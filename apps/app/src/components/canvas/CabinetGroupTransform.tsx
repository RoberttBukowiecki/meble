"use client";

/**
 * CabinetGroupTransform Component
 *
 * Handles translate/rotate for cabinet groups.
 * PERFORMANCE: Uses ref-based preview - no store updates during drag.
 * Preview meshes are rendered for all cabinet parts during transform.
 */

import { useRef, useEffect, useMemo, useCallback, useState } from "react";
import { TransformControls } from "@react-three/drei";
import { useStore, useMaterial } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import * as THREE from "three";
import { Part, KitchenCabinetParams, TransformSpace } from "@/types";
import type { LegData } from "@/types";
import type { CountertopSegment, CountertopGroup } from "@/types/countertop";
import { isBodyPartRole } from "@/types/cabinet";
import { CabinetTransformDomain } from "@/lib/domain";
import { SCENE_CONFIG, PART_CONFIG, MATERIAL_CONFIG, COUNTERTOP_DEFAULTS } from "@/lib/config";
import { useSnapContext } from "@/lib/snap-context";
import { useDimensionContext } from "@/lib/dimension-context";
import { calculateCabinetSnapV2 } from "@/lib/snapping-v2";
import { calculateDimensions } from "@/lib/dimension-calculator";
import { getCabinetBoundingBoxWithOffset, getOtherBoundingBoxes } from "@/lib/bounding-box-utils";
import { useTransformAxisConstraints } from "@/hooks/useOrthographicConstraints";
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
        emissive={PART_CONFIG.CABINET_SELECTION_EMISSIVE_COLOR}
        emissiveIntensity={PART_CONFIG.CABINET_SELECTION_EMISSIVE_INTENSITY}
      />
    </mesh>
  );
}

// ============================================================================
// Preview Countertop Mesh Component
// ============================================================================

interface PreviewCountertopMeshProps {
  position: [number, number, number];
  rotation: [number, number, number];
  dimensions: { width: number; height: number; depth: number };
  color: string;
}

function PreviewCountertopMesh({
  position,
  rotation,
  dimensions,
  color,
}: PreviewCountertopMeshProps) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={[dimensions.width, dimensions.height, dimensions.depth]} />
      <meshStandardMaterial
        color={color}
        emissive={PART_CONFIG.CABINET_SELECTION_EMISSIVE_COLOR}
        emissiveIntensity={PART_CONFIG.CABINET_SELECTION_EMISSIVE_INTENSITY}
      />
    </mesh>
  );
}

// ============================================================================
// Preview Leg Mesh Component
// ============================================================================

interface PreviewLegMeshProps {
  leg: LegData;
  groupPosition: [number, number, number];
  groupRotation: THREE.Euler;
}

/**
 * Single leg preview mesh - transforms leg position based on group transform
 */
function PreviewLegMesh({ leg, groupPosition, groupRotation }: PreviewLegMeshProps) {
  const { position, shape, color, height, diameter } = leg;

  const worldPos = useMemo(() => {
    const legCenterY = height / 2;
    const rotationQuat = new THREE.Quaternion().setFromEuler(groupRotation);
    const localPos = new THREE.Vector3(position.x, legCenterY, position.z);
    localPos.applyQuaternion(rotationQuat);

    return [
      groupPosition[0] + localPos.x,
      groupPosition[1] + localPos.y,
      groupPosition[2] + localPos.z,
    ] as [number, number, number];
  }, [position.x, position.z, height, groupPosition, groupRotation]);

  const rotation: [number, number, number] = useMemo(
    () => [groupRotation.x, groupRotation.y, groupRotation.z],
    [groupRotation.x, groupRotation.y, groupRotation.z]
  );

  const radius = diameter / 2;

  return (
    <mesh position={worldPos} rotation={rotation}>
      {shape === "ROUND" ? (
        <cylinderGeometry args={[radius, radius, height, 16]} />
      ) : (
        <boxGeometry args={[diameter, height, diameter]} />
      )}
      <meshStandardMaterial
        color={color}
        metalness={shape === "ROUND" ? 0.3 : 0.1}
        roughness={0.7}
        emissive={PART_CONFIG.CABINET_SELECTION_EMISSIVE_COLOR}
        emissiveIntensity={PART_CONFIG.CABINET_SELECTION_EMISSIVE_INTENSITY}
      />
    </mesh>
  );
}

