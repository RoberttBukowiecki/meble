'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { TransformControls } from '@react-three/drei';
import { useStore, useMaterial } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import * as THREE from 'three';
import type { Part } from '@/types';
import { pickTransform } from '@/lib/store/history/utils';
import { SCENE_CONFIG, PART_CONFIG, MATERIAL_CONFIG } from '@/lib/config';
import { useSnapContext } from '@/lib/snap-context';
import { useDimensionContext } from '@/lib/dimension-context';
import { calculateSnapSimple } from '@/lib/snapping';
import { calculatePartSnapV2 } from '@/lib/snapping-v2';
import { calculateDimensions } from '@/lib/dimension-calculator';
import { getPartBoundingBoxAtPosition, getOtherBoundingBoxes } from '@/lib/bounding-box-utils';
import type { TransformControls as TransformControlsImpl } from 'three-stdlib';

interface PartTransformControlsProps {
  part: Part;
  mode: 'translate' | 'rotate';
  onTransformStart: () => void;
  onTransformEnd: () => void;
}

/**
 * Detect which axis has the most movement (fallback when TransformControls axis is not available)
 */
function detectMovementAxis(
  originalPos: [number, number, number],
  currentPos: [number, number, number]
): 'X' | 'Y' | 'Z' | null {
  const dx = Math.abs(currentPos[0] - originalPos[0]);
  const dy = Math.abs(currentPos[1] - originalPos[1]);
  const dz = Math.abs(currentPos[2] - originalPos[2]);

  const maxDelta = Math.max(dx, dy, dz);

  // Only detect if there's meaningful movement (> 1mm)
  if (maxDelta < 1) return null;

  if (dx === maxDelta) return 'X';
  if (dy === maxDelta) return 'Y';
  return 'Z';
}

export function PartTransformControls({
  part,
  mode,
  onTransformStart,
  onTransformEnd,
}: PartTransformControlsProps) {
  const [target, setTarget] = useState<THREE.Group | null>(null);
  const { setSnapPoints, clearSnapPoints } = useSnapContext();
  const { setDimensionLines, clearDimensionLines, setActiveAxis } = useDimensionContext();

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

  const initialTransformRef = useRef<{ position: [number, number, number]; rotation: [number, number, number] } | null>(null);
  const controlsRef = useRef<TransformControlsImpl | null>(null);
  const isDraggingRef = useRef(false);

  const rotationSnap = mode === 'rotate' && isShiftPressed
    ? THREE.MathUtils.degToRad(SCENE_CONFIG.ROTATION_SNAP_DEGREES)
    : undefined;

  // Get current drag axis from TransformControls
  const getDragAxis = useCallback((): 'X' | 'Y' | 'Z' | null => {
    const controls = controlsRef.current;
    if (!controls) return null;
    const axis = (controls as unknown as { axis: string | null }).axis;
    if (axis === 'X' || axis === 'Y' || axis === 'Z') return axis;
    return null;
  }, []);

  // Handle transform changes - called on every frame during drag
  // PERFORMANCE: No store updates during drag, only snap logic
  const handleChange = useCallback(() => {
    if (!target || !isDraggingRef.current) return;

    const position = target.position.toArray() as [number, number, number];

    // Only process for translate mode
    if (mode === 'translate') {
      const axis = getDragAxis();

      // If no specific axis detected, try to determine from movement
      const originalPos = initialTransformRef.current?.position || part.position;
      const effectiveAxis = axis || detectMovementAxis(originalPos, position);

      if (effectiveAxis) {
        // Apply snap when enabled
        if (snapEnabled) {
          let snapResult;

          // Use V2 snapping for bounding box based snapping, V1 for face-to-face
          if (snapSettings.version === 'v2') {
            // V2: Group bounding box based snapping
            snapResult = calculatePartSnapV2(
              part,
              position,
              parts,
              cabinets,
              snapSettings,
              effectiveAxis
            );
          } else {
            // V1: Individual part face snapping
            const otherParts = parts.filter(
              (p) =>
                p.id !== part.id &&
                (!part.cabinetMetadata?.cabinetId ||
                  p.cabinetMetadata?.cabinetId !== part.cabinetMetadata.cabinetId)
            );

            snapResult = calculateSnapSimple(
              part,
              position,
              otherParts,
              snapSettings,
              effectiveAxis
            );
          }

          if (snapResult.snapped && snapResult.snapPoints.length > 0) {
            // Apply snap offset ONLY on the drag axis
            const axisIndex = effectiveAxis === 'X' ? 0 : effectiveAxis === 'Y' ? 1 : 2;
            position[axisIndex] = snapResult.position[axisIndex];
            target.position.setComponent(axisIndex, position[axisIndex]);
            setSnapPoints(snapResult.snapPoints);
          } else {
            clearSnapPoints();
          }
        }

        // Calculate dimension lines (independent of snap)
        if (dimensionSettings?.enabled) {
          setActiveAxis(effectiveAxis);

          // Get current position (after snap if applied)
          const currentPosition = target.position.toArray() as [number, number, number];

          // Get bounding box of the moving part at current position
          const movingBounds = getPartBoundingBoxAtPosition(part, currentPosition);

          // Get bounding boxes of all other objects (excluding this part and its cabinet)
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
            effectiveAxis,
            dimensionSettings
          );

          setDimensionLines(dimensions);
        }
      }
    }

    // PERFORMANCE: NO store update here - preview mesh follows target directly
    // Store will be updated on mouseUp
  }, [target, part, mode, snapEnabled, snapSettings, dimensionSettings, parts, cabinets, setSnapPoints, clearSnapPoints, setDimensionLines, setActiveAxis, getDragAxis]);

  const handleTransformStart = useCallback(() => {
    isDraggingRef.current = true;
    initialTransformRef.current = pickTransform(part);

    beginBatch('TRANSFORM_PART', {
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
  }, [target, updatePart, part.id, commitBatch, onTransformEnd, detectCollisions, clearSnapPoints, clearDimensionLines, setTransformingPartId]);

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
          onMouseDown={handleTransformStart}
          onChange={handleChange}
          onMouseUp={handleTransformEnd}
          rotationSnap={rotationSnap}
        />
      )}
    </>
  );
}
