'use client';

/**
 * CabinetGroupTransform Component
 *
 * Handles translate/rotate for cabinet groups.
 * PERFORMANCE: Uses ref-based preview - no store updates during drag.
 * Preview meshes are rendered for all cabinet parts during transform.
 */

import { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import { TransformControls } from '@react-three/drei';
import { useStore, useMaterial } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import * as THREE from 'three';
import { Part } from '@/types';
import { SCENE_CONFIG, PART_CONFIG, MATERIAL_CONFIG } from '@/lib/config';
import { useSnapContext } from '@/lib/snap-context';
import { useDimensionContext } from '@/lib/dimension-context';
import { calculateCabinetBounds, calculateSnapSimple } from '@/lib/snapping';
import { calculateCabinetSnapV2 } from '@/lib/snapping-v2';
import { calculateDimensions } from '@/lib/dimension-calculator';
import { getCabinetBoundingBoxWithOffset, getOtherBoundingBoxes } from '@/lib/bounding-box-utils';
import type { TransformControls as TransformControlsImpl } from 'three-stdlib';

type PartTransform = Pick<Part, 'position' | 'rotation'>;

// ============================================================================
// Preview Mesh Component
// ============================================================================

interface PreviewPartMeshProps {
  part: Part;
  previewPosition: [number, number, number];
  previewRotation: [number, number, number];
}

function PreviewPartMesh({ part, previewPosition, previewRotation }: PreviewPartMeshProps) {
  const material = useMaterial(part.materialId);
  const color = material?.color || MATERIAL_CONFIG.DEFAULT_MATERIAL_COLOR;

  return (
    <mesh
      position={previewPosition}
      rotation={previewRotation}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[part.width, part.height, part.depth]} />
      <meshStandardMaterial
        color={color}
        emissive={PART_CONFIG.CABINET_SELECTION_EMISSIVE_COLOR}
        emissiveIntensity={PART_CONFIG.CABINET_SELECTION_EMISSIVE_INTENSITY}
      />
    </mesh>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CabinetGroupTransform({ cabinetId }: { cabinetId: string }) {
  const { setSnapPoints, clearSnapPoints } = useSnapContext();
  const { setDimensionLines, clearDimensionLines, setActiveAxis } = useDimensionContext();

  // Get cabinet parts using useShallow
  const cabinetParts = useStore(
    useShallow((state) =>
      state.parts.filter((p) => p.cabinetMetadata?.cabinetId === cabinetId)
    )
  );

  // Get all parts for snap calculations
  const allParts = useStore((state) => state.parts);

  // Get all cabinets for dimension calculations
  const allCabinets = useStore((state) => state.cabinets);

  const {
    updatePartsBatch,
    transformMode,
    setIsTransforming,
    setTransformingCabinetId,
    beginBatch,
    commitBatch,
    isShiftPressed,
    detectCollisions,
    snapEnabled,
    snapSettings,
    dimensionSettings,
  } = useStore(
    useShallow((state) => ({
      updatePartsBatch: state.updatePartsBatch,
      transformMode: state.transformMode,
      setIsTransforming: state.setIsTransforming,
      setTransformingCabinetId: state.setTransformingCabinetId,
      beginBatch: state.beginBatch,
      commitBatch: state.commitBatch,
      isShiftPressed: state.isShiftPressed,
      detectCollisions: state.detectCollisions,
      snapEnabled: state.snapEnabled,
      snapSettings: state.snapSettings,
      dimensionSettings: state.dimensionSettings,
    }))
  );

  // Alias for backward compatibility
  const parts = cabinetParts;

  const [target, setTarget] = useState<THREE.Group | null>(null);
  const controlRef = useRef<TransformControlsImpl | null>(null);
  const initialPartPositions = useRef<Map<string, THREE.Vector3>>(new Map());
  const initialPartRotations = useRef<Map<string, THREE.Quaternion>>(new Map());
  const initialGroupQuaternion = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const initialCabinetCenter = useRef<THREE.Vector3>(new THREE.Vector3());
  const isDraggingRef = useRef(false);

  // Preview state - stores calculated transforms without updating store
  const previewTransformsRef = useRef<Map<string, { position: [number, number, number]; rotation: [number, number, number] }>>(new Map());
  const [previewVersion, setPreviewVersion] = useState(0);

  // Calculate cabinet center
  const cabinetCenter = useMemo(() => {
    if (parts.length === 0) return new THREE.Vector3(0, 0, 0);
    const sum = new THREE.Vector3();
    parts.forEach(p => {
      sum.add(new THREE.Vector3().fromArray(p.position));
    });
    sum.divideScalar(parts.length);
    return sum;
  }, [parts]);

  const rotationSnap = transformMode === 'rotate' && isShiftPressed
    ? THREE.MathUtils.degToRad(SCENE_CONFIG.ROTATION_SNAP_DEGREES)
    : undefined;

  // Get current drag axis from TransformControls
  const getDragAxis = useCallback((): 'X' | 'Y' | 'Z' | null => {
    const controls = controlRef.current;
    if (!controls) return null;
    const axis = (controls as unknown as { axis: string | null }).axis;
    if (axis === 'X' || axis === 'Y' || axis === 'Z') return axis;
    return null;
  }, []);

  // Calculate preview transforms - called on change, updates refs only
  const calculatePreviewTransforms = useCallback(() => {
    const group = target;
    if (!group || !isDraggingRef.current) return;

    // Calculate delta rotation from initial state
    const deltaQuat = group.quaternion.clone().multiply(initialGroupQuaternion.current.clone().invert());

    // Start with frozen cabinet center
    let pivotPoint = initialCabinetCenter.current.clone();
    const groupTranslation = group.position.clone().sub(initialCabinetCenter.current);
    pivotPoint = pivotPoint.add(groupTranslation);

    // Apply snap for translate mode (only on the dragged axis)
    if (transformMode === 'translate') {
      const axis = getDragAxis();

      if (axis) {
        if (snapEnabled) {
          let snapResult;
          const positionOffset: [number, number, number] = [
            groupTranslation.x,
            groupTranslation.y,
            groupTranslation.z,
          ];

          // Use V2 snapping for bounding box based snapping, V1 for face-to-face
          if (snapSettings.version === 'v2') {
            // V2: Group bounding box based snapping
            const cabinet = allCabinets.find((c) => c.id === cabinetId);
            if (cabinet) {
              snapResult = calculateCabinetSnapV2(
                cabinet,
                positionOffset,
                allParts,
                allCabinets,
                snapSettings,
                axis
              );
            }
          } else {
            // V1: Individual part face snapping using cabinet bounds
            const cabinetBounds = calculateCabinetBounds(parts);
            if (cabinetBounds) {
              // Update bounds position based on group translation
              cabinetBounds.position = [
                cabinetBounds.position[0] + groupTranslation.x,
                cabinetBounds.position[1] + groupTranslation.y,
                cabinetBounds.position[2] + groupTranslation.z,
              ];

              const otherParts = allParts.filter(
                (p) => p.cabinetMetadata?.cabinetId !== cabinetId
              );

              snapResult = calculateSnapSimple(
                cabinetBounds,
                cabinetBounds.position,
                otherParts,
                snapSettings,
                axis
              );
            }
          }

          if (snapResult?.snapped && snapResult.snapPoints.length > 0) {
            // Apply snap offset ONLY on the drag axis
            const axisIndex = axis === 'X' ? 0 : axis === 'Y' ? 1 : 2;

            // For V2, the snapResult.position is the final position, calculate offset
            const currentPos = [
              initialCabinetCenter.current.x + groupTranslation.x,
              initialCabinetCenter.current.y + groupTranslation.y,
              initialCabinetCenter.current.z + groupTranslation.z,
            ];
            const snapOffset = snapResult.position[axisIndex] - currentPos[axisIndex];

            if (axisIndex === 0) pivotPoint.x += snapOffset;
            else if (axisIndex === 1) pivotPoint.y += snapOffset;
            else pivotPoint.z += snapOffset;

            group.position.copy(pivotPoint);
            setSnapPoints(snapResult.snapPoints);
          } else {
            clearSnapPoints();
          }
        }

        // Calculate dimension lines
        if (dimensionSettings.enabled) {
          setActiveAxis(axis);

          const offset: [number, number, number] = [
            pivotPoint.x - initialCabinetCenter.current.x,
            pivotPoint.y - initialCabinetCenter.current.y,
            pivotPoint.z - initialCabinetCenter.current.z,
          ];

          const movingBounds = getCabinetBoundingBoxWithOffset(cabinetId, allParts, offset);

          if (movingBounds) {
            const excludePartIds = new Set(parts.map((p) => p.id));
            const excludeCabinetIds = new Set([cabinetId]);

            const otherBounds = getOtherBoundingBoxes(
              excludePartIds,
              excludeCabinetIds,
              allParts,
              allCabinets
            );

            const dimensions = calculateDimensions(
              movingBounds,
              otherBounds,
              axis,
              dimensionSettings
            );

            setDimensionLines(dimensions);
          }
        }
      }
    }

    // Calculate preview transforms for all parts (no store update!)
    const newTransforms = new Map<string, { position: [number, number, number]; rotation: [number, number, number] }>();

    parts.forEach(part => {
      const relativePos = initialPartPositions.current.get(part.id);
      const originalRot = initialPartRotations.current.get(part.id);
      if (relativePos && originalRot) {
        const newPos = relativePos.clone().applyQuaternion(deltaQuat).add(pivotPoint);
        const newRotQuat = new THREE.Quaternion().multiplyQuaternions(deltaQuat, originalRot);
        const newRot = new THREE.Euler().setFromQuaternion(newRotQuat, 'XYZ');

        newTransforms.set(part.id, {
          position: newPos.toArray() as [number, number, number],
          rotation: [newRot.x, newRot.y, newRot.z] as [number, number, number],
        });
      }
    });

    // Update preview ref and trigger re-render
    previewTransformsRef.current = newTransforms;
    setPreviewVersion(v => v + 1);
  }, [parts, target, transformMode, snapEnabled, snapSettings, dimensionSettings, allParts, allCabinets, cabinetId, setSnapPoints, clearSnapPoints, setDimensionLines, setActiveAxis, getDragAxis]);

  const handleTransformStart = useCallback(() => {
    if (!target) return;

    isDraggingRef.current = true;

    // Freeze cabinet center at start of transform
    initialCabinetCenter.current.copy(cabinetCenter);

    target.position.copy(initialCabinetCenter.current);
    target.rotation.set(0, 0, 0);
    target.updateMatrixWorld();

    // Save initial group quaternion (should be identity)
    initialGroupQuaternion.current.copy(target.quaternion);

    // Capture initial state for each part
    initialPartPositions.current.clear();
    initialPartRotations.current.clear();

    parts.forEach(part => {
      const partPos = new THREE.Vector3().fromArray(part.position);
      const relativePos = partPos.clone().sub(initialCabinetCenter.current);
      initialPartPositions.current.set(part.id, relativePos);

      const partRot = new THREE.Euler(part.rotation[0], part.rotation[1], part.rotation[2], 'XYZ');
      const partQuat = new THREE.Quaternion().setFromEuler(partRot);
      initialPartRotations.current.set(part.id, partQuat);
    });

    // Initialize preview transforms
    const initialTransforms = new Map<string, { position: [number, number, number]; rotation: [number, number, number] }>();
    parts.forEach(part => {
      initialTransforms.set(part.id, {
        position: [...part.position],
        rotation: [...part.rotation],
      });
    });
    previewTransformsRef.current = initialTransforms;

    setIsTransforming(true);
    setTransformingCabinetId(cabinetId); // Hide original parts, show preview

    const beforeState: Record<string, PartTransform> = {};
    parts.forEach(p => {
      beforeState[p.id] = { position: [...p.position], rotation: [...p.rotation] };
    });
    beginBatch('TRANSFORM_CABINET', {
      targetId: cabinetId,
      before: beforeState,
    });

    setPreviewVersion(v => v + 1);
  }, [setIsTransforming, setTransformingCabinetId, parts, beginBatch, cabinetId, cabinetCenter, target]);

  const handleTransformEnd = useCallback(() => {
    isDraggingRef.current = false;

    const group = target;
    if (!group) {
      setTransformingCabinetId(null);
      setIsTransforming(false);
      return;
    }

    clearSnapPoints();
    clearDimensionLines();

    // Get final transforms from preview ref
    const updates: Array<{ id: string; patch: Partial<Part> }> = [];
    previewTransformsRef.current.forEach((transform, partId) => {
      updates.push({
        id: partId,
        patch: {
          position: transform.position,
          rotation: transform.rotation,
        },
      });
    });

    // PERFORMANCE: Single batch update on mouseUp (not during drag)
    if (updates.length > 0) {
      updatePartsBatch(updates);
    }

    // Build afterState for history
    const afterState: Record<string, PartTransform> = {};
    previewTransformsRef.current.forEach((transform, partId) => {
      afterState[partId] = { position: transform.position, rotation: transform.rotation };
    });

    commitBatch({ after: afterState });
    setTransformingCabinetId(null); // Show original parts again
    setIsTransforming(false);
    detectCollisions();

    // Clear preview
    previewTransformsRef.current.clear();
  }, [target, setIsTransforming, setTransformingCabinetId, commitBatch, detectCollisions, clearSnapPoints, clearDimensionLines, updatePartsBatch]);

  // Get current preview state
  const isShowingPreview = isDraggingRef.current && previewTransformsRef.current.size > 0;

  return (
    <>
      {/* Preview meshes during drag (looks identical to original parts) */}
      {isShowingPreview && parts.map(part => {
        const transform = previewTransformsRef.current.get(part.id);
        if (!transform) return null;
        return (
          <PreviewPartMesh
            key={`preview-${part.id}`}
            part={part}
            previewPosition={transform.position}
            previewRotation={transform.rotation}
          />
        );
      })}

      {/* Proxy group for controls */}
      <group ref={setTarget} position={cabinetCenter} />

      {/* Conditionally render controls when target is ready */}
      {target && (transformMode === 'translate' || transformMode === 'rotate') && (
        <TransformControls
          ref={controlRef}
          object={target}
          mode={transformMode}
          onMouseDown={handleTransformStart}
          onChange={calculatePreviewTransforms}
          onMouseUp={handleTransformEnd}
          rotationSnap={rotationSnap}
        />
      )}
    </>
  );
}
