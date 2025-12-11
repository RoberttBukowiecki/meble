'use client';

/**
 * PartResizeControls Component
 *
 * Renders 6 resize handles (one per face) for resizing parts.
 * Uses ref-based drag state to avoid rerenders during drag operations.
 *
 * PERFORMANCE: Store is only updated on pointerup, not during drag.
 * A preview mesh shows the resized dimensions in real-time.
 */

import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useThree, ThreeEvent, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useStore, useMaterial } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import { useSnapContext } from '@/lib/snap-context';
import { calculateResize, getHandlePosition, getHandleNormal } from '@/lib/resize';
import type { Part, ResizeHandle as ResizeHandleType } from '@/types';
import { PART_CONFIG, MATERIAL_CONFIG } from '@/lib/config';

// ============================================================================
// Constants
// ============================================================================

/** Visual size of resize handle in mm */
const HANDLE_SIZE = 20;

/** Hitbox size for easier clicking (invisible, larger) */
const HITBOX_SIZE = 50;

/** Resize handle types (depth disabled - thickness is determined by material) */
const HANDLES: ResizeHandleType[] = [
  'width+', 'width-',
  'height+', 'height-',
  // 'depth+', 'depth-', // Disabled - depth = material thickness
];

// ============================================================================
// Types
// ============================================================================

interface PartResizeControlsProps {
  part: Part;
  onTransformStart: () => void;
  onTransformEnd: () => void;
}

interface HandleMeshProps {
  part: Part;
  handle: ResizeHandleType;
  isDragging: boolean;
  isHovered: boolean;
  hasCollision: boolean;
  onPointerDown: (e: ThreeEvent<PointerEvent>, handle: ResizeHandleType) => void;
  onPointerEnter: (handle: ResizeHandleType) => void;
  onPointerLeave: () => void;
}

interface DragState {
  isDragging: boolean;
  handle: ResizeHandleType | null;
  startPoint: THREE.Vector3;
  startDimensions: { width: number; height: number; depth: number };
  startPosition: [number, number, number];
  // Preview state (updated during drag, committed on pointerup)
  previewDimensions: { width: number; height: number; depth: number } | null;
  previewPosition: [number, number, number] | null;
  hasCollision: boolean;
}

// ============================================================================
// Handle Mesh Component
// ============================================================================

function HandleMesh({
  part,
  handle,
  isDragging,
  isHovered,
  hasCollision,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
}: HandleMeshProps) {
  const position = useMemo(() => getHandlePosition(part, handle), [part, handle]);
  const normal = useMemo(() => getHandleNormal(part, handle), [part, handle]);

  // Calculate handle rotation to face outward
  const rotation = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3(...normal);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dir);
    const euler = new THREE.Euler().setFromQuaternion(quaternion);
    return [euler.x, euler.y, euler.z] as [number, number, number];
  }, [normal]);

  // Handle color based on state
  const color = useMemo(() => {
    if (hasCollision) return 'hsl(0, 70%, 50%)'; // Red for collision
    if (isDragging) return 'hsl(var(--accent))';
    if (isHovered) return 'hsl(var(--primary))';
    return 'hsl(var(--muted-foreground))';
  }, [isDragging, isHovered, hasCollision]);

  const scale = isHovered || isDragging ? 1.2 : 1;

  return (
    <group position={position} rotation={rotation}>
      {/* Invisible hitbox for easier clicking */}
      <mesh
        onPointerDown={(e) => onPointerDown(e, handle)}
        onPointerEnter={() => onPointerEnter(handle)}
        onPointerLeave={onPointerLeave}
      >
        <boxGeometry args={[HITBOX_SIZE, 5, HITBOX_SIZE]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Visible handle */}
      <mesh scale={scale}>
        <boxGeometry args={[HANDLE_SIZE, 5, HANDLE_SIZE]} />
        <meshStandardMaterial
          color={color}
          emissive={isDragging || isHovered ? color : 'black'}
          emissiveIntensity={isDragging ? 0.3 : isHovered ? 0.2 : 0}
        />
      </mesh>
    </group>
  );
}

// ============================================================================
// Preview Mesh Component (shows during drag, looks identical to original)
// ============================================================================

interface PreviewMeshProps {
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  height: number;
  depth: number;
  color: string;
  hasCollision: boolean;
  isSelected: boolean;
}

function PreviewMesh({ position, rotation, width, height, depth, color, hasCollision, isSelected }: PreviewMeshProps) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial
        color={color}
        emissive={
          hasCollision
            ? PART_CONFIG.COLLISION_EMISSIVE_COLOR
            : isSelected
            ? PART_CONFIG.SELECTION_EMISSIVE_COLOR
            : '#000000'
        }
        emissiveIntensity={
          hasCollision
            ? PART_CONFIG.COLLISION_EMISSIVE_INTENSITY
            : isSelected
            ? PART_CONFIG.SELECTION_EMISSIVE_INTENSITY
            : 0
        }
      />
    </mesh>
  );
}

