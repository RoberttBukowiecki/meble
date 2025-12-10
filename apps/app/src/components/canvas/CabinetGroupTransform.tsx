
'use client';

import { useRef, useEffect, useMemo, useCallback } from 'react';
import { TransformControls } from '@react-three/drei';
import { useStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import * as THREE from 'three';

export function CabinetGroupTransform({ cabinetId }: { cabinetId: string }) {
  const parts = useStore(
    useShallow((state) =>
      state.parts.filter((p) => p.cabinetMetadata?.cabinetId === cabinetId)
    )
  );
  const { updatePart, transformMode, setIsTransforming } = useStore(
    useShallow((state) => ({
      updatePart: state.updatePart,
      transformMode: state.transformMode,
      setIsTransforming: state.setIsTransforming,
    }))
  );

  const controlRef = useRef<any>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const initialPartPositions = useRef<Map<string, THREE.Vector3>>(new Map());

  // Initialize group once
  if (groupRef.current === null) {
    groupRef.current = new THREE.Group();
  }

  // Calculate cabinet center - optimized to avoid creating Three.js objects
  const cabinetCenter = useMemo(() => {
    if (parts.length === 0) return new THREE.Vector3(0, 0, 0);

    // Simple average of all part positions (faster than bounding box calculation)
    const sum = new THREE.Vector3();
    parts.forEach(p => {
      sum.add(new THREE.Vector3().fromArray(p.position));
    });
    sum.divideScalar(parts.length);

    return sum;
  }, [parts]);

  useEffect(() => {
    // Store initial relative positions of parts to the group center
    initialPartPositions.current.clear();
    parts.forEach(part => {
        const initialPosition = new THREE.Vector3().fromArray(part.position);
        const relativePos = initialPosition.clone().sub(cabinetCenter);
        initialPartPositions.current.set(part.id, relativePos);
    });
  }, [cabinetCenter, parts]);

  // Update parts in real-time during transformation (live preview)
  const updatePartsFromGroup = useCallback(() => {
    const group = groupRef.current;
    if (!group) return;

    parts.forEach(part => {
        const initialRelativePos = initialPartPositions.current.get(part.id);
        if (initialRelativePos) {
            const newPos = initialRelativePos.clone().applyQuaternion(group.quaternion).add(group.position);

            const newRotation = new THREE.Euler().setFromQuaternion(
                new THREE.Quaternion().setFromEuler(new THREE.Euler().fromArray(part.rotation)).premultiply(group.quaternion)
            );

            updatePart(part.id, {
                position: newPos.toArray() as [number, number, number],
                rotation: [newRotation.x, newRotation.y, newRotation.z] as [number, number, number],
            });
        }
    });
  }, [parts, updatePart]);

  // Memoize callback to avoid recreating function on every render
  const handleTransformEnd = useCallback(() => {
    const group = groupRef.current;
    if (!group) return;

    // Final update
    updatePartsFromGroup();

    // Reset group transform after applying to parts
    group.position.copy(cabinetCenter);
    group.rotation.set(0, 0, 0);
    group.quaternion.identity();

    setIsTransforming(false);
  }, [updatePartsFromGroup, cabinetCenter, setIsTransforming]);

  return (
      <>
        {/* Render the group in the scene so TransformControls can attach to it */}
        <group ref={groupRef} position={cabinetCenter} />
        <TransformControls
          ref={controlRef}
          object={groupRef.current}
          mode={transformMode}
          onMouseDown={() => setIsTransforming(true)}
          onChange={updatePartsFromGroup}
          onMouseUp={handleTransformEnd}
          showX={transformMode === 'translate'}
          showY={transformMode === 'translate'}
          showZ={transformMode === 'translate'}
        />
      </>
  );
}
