"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { TransformControls } from "@react-three/drei";
import { useStore, useMaterial } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import * as THREE from "three";
import type { Part, TransformSpace } from "@/types";
import type { DragAxes } from "@/types/transform";
import { pickTransform } from "@/lib/store/history/utils";
import { SCENE_CONFIG, PART_CONFIG, MATERIAL_CONFIG } from "@/lib/config";
import {
  getDragAxesFromControls,
  isPlanarDrag,
  detectMovementAxis,
  localAxisToWorldAxis,
} from "@/lib/transform-utils";
import { useSnapContext, useWallSnapCache } from "@/lib/snap-context";
import { useDimensionContext } from "@/lib/dimension-context";
import { calculatePartSnapV2 } from "@/lib/snapping-v2";
import { calculatePartSnapV3, calculateMultiAxisSnap } from "@/lib/snapping-v3";
import {
  calculateWallSnap,
  calculateMultiAxisWallSnap,
  createWallSnapBounds,
} from "@/lib/wall-snapping";
import { calculateDimensions } from "@/lib/dimension-calculator";
import { getPartBoundingBoxAtPosition, getOtherBoundingBoxes } from "@/lib/bounding-box-utils";
import { useTransformAxisConstraints } from "@/hooks/useOrthographicConstraints";
import type { TransformControls as TransformControlsImpl } from "three-stdlib";

interface PartTransformControlsProps {
  part: Part;
  mode: "translate" | "rotate";
  space?: TransformSpace;
  onTransformStart: () => void;
  onTransformEnd: () => void;
}

