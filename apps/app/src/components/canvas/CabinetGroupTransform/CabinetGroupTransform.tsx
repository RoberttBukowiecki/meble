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
import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import * as THREE from "three";
import type { Part, KitchenCabinetParams, TransformSpace } from "@/types";
import { SCENE_CONFIG } from "@/lib/config";
import { getDragAxesFromControls, isPlanarDrag } from "@/lib/transform-utils";
import { useSnapContext, useWallSnapCache } from "@/lib/snap-context";
import { useDimensionContext } from "@/lib/dimension-context";
import { calculateCabinetSnapV2 } from "@/lib/snapping-v2";
import {
  calculateCabinetWallSnap,
  calculateMultiAxisWallSnap,
  createWallSnapBounds,
} from "@/lib/wall-snapping";
import { calculateDimensions } from "@/lib/dimension-calculator";
import { getCabinetBoundingBoxWithOffset, getOtherBoundingBoxes } from "@/lib/bounding-box-utils";
import { useTransformAxisConstraints } from "@/hooks/useOrthographicConstraints";
import type { TransformControls as TransformControlsImpl } from "three-stdlib";

// Local imports from split modules
import {
  PreviewPartMesh,
  PreviewCountertopMesh,
  PreviewLegs,
  type PreviewTransformMap,
} from "./CabinetPreviewMeshes";
import { calculateCountertopPreview } from "./countertopPreview";

// ============================================================================
// Types
// ============================================================================

type PartTransform = Pick<Part, "position" | "rotation">;

interface CabinetGroupTransformProps {
  cabinetId: string;
  space?: TransformSpace;
}

// ============================================================================
// Main Component
// ============================================================================

