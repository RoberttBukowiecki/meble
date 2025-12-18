'use client';

/**
 * PartResizeControls Component
 *
 * Renders resize handles for resizing individual parts.
 * Store is only updated on pointerup for performance.
 */

import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useThree, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore, useMaterial } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import { useSnapContext } from '@/lib/snap-context';
import { calculateResize, getHandlePosition, getHandleNormal } from '@/lib/resize';
import type { Part, ResizeHandle } from '@/types';
import { MATERIAL_CONFIG } from '@/lib/config';
import { ResizeHandleMesh, ResizePreviewMesh, DimensionDisplay } from './resize';

// ============================================================================
// Constants
// ============================================================================

/** Resize handles (depth disabled - thickness is determined by material) */
const HANDLES: ResizeHandle[] = ['width+', 'width-', 'height+', 'height-'];

/** Grid snap size when Shift is pressed */
const GRID_SNAP = 10;

// ============================================================================
// Types
// ============================================================================

interface PartResizeControlsProps {
  part: Part;
  onTransformStart: () => void;
  onTransformEnd: () => void;
}

interface DragState {
  isDragging: boolean;
  handle: ResizeHandle | null;
  startPoint: THREE.Vector3;
  startDimensions: { width: number; height: number; depth: number };
  startPosition: [number, number, number];
  previewDimensions: { width: number; height: number; depth: number } | null;
  previewPosition: [number, number, number] | null;
  hasCollision: boolean;
}

// ============================================================================
// Main Component
// ============================================================================

