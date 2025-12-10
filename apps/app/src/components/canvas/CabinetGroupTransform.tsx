
'use client';

import { useRef, useEffect, useMemo } from 'react';
import { TransformControls } from '@react-three/drei';
import { useStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import * as THREE from 'three';
import { Part } from '@/types';

export function CabinetGroupTransform({ cabinetId }: { cabinetId: string }) {
  const { parts, updatePart, transformMode, setIsTransforming } = useStore(
    useShallow((state) => ({
      parts: state.parts.filter((p) => p.cabinetMetadata?.cabinetId === cabinetId),
      updatePart: state.updatePart,
      transformMode: state.transformMode,
      setIsTransforming: state.setIsTransforming,
    }))
  );
  
  const controlRef = useRef<any>(null);
  const groupRef = useRef<THREE.Group>(new THREE.Group());
  const initialPartPositions = useRef<Map<string, THREE.Vector3>>(new Map());

  const cabinetCenter = useMemo(() => {
    if (parts.length === 0) return new THREE.Vector3(0, 0, 0);
    const box = new THREE.Box3();
    parts.forEach(p => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(p.width, p.height, p.depth));
        mesh.position.fromArray(p.position);
        mesh.rotation.fromArray(p.rotation);
        box.expandByObject(mesh);
    });
    const center = new THREE.Vector3();
    box.getCenter(center);
    return center;
  }, [parts]);

  useEffect(() => {
    const group = groupRef.current;
    group.position.copy(cabinetCenter);
    
    // Store initial relative positions of parts to the group center
    initialPartPositions.current.clear();
    parts.forEach(part => {
        const initialPosition = new THREE.Vector3().fromArray(part.position);
        const relativePos = initialPosition.clone().sub(cabinetCenter);
        initialPartPositions.current.set(part.id, relativePos);
    });

    if (controlRef.current) {
        controlRef.current.attach(group);
    }

    return () => {
        if (controlRef.current) {
            controlRef.current.detach();
        }
    }
  }, [cabinetCenter, parts]);

  const handleTransformEnd = () => {
    const group = groupRef.current;
    
    parts.forEach(part => {
        const initialRelativePos = initialPartPositions.current.get(part.id);
        if (initialRelativePos) {
            const newPos = initialRelativePos.clone().applyQuaternion(group.quaternion).add(group.position);
            
            const newRotation = new THREE.Euler().setFromQuaternion(
                new THREE.Quaternion().setFromEuler(new THREE.Euler().fromArray(part.rotation)).premultiply(group.quaternion)
            );

            updatePart(part.id, { 
                position: newPos.toArray(),
                rotation: [newRotation.x, newRotation.y, newRotation.z],
            });
        }
    });

    setIsTransforming(false);
  };

  return (
      <TransformControls
        ref={controlRef}
        mode={transformMode}
        onMouseDown={() => setIsTransforming(true)}
        onMouseUp={handleTransformEnd}
        showX={transformMode === 'translate'}
        showY={transformMode === 'translate'}
        showZ={transformMode === 'translate'}
      />
  );
}
