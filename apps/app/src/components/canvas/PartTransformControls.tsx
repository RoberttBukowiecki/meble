'use client';

import { useEffect, useCallback, useState } from 'react';
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

  // The original component had a complex and unsafe way of handling the reference
  // to the controlled object, causing race conditions. This new implementation
  // uses a standard React pattern (`useState` with a ref callback) to ensure
  // the TransformControls are only rendered when the target object is mounted in the scene.

  // This effect ensures that when the part prop changes, we reset the target.
  // Although the component is likely re-mounted, this is a safeguard.
  useEffect(() => {
    setTarget(null);
  }, [part.id]);

  // Using useCallback for event handlers to prevent re-creation on every render.
  const handleTransformChange = useCallback(
    (e: THREE.Event | undefined) => {
      // The `e.target.object` is the most reliable source for the object's current state.
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
    // On transform end, we can rely on the `target` from state, which is safe
    // because the controls wouldn't exist without it.
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

      {/* Conditionally render TransformControls only when the target is set.
          This fixes the "not a part of the scene graph" error and the perceived delay. */}
      {target && (
        <TransformControls
          object={target}
          mode={mode}
          onMouseDown={onTransformStart}
          onChange={handleTransformChange}
          onMouseUp={handleTransformEnd}
          key={part.id} // Add key to ensure a fresh instance when part changes
        />
      )}
    </>
  );
}
