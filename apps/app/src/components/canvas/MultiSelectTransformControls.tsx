"use client";

/**
 * MultiSelectTransformControls Component
 *
 * Handles translate/rotate for multiple selected parts.
 * PERFORMANCE: Uses ref-based preview - no store updates during drag.
 * Preview meshes are rendered for all selected parts during transform.
 */

import { useRef, useEffect, useMemo, useCallback, useState } from "react";
import { TransformControls } from "@react-three/drei";
import { useStore, useMaterial, useSelectedParts } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import * as THREE from "three";
import { Part, TransformSpace } from "@/types";
import { SCENE_CONFIG, PART_CONFIG, MATERIAL_CONFIG } from "@/lib/config";
import { useSnapContext } from "@/lib/snap-context";
import { useDimensionContext } from "@/lib/dimension-context";
import { useTransformAxisConstraints } from "@/hooks/useOrthographicConstraints";
import { calculatePartSnapV3 } from "@/lib/snapping-v3";
import { calculateDimensions } from "@/lib/dimension-calculator";
import {
  getMultiselectBoundingBoxWithOffset,
  getOtherBoundingBoxes,
} from "@/lib/bounding-box-utils";
import type { TransformControls as TransformControlsImpl } from "three-stdlib";

type PartTransform = Pick<Part, "position" | "rotation">;

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
    <mesh position={previewPosition} rotation={previewRotation} castShadow receiveShadow>
      <boxGeometry args={[part.width, part.height, part.depth]} />
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

interface MultiSelectTransformControlsProps {
  mode: "translate" | "rotate";
  space?: TransformSpace;
  onTransformStart: () => void;
  onTransformEnd: () => void;
}