// ============================================================================
// Preview Legs Group Component
// ============================================================================

interface PreviewLegsProps {
  legs: LegData[];
  parts: Part[];
  previewTransforms: Map<
    string,
    { position: [number, number, number]; rotation: [number, number, number] }
  >;
  groupRotation: THREE.Euler;
}

/**
 * Renders all legs preview during cabinet transformation.
 * Uses geometric bounds (true center) instead of position average.
 */
function PreviewLegs({ legs, parts, previewTransforms, groupRotation }: PreviewLegsProps) {
  const legsAnchor = useMemo(() => {
    // Use geometric bounds for correct positioning at all rotations
    const bounds = CabinetTransformDomain.getCabinetGeometricBoundsFromPreview(
      parts,
      previewTransforms
    );
    return CabinetTransformDomain.getLegsAnchorPoint(bounds);
  }, [parts, previewTransforms]);

  return (
    <>
      {legs.map((leg) => (
        <PreviewLegMesh
          key={`preview-leg-${leg.index}`}
          leg={leg}
          groupPosition={legsAnchor.position}
          groupRotation={groupRotation}
        />
      ))}
    </>
  );
}

// ============================================================================
// Countertop Preview Calculation
// ============================================================================

interface CountertopPreviewData {
  position: [number, number, number];
  rotation: [number, number, number];
  dimensions: { width: number; height: number; depth: number };
  color: string;
}

/**
 * Calculate countertop preview data based on preview part transforms.
 * Uses LOCAL dimensions from cabinet params (rotation-invariant) to prevent size changes on rotation.
 */
function calculateCountertopPreview(
  segment: CountertopSegment,
  group: CountertopGroup,
  previewTransforms: Map<
    string,
    { position: [number, number, number]; rotation: [number, number, number] }
  >,
  parts: Part[],
  cabinets: { id: string; params: KitchenCabinetParams }[],
  materials: { id: string; color: string }[],
  groupRotation: THREE.Euler
): CountertopPreviewData | null {
  // Get cabinets for this segment
  const segmentCabinets = cabinets.filter((c) => segment.cabinetIds.includes(c.id));
  if (segmentCabinets.length === 0) return null;

  // Get segment parts for preview bounds
  const segmentParts = parts.filter((p) =>
    segmentCabinets.some((c) => p.cabinetMetadata?.cabinetId === c.id)
  );

  if (segmentParts.length === 0) return null;

  // Calculate LOCAL dimensions from cabinet params (rotation-invariant!)
  // Sum widths for all cabinets, use max depth
  let totalLocalWidth = 0;
  let maxLocalDepth = 0;
  for (const cabinet of segmentCabinets) {
    totalLocalWidth += cabinet.params.width;
    maxLocalDepth = Math.max(maxLocalDepth, cabinet.params.depth);
  }

  // Calculate world-space bounds from preview transforms for positioning only
  // Must use rotation-aware extent calculation since parts are rotated
  let minX = Infinity,
    maxX = -Infinity;
  let minZ = Infinity,
    maxZ = -Infinity;
  let maxY = -Infinity;

  for (const part of segmentParts) {
    const transform = previewTransforms.get(part.id);
    if (!transform) continue;

    const [px, py, pz] = transform.position;

    // Calculate rotation-aware world extents
    const rotationQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(transform.rotation[0], transform.rotation[1], transform.rotation[2])
    );

    const halfW = part.width / 2;
    const halfH = part.height / 2;
    const halfD = part.depth / 2;

    // Transform extent vectors by part's rotation to get world-space extents
    const extentX = new THREE.Vector3(halfW, 0, 0).applyQuaternion(rotationQuat);
    const extentY = new THREE.Vector3(0, halfH, 0).applyQuaternion(rotationQuat);
    const extentZ = new THREE.Vector3(0, 0, halfD).applyQuaternion(rotationQuat);

    // Calculate world-space half dimensions (max extent in each axis)
    const worldHalfW = Math.abs(extentX.x) + Math.abs(extentY.x) + Math.abs(extentZ.x);
    const worldHalfH = Math.abs(extentX.y) + Math.abs(extentY.y) + Math.abs(extentZ.y);
    const worldHalfD = Math.abs(extentX.z) + Math.abs(extentY.z) + Math.abs(extentZ.z);

    minX = Math.min(minX, px - worldHalfW);
    maxX = Math.max(maxX, px + worldHalfW);
    minZ = Math.min(minZ, pz - worldHalfD);
    maxZ = Math.max(maxZ, pz + worldHalfD);
    maxY = Math.max(maxY, py + worldHalfH);
  }

  // If no valid bounds, skip
  if (!isFinite(minX) || !isFinite(maxX)) return null;

  // Get material for thickness and color
  const material = materials.find((m) => m.id === group.materialId);
  const materialThickness = (material as any)?.thickness ?? segment.thickness;
  const color = material?.color || MATERIAL_CONFIG.DEFAULT_MATERIAL_COLOR;

  // Use LOCAL dimensions for countertop size (don't change with rotation!)
  const countertopWidth = totalLocalWidth + segment.overhang.left + segment.overhang.right;
  const countertopDepth = maxLocalDepth + segment.overhang.front + segment.overhang.back;

  // Calculate world position from bounds center
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const topY = maxY + materialThickness / 2;

  // Calculate overhang offset in LOCAL space
  const localOffsetX = (segment.overhang.right - segment.overhang.left) / 2;
  const localOffsetZ = (segment.overhang.front - segment.overhang.back) / 2;

  // Transform offset to world space using cabinet rotation
  const rotationQuat = new THREE.Quaternion().setFromEuler(groupRotation);
  const localOffset = new THREE.Vector3(localOffsetX, 0, localOffsetZ);
  localOffset.applyQuaternion(rotationQuat);

  return {
    position: [centerX + localOffset.x, topY, centerZ + localOffset.z],
    rotation: [groupRotation.x, groupRotation.y, groupRotation.z],
    dimensions: {
      width: countertopWidth,
      height: materialThickness,
      depth: countertopDepth,
    },
    color,
  };
}

