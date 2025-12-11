
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
  const initialGroupQuaternion = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const initialCabinetCenter = useRef<THREE.Vector3>(new THREE.Vector3());
  const rafIdRef = useRef<number | null>(null);

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

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Apply group transform (throttled to RAF)
  const applyGroupTransform = useCallback(() => {
    const group = target;
    if (!group) return;

    const updates: Array<{ id: string; patch: Partial<Part> }> = [];

    // Calculate delta rotation from initial state
    const deltaQuat = group.quaternion.clone().multiply(initialGroupQuaternion.current.clone().invert());

    // CRITICAL: Use frozen cabinet center, not current group.position
    // group.position could drift during transform due to floating point or user dragging
    const pivotPoint = initialCabinetCenter.current;

    parts.forEach(part => {
        const relativePos = initialPartPositions.current.get(part.id);
        const originalRot = initialPartRotations.current.get(part.id);
        if (relativePos && originalRot) {
            // Apply delta rotation to the relative position, then add pivot point
            const newPos = relativePos.clone().applyQuaternion(deltaQuat).add(pivotPoint);

            // Apply delta rotation to the original rotation
            // For world-space rotation: newRot = deltaRot * originalRot
            const newRotQuat = new THREE.Quaternion().multiplyQuaternions(deltaQuat, originalRot);
            const newRot = new THREE.Euler().setFromQuaternion(newRotQuat, 'XYZ');

            updates.push({
                id: part.id,
                patch: {
                    position: newPos.toArray() as [number, number, number],
                    rotation: [newRot.x, newRot.y, newRot.z] as [number, number, number],
                }
            });
        }
    });

    // Batch update all parts in a single store update (skip history)
    if (updates.length > 0) {
        updatePartsBatch(updates);
    }
  }, [parts, updatePartsBatch, target]);

  // Schedule throttled transform update
  const scheduleGroupTransform = useCallback(() => {
    if (rafIdRef.current !== null) return; // Already scheduled
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      applyGroupTransform();
    });
  }, [applyGroupTransform]);

  const handleTransformStart = useCallback(() => {
    if (!target) return;

    // CRITICAL FIX: Freeze cabinet center at start of transform
    // cabinetCenter changes during transform (useMemo recalculates), causing math errors
    initialCabinetCenter.current.copy(cabinetCenter);

    target.position.copy(initialCabinetCenter.current);
    target.rotation.set(0, 0, 0);
    target.updateMatrixWorld();

    // Save initial group quaternion (should be identity)
    initialGroupQuaternion.current.copy(target.quaternion);

    console.log('[CabinetTransform] Start - initial quaternion:', initialGroupQuaternion.current.toArray());
    console.log('[CabinetTransform] Start - frozen cabinet center:', initialCabinetCenter.current.toArray());

    // Capture initial state for each part
    initialPartPositions.current.clear();
    initialPartRotations.current.clear();

    parts.forEach(part => {
      // Store relative position from FROZEN cabinet center
      const partPos = new THREE.Vector3().fromArray(part.position);
      const relativePos = partPos.clone().sub(initialCabinetCenter.current);
      initialPartPositions.current.set(part.id, relativePos);

      // Store original rotation as quaternion (preserve rotation order 'XYZ')
      const partRot = new THREE.Euler(part.rotation[0], part.rotation[1], part.rotation[2], 'XYZ');
      const partQuat = new THREE.Quaternion().setFromEuler(partRot);
      initialPartRotations.current.set(part.id, partQuat);

      console.log(`[Part ${part.name}] relativePos:`, relativePos.toArray(), 'rotation:', part.rotation);
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

    // Cancel any pending RAF
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    console.log('[CabinetTransform] End - final quaternion:', group.quaternion.toArray());
    console.log('[CabinetTransform] End - delta from identity:', group.quaternion.angleTo(initialGroupQuaternion.current), 'radians');

    // Apply final transform
    applyGroupTransform();

    // Build afterState for history from latest store state
    const afterState: Record<string, PartTransform> = {};
    const latestParts = useStore.getState().parts.filter(p => p.cabinetMetadata?.cabinetId === cabinetId);
    latestParts.forEach(p => {
      afterState[p.id] = { position: [...p.position], rotation: [...p.rotation] };
    });

    // Commit history batch
    commitBatch({ after: afterState });

    setIsTransforming(false);

    // Recompute collisions once after the transform finishes
    detectCollisions();
  }, [target, applyGroupTransform, setIsTransforming, commitBatch, cabinetId, detectCollisions]);

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
