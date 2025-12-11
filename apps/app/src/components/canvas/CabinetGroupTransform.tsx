
'use client';

import { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import { TransformControls } from '@react-three/drei';
import { useStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import * as THREE from 'three';
import { Part } from '@/types';
import { SCENE_CONFIG } from '@/lib/config';

type PartTransform = Pick<Part, 'position' | 'rotation'>;

export function CabinetGroupTransform({ cabinetId }: { cabinetId: string }) {
  // Get cabinet parts using useShallow
  const parts = useStore(
    useShallow((state) =>
      state.parts.filter((p) => p.cabinetMetadata?.cabinetId === cabinetId)
    )
  );

  const { updatePartsBatch, transformMode, setIsTransforming, beginBatch, commitBatch, isShiftPressed, detectCollisions } = useStore(
    useShallow((state) => ({
      updatePartsBatch: state.updatePartsBatch,
      transformMode: state.transformMode,
      setIsTransforming: state.setIsTransforming,
      beginBatch: state.beginBatch,
      commitBatch: state.commitBatch,
      isShiftPressed: state.isShiftPressed,
      detectCollisions: state.detectCollisions,
    }))
  );

  const [target, setTarget] = useState<THREE.Group | null>(null);
  const controlRef = useRef<any>(null);
  const initialPartPositions = useRef<Map<string, THREE.Vector3>>(new Map());
  const initialPartRotations = useRef<Map<string, THREE.Quaternion>>(new Map());
  const rafIdRef = useRef<number | null>(null);
  const initialGroupQuaternion = useRef<THREE.Quaternion>(new THREE.Quaternion());

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


  const rotationSnap = isShiftPressed
    ? THREE.MathUtils.degToRad(SCENE_CONFIG.ROTATION_SNAP_DEGREES)
    : undefined;

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Update parts in real-time during transformation (throttled to animation frame)
  const applyGroupTransform = useCallback(() => {
    const group = target;
    if (!group) return;

    const updates: Array<{ id: string; patch: Partial<Part> }> = [];

    // Calculate delta rotation from initial state
    const deltaQuat = group.quaternion.clone().multiply(initialGroupQuaternion.current.clone().invert());

    parts.forEach(part => {
        const relativePos = initialPartPositions.current.get(part.id);
        const originalRot = initialPartRotations.current.get(part.id);
        if (relativePos && originalRot) {
            // Apply delta rotation to the relative position, then add group position
            const newPos = relativePos.clone().applyQuaternion(deltaQuat).add(group.position);

            // Apply delta rotation to the original rotation
            const newRotQuat = deltaQuat.clone().multiply(originalRot);
            const newRot = new THREE.Euler().setFromQuaternion(newRotQuat);

            updates.push({
                id: part.id,
                patch: {
                    position: newPos.toArray() as [number, number, number],
                    rotation: [newRot.x, newRot.y, newRot.z] as [number, number, number],
                }
            });
        }
    });

    // Batch update all parts in a single store update
    if (updates.length > 0) {
        updatePartsBatch(updates);
    }
  }, [parts, updatePartsBatch, target]);

  const scheduleGroupTransform = useCallback(() => {
    if (rafIdRef.current !== null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      applyGroupTransform();
    });
  }, [applyGroupTransform]);

  const handleTransformStart = useCallback(() => {
    if (!target) return;

    // Set gizmo to cabinet center with NO rotation (identity)
    target.position.copy(cabinetCenter);
    target.rotation.set(0, 0, 0);
    target.updateMatrixWorld();

    // Save initial group quaternion (should be identity)
    initialGroupQuaternion.current.copy(target.quaternion);

    // Capture initial state for each part
    initialPartPositions.current.clear();
    initialPartRotations.current.clear();

    parts.forEach(part => {
      // Store relative position from cabinet center (simple offset in world space)
      const partPos = new THREE.Vector3().fromArray(part.position);
      const relativePos = partPos.clone().sub(cabinetCenter);
      initialPartPositions.current.set(part.id, relativePos);

      // Store original rotation as quaternion (world space, no conversion!)
      const partRot = new THREE.Euler().fromArray(part.rotation);
      const partQuat = new THREE.Quaternion().setFromEuler(partRot);
      initialPartRotations.current.set(part.id, partQuat);
    });

    setIsTransforming(true);
    const beforeState: Record<string, PartTransform> = {};
    parts.forEach(p => {
      beforeState[p.id] = { position: [...p.position], rotation: [...p.rotation] };
    });
    beginBatch('TRANSFORM_CABINET', {
      targetId: cabinetId,
      before: beforeState,
    });
  }, [setIsTransforming, parts, beginBatch, cabinetId, cabinetCenter, target]);

  const handleTransformEnd = useCallback(() => {
    const group = target;
    if (!group) {
        setIsTransforming(false);
        return;
    }
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    applyGroupTransform();

    const afterState: Record<string, PartTransform> = {};
    // Need to get the latest part state from the store
    const latestParts = useStore.getState().parts.filter(p => p.cabinetMetadata?.cabinetId === cabinetId);
    latestParts.forEach(p => {
      afterState[p.id] = { position: [...p.position], rotation: [...p.rotation] };
    });

    commitBatch({ after: afterState });

    setIsTransforming(false);

    // Recompute collisions once after the transform finishes
    detectCollisions();
  }, [applyGroupTransform, setIsTransforming, target, commitBatch, cabinetId, detectCollisions]);

  return (
      <>
        {/* Proxy group for controls */}
        <group ref={setTarget} position={cabinetCenter} />

        {/* Conditionally render controls when target is ready */}
        {target && (
            <TransformControls
              ref={controlRef}
              object={target}
              mode={transformMode}
              onMouseDown={handleTransformStart}
              onChange={scheduleGroupTransform}
              onMouseUp={handleTransformEnd}
              rotationSnap={rotationSnap}
            />
        )}
      </>
  );
}
