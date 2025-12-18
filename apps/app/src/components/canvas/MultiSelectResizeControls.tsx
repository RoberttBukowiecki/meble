'use client';

/**
 * MultiSelectResizeControls Component
 *
 * Renders 6 resize handles on bounding box of selected parts.
 * Uses edge-based resize - only parts at the edge change dimensions.
 *
 * PERFORMANCE STRATEGY:
 * - dragStateRef stores all mutable state during drag
 * - previewVersion state triggers re-renders for preview mesh only
 * - Store updated ONCE on pointerup
 * - Original parts hidden via setTransformingPartIds
 */

import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useThree, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore, useMaterial, useSelectedParts } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import type { Part, CabinetResizeHandle, CabinetBoundingBox, CabinetPartInitialTransform, CabinetPartPreview } from '@/types';
import { PART_CONFIG, MATERIAL_CONFIG } from '@/lib/config';
import {
  calculateCabinetBoundingBox,
  getCabinetHandlePosition,
  getCabinetHandleNormal,
  captureInitialTransforms,
  calculateEdgeBasedResize,
  getHandleAxisName,
  getHandleAxisIndex,
} from '@/lib/cabinetResize';
import { ResizeHandleMesh, DimensionDisplay } from './resize';

// ============================================================================
// Constants
// ============================================================================

/** All 6 resize handles */
const HANDLES: CabinetResizeHandle[] = [
  'width+', 'width-',
  'height+', 'height-',
  'depth+', 'depth-',
];

/** Grid snap size when Shift is pressed */
const GRID_SNAP = 10;

// ============================================================================
// Types
// ============================================================================

interface MultiSelectResizeControlsProps {
  onTransformStart: () => void;
  onTransformEnd: () => void;
}

interface DragState {
  isDragging: boolean;
  handle: CabinetResizeHandle | null;
  startPoint: THREE.Vector3;
  initialBoundingBox: CabinetBoundingBox;
  initialTransforms: Map<string, CabinetPartInitialTransform>;
  previewTransforms: Map<string, CabinetPartPreview>;
  previewBoundingBox: CabinetBoundingBox | null;
}

// ============================================================================
// Preview Part Mesh Component
// ============================================================================

interface PreviewPartMeshProps {
  preview: CabinetPartPreview;
  materialId: string;
}

