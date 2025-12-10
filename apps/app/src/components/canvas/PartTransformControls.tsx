'use client';

import { useCallback, useState } from 'react';
import { TransformControls } from '@react-three/drei';
import { useStore } from '@/lib/store';
import * as THREE from 'three';
import type { Part } from '@/types';

interface PartTransformControlsProps {
  part: Part;
  mode: 'translate' | 'rotate';
  onTransformStart: () => void;
  onTransformEnd: () => void;
}

export function PartTransformControls({
  part,
  mode,
  onTransformStart,
  onTransformEnd,
}: PartTransformControlsProps) {
  const [target, setTarget] = useState<THREE.Group | null>(null);
  const updatePart = useStore((state) => state.updatePart);

  // The `useState` with ref callback pattern is correct for avoiding the race condition.
  // We conditionally render the TransformControls only when the target object is mounted.

  const handleTransformChange = useCallback(
    (e: THREE.Event | undefined) => {
      const group = e?.target.object as THREE.Group;
      if (!group) return;

      const position = group.position.toArray() as [number, number, number];
      const rotation = group.rotation.toArray().slice(0, 3) as [
        number,
        number,
        number
      ];

      // Update the part in the store (live update)
      updatePart(part.id, { position, rotation });
    },
    [part.id, updatePart]
  );

  const handleTransformEnd = useCallback(() => {
    if (!target) {
      onTransformEnd();
      return;
    }

    // Final update
    const position = target.position.toArray() as [number, number, number];
    const rotation = target.rotation.toArray().slice(0, 3) as [
      number,
      number,
      number
    ];

    updatePart(part.id, { position, rotation });

    // Call the parent callback
    onTransformEnd();
  }, [part.id, updatePart, onTransformEnd, target]);

  return (
    <>
      {/* An invisible group that acts as a proxy for the transform controls.
          The ref callback `setTarget` updates the state, triggering the rendering of TransformControls. */}
      <group ref={setTarget} position={part.position} rotation={part.rotation} />

      {/* Conditionally render TransformControls only when the target is set. */}
      {target && (
        <TransformControls
          object={target}
          mode={mode}
          onMouseDown={onTransformStart}
          onChange={handleTransformChange}
          onMouseUp={handleTransformEnd}
        />
      )}
    </>
  );
}