export function PartTransformControls({
  part,
  mode,
  space = "world",
  onTransformStart,
  onTransformEnd,
}: PartTransformControlsProps) {
  const [target, setTarget] = useState<THREE.Group | null>(null);
  const { setSnapPoints, clearSnapPoints } = useSnapContext();
  const { wallSnapCacheRef } = useWallSnapCache();
  const { setDimensionLines, clearDimensionLines, setActiveAxis } = useDimensionContext();

  // Get axis constraints for orthographic view
  const axisConstraints = useTransformAxisConstraints(mode);

  const {
    updatePart,
    beginBatch,
    commitBatch,
    isShiftPressed,
    detectCollisions,
    parts,
    cabinets,
    snapEnabled,
    snapSettings,
    dimensionSettings,
    setTransformingPartId,
  } = useStore(
    useShallow((state) => ({
      updatePart: state.updatePart,
      beginBatch: state.beginBatch,
      commitBatch: state.commitBatch,
      isShiftPressed: state.isShiftPressed,
      detectCollisions: state.detectCollisions,
      parts: state.parts,
      cabinets: state.cabinets,
      snapEnabled: state.snapEnabled,
      snapSettings: state.snapSettings,
      dimensionSettings: state.dimensionSettings,
      setTransformingPartId: state.setTransformingPartId,
    }))
  );

  // Get material color for preview mesh
  const material = useMaterial(part.materialId);
  const partColor = material?.color || MATERIAL_CONFIG.DEFAULT_MATERIAL_COLOR;

  const initialTransformRef = useRef<{
    position: [number, number, number];
    rotation: [number, number, number];
  } | null>(null);
  const controlsRef = useRef<TransformControlsImpl | null>(null);
  const isDraggingRef = useRef(false);

  // Effective space for TransformControls
  const effectiveSpace = mode === "translate" ? space : "local";

  // Update TransformControls space directly on every render
  // (drei's TransformControls doesn't properly react to space prop changes)
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.setSpace(effectiveSpace);
    }
  });

  const rotationSnap =
    mode === "rotate" && isShiftPressed
      ? THREE.MathUtils.degToRad(SCENE_CONFIG.ROTATION_SNAP_DEGREES)
      : undefined;

  // Handle transform changes - called on every frame during drag
  // PERFORMANCE: No store updates during drag, only snap logic
  const handleChange = () => {
    if (!target || !isDraggingRef.current) return;

    const position = target.position.toArray() as [number, number, number];

    // Only process for translate mode
    if (mode === "translate") {
      const dragAxes = getDragAxesFromControls(controlsRef.current);
      const originalPos = initialTransformRef.current?.position || part.position;

      // Determine effective axes for snapping
      let effectiveAxes: DragAxes | null = dragAxes;

      // For single-axis drag, transform local to world axis if rotated
      if (dragAxes && dragAxes.length === 1) {
        const worldAxis = localAxisToWorldAxis(dragAxes as "X" | "Y" | "Z", part.rotation);
        effectiveAxes = worldAxis;
      }

      // Fallback: detect axis from movement if TransformControls doesn't report it
      if (!effectiveAxes) {
        const detectedAxis = detectMovementAxis(originalPos, position);
        effectiveAxes = detectedAxis;
      }

      if (effectiveAxes) {
        const isMultiAxis = isPlanarDrag(effectiveAxes);

        // Apply snap when enabled
        if (snapEnabled) {
          let hasSnapped = false;

          if (isMultiAxis) {
            // ===== MULTI-AXIS SNAP (planar drag) =====
            const wallCache = wallSnapCacheRef.current;
            const hasWallCache = wallCache.surfaces.length > 0;

            // Step 1: Try corner snap first (highest priority for XZ drag)
            if (
              effectiveAxes === "XZ" &&
              snapSettings.wallSnap &&
              snapSettings.cornerSnap &&
              hasWallCache
            ) {
              const bounds = getPartBoundingBoxAtPosition(part, position);
              const wallBounds = createWallSnapBounds(bounds.min, bounds.max);

              const wallSnapResult = calculateMultiAxisWallSnap(
                wallBounds,
                wallCache.surfaces,
                wallCache.corners,
                snapSettings
              );

              // If corner snap found, use it and skip part snap
              if (wallSnapResult.snapped && wallSnapResult.snappedToCorner) {
                position[0] += wallSnapResult.snapOffset[0];
                position[2] += wallSnapResult.snapOffset[2];
                target.position.set(position[0], position[1], position[2]);
                clearSnapPoints(); // TODO: Add corner visualization
                hasSnapped = true;
              }
            }

            // Step 2: If no corner snap, try multi-axis part snap
            if (!hasSnapped) {
              const multiAxisResult = calculateMultiAxisSnap(
                part,
                position,
                parts,
                cabinets,
                snapSettings,
                effectiveAxes
              );

              if (multiAxisResult.snapped) {
                // Apply snapped position for all snapped axes
                for (const axis of multiAxisResult.snappedAxes) {
                  const axisIndex = axis === "X" ? 0 : axis === "Y" ? 1 : 2;
                  position[axisIndex] = multiAxisResult.position[axisIndex];
                }
                target.position.set(position[0], position[1], position[2]);
                setSnapPoints(multiAxisResult.snapPoints);
                hasSnapped = true;
              }
            }

            // Step 3: If still no snap, try individual wall snaps
            if (!hasSnapped && snapSettings.wallSnap && hasWallCache) {
              const bounds = getPartBoundingBoxAtPosition(part, position);
              const wallBounds = createWallSnapBounds(bounds.min, bounds.max);

              const wallSnapResult = calculateMultiAxisWallSnap(
                wallBounds,
                wallCache.surfaces,
                wallCache.corners,
                snapSettings
              );

              if (wallSnapResult.snapped) {
                if (wallSnapResult.snappedAxes?.includes("X")) {
                  position[0] += wallSnapResult.snapOffset[0];
                }
                if (wallSnapResult.snappedAxes?.includes("Z")) {
                  position[2] += wallSnapResult.snapOffset[2];
                }
                target.position.set(position[0], position[1], position[2]);
                clearSnapPoints();
                hasSnapped = true;
              }
            }

            if (!hasSnapped) {
              clearSnapPoints();
            }
          } else {
            // ===== SINGLE-AXIS SNAP (original logic) =====
            const singleAxis = effectiveAxes as "X" | "Y" | "Z";
            let snapResult;

            // Select snap algorithm based on version
            if (snapSettings.version === "v2") {
              snapResult = calculatePartSnapV2(
                part,
                position,
                parts,
                cabinets,
                snapSettings,
                singleAxis
              );
            } else {
              snapResult = calculatePartSnapV3(
                part,
                position,
                parts,
                cabinets,
                snapSettings,
                singleAxis
              );
            }

            if (snapResult.snapped && snapResult.snapPoints.length > 0) {
              const axisIndex = singleAxis === "X" ? 0 : singleAxis === "Y" ? 1 : 2;
              position[axisIndex] = snapResult.position[axisIndex];
              target.position.set(position[0], position[1], position[2]);
              setSnapPoints(snapResult.snapPoints);
            } else {
              // No part snap - try wall snap
              const wallCache = wallSnapCacheRef.current;
              if (
                snapSettings.wallSnap &&
                wallCache.surfaces.length > 0 &&
                (singleAxis === "X" || singleAxis === "Z")
              ) {
                const bounds = getPartBoundingBoxAtPosition(part, position);
                const wallBounds = createWallSnapBounds(bounds.min, bounds.max);

                const wallSnapResult = calculateWallSnap(
                  wallBounds,
                  wallCache.surfaces,
                  wallCache.corners,
                  singleAxis,
                  snapSettings
                );

                if (wallSnapResult.snapped) {
                  const axisIndex = singleAxis === "X" ? 0 : 2;
                  position[axisIndex] += wallSnapResult.snapOffset[axisIndex];
                  target.position.set(position[0], position[1], position[2]);
                  clearSnapPoints();
                } else {
                  clearSnapPoints();
                }
              } else {
                clearSnapPoints();
              }
            }
          }
        }

        // Calculate dimension lines (independent of snap)
        if (dimensionSettings?.enabled) {
          // For multi-axis, show dimensions for primary axis (first in string)
          const primaryAxis = (effectiveAxes[0] as "X" | "Y" | "Z") || "X";
          setActiveAxis(primaryAxis);

          const currentPosition = target.position.toArray() as [number, number, number];
          const movingBounds = getPartBoundingBoxAtPosition(part, currentPosition);

          const excludePartIds = new Set([part.id]);
          const excludeCabinetIds = part.cabinetMetadata?.cabinetId
            ? new Set([part.cabinetMetadata.cabinetId])
            : new Set<string>();

          const otherBounds = getOtherBoundingBoxes(
            excludePartIds,
            excludeCabinetIds,
            parts,
            cabinets
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
    }

    // PERFORMANCE: NO store update here - preview mesh follows target directly
    // Store will be updated on mouseUp
  };

  const handleTransformStart = useCallback(() => {
    isDraggingRef.current = true;
    initialTransformRef.current = pickTransform(part);

    beginBatch("TRANSFORM_PART", {
      targetId: part.id,
      before: initialTransformRef.current,
    });

    setTransformingPartId(part.id); // Hide original Part3D, show preview
    onTransformStart();
  }, [part, beginBatch, onTransformStart, setTransformingPartId]);

  const handleTransformEnd = useCallback(() => {
    isDraggingRef.current = false;

    if (!target) {
      setTransformingPartId(null);
      onTransformEnd();
      return;
    }

    clearSnapPoints();
    clearDimensionLines();

    const position = target.position.toArray() as [number, number, number];
    const rotation = target.rotation.toArray().slice(0, 3) as [number, number, number];

    // PERFORMANCE: Single store update on mouseUp (not during drag)
    updatePart(part.id, { position, rotation }, true);

    commitBatch({
      after: { position, rotation },
    });

    setTransformingPartId(null); // Show original Part3D again
    onTransformEnd();
    detectCollisions();
  }, [
    target,
    updatePart,
    part.id,
    commitBatch,
    onTransformEnd,
    detectCollisions,
    clearSnapPoints,
    clearDimensionLines,
    setTransformingPartId,
  ]);

  // Sync target position with part when part changes externally
  useEffect(() => {
    if (target && !isDraggingRef.current) {
      target.position.set(...part.position);
      target.rotation.set(...part.rotation);
    }
  }, [target, part.position, part.rotation]);

  return (
    <>
      {/* Target group that TransformControls operates on */}
      <group ref={setTarget} position={part.position} rotation={part.rotation}>
        {/* Preview mesh - child of target, so follows transform automatically */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[part.width, part.height, part.depth]} />
          <meshStandardMaterial
            color={partColor}
            emissive={PART_CONFIG.SELECTION_EMISSIVE_COLOR}
            emissiveIntensity={PART_CONFIG.SELECTION_EMISSIVE_INTENSITY}
          />
        </mesh>
      </group>

      {target && (
        <TransformControls
          ref={controlsRef}
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
