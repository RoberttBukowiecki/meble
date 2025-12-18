'use client';

/**
 * ResizePreviewMesh - Shows part preview during resize drag
 */

import { PART_CONFIG } from '@/lib/config';

// ============================================================================
// Types
// ============================================================================

export interface ResizePreviewMeshProps {
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  height: number;
  depth: number;
  color: string;
  hasCollision?: boolean;
  isSelected?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function ResizePreviewMesh({
  position,
  rotation,
  width,
  height,
  depth,
  color,
  hasCollision = false,
  isSelected = false,
}: ResizePreviewMeshProps) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial
        color={color}
        emissive={
          hasCollision
            ? PART_CONFIG.COLLISION_EMISSIVE_COLOR
            : isSelected
            ? PART_CONFIG.SELECTION_EMISSIVE_COLOR
            : '#000000'
        }
        emissiveIntensity={
          hasCollision
            ? PART_CONFIG.COLLISION_EMISSIVE_INTENSITY
            : isSelected
            ? PART_CONFIG.SELECTION_EMISSIVE_INTENSITY
            : 0
        }
      />
    </mesh>
  );
}