function PreviewPartMesh({ preview, materialId }: PreviewPartMeshProps) {
  const material = useMaterial(materialId);
  const color = material?.color || MATERIAL_CONFIG.DEFAULT_MATERIAL_COLOR;

  return (
    <mesh
      position={preview.position}
      rotation={preview.rotation}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[preview.width, preview.height, preview.depth]} />
      <meshStandardMaterial
        color={color}
        emissive={PART_CONFIG.MULTISELECT_EMISSIVE_COLOR}
        emissiveIntensity={PART_CONFIG.MULTISELECT_EMISSIVE_INTENSITY}
      />
    </mesh>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function MultiSelectResizeControls({
  onTransformStart,
  onTransformEnd,
}: MultiSelectResizeControlsProps) {
  const { camera, gl } = useThree();

  // Get selected parts
  const selectedParts = useSelectedParts();

  // Store actions
  const {
    updatePartsBatch,
    setTransformingPartIds,
    selectedPartIds,
    beginBatch,
    commitBatch,
    isShiftPressed,
  } = useStore(
    useShallow((state) => ({
      updatePartsBatch: state.updatePartsBatch,
      setTransformingPartIds: state.setTransformingPartIds,
      selectedPartIds: state.selectedPartIds,
      beginBatch: state.beginBatch,
      commitBatch: state.commitBatch,
      isShiftPressed: state.isShiftPressed,
    }))
  );

  // Local state for visual feedback
  const [hoveredHandle, setHoveredHandle] = useState<CabinetResizeHandle | null>(null);
  const [activeHandle, setActiveHandle] = useState<CabinetResizeHandle | null>(null);
  const [previewVersion, setPreviewVersion] = useState(0);

  // Calculate bounding box
  const boundingBox = useMemo(
    () => calculateCabinetBoundingBox(selectedParts),
    [selectedParts]
  );

  // Ref-based drag state
  const dragStateRef = useRef<DragState>({
    isDragging: false,
    handle: null,
    startPoint: new THREE.Vector3(),
    initialBoundingBox: boundingBox,
    initialTransforms: new Map(),
    previewTransforms: new Map(),
    previewBoundingBox: null,
  });

  // Plane for raycasting during drag
  const dragPlaneRef = useRef(new THREE.Plane());
  const raycasterRef = useRef(new THREE.Raycaster());
  const intersectPointRef = useRef(new THREE.Vector3());

  // RAF throttle ref
  const rafIdRef = useRef<number | null>(null);

  // Keep refs in sync for event handlers
  const selectedPartsRef = useRef(selectedParts);
  const isShiftPressedRef = useRef(isShiftPressed);

  useEffect(() => {
    selectedPartsRef.current = selectedParts;
  }, [selectedParts]);

  useEffect(() => {
    isShiftPressedRef.current = isShiftPressed;
  }, [isShiftPressed]);

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
    (e: ThreeEvent<PointerEvent>, handle: CabinetResizeHandle) => {
      e.stopPropagation();

      const startPoint = e.point.clone();
      const currentBoundingBox = calculateCabinetBoundingBox(selectedPartsRef.current);
      const initialTransforms = captureInitialTransforms(selectedPartsRef.current);

      // Initialize preview transforms with current values
      const initialPreviews = new Map<string, CabinetPartPreview>();
      selectedPartsRef.current.forEach(part => {
        initialPreviews.set(part.id, {
          position: [...part.position],
          rotation: [...part.rotation],
          width: part.width,
          height: part.height,
          depth: part.depth,
        });
      });

      dragStateRef.current = {
        isDragging: true,
        handle,
        startPoint,
        initialBoundingBox: currentBoundingBox,
        initialTransforms,
        previewTransforms: initialPreviews,
        previewBoundingBox: currentBoundingBox,
      };

      // Setup drag plane (perpendicular to camera, through start point)
      const cameraDir = new THREE.Vector3();
      camera.getWorldDirection(cameraDir);
      dragPlaneRef.current.setFromNormalAndCoplanarPoint(cameraDir, startPoint);

      // Begin history batch
      const beforeState: Record<string, { position: [number, number, number]; width: number; height: number; depth: number }> = {};
      selectedPartsRef.current.forEach(p => {
        beforeState[p.id] = {
          position: [...p.position],
          width: p.width,
          height: p.height,
          depth: p.depth,
        };
      });

      beginBatch('TRANSFORM_MULTISELECT', {
        targetId: `multiselect-resize-${selectedPartsRef.current.length}`,
        before: beforeState,
      });

      setActiveHandle(handle);
      setPreviewVersion((v) => v + 1);
      setTransformingPartIds(selectedPartIds);
      onTransformStart();

      // Capture pointer
      gl.domElement.setPointerCapture((e as unknown as PointerEvent).pointerId);
    },
    [camera, beginBatch, selectedPartIds, setTransformingPartIds, onTransformStart, gl]
  );

  // Handle pointer move (global)
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

        // Apply grid snap when Shift is pressed
        if (isShiftPressedRef.current) {
          dragOffset[0] = Math.round(dragOffset[0] / GRID_SNAP) * GRID_SNAP;
          dragOffset[1] = Math.round(dragOffset[1] / GRID_SNAP) * GRID_SNAP;
          dragOffset[2] = Math.round(dragOffset[2] / GRID_SNAP) * GRID_SNAP;
        }

        // Calculate resize using edge-based algorithm
        const result = calculateEdgeBasedResize(
          selectedPartsRef.current,
          dragStateRef.current.handle!,
          dragOffset,
          dragStateRef.current.initialBoundingBox,
          dragStateRef.current.initialTransforms
        );

        // Update preview state
        dragStateRef.current.previewTransforms = result.partPreviews;
        dragStateRef.current.previewBoundingBox = result.boundingBox;

        // Trigger re-render
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

      // Get final transforms from preview state
      const previews = dragStateRef.current.previewTransforms;
      const updates: Array<{ id: string; patch: Partial<Part> }> = [];
      const afterState: Record<string, { position: [number, number, number]; width: number; height: number; depth: number }> = {};

      previews.forEach((preview, partId) => {
        updates.push({
          id: partId,
          patch: {
            position: preview.position,
            width: preview.width,
            height: preview.height,
            depth: preview.depth,
          },
        });
        afterState[partId] = {
          position: preview.position,
          width: preview.width,
          height: preview.height,
          depth: preview.depth,
        };
      });

      // Single batch update on pointerup
      if (updates.length > 0) {
        updatePartsBatch(updates);
      }

      commitBatch({ after: afterState });

      // Reset state
      dragStateRef.current.isDragging = false;
      dragStateRef.current.handle = null;
      dragStateRef.current.previewTransforms = new Map();
      dragStateRef.current.previewBoundingBox = null;

      setActiveHandle(null);
      setTransformingPartIds(new Set());
      onTransformEnd();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [camera, gl, updatePartsBatch, commitBatch, setTransformingPartIds, onTransformEnd]);

  // Get current preview state
  const previewState = dragStateRef.current;
  const isShowingPreview = activeHandle !== null && previewState.previewTransforms.size > 0;
  const displayBoundingBox = isShowingPreview && previewState.previewBoundingBox
    ? previewState.previewBoundingBox
    : boundingBox;

  // Don't render if less than 2 parts selected
  if (selectedParts.length < 2) {
    return null;
  }

  // Get dimension info for active handle
  const activeDimensionInfo = (() => {
    if (!activeHandle) return null;
    const axis = getHandleAxisName(activeHandle);
    const axisIndex = getHandleAxisIndex(activeHandle);
    const dimension = displayBoundingBox.size[axisIndex];
    const pos = getCabinetHandlePosition(displayBoundingBox, activeHandle);
    return {
      axis,
      dimension,
      position: [pos[0], pos[1] + 40, pos[2]] as [number, number, number],
    };
  })();

  return (
    <group>
      {/* Preview meshes during drag */}
      {isShowingPreview && selectedParts.map(part => {
        const preview = previewState.previewTransforms.get(part.id);
        if (!preview) return null;
        return (
          <PreviewPartMesh
            key={`preview-${part.id}-${previewVersion}`}
            preview={preview}
            materialId={part.materialId}
          />
        );
      })}

      {/* Resize handles */}
      {HANDLES.map((handle) => {
        const position = getCabinetHandlePosition(displayBoundingBox, handle);
        const normal = getCabinetHandleNormal(handle);
        return (
          <ResizeHandleMesh
            key={handle}
            position={position}
            normal={normal}
            handleId={handle}
            isDragging={activeHandle === handle}
            isHovered={hoveredHandle === handle}
            onPointerDown={(e, id) => handlePointerDown(e, id as CabinetResizeHandle)}
            onPointerEnter={(id) => setHoveredHandle(id as CabinetResizeHandle)}
            onPointerLeave={() => setHoveredHandle(null)}
          />
        );
      })}

      {/* Dimension display during drag */}
      {activeDimensionInfo && (
        <DimensionDisplay
          position={activeDimensionInfo.position}
          dimension={activeDimensionInfo.dimension}
          axis={activeDimensionInfo.axis}
        />
      )}
    </group>
  );
}