export function CabinetGroupTransform({ cabinetId, space = "world" }: CabinetGroupTransformProps) {
  // -------------------------------------------------------------------------
  // Context Hooks
  // -------------------------------------------------------------------------
  const { setSnapPoints, clearSnapPoints } = useSnapContext();
  const { wallSnapCacheRef } = useWallSnapCache();
  const { setDimensionLines, clearDimensionLines, setActiveAxis } = useDimensionContext();

  // -------------------------------------------------------------------------
  // Store Selectors
  // -------------------------------------------------------------------------
  const storeTransformMode = useStore((state) => state.transformMode);
  const orthoConstraints = useTransformAxisConstraints(
    storeTransformMode === "resize" ? "translate" : storeTransformMode
  );

  // For cabinets, rotation is restricted to Y axis only (no tilting)
  const axisConstraints =
    storeTransformMode === "rotate"
      ? { showX: false, showY: true, showZ: false }
      : orthoConstraints;

  const cabinetParts = useStore(
    useShallow((state) => state.parts.filter((p) => p.cabinetMetadata?.cabinetId === cabinetId))
  );

  const allParts = useStore((state) => state.parts);
  const allCabinets = useStore((state) => state.cabinets);
  const materials = useStore((state) => state.materials);

  const countertopGroups = useStore(
    useShallow((state) =>
      state.countertopGroups.filter((g) =>
        g.segments.some((seg) => seg.cabinetIds.includes(cabinetId))
      )
    )
  );

  const currentCabinet = useStore(
    useShallow((state) => state.cabinets.find((c) => c.id === cabinetId))
  );

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
    regenerateCountertopGroup,
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
      regenerateCountertopGroup: state.regenerateCountertopGroup,
    }))
  );

  // Alias for clarity
  const parts = cabinetParts;

  // -------------------------------------------------------------------------
  // Local State & Refs
  // -------------------------------------------------------------------------
  const [target, setTarget] = useState<THREE.Group | null>(null);
  const controlRef = useRef<TransformControlsImpl | null>(null);

  const initialPartPositions = useRef<Map<string, THREE.Vector3>>(new Map());
  const initialPartRotations = useRef<Map<string, THREE.Quaternion>>(new Map());
  const initialGroupQuaternion = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const initialCabinetCenter = useRef<THREE.Vector3>(new THREE.Vector3());
  const isDraggingRef = useRef(false);

  // Preview state - stores calculated transforms without updating store
  const previewTransformsRef = useRef<PreviewTransformMap>(new Map());
  const previewRotationRef = useRef<THREE.Euler>(new THREE.Euler());
  const [previewVersion, setPreviewVersion] = useState(0);

  // -------------------------------------------------------------------------
  // Derived Values
  // -------------------------------------------------------------------------
  const effectiveSpace = transformMode === "translate" ? space : "local";

  const cabinetCenter = useMemo(() => {
    if (parts.length === 0) return new THREE.Vector3(0, 0, 0);
    const sum = new THREE.Vector3();
    parts.forEach((p) => sum.add(new THREE.Vector3().fromArray(p.position)));
    sum.divideScalar(parts.length);
    return sum;
  }, [parts]);

  const cabinetRotation = useMemo((): [number, number, number] => {
    return currentCabinet?.worldTransform?.rotation ?? [0, 0, 0];
  }, [currentCabinet?.worldTransform?.rotation]);

  const rotationSnap =
    transformMode === "rotate" && isShiftPressed
      ? THREE.MathUtils.degToRad(SCENE_CONFIG.ROTATION_SNAP_DEGREES)
      : undefined;

  // -------------------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------------------

  // Update TransformControls space directly on every render
  useEffect(() => {
    if (controlRef.current) {
      controlRef.current.setSpace(effectiveSpace);
    }
  });

  // Sync target rotation with cabinet rotation when cabinet changes
  useEffect(() => {
    if (target && !isDraggingRef.current) {
      target.rotation.set(cabinetRotation[0], cabinetRotation[1], cabinetRotation[2]);
      target.updateMatrixWorld();
    }
  }, [target, cabinetId, cabinetRotation]);

  // -------------------------------------------------------------------------
  // Callbacks
  // -------------------------------------------------------------------------

  const updateControlsSpace = useCallback(() => {
    requestAnimationFrame(() => {
      if (controlRef.current) {
        controlRef.current.setSpace(effectiveSpace);
      }
    });
  }, [effectiveSpace]);

  /**
   * Apply snap logic and update pivot point based on drag axis.
   * Returns the updated pivot point.
   */
  const applySnapLogic = useCallback(
    (
      pivotPoint: THREE.Vector3,
      groupTranslation: THREE.Vector3,
      group: THREE.Group
    ): THREE.Vector3 => {
      const dragAxes = getDragAxesFromControls(controlRef.current);
      if (!dragAxes) return pivotPoint;

      const isMultiAxis = isPlanarDrag(dragAxes);
      const positionOffset: [number, number, number] = [
        groupTranslation.x,
        groupTranslation.y,
        groupTranslation.z,
      ];

      if (isMultiAxis) {
        // ===== MULTI-AXIS SNAP (planar drag) =====
        const wallCache = wallSnapCacheRef.current;
        const hasWallCache = wallCache.surfaces.length > 0;
        let hasSnapped = false;

        // Step 1: Try corner snap first (highest priority for XZ drag)
        if (dragAxes === "XZ" && snapSettings.wallSnap && snapSettings.cornerSnap && hasWallCache) {
          const cabinetBounds = getCabinetBoundingBoxWithOffset(cabinetId, allParts, [
            groupTranslation.x,
            groupTranslation.y,
            groupTranslation.z,
          ]);

          if (cabinetBounds) {
            const wallBounds = createWallSnapBounds(cabinetBounds.min, cabinetBounds.max);
            const wallSnapResult = calculateMultiAxisWallSnap(
              wallBounds,
              wallCache.surfaces,
              wallCache.corners,
              snapSettings
            );

            if (wallSnapResult.snapped && wallSnapResult.snappedToCorner) {
              pivotPoint.x += wallSnapResult.snapOffset[0];
              pivotPoint.z += wallSnapResult.snapOffset[2];
              group.position.copy(pivotPoint);
              clearSnapPoints();
              hasSnapped = true;
            }
          }
        }

        // Step 2: Try cabinet snap on each axis independently
        if (!hasSnapped) {
          const cabinet = allCabinets.find((c) => c.id === cabinetId);
          const currentPos = [
            initialCabinetCenter.current.x + groupTranslation.x,
            initialCabinetCenter.current.y + groupTranslation.y,
            initialCabinetCenter.current.z + groupTranslation.z,
          ];

          for (const axisChar of dragAxes) {
            if (axisChar !== "X" && axisChar !== "Y" && axisChar !== "Z") continue;
            const singleAxis = axisChar as "X" | "Y" | "Z";

            if (cabinet) {
              const snapResult = calculateCabinetSnapV2(
                cabinet,
                positionOffset,
                allParts,
                allCabinets,
                snapSettings,
                singleAxis
              );

              if (snapResult?.snapped && snapResult.snapPoints.length > 0) {
                const axisIndex = singleAxis === "X" ? 0 : singleAxis === "Y" ? 1 : 2;
                const snapOffset = snapResult.position[axisIndex] - currentPos[axisIndex];

                if (axisIndex === 0) pivotPoint.x += snapOffset;
                else if (axisIndex === 1) pivotPoint.y += snapOffset;
                else pivotPoint.z += snapOffset;

                positionOffset[axisIndex] += snapOffset;
                group.position.copy(pivotPoint);
                setSnapPoints(snapResult.snapPoints);
                hasSnapped = true;
              }
            }
          }
        }

        // Step 3: Try wall snap on each axis if no cabinet snap found
        if (!hasSnapped && snapSettings.wallSnap && wallSnapCacheRef.current.surfaces.length > 0) {
          const cabinetBounds = getCabinetBoundingBoxWithOffset(cabinetId, allParts, [
            groupTranslation.x,
            groupTranslation.y,
            groupTranslation.z,
          ]);

          if (cabinetBounds) {
            const wallBounds = createWallSnapBounds(cabinetBounds.min, cabinetBounds.max);
            const wallSnapResult = calculateMultiAxisWallSnap(
              wallBounds,
              wallSnapCacheRef.current.surfaces,
              wallSnapCacheRef.current.corners,
              snapSettings
            );

            if (wallSnapResult.snapped) {
              if (wallSnapResult.snappedAxes?.includes("X")) {
                pivotPoint.x += wallSnapResult.snapOffset[0];
              }
              if (wallSnapResult.snappedAxes?.includes("Z")) {
                pivotPoint.z += wallSnapResult.snapOffset[2];
              }
              group.position.copy(pivotPoint);
              clearSnapPoints();
              hasSnapped = true;
            }
          }
        }

        if (!hasSnapped) {
          clearSnapPoints();
        }
      } else {
        // ===== SINGLE-AXIS SNAP =====
        const singleAxis = dragAxes as "X" | "Y" | "Z";
        const cabinet = allCabinets.find((c) => c.id === cabinetId);

        if (cabinet) {
          const snapResult = calculateCabinetSnapV2(
            cabinet,
            positionOffset,
            allParts,
            allCabinets,
            snapSettings,
            singleAxis
          );

          if (snapResult?.snapped && snapResult.snapPoints.length > 0) {
            const axisIndex = singleAxis === "X" ? 0 : singleAxis === "Y" ? 1 : 2;
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
            // No cabinet snap - try wall snap
            const wallCache = wallSnapCacheRef.current;
            if (
              snapSettings.wallSnap &&
              wallCache.surfaces.length > 0 &&
              (singleAxis === "X" || singleAxis === "Z")
            ) {
              const cabinetBounds = getCabinetBoundingBoxWithOffset(cabinetId, allParts, [
                groupTranslation.x,
                groupTranslation.y,
                groupTranslation.z,
              ]);

              if (cabinetBounds) {
                const wallBounds = createWallSnapBounds(cabinetBounds.min, cabinetBounds.max);
                const wallSnapResult = calculateCabinetWallSnap(
                  wallBounds,
                  wallCache.surfaces,
                  wallCache.corners,
                  singleAxis,
                  snapSettings
                );

                if (wallSnapResult.snapped) {
                  const axisIndex = singleAxis === "X" ? 0 : 2;
                  if (axisIndex === 0) pivotPoint.x += wallSnapResult.snapOffset[0];
                  else pivotPoint.z += wallSnapResult.snapOffset[2];
                  group.position.copy(pivotPoint);
                }
              }
            }
            clearSnapPoints();
          }
        } else {
          clearSnapPoints();
        }
      }

      // Calculate dimension lines
      if (dimensionSettings.enabled && dragAxes) {
        const primaryAxis = (dragAxes[0] as "X" | "Y" | "Z") || "X";
        setActiveAxis(primaryAxis);

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
            primaryAxis,
            dimensionSettings
          );

          setDimensionLines(dimensions);
        }
      }

      return pivotPoint;
    },
    [
      cabinetId,
      allParts,
      allCabinets,
      parts,
      snapSettings,
      dimensionSettings,
      setSnapPoints,
      clearSnapPoints,
      setDimensionLines,
      setActiveAxis,
      wallSnapCacheRef,
    ]
  );

  /**
   * Calculate preview transforms - called on every frame during drag.
   * Updates refs only, no store updates until transform ends.
   */
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

    // Apply snap for translate mode
    if (transformMode === "translate" && snapEnabled) {
      pivotPoint = applySnapLogic(pivotPoint, groupTranslation, group);
    }

    // Calculate preview transforms for all parts (no store update!)
    const newTransforms: PreviewTransformMap = new Map();

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
    const cabinet = allCabinets.find((c) => c.id === cabinetId);
    const existingRotation = cabinet?.worldTransform?.rotation ?? [0, 0, 0];
    const existingQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(existingRotation[0], existingRotation[1], existingRotation[2], "XYZ")
    );
    const newRotQuat = deltaQuat.clone().multiply(existingQuat);
    previewRotationRef.current.setFromQuaternion(newRotQuat, "XYZ");

    setPreviewVersion((v) => v + 1);
  }, [parts, target, transformMode, snapEnabled, applySnapLogic, allCabinets, cabinetId]);

  const handleTransformStart = useCallback(() => {
    if (!target) return;

    isDraggingRef.current = true;

    // Freeze cabinet center at start of transform
    initialCabinetCenter.current.copy(cabinetCenter);
    target.position.copy(initialCabinetCenter.current);

    // For rotate mode: reset to identity so delta rotation is easy to calculate
    // For translate mode: keep cabinet rotation so "local" space axes align with cabinet
    if (transformMode === "rotate") {
      target.rotation.set(0, 0, 0);
    } else {
      target.rotation.set(cabinetRotation[0], cabinetRotation[1], cabinetRotation[2]);
    }
    target.updateMatrixWorld();

    // Save initial group quaternion
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
    const initialTransforms: PreviewTransformMap = new Map();
    parts.forEach((part) => {
      initialTransforms.set(part.id, {
        position: [...part.position],
        rotation: [...part.rotation],
      });
    });
    previewTransformsRef.current = initialTransforms;

    // Initialize preview rotation from cabinet's current worldTransform
    const cabinet = allCabinets.find((c) => c.id === cabinetId);
    const existingRotation = cabinet?.worldTransform?.rotation ?? [0, 0, 0];
    previewRotationRef.current.set(
      existingRotation[0],
      existingRotation[1],
      existingRotation[2],
      "XYZ"
    );

    setIsTransforming(true);
    setTransformingCabinetId(cabinetId);

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
    transformMode,
    cabinetRotation,
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
    const newCenterPos = new THREE.Vector3();
    previewTransformsRef.current.forEach((transform) => {
      newCenterPos.add(new THREE.Vector3().fromArray(transform.position));
    });
    if (previewTransformsRef.current.size > 0) {
      newCenterPos.divideScalar(previewTransformsRef.current.size);
    }

    // Get rotation from group (add delta to existing)
    const cabinet = allCabinets.find((c) => c.id === cabinetId);
    const existingRotation = cabinet?.worldTransform?.rotation ?? [0, 0, 0];

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
    setTransformingCabinetId(null);
    setIsTransforming(false);
    detectCollisions();

    // Regenerate countertops for all groups containing this cabinet
    countertopGroups.forEach((grp) => {
      regenerateCountertopGroup(grp.id);
    });

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
    countertopGroups,
    regenerateCountertopGroup,
  ]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  const isShowingPreview = isDraggingRef.current && previewTransformsRef.current.size > 0;

  return (
    <>
      {/* Preview part meshes during drag */}
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
            const segmentCabinets = allCabinets
              .filter((c) => segment.cabinetIds.includes(c.id))
              .map((c) => ({ id: c.id, params: c.params as KitchenCabinetParams }));

            const previewData = calculateCountertopPreview(
              segment,
              group,
              previewTransformsRef.current,
              allParts,
              segmentCabinets,
              allCabinets,
              materials,
              previewRotationRef.current,
              cabinetId
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

      {/* Proxy group for controls */}
      <group ref={setTarget} position={cabinetCenter} rotation={cabinetRotation} />

      {/* Transform controls */}
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
