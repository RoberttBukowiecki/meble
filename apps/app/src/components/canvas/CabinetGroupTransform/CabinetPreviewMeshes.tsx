"use client";

/**
 * Cabinet Preview Mesh Components
 *
 * Visual preview meshes rendered during cabinet transformation.
 * These components show a preview of where parts will be positioned
 * without updating the store until the transform is complete.
 */

import { useMemo } from "react";
import * as THREE from "three";
import { useMaterial } from "@/lib/store";
import type { Part } from "@/types";
import type { LegData } from "@/types";
import { CabinetTransformDomain } from "@/lib/domain";
import { PART_CONFIG, MATERIAL_CONFIG } from "@/lib/config";

// ============================================================================
// Types
// ============================================================================

export type PreviewTransformMap = Map<
  string,
  { position: [number, number, number]; rotation: [number, number, number] }
>;

// ============================================================================
// Preview Part Mesh
// ============================================================================

interface PreviewPartMeshProps {
  part: Part;
  previewPosition: [number, number, number];
  previewRotation: [number, number, number];
}

export function PreviewPartMesh({ part, previewPosition, previewRotation }: PreviewPartMeshProps) {
  const material = useMaterial(part.materialId);
  const color = material?.color || MATERIAL_CONFIG.DEFAULT_MATERIAL_COLOR;

  return (
    <mesh position={previewPosition} rotation={previewRotation} castShadow receiveShadow>
      <boxGeometry args={[part.width, part.height, part.depth]} />
      <meshStandardMaterial
        color={color}
        emissive={PART_CONFIG.CABINET_SELECTION_EMISSIVE_COLOR}
        emissiveIntensity={PART_CONFIG.CABINET_SELECTION_EMISSIVE_INTENSITY}
      />
    </mesh>
  );
}

// ============================================================================
// Preview Countertop Mesh
// ============================================================================

interface PreviewCountertopMeshProps {
  position: [number, number, number];
  rotation: [number, number, number];
  dimensions: { width: number; height: number; depth: number };
  color: string;
}

export function PreviewCountertopMesh({
  position,
  rotation,
  dimensions,
  color,
}: PreviewCountertopMeshProps) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={[dimensions.width, dimensions.height, dimensions.depth]} />
      <meshStandardMaterial
        color={color}
        emissive={PART_CONFIG.CABINET_SELECTION_EMISSIVE_COLOR}
        emissiveIntensity={PART_CONFIG.CABINET_SELECTION_EMISSIVE_INTENSITY}
      />
    </mesh>
  );
}

// ============================================================================
// Preview Leg Mesh
// ============================================================================

interface PreviewLegMeshProps {
  leg: LegData;
  groupPosition: [number, number, number];
  groupRotation: THREE.Euler;
}

/**
 * Single leg preview mesh - transforms leg position based on group transform
 */
function PreviewLegMesh({ leg, groupPosition, groupRotation }: PreviewLegMeshProps) {
  const { position, shape, color, height, diameter } = leg;

  const worldPos = useMemo(() => {
    const legCenterY = height / 2;
    const rotationQuat = new THREE.Quaternion().setFromEuler(groupRotation);
    const localPos = new THREE.Vector3(position.x, legCenterY, position.z);
    localPos.applyQuaternion(rotationQuat);

    return [
      groupPosition[0] + localPos.x,
      groupPosition[1] + localPos.y,
      groupPosition[2] + localPos.z,
    ] as [number, number, number];
  }, [position.x, position.z, height, groupPosition, groupRotation]);

  const rotation: [number, number, number] = useMemo(
    () => [groupRotation.x, groupRotation.y, groupRotation.z],
    [groupRotation.x, groupRotation.y, groupRotation.z]
  );

  const radius = diameter / 2;

  return (
    <mesh position={worldPos} rotation={rotation}>
      {shape === "ROUND" ? (
        <cylinderGeometry args={[radius, radius, height, 16]} />
      ) : (
        <boxGeometry args={[diameter, height, diameter]} />
      )}
      <meshStandardMaterial
        color={color}
        metalness={shape === "ROUND" ? 0.3 : 0.1}
        roughness={0.7}
        emissive={PART_CONFIG.CABINET_SELECTION_EMISSIVE_COLOR}
        emissiveIntensity={PART_CONFIG.CABINET_SELECTION_EMISSIVE_INTENSITY}
      />
    </mesh>
  );
}

// ============================================================================
// Preview Legs Group
// ============================================================================

interface PreviewLegsProps {
  legs: LegData[];
  parts: Part[];
  previewTransforms: PreviewTransformMap;
  groupRotation: THREE.Euler;
}

/**
 * Renders all legs preview during cabinet transformation.
 * Uses geometric bounds (true center) instead of position average.
 */
export function PreviewLegs({ legs, parts, previewTransforms, groupRotation }: PreviewLegsProps) {
  const legsAnchor = useMemo(() => {
    // Use geometric bounds for correct positioning at all rotations
    const bounds = CabinetTransformDomain.getCabinetGeometricBoundsFromPreview(
      parts,
      previewTransforms
    );
    return CabinetTransformDomain.getLegsAnchorPoint(bounds);
  }, [parts, previewTransforms]);

  return (
    <>
      {legs.map((leg) => (
        <PreviewLegMesh
          key={`preview-leg-${leg.index}`}
          leg={leg}
          groupPosition={legsAnchor.position}
          groupRotation={groupRotation}
        />
      ))}
    </>
  );
}
