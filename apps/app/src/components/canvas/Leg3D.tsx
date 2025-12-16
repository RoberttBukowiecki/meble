'use client';

/**
 * 3D representation of a cabinet leg
 * Renders different leg shapes (round, square) with appropriate finishes
 */

import { useMemo } from 'react';
import { DoubleSide } from 'three';
import type { LegData } from '@/types';

interface Leg3DProps {
  leg: LegData;
}

/**
 * Single leg component - renders at the given position
 */
export function Leg3D({ leg }: Leg3DProps) {
  const { position, shape, color, height, diameter } = leg;

  // Leg center Y is at height/2 (legs start at Y=0 ground plane)
  const legCenterY = height / 2;
  const radius = diameter / 2;

  const geometry = useMemo(() => {
    if (shape === 'ROUND') {
      return (
        <cylinderGeometry args={[radius, radius, height, 16]} />
      );
    } else {
      // SQUARE - box geometry
      return (
        <boxGeometry args={[diameter, height, diameter]} />
      );
    }
  }, [shape, radius, height, diameter]);

  return (
    <mesh position={[position.x, legCenterY, position.z]}>
      {geometry}
      <meshStandardMaterial
        color={color}
        metalness={shape === 'ROUND' ? 0.3 : 0.1}
        roughness={0.7}
        side={DoubleSide}
      />
    </mesh>
  );
}

interface CabinetLegsProps {
  legs: LegData[];
}

/**
 * Renders all legs for a cabinet
 */
export function CabinetLegs({ legs }: CabinetLegsProps) {
  if (!legs || legs.length === 0) return null;

  return (
    <group name="cabinet-legs">
      {legs.map((leg) => (
        <Leg3D key={leg.index} leg={leg} />
      ))}
    </group>
  );
}