// ============================================================================
// Dimension Display Component
// ============================================================================

interface DimensionDisplayProps {
  position: [number, number, number];
  dimension: number;
  axis: 'width' | 'height' | 'depth';
}

function DimensionDisplay({ position, dimension, axis }: DimensionDisplayProps) {
  const labels: Record<string, string> = {
    width: 'Szer.',
    height: 'Wys.',
    depth: 'Głęb.',
  };

  return (
    <Html position={position} center>
      <div className="pointer-events-none rounded bg-background/90 px-2 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm">
        {labels[axis]}: {Math.round(dimension)}mm
      </div>
    </Html>
  );
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

  // Local state for visual feedback (minimal - only for hover/active handle)
  const [hoveredHandle, setHoveredHandle] = useState<ResizeHandleType | null>(null);
  const [activeHandle, setActiveHandle] = useState<ResizeHandleType | null>(null);

  // Force re-render trigger for preview mesh (incremented during drag)
  const [previewVersion, setPreviewVersion] = useState(0);

  // Ref-based drag state (no rerenders during drag, only preview mesh updates)
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

  // Plane for raycasting during drag
  const dragPlaneRef = useRef(new THREE.Plane());
  const raycasterRef = useRef(new THREE.Raycaster());
  const intersectPointRef = useRef(new THREE.Vector3());

  // RAF throttle ref
  const rafIdRef = useRef<number | null>(null);

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
    (e: ThreeEvent<PointerEvent>, handle: ResizeHandleType) => {
      e.stopPropagation();

      // Get world position of click
      const startPoint = e.point.clone();

      // Setup drag state with initial preview matching current part
      dragStateRef.current = {
        isDragging: true,
        handle,
        startPoint,
        startDimensions: {
          width: part.width,
          height: part.height,
          depth: part.depth,
        },
        startPosition: [...part.position],
        previewDimensions: {
          width: part.width,
          height: part.height,
          depth: part.depth,
        },
        previewPosition: [...part.position],
        hasCollision: false,
      };

      // Setup drag plane (perpendicular to camera, through start point)
      const cameraDir = new THREE.Vector3();
      camera.getWorldDirection(cameraDir);
      dragPlaneRef.current.setFromNormalAndCoplanarPoint(cameraDir, startPoint);

      // Begin history batch
      beginBatch('TRANSFORM_PART', {
        targetId: part.id,
        before: {
          position: part.position,
          width: part.width,
          height: part.height,
          depth: part.depth,
        },
      });

      setActiveHandle(handle);
      setPreviewVersion((v) => v + 1); // Trigger initial preview render
      setTransformingPartId(part.id); // Hide original Part3D, show preview
      onTransformStart();

      // Capture pointer
      gl.domElement.setPointerCapture((e as any).pointerId);
    },
    [part, camera, beginBatch, onTransformStart, gl, setTransformingPartId]
  );

  // Refs for stable access in event handlers (avoids effect re-runs)
  const partRef = useRef(part);
  const partsRef = useRef(parts);
  const snapEnabledRef = useRef(snapEnabled);
  const snapSettingsRef = useRef(snapSettings);
  const isShiftPressedRef = useRef(isShiftPressed);

  // Keep refs in sync
  useEffect(() => {
    partRef.current = part;
  }, [part]);
  useEffect(() => {
    partsRef.current = parts;
  }, [parts]);
  useEffect(() => {
    snapEnabledRef.current = snapEnabled;
  }, [snapEnabled]);
  useEffect(() => {
    snapSettingsRef.current = snapSettings;
  }, [snapSettings]);
  useEffect(() => {
    isShiftPressedRef.current = isShiftPressed;
  }, [isShiftPressed]);

  // Handle pointer move (global) - ONLY updates refs, NOT store
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!dragStateRef.current.isDragging || !dragStateRef.current.handle) return;

      // Throttle with RAF
      if (rafIdRef.current !== null) return;

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;

        // Get mouse position in normalized device coordinates
        const rect = gl.domElement.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        // Raycast to drag plane
        raycasterRef.current.setFromCamera(new THREE.Vector2(x, y), camera);
        raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, intersectPointRef.current);

        if (!intersectPointRef.current) return;

        // Calculate drag offset from start point
        const dragOffset: [number, number, number] = [
          intersectPointRef.current.x - dragStateRef.current.startPoint.x,
          intersectPointRef.current.y - dragStateRef.current.startPoint.y,
          intersectPointRef.current.z - dragStateRef.current.startPoint.z,
        ];

        // Create temporary part with original dimensions for resize calculation
        const currentPart = partRef.current;
        const tempPart: Part = {
          ...currentPart,
          width: dragStateRef.current.startDimensions.width,
          height: dragStateRef.current.startDimensions.height,
          depth: dragStateRef.current.startDimensions.depth,
          position: dragStateRef.current.startPosition,
        };

        // Calculate resize
        const result = calculateResize(
          tempPart,
          dragStateRef.current.handle!,
          dragOffset,
          partsRef.current.filter((p) => p.id !== currentPart.id),
          snapEnabledRef.current,
          snapSettingsRef.current
        );

        // Apply grid snap (10mm) when Shift is pressed
        const GRID_SNAP = 10;
        let finalWidth = result.newWidth;
        let finalHeight = result.newHeight;
        let finalDepth = result.newDepth;

        if (isShiftPressedRef.current) {
          finalWidth = Math.round(result.newWidth / GRID_SNAP) * GRID_SNAP;
          finalHeight = Math.round(result.newHeight / GRID_SNAP) * GRID_SNAP;
          finalDepth = Math.round(result.newDepth / GRID_SNAP) * GRID_SNAP;

          // Ensure minimum dimension
          finalWidth = Math.max(GRID_SNAP, finalWidth);
          finalHeight = Math.max(GRID_SNAP, finalHeight);
          finalDepth = Math.max(GRID_SNAP, finalDepth);
        }

        // PERFORMANCE: Update refs only, NOT the store!
        // Store will be updated on pointerup
        dragStateRef.current.previewDimensions = {
          width: finalWidth,
          height: finalHeight,
          depth: finalDepth,
        };
        dragStateRef.current.previewPosition = result.newPosition;
        dragStateRef.current.hasCollision = result.collision;

        // Update snap points for visualization
        if (result.snapPoints.length > 0) {
          setSnapPoints(result.snapPoints);
        } else {
          clearSnapPoints();
        }

        // Trigger preview mesh re-render (single setState per frame)
        setPreviewVersion((v) => v + 1);
      });
    };

    const handlePointerUp = () => {
      if (!dragStateRef.current.isDragging) return;

      // Cancel pending RAF
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      // Get final dimensions from preview state
      const preview = dragStateRef.current;
      if (preview.previewDimensions && preview.previewPosition) {
        // PERFORMANCE: Single store update on pointerup (not during drag)
        updatePart(
          partRef.current.id,
          {
            width: preview.previewDimensions.width,
            height: preview.previewDimensions.height,
            depth: preview.previewDimensions.depth,
            position: preview.previewPosition,
          },
          true // skip individual history, we're batching
        );

        // Commit history batch with final state
        commitBatch({
          after: {
            position: preview.previewPosition,
            width: preview.previewDimensions.width,
            height: preview.previewDimensions.height,
            depth: preview.previewDimensions.depth,
          },
        });
      } else {
        // No change, just close the batch
        commitBatch({
          after: {
            position: partRef.current.position,
            width: partRef.current.width,
            height: partRef.current.height,
            depth: partRef.current.depth,
          },
        });
      }

      // Clear snap points
      clearSnapPoints();

      // Reset state
      dragStateRef.current.isDragging = false;
      dragStateRef.current.handle = null;
      dragStateRef.current.previewDimensions = null;
      dragStateRef.current.previewPosition = null;
      dragStateRef.current.hasCollision = false;
      setActiveHandle(null);
      setTransformingPartId(null); // Show original Part3D again

      onTransformEnd();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [camera, gl, updatePart, commitBatch, setSnapPoints, clearSnapPoints, onTransformEnd, setTransformingPartId]);

  // Get current preview state (read from ref, re-render triggered by previewVersion)
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

  // Dimension display position (near active handle)
  const dimensionDisplayPos = useMemo(() => {
    if (!activeHandle) return null;
    const pos = getHandlePosition(displayPart, activeHandle);
    // Offset slightly for visibility
    return [pos[0], pos[1] + 30, pos[2]] as [number, number, number];
  }, [displayPart, activeHandle]);

  // Get axis and current dimension for active handle
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
      {/* Preview mesh during drag (looks identical to original Part3D) */}
      {isShowingPreview && preview.previewDimensions && preview.previewPosition && (
        <PreviewMesh
          position={preview.previewPosition}
          rotation={part.rotation}
          width={preview.previewDimensions.width}
          height={preview.previewDimensions.height}
          depth={preview.previewDimensions.depth}
          color={partColor}
          hasCollision={preview.hasCollision}
          isSelected={true}
        />
      )}

      {/* Resize handles - positioned according to preview during drag */}
      {HANDLES.map((handle) => (
        <HandleMesh
          key={handle}
          part={displayPart}
          handle={handle}
          isDragging={activeHandle === handle}
          isHovered={hoveredHandle === handle}
          hasCollision={preview.hasCollision && activeHandle === handle}
          onPointerDown={handlePointerDown}
          onPointerEnter={setHoveredHandle}
          onPointerLeave={() => setHoveredHandle(null)}
        />
      ))}

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