// ============================================================================
// Main Component
// ============================================================================

export function CabinetGroupTransform({
  cabinetId,
  space = "world",
}: {
  cabinetId: string;
  space?: TransformSpace;
}) {
  const { setSnapPoints, clearSnapPoints } = useSnapContext();
  const { setDimensionLines, clearDimensionLines, setActiveAxis } = useDimensionContext();

  // Get transform mode from store for axis constraints
  const storeTransformMode = useStore((state) => state.transformMode);
  const orthoConstraints = useTransformAxisConstraints(
    storeTransformMode === "resize" ? "translate" : storeTransformMode
  );

  // For cabinets, rotation is restricted to Y axis only (no tilting)
  const axisConstraints =
    storeTransformMode === "rotate"
      ? { showX: false, showY: true, showZ: false }
      : orthoConstraints;

  // Get cabinet parts using useShallow
  const cabinetParts = useStore(
    useShallow((state) => state.parts.filter((p) => p.cabinetMetadata?.cabinetId === cabinetId))
  );

  // Get all parts for snap calculations
  const allParts = useStore((state) => state.parts);

  // Get all cabinets for dimension calculations
  const allCabinets = useStore((state) => state.cabinets);

  // Get countertop groups that contain this cabinet
  const countertopGroups = useStore(
    useShallow((state) =>
      state.countertopGroups.filter((g) =>
        g.segments.some((seg) => seg.cabinetIds.includes(cabinetId))
      )
    )
  );

  // Get current cabinet for legs
  const currentCabinet = useStore(
    useShallow((state) => state.cabinets.find((c) => c.id === cabinetId))
  );

  // Get materials for countertop color
  const materials = useStore((state) => state.materials);

  const {
    updatePartsBatch,
    updateCabinet,
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
      updateCabinet: state.updateCabinet,
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

  // Effective space for TransformControls
  const effectiveSpace = transformMode === "translate" ? space : "local";

  // Update TransformControls space directly on every render
  // (drei's TransformControls doesn't properly react to space prop changes)
  useEffect(() => {
    if (controlRef.current) {
      controlRef.current.setSpace(effectiveSpace);
    }
  });

  // Also update space after any transform operation ends
  const updateControlsSpace = useCallback(() => {
    requestAnimationFrame(() => {
      if (controlRef.current) {
        controlRef.current.setSpace(effectiveSpace);
      }
    });
  }, [effectiveSpace]);
  const initialPartPositions = useRef<Map<string, THREE.Vector3>>(new Map());
  const initialPartRotations = useRef<Map<string, THREE.Quaternion>>(new Map());
  const initialGroupQuaternion = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const initialCabinetCenter = useRef<THREE.Vector3>(new THREE.Vector3());
  const isDraggingRef = useRef(false);

  // Preview state - stores calculated transforms without updating store
  const previewTransformsRef = useRef<
    Map<string, { position: [number, number, number]; rotation: [number, number, number] }>
  >(new Map());
  const previewRotationRef = useRef<THREE.Euler>(new THREE.Euler());
  const [previewVersion, setPreviewVersion] = useState(0);

  // Calculate cabinet center
  const cabinetCenter = useMemo(() => {
    if (parts.length === 0) return new THREE.Vector3(0, 0, 0);
    const sum = new THREE.Vector3();
    parts.forEach((p) => {
      sum.add(new THREE.Vector3().fromArray(p.position));
    });
    sum.divideScalar(parts.length);
    return sum;
  }, [parts]);

  const rotationSnap =
    transformMode === "rotate" && isShiftPressed
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

    // Start with frozen cabinet center
    let pivotPoint = initialCabinetCenter.current.clone();
    const groupTranslation = group.position.clone().sub(initialCabinetCenter.current);
    pivotPoint = pivotPoint.add(groupTranslation);

    // Apply snap for translate mode (only on the dragged axis)
    if (transformMode === "translate") {
      const axis = getDragAxis();

      if (axis) {
        if (snapEnabled) {
          let snapResult;
          const positionOffset: [number, number, number] = [
            groupTranslation.x,
            groupTranslation.y,
            groupTranslation.z,
          ];

          // Use V2 snapping for cabinet groups (bounding box based)
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

          if (snapResult?.snapped && snapResult.snapPoints.length > 0) {
            // Apply snap offset ONLY on the drag axis
            const axisIndex = axis === "X" ? 0 : axis === "Y" ? 1 : 2;

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

    // Update preview rotation (cumulative rotation for countertop preview)
    // Get current cabinet's rotation and apply delta
    const currentCabinet = allCabinets.find((c) => c.id === cabinetId);
    const existingRotation = currentCabinet?.worldTransform?.rotation ?? [0, 0, 0];
    const existingQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(existingRotation[0], existingRotation[1], existingRotation[2], "XYZ")
    );
    const newRotQuat = deltaQuat.clone().multiply(existingQuat);
    previewRotationRef.current.setFromQuaternion(newRotQuat, "XYZ");

    setPreviewVersion((v) => v + 1);
  }, [
    parts,
    target,
    transformMode,
    snapEnabled,
    snapSettings,
    dimensionSettings,
    allParts,
    allCabinets,
    cabinetId,
    setSnapPoints,
    clearSnapPoints,
    setDimensionLines,
    setActiveAxis,
    getDragAxis,
  ]);

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

    parts.forEach((part) => {
      const partPos = new THREE.Vector3().fromArray(part.position);
      const relativePos = partPos.clone().sub(initialCabinetCenter.current);
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

    // Initialize preview rotation from cabinet's current worldTransform
    const currentCabinet = allCabinets.find((c) => c.id === cabinetId);
    const existingRotation = currentCabinet?.worldTransform?.rotation ?? [0, 0, 0];
    previewRotationRef.current.set(
      existingRotation[0],
      existingRotation[1],
      existingRotation[2],
      "XYZ"
    );

    setIsTransforming(true);
    setTransformingCabinetId(cabinetId); // Hide original parts, show preview

    const beforeState: Record<string, PartTransform> = {};
    parts.forEach((p) => {
      beforeState[p.id] = { position: [...p.position], rotation: [...p.rotation] };
    });
    beginBatch("TRANSFORM_CABINET", {
      targetId: cabinetId,
      before: beforeState,
    });

    setPreviewVersion((v) => v + 1);
  }, [
    setIsTransforming,
    setTransformingCabinetId,
    parts,
    beginBatch,
    cabinetId,
    cabinetCenter,
    target,
    allCabinets,
  ]);

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

    // Calculate and update cabinet worldTransform
    // Position: average of all part positions after transform
    // Rotation: from the group quaternion (what user dragged)
    const newCenterPos = new THREE.Vector3();
    previewTransformsRef.current.forEach((transform) => {
      newCenterPos.add(new THREE.Vector3().fromArray(transform.position));
    });
    if (previewTransformsRef.current.size > 0) {
      newCenterPos.divideScalar(previewTransformsRef.current.size);
    }

    // Get rotation from group (Euler angles to avoid gimbal lock)
    const groupEuler = new THREE.Euler().setFromQuaternion(group.quaternion, "XYZ");

    // Get current cabinet to read existing worldTransform rotation
    const currentCabinet = allCabinets.find((c) => c.id === cabinetId);
    const existingRotation = currentCabinet?.worldTransform?.rotation ?? [0, 0, 0];

    // For rotation: add delta rotation to existing rotation
    // Delta = group.quaternion * inverse(initialGroupQuaternion)
    const deltaQuat = group.quaternion
      .clone()
      .multiply(initialGroupQuaternion.current.clone().invert());
    const existingQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(existingRotation[0], existingRotation[1], existingRotation[2], "XYZ")
    );
    const newRotQuat = deltaQuat.multiply(existingQuat);
    const newRotEuler = new THREE.Euler().setFromQuaternion(newRotQuat, "XYZ");

    // Update cabinet with new worldTransform
    updateCabinet(cabinetId, {
      worldTransform: {
        position: [
          Math.round(newCenterPos.x),
          Math.round(newCenterPos.y),
          Math.round(newCenterPos.z),
        ] as [number, number, number],
        rotation: [newRotEuler.x, newRotEuler.y, newRotEuler.z] as [number, number, number],
      },
    });

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

    // Ensure space is correct after transform ends
    updateControlsSpace();
  }, [
    target,
    setIsTransforming,
    setTransformingCabinetId,
    commitBatch,
    detectCollisions,
    clearSnapPoints,
    clearDimensionLines,
    updatePartsBatch,
    updateCabinet,
    cabinetId,
    allCabinets,
    updateControlsSpace,
  ]);

  // Reset target rotation when cabinet changes to prevent state carryover
  useEffect(() => {
    if (target) {
      target.rotation.set(0, 0, 0);
      target.updateMatrixWorld();
    }
  }, [target, cabinetId]);

  // Get current preview state
  const isShowingPreview = isDraggingRef.current && previewTransformsRef.current.size > 0;

  return (
    <>
      {/* Preview meshes during drag (looks identical to original parts) */}
      {isShowingPreview &&
        parts.map((part) => {
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

      {/* Preview countertop meshes during drag */}
      {isShowingPreview &&
        countertopGroups.map((group) =>
          group.segments.map((segment) => {
            // Get cabinets for this segment
            const segmentCabinets = allCabinets
              .filter((c) => segment.cabinetIds.includes(c.id))
              .map((c) => ({ id: c.id, params: c.params as KitchenCabinetParams }));

            const previewData = calculateCountertopPreview(
              segment,
              group,
              previewTransformsRef.current,
              allParts,
              segmentCabinets,
              materials,
              previewRotationRef.current
            );

            if (!previewData) return null;

            return (
              <PreviewCountertopMesh
                key={`preview-countertop-${segment.id}`}
                position={previewData.position}
                rotation={previewData.rotation}
                dimensions={previewData.dimensions}
                color={previewData.color}
              />
            );
          })
        )}

      {/* Preview leg meshes during drag */}
      {isShowingPreview && currentCabinet?.legs && currentCabinet.legs.length > 0 && (
        <PreviewLegs
          legs={currentCabinet.legs}
          parts={parts}
          previewTransforms={previewTransformsRef.current}
          groupRotation={previewRotationRef.current}
        />
      )}

      {/* Proxy group for controls - explicit rotation={[0,0,0]} to prevent state carryover */}
      <group ref={setTarget} position={cabinetCenter} rotation={[0, 0, 0]} />

      {/* Conditionally render controls when target is ready */}
      {target && (transformMode === "translate" || transformMode === "rotate") && (
        <TransformControls
          ref={controlRef}
          object={target}
          mode={transformMode}
          space={effectiveSpace}
          onMouseDown={handleTransformStart}
          onChange={calculatePreviewTransforms}
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
