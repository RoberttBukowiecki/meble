'use client';

/**
 * ResizeHandleMesh - Reusable resize handle component for 3D scene
 */

import { useMemo } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { PART_CONFIG } from '@/lib/config';

// ============================================================================
// Constants
// ============================================================================

/** Visual size of resize handle in mm */
export const HANDLE_SIZE = 20;

/** Hitbox size for easier clicking (invisible, larger) */
export const HITBOX_SIZE = 50;

// ============================================================================
// Types
// ============================================================================

export interface ResizeHandleMeshProps {
  /** Position in world space */
  position: [number, number, number];
  /** Normal direction (outward facing) */
  normal: [number, number, number];
  /** Handle identifier for event handling */
  handleId: string;
  /** Whether this handle is being dragged */
  isDragging: boolean;
  /** Whether this handle is hovered */
  isHovered: boolean;
  /** Whether there's a collision */
  hasCollision?: boolean;
  /** Pointer down handler */
  onPointerDown: (e: ThreeEvent<PointerEvent>, handleId: string) => void;
  /** Pointer enter handler */
  onPointerEnter: (handleId: string) => void;
  /** Pointer leave handler */
  onPointerLeave: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function ResizeHandleMesh({
  position,
  normal,
  handleId,
  isDragging,
  isHovered,
  hasCollision = false,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
}: ResizeHandleMeshProps) {
  // Calculate handle rotation to face outward
  const handleRotation = useMemo(() => {
    const normalVec = new THREE.Vector3(...normal);
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion();

    // Handle edge cases for parallel/anti-parallel vectors
    const dot = up.dot(normalVec);
    if (Math.abs(dot) > 0.9999) {
      // Vectors are nearly parallel or anti-parallel
      quaternion.setFromUnitVectors(up, normalVec);
    } else {
      quaternion.setFromUnitVectors(up, normalVec);
    }

    const euler = new THREE.Euler().setFromQuaternion(quaternion);
    return [euler.x, euler.y, euler.z] as [number, number, number];
  }, [normal]);

  // Handle color based on state
  const color = useMemo(() => {
    if (hasCollision) return PART_CONFIG.COLLISION_EMISSIVE_COLOR;
    if (isDragging) return PART_CONFIG.RESIZE_HANDLE_ACTIVE_COLOR;
    if (isHovered) return PART_CONFIG.RESIZE_HANDLE_HOVER_COLOR;
    return PART_CONFIG.RESIZE_HANDLE_COLOR;
  }, [isDragging, isHovered, hasCollision]);

  const emissiveIntensity = useMemo(() => {
    if (hasCollision) return PART_CONFIG.COLLISION_EMISSIVE_INTENSITY;
    if (isDragging) return PART_CONFIG.RESIZE_HANDLE_ACTIVE_EMISSIVE_INTENSITY;
    if (isHovered) return PART_CONFIG.RESIZE_HANDLE_HOVER_EMISSIVE_INTENSITY;
    return PART_CONFIG.RESIZE_HANDLE_EMISSIVE_INTENSITY;
  }, [isDragging, isHovered, hasCollision]);

  const scale = isHovered || isDragging ? 1.2 : 1;

  return (
    <group position={position} rotation={handleRotation}>
      {/* Invisible hitbox for easier clicking */}
      <mesh
        onPointerDown={(e) => onPointerDown(e, handleId)}
        onPointerEnter={() => onPointerEnter(handleId)}
        onPointerLeave={onPointerLeave}
      >
        <boxGeometry args={[HITBOX_SIZE, 5, HITBOX_SIZE]} />
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* Visible handle */}
      <mesh scale={scale}>
        <boxGeometry args={[HANDLE_SIZE, 5, HANDLE_SIZE]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>
    </group>
  );
}