export function PartResizeControls({
  part,
  onTransformStart,
  onTransformEnd,
}: PartResizeControlsProps) {
  const { camera, gl } = useThree();
  const { setSnapPoints, clearSnapPoints } = useSnapContext();

  // Store access
  const { updatePart, beginBatch, commitBatch, parts, snapEnabled, snapSettings, isShiftPressed, setTransformingPartId } = useStore(
    useShallow((state) => ({
      updatePart: state.updatePart,
      beginBatch: state.beginBatch,
      commitBatch: state.commitBatch,
      parts: state.parts,
      snapEnabled: state.snapEnabled,
      snapSettings: state.snapSettings,
      isShiftPressed: state.isShiftPressed,
      setTransformingPartId: state.setTransformingPartId,
    }))
  );

  // Get material color for preview mesh
  const material = useMaterial(part.materialId);
  const partColor = material?.color || MATERIAL_CONFIG.DEFAULT_MATERIAL_COLOR;

  // Local state for visual feedback
  const [hoveredHandle, setHoveredHandle] = useState<ResizeHandle | null>(null);
  const [activeHandle, setActiveHandle] = useState<ResizeHandle | null>(null);
  const [previewVersion, setPreviewVersion] = useState(0);

  // Drag state ref (no rerenders during drag)
  const dragStateRef = useRef<DragState>({
    isDragging: false,
    handle: null,
    startPoint: new THREE.Vector3(),
    startDimensions: { width: 0, height: 0, depth: 0 },
    startPosition: [0, 0, 0],
    previewDimensions: null,
    previewPosition: null,
    hasCollision: false,
  });

  // Refs for raycasting
  const dragPlaneRef = useRef(new THREE.Plane());
  const raycasterRef = useRef(new THREE.Raycaster());
  const intersectPointRef = useRef(new THREE.Vector3());
  const rafIdRef = useRef<number | null>(null);

  // Refs for stable access in event handlers
  const partRef = useRef(part);
  const partsRef = useRef(parts);
  const snapEnabledRef = useRef(snapEnabled);
  const snapSettingsRef = useRef(snapSettings);
  const isShiftPressedRef = useRef(isShiftPressed);

  // Keep refs in sync
  useEffect(() => { partRef.current = part; }, [part]);
  useEffect(() => { partsRef.current = parts; }, [parts]);
  useEffect(() => { snapEnabledRef.current = snapEnabled; }, [snapEnabled]);
  useEffect(() => { snapSettingsRef.current = snapSettings; }, [snapSettings]);
  useEffect(() => { isShiftPressedRef.current = isShiftPressed; }, [isShiftPressed]);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Handle pointer down on resize handle
  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>, handleId: string) => {
      e.stopPropagation();
      const handle = handleId as ResizeHandle;
      const startPoint = e.point.clone();

      dragStateRef.current = {
        isDragging: true,
        handle,
        startPoint,
        startDimensions: { width: part.width, height: part.height, depth: part.depth },
        startPosition: [...part.position],
        previewDimensions: { width: part.width, height: part.height, depth: part.depth },
        previewPosition: [...part.position],
        hasCollision: false,
      };

      // Setup drag plane perpendicular to camera
      const cameraDir = new THREE.Vector3();
      camera.getWorldDirection(cameraDir);
      dragPlaneRef.current.setFromNormalAndCoplanarPoint(cameraDir, startPoint);

      beginBatch('TRANSFORM_PART', {
        targetId: part.id,
        before: { position: part.position, width: part.width, height: part.height, depth: part.depth },
      });

      setActiveHandle(handle);
      setPreviewVersion((v) => v + 1);
      setTransformingPartId(part.id);
      onTransformStart();

      gl.domElement.setPointerCapture((e as unknown as { pointerId: number }).pointerId);
    },
    [part, camera, beginBatch, onTransformStart, gl, setTransformingPartId]
  );

  // Handle pointer move and up (global listeners)
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!dragStateRef.current.isDragging || !dragStateRef.current.handle) return;
      if (rafIdRef.current !== null) return;

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;

        const rect = gl.domElement.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycasterRef.current.setFromCamera(new THREE.Vector2(x, y), camera);
        raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, intersectPointRef.current);

        if (!intersectPointRef.current) return;

        const dragOffset: [number, number, number] = [
          intersectPointRef.current.x - dragStateRef.current.startPoint.x,
          intersectPointRef.current.y - dragStateRef.current.startPoint.y,
          intersectPointRef.current.z - dragStateRef.current.startPoint.z,
        ];

        const currentPart = partRef.current;
        const tempPart: Part = {
          ...currentPart,
          width: dragStateRef.current.startDimensions.width,
          height: dragStateRef.current.startDimensions.height,
          depth: dragStateRef.current.startDimensions.depth,
          position: dragStateRef.current.startPosition,
        };

        const result = calculateResize(
          tempPart,
          dragStateRef.current.handle!,
          dragOffset,
          partsRef.current.filter((p) => p.id !== currentPart.id),
          snapEnabledRef.current,
          snapSettingsRef.current
        );

        // Apply grid snap when Shift is pressed
        let finalWidth = result.newWidth;
        let finalHeight = result.newHeight;
        let finalDepth = result.newDepth;

        if (isShiftPressedRef.current) {
          finalWidth = Math.max(GRID_SNAP, Math.round(result.newWidth / GRID_SNAP) * GRID_SNAP);
          finalHeight = Math.max(GRID_SNAP, Math.round(result.newHeight / GRID_SNAP) * GRID_SNAP);
          finalDepth = Math.max(GRID_SNAP, Math.round(result.newDepth / GRID_SNAP) * GRID_SNAP);
        }

        dragStateRef.current.previewDimensions = { width: finalWidth, height: finalHeight, depth: finalDepth };
        dragStateRef.current.previewPosition = result.newPosition;
        dragStateRef.current.hasCollision = result.collision;

        if (result.snapPoints.length > 0) {
          setSnapPoints(result.snapPoints);
        } else {
          clearSnapPoints();
        }

        setPreviewVersion((v) => v + 1);
      });
    };

    const handlePointerUp = () => {
      if (!dragStateRef.current.isDragging) return;

      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      const preview = dragStateRef.current;
      if (preview.previewDimensions && preview.previewPosition) {
        updatePart(partRef.current.id, {
          width: preview.previewDimensions.width,
          height: preview.previewDimensions.height,
          depth: preview.previewDimensions.depth,
          position: preview.previewPosition,
        }, true);

        commitBatch({
          after: {
            position: preview.previewPosition,
            width: preview.previewDimensions.width,
            height: preview.previewDimensions.height,
            depth: preview.previewDimensions.depth,
          },
        });
      } else {
        commitBatch({
          after: {
            position: partRef.current.position,
            width: partRef.current.width,
            height: partRef.current.height,
            depth: partRef.current.depth,
          },
        });
      }

      clearSnapPoints();

      dragStateRef.current.isDragging = false;
      dragStateRef.current.handle = null;
      dragStateRef.current.previewDimensions = null;
      dragStateRef.current.previewPosition = null;
      dragStateRef.current.hasCollision = false;

      setActiveHandle(null);
      setTransformingPartId(null);
      onTransformEnd();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [camera, gl, updatePart, commitBatch, setSnapPoints, clearSnapPoints, onTransformEnd, setTransformingPartId]);

  // Get current preview state
  const preview = dragStateRef.current;
  const isShowingPreview = activeHandle !== null && preview.previewDimensions !== null;

  // Part with preview dimensions for handle positioning during drag
  const displayPart = useMemo((): Part => {
    if (isShowingPreview && preview.previewDimensions && preview.previewPosition) {
      return {
        ...part,
        width: preview.previewDimensions.width,
        height: preview.previewDimensions.height,
        depth: preview.previewDimensions.depth,
        position: preview.previewPosition,
      };
    }
    return part;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [part, isShowingPreview, previewVersion]);

  // Dimension display position
  const dimensionDisplayPos = useMemo(() => {
    if (!activeHandle) return null;
    const pos = getHandlePosition(displayPart, activeHandle);
    return [pos[0], pos[1] + 30, pos[2]] as [number, number, number];
  }, [displayPart, activeHandle]);

  // Get axis for active handle
  const activeAxis = useMemo(() => {
    if (!activeHandle) return null;
    if (activeHandle.startsWith('width')) return 'width';
    if (activeHandle.startsWith('height')) return 'height';
    return 'depth';
  }, [activeHandle]);

  const currentDimension = useMemo(() => {
    if (!activeAxis || !isShowingPreview || !preview.previewDimensions) return null;
    return preview.previewDimensions[activeAxis];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAxis, isShowingPreview, previewVersion]);

  return (
    <group>
      {/* Preview mesh during drag */}
      {isShowingPreview && preview.previewDimensions && preview.previewPosition && (
        <ResizePreviewMesh
          position={preview.previewPosition}
          rotation={part.rotation}
          width={preview.previewDimensions.width}
          height={preview.previewDimensions.height}
          depth={preview.previewDimensions.depth}
          color={partColor}
          hasCollision={preview.hasCollision}
          isSelected
        />
      )}

      {/* Resize handles */}
      {HANDLES.map((handle) => {
        const position = getHandlePosition(displayPart, handle);
        const normal = getHandleNormal(displayPart, handle);

        return (
          <ResizeHandleMesh
            key={handle}
            position={position}
            normal={normal}
            handleId={handle}
            isDragging={activeHandle === handle}
            isHovered={hoveredHandle === handle}
            hasCollision={preview.hasCollision && activeHandle === handle}
            onPointerDown={handlePointerDown}
            onPointerEnter={(id) => setHoveredHandle(id as ResizeHandle)}
            onPointerLeave={() => setHoveredHandle(null)}
          />
        );
      })}

      {/* Dimension display during drag */}
      {currentDimension !== null && dimensionDisplayPos && activeAxis && (
        <DimensionDisplay
          position={dimensionDisplayPos}
          dimension={currentDimension}
          axis={activeAxis}
        />
      )}
    </group>
  );
}
