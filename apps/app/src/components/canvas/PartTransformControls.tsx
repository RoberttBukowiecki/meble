'use client';

import { useCallback, useState, useRef } from 'react';
import { TransformControls } from '@react-three/drei';
import { useStore } from '@/lib/store';
import * as THREE from 'three';
import type { Part } from '@/types';
import { pickTransform } from '@/lib/store/history/utils';

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
  const beginBatch = useStore((state) => state.beginBatch);
  const commitBatch = useStore((state) => state.commitBatch);
  const initialTransformRef = useRef<{ position: [number, number, number]; rotation: [number, number, number] } | null>(null);

  // The `useState` with ref callback pattern is correct for avoiding the race condition.
  // We conditionally render the TransformControls only when the target object is mounted.

  const handleTransformStart = useCallback(() => {
    // Capture initial transform state
    initialTransformRef.current = pickTransform(part);

    // Begin history batch
    beginBatch('TRANSFORM_PART', {
      targetId: part.id,
      before: initialTransformRef.current,
    });

    // Call parent callback
    onTransformStart();
  }, [part, beginBatch, onTransformStart]);

  const handleTransformChange = useCallback(
    (e: THREE.Event | undefined) => {
      const group = (e?.target as any)?.object as THREE.Group;
      if (!group) return;

      const position = group.position.toArray() as [number, number, number];
      const rotation = group.rotation.toArray().slice(0, 3) as [
        number,
        number,
        number
      ];

      // Update the part in the store (live update, skipHistory=true to avoid per-frame entries)
      updatePart(part.id, { position, rotation }, true);
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

    // Final update to store (still skip history as it will be recorded in batch)
    updatePart(part.id, { position, rotation }, true);

    // Commit history batch with final transform
    commitBatch({
      after: {
        position,
        rotation,
      },
    });

    // Call the parent callback
    onTransformEnd();
  }, [part.id, updatePart, commitBatch, onTransformEnd, target]);

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
          onMouseDown={handleTransformStart}
          onChange={handleTransformChange}
          onMouseUp={handleTransformEnd}
        />
      )}
    </>
  );
}

