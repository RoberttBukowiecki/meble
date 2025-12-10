
'use client';

import { useRef, useEffect, useMemo, useCallback, useState } from 'react';
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

  const [target, setTarget] = useState<THREE.Group | null>(null);
  const controlRef = useRef<any>(null);
  const initialPartPositions = useRef<Map<string, THREE.Vector3>>(new Map());

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

  useEffect(() => {
    // Store initial relative positions of parts to the group center
    initialPartPositions.current.clear();
    parts.forEach(part => {
        const initialPosition = new THREE.Vector3().fromArray(part.position);
        const relativePos = initialPosition.clone().sub(cabinetCenter);
        initialPartPositions.current.set(part.id, relativePos);
    });
  }, [cabinetCenter, parts]);

  // Update parts in real-time during transformation
  const updatePartsFromGroup = useCallback(() => {
    const group = target;
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
  }, [parts, updatePart, target]);

  const handleTransformEnd = useCallback(() => {
    const group = target;
    if (!group) {
        setIsTransforming(false);
        return;
    }
    updatePartsFromGroup();
    group.position.copy(cabinetCenter);
    group.rotation.set(0, 0, 0);
    group.quaternion.identity();
    setIsTransforming(false);
  }, [updatePartsFromGroup, cabinetCenter, setIsTransforming, target]);

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
              onMouseDown={() => setIsTransforming(true)}
              onChange={updatePartsFromGroup}
              onMouseUp={handleTransformEnd}
              showX={transformMode === 'translate'}
              showY={transformMode === 'translate'}
              showZ={transformMode === 'translate'}
            />
        )}
      </>
  );
}