export function MultiSelectTransformControls({
  mode,
  space = "world",
  onTransformStart,
  onTransformEnd,
}: MultiSelectTransformControlsProps) {
  const { setSnapPoints, clearSnapPoints } = useSnapContext();
  const { setDimensionLines, clearDimensionLines, setActiveAxis } = useDimensionContext();

  // Get axis constraints for orthographic view
  const axisConstraints = useTransformAxisConstraints(mode);

  // Get selected parts
  const selectedParts = useSelectedParts();

  // Get all parts for snap calculations
  const allParts = useStore((state) => state.parts);

  // Get all cabinets for dimension calculations
  const allCabinets = useStore((state) => state.cabinets);

  const {
    updatePartsBatch,
    setIsTransforming,
    setTransformingPartIds,
    selectedPartIds,
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
      setIsTransforming: state.setIsTransforming,
      setTransformingPartIds: state.setTransformingPartIds,
      selectedPartIds: state.selectedPartIds,
      beginBatch: state.beginBatch,
      commitBatch: state.commitBatch,
      isShiftPressed: state.isShiftPressed,
      detectCollisions: state.detectCollisions,
      snapEnabled: state.snapEnabled,
      snapSettings: state.snapSettings,
      dimensionSettings: state.dimensionSettings,
    }))
  );

  const parts = selectedParts;

  const [target, setTarget] = useState<THREE.Group | null>(null);
  const controlRef = useRef<TransformControlsImpl | null>(null);

  // Effective space for TransformControls
  const effectiveSpace = mode === "translate" ? space : "local";

  // Update TransformControls space directly on every render
  // (drei's TransformControls doesn't properly react to space prop changes)
  useEffect(() => {
    if (controlRef.current) {
      controlRef.current.setSpace(effectiveSpace);
    }
  });
  const initialPartPositions = useRef<Map<string, THREE.Vector3>>(new Map());
  const initialPartRotations = useRef<Map<string, THREE.Quaternion>>(new Map());
  const initialGroupQuaternion = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const initialSelectionCenter = useRef<THREE.Vector3>(new THREE.Vector3());
  const isDraggingRef = useRef(false);

  // Preview state - stores calculated transforms without updating store
  const previewTransformsRef = useRef<
    Map<string, { position: [number, number, number]; rotation: [number, number, number] }>
  >(new Map());
  const [previewVersion, setPreviewVersion] = useState(0);

  // Calculate selection center
  const selectionCenter = useMemo(() => {
    if (parts.length === 0) return new THREE.Vector3(0, 0, 0);
    const sum = new THREE.Vector3();
    parts.forEach((p) => {
      sum.add(new THREE.Vector3().fromArray(p.position));
    });
    sum.divideScalar(parts.length);
    return sum;
  }, [parts]);

  const rotationSnap =
    mode === "rotate" && isShiftPressed
      ? THREE.MathUtils.degToRad(SCENE_CONFIG.ROTATION_SNAP_DEGREES)
      : undefined;

  // Get current drag axis from TransformControls
  const getDragAxis = useCallback((): "X" | "Y" | "Z" | null => {
    const controls = controlRef.current;
    if (!controls) return null;
    const axis = (controls as unknown as { axis: string | null }).axis;
    if (axis === "X" || axis === "Y" || axis === "Z") return axis;
    return null;
  }, []);

  // Calculate preview transforms - called on change, updates refs only
  const calculatePreviewTransforms = useCallback(() => {
    const group = target;
    if (!group || !isDraggingRef.current) return;

    // Calculate delta rotation from initial state
    const deltaQuat = group.quaternion
      .clone()
      .multiply(initialGroupQuaternion.current.clone().invert());

    // Start with frozen selection center
    let pivotPoint = initialSelectionCenter.current.clone();
    const groupTranslation = group.position.clone().sub(initialSelectionCenter.current);
    pivotPoint = pivotPoint.add(groupTranslation);

    // Apply snap for translate mode (only on the dragged axis)
    if (mode === "translate") {
      const axis = getDragAxis();

      if (axis) {
        if (snapEnabled && parts.length > 0) {
          // Use the first part in selection as reference for snapping
          const referencePart = parts[0];

          // Create a virtual position for the reference part after translation
          const translatedPosition: [number, number, number] = [
            referencePart.position[0] + groupTranslation.x,
            referencePart.position[1] + groupTranslation.y,
            referencePart.position[2] + groupTranslation.z,
          ];

          // Exclude selected parts from snap targets
          const selectedIds = new Set(parts.map((p) => p.id));
          const otherParts = allParts.filter((p) => !selectedIds.has(p.id));

          const snapResult = calculatePartSnapV3(
            referencePart,
            translatedPosition,
            otherParts,
            allCabinets,
            snapSettings,
            axis
          );

          if (snapResult.snapped && snapResult.snapPoints.length > 0) {
            // Apply snap offset ONLY on the drag axis
            const axisIndex = axis === "X" ? 0 : axis === "Y" ? 1 : 2;
            const snapOffset = snapResult.position[axisIndex] - translatedPosition[axisIndex];

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
            pivotPoint.x - initialSelectionCenter.current.x,
            pivotPoint.y - initialSelectionCenter.current.y,
            pivotPoint.z - initialSelectionCenter.current.z,
          ];

          const movingBounds = getMultiselectBoundingBoxWithOffset(
            selectedPartIds,
            allParts,
            offset
          );

          if (movingBounds) {
            const excludePartIds = selectedPartIds;
            const excludeCabinetIds = new Set<string>();

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
    const newTransforms = new Map<
      string,
      { position: [number, number, number]; rotation: [number, number, number] }
    >();

    parts.forEach((part) => {
      const relativePos = initialPartPositions.current.get(part.id);
      const originalRot = initialPartRotations.current.get(part.id);
      if (relativePos && originalRot) {
        const newPos = relativePos.clone().applyQuaternion(deltaQuat).add(pivotPoint);
        const newRotQuat = new THREE.Quaternion().multiplyQuaternions(deltaQuat, originalRot);
        const newRot = new THREE.Euler().setFromQuaternion(newRotQuat, "XYZ");

        newTransforms.set(part.id, {
          position: newPos.toArray() as [number, number, number],
          rotation: [newRot.x, newRot.y, newRot.z] as [number, number, number],
        });
      }
    });

    // Update preview ref and trigger re-render
    previewTransformsRef.current = newTransforms;
    setPreviewVersion((v) => v + 1);
  }, [
    parts,
    target,
    mode,
    snapEnabled,
    snapSettings,
    dimensionSettings,
    allParts,
    allCabinets,
    selectedPartIds,
    setSnapPoints,
    clearSnapPoints,
    setDimensionLines,
    setActiveAxis,
    getDragAxis,
  ]);

  const handleTransformStart = useCallback(() => {
    if (!target) return;

    isDraggingRef.current = true;

    // Freeze selection center at start of transform
    initialSelectionCenter.current.copy(selectionCenter);

    target.position.copy(initialSelectionCenter.current);
    target.rotation.set(0, 0, 0);
    target.updateMatrixWorld();

    // Save initial group quaternion (should be identity)
    initialGroupQuaternion.current.copy(target.quaternion);

    // Capture initial state for each part
    initialPartPositions.current.clear();
    initialPartRotations.current.clear();

    parts.forEach((part) => {
      const partPos = new THREE.Vector3().fromArray(part.position);
      const relativePos = partPos.clone().sub(initialSelectionCenter.current);
      initialPartPositions.current.set(part.id, relativePos);

      const partRot = new THREE.Euler(part.rotation[0], part.rotation[1], part.rotation[2], "XYZ");
      const partQuat = new THREE.Quaternion().setFromEuler(partRot);
      initialPartRotations.current.set(part.id, partQuat);
    });

    // Initialize preview transforms
    const initialTransforms = new Map<
      string,
      { position: [number, number, number]; rotation: [number, number, number] }
    >();
    parts.forEach((part) => {
      initialTransforms.set(part.id, {
        position: [...part.position],
        rotation: [...part.rotation],
      });
    });
    previewTransformsRef.current = initialTransforms;

    setIsTransforming(true);
    setTransformingPartIds(selectedPartIds); // Hide original parts, show preview

    // Record history - use first part ID as targetId, store all parts in before state
    const beforeState: Record<string, PartTransform> = {};
    parts.forEach((p) => {
      beforeState[p.id] = { position: [...p.position], rotation: [...p.rotation] };
    });
    beginBatch("TRANSFORM_MULTISELECT", {
      targetId: `multiselect-${parts.length}`,
      before: beforeState,
    });

    setPreviewVersion((v) => v + 1);
    onTransformStart();
  }, [
    setIsTransforming,
    setTransformingPartIds,
    parts,
    beginBatch,
    selectionCenter,
    target,
    selectedPartIds,
    onTransformStart,
  ]);

  const handleTransformEnd = useCallback(() => {
    isDraggingRef.current = false;

    const group = target;
    if (!group) {
      setTransformingPartIds(new Set());
      setIsTransforming(false);
      onTransformEnd();
      return;
    }

    clearSnapPoints();
    clearDimensionLines();

    // Get final transforms from preview ref
    const updates: Array<{ id: string; patch: Partial<Part> }> = [];
    const afterState: Record<string, PartTransform> = {};

    previewTransformsRef.current.forEach((transform, partId) => {
      updates.push({
        id: partId,
        patch: {
          position: transform.position,
          rotation: transform.rotation,
        },
      });
      afterState[partId] = { position: transform.position, rotation: transform.rotation };
    });

    // PERFORMANCE: Single batch update on mouseUp (not during drag)
    if (updates.length > 0) {
      updatePartsBatch(updates);
    }

    commitBatch({
      after: afterState,
    });

    // Reset group position for next drag
    group.position.copy(selectionCenter);
    group.rotation.set(0, 0, 0);

    setTransformingPartIds(new Set()); // Show original parts again
    setIsTransforming(false);
    onTransformEnd();
    detectCollisions();
  }, [
    target,
    updatePartsBatch,
    commitBatch,
    selectionCenter,
    setIsTransforming,
    setTransformingPartIds,
    onTransformEnd,
    detectCollisions,
    clearSnapPoints,
    clearDimensionLines,
  ]);

  // Handle change during drag
  const handleChange = useCallback(() => {
    calculatePreviewTransforms();
  }, [calculatePreviewTransforms]);

  // Sync target position when selection changes
  useEffect(() => {
    if (target && !isDraggingRef.current) {
      target.position.copy(selectionCenter);
      target.rotation.set(0, 0, 0);
    }
  }, [target, selectionCenter]);

  // Get preview transform for a part
  const getPreviewTransform = (partId: string) => {
    const preview = previewTransformsRef.current.get(partId);
    if (preview) return preview;
    const part = parts.find((p) => p.id === partId);
    if (part) {
      return { position: part.position, rotation: part.rotation };
    }
    return {
      position: [0, 0, 0] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
    };
  };

  if (parts.length < 2) {
    return null;
  }

  return (
    <>
      {/* Target group that TransformControls operates on */}
      <group ref={setTarget} position={selectionCenter.toArray()} rotation={[0, 0, 0]} />

      {/* Preview meshes for all selected parts */}
      {parts.map((part) => {
        const transform = getPreviewTransform(part.id);
        return (
          <PreviewPartMesh
            key={`preview-${part.id}-${previewVersion}`}
            part={part}
            previewPosition={transform.position}
            previewRotation={transform.rotation}
          />
        );
      })}

      {target && (
        <TransformControls
          ref={controlRef}
          object={target}
          mode={mode}
          space={effectiveSpace}
          onMouseDown={handleTransformStart}
          onChange={handleChange}
          onMouseUp={handleTransformEnd}
          rotationSnap={rotationSnap}
          showX={axisConstraints.showX}
          showY={axisConstraints.showY}
          showZ={axisConstraints.showZ}
        />
      )}
    </>
  );
}
