import { Euler, Quaternion, Vector3 } from 'three';
import type { Material, Part, ProjectState } from '@/types';
import { isBodyPartRole } from '@/types/cabinet';

let collisionDetectionTimeout: NodeJS.Timeout | null = null;

const COLLISION_DETECTION_DEBOUNCE_MS = 100;

/**
 * Default construction rotations for cabinet parts.
 * These are the rotations parts have when the cabinet has no world rotation.
 */
const DEFAULT_PART_ROTATIONS: Record<string, [number, number, number]> = {
  BOTTOM: [-Math.PI / 2, 0, 0],
  TOP: [-Math.PI / 2, 0, 0],
  LEFT_SIDE: [0, Math.PI / 2, 0],
  RIGHT_SIDE: [0, Math.PI / 2, 0],
  SHELF: [-Math.PI / 2, 0, 0],
  BACK: [0, 0, 0],
  DOOR: [0, 0, 0],
  DRAWER_FRONT: [0, 0, 0],
  DRAWER_BOTTOM: [-Math.PI / 2, 0, 0],
  DRAWER_SIDE_LEFT: [0, Math.PI / 2, 0],
  DRAWER_SIDE_RIGHT: [0, Math.PI / 2, 0],
  DRAWER_BACK: [0, 0, 0],
};

/**
 * Get the cabinet's world transform (position and rotation).
 * The rotation returned is the CABINET's rotation, not the part's full rotation.
 * This is calculated by factoring out the part's default construction rotation.
 */
export const getCabinetTransform = (parts: Part[]) => {
  const center = new Vector3();
  if (parts.length > 0) {
    parts.forEach((p) => center.add(new Vector3().fromArray(p.position)));
    center.divideScalar(parts.length);
  }

  const referencePart =
    parts.find((p) => p.cabinetMetadata?.role === 'BOTTOM') ?? parts[0];

  if (!referencePart?.rotation) {
    return { center, rotation: new Quaternion() };
  }

  // Get the part's current full rotation
  const currentRotation = new Quaternion().setFromEuler(
    new Euler().fromArray(referencePart.rotation)
  );

  // Get the part's default construction rotation
  const role = referencePart.cabinetMetadata?.role ?? 'BOTTOM';
  const defaultRotationArray = DEFAULT_PART_ROTATIONS[role] ?? [0, 0, 0];
  const defaultRotation = new Quaternion().setFromEuler(
    new Euler().fromArray(defaultRotationArray)
  );

  // Cabinet rotation = currentRotation * inverse(defaultRotation)
  // This gives us just the world rotation applied to the cabinet
  const cabinetRotation = currentRotation.clone().multiply(defaultRotation.clone().invert());

  return { center, rotation: cabinetRotation };
};

/**
 * Filter parts to only include cabinet body parts (excludes doors, fronts, decorative).
 * Returns original parts array if no body parts found.
 */
export function filterBodyParts(parts: Part[]): Part[] {
  const bodyParts = parts.filter(p => isBodyPartRole(p.cabinetMetadata?.role));
  return bodyParts.length > 0 ? bodyParts : parts;
}

/**
 * Get cabinet transform using only body parts for center calculation.
 * This prevents the center from being shifted by doors/fronts that stick out.
 */
export function getCabinetBodyTransform(allParts: Part[]) {
  const bodyParts = filterBodyParts(allParts);
  return getCabinetTransform(bodyParts);
}

export const applyCabinetTransform = <
  T extends Omit<Part, 'id' | 'createdAt' | 'updatedAt'>
>(
  generatedParts: T[],
  targetCenter: Vector3,
  rotation: Quaternion
) => {
  if (generatedParts.length === 0) return generatedParts;

  const baseCenter = new Vector3();
  generatedParts.forEach((p) => baseCenter.add(new Vector3().fromArray(p.position)));
  baseCenter.divideScalar(generatedParts.length);

  const rotatedBaseCenter = baseCenter.clone().applyQuaternion(rotation);
  const offset = targetCenter.clone().sub(rotatedBaseCenter);

  return generatedParts.map((part) => {
    const finalPosition = new Vector3()
      .fromArray(part.position)
      .applyQuaternion(rotation)
      .add(offset);

    const partQuat = new Quaternion().setFromEuler(new Euler().fromArray(part.rotation));
    const finalQuat = partQuat.premultiply(rotation);
    const finalEuler = new Euler().setFromQuaternion(finalQuat);

    return {
      ...part,
      position: finalPosition.toArray() as [number, number, number],
      rotation: [finalEuler.x, finalEuler.y, finalEuler.z] as [
        number,
        number,
        number
      ],
    };
  });
};

export function triggerDebouncedCollisionDetection(
  getState: () => ProjectState
): void {
  if (collisionDetectionTimeout) {
    clearTimeout(collisionDetectionTimeout);
  }

  collisionDetectionTimeout = setTimeout(() => {
    const state = getState();
    state.detectCollisions();
    collisionDetectionTimeout = null;
  }, COLLISION_DETECTION_DEBOUNCE_MS);
}

export function getDefaultMaterials(materials: Material[]) {
  const defaults = materials.filter((material) => material.isDefault);

  const default_material = defaults[0]?.id ?? materials[0]?.id ?? '';
  const default_front_material =
    defaults[1]?.id ??
    defaults[0]?.id ??
    materials[1]?.id ??
    default_material;

  return { default_material, default_front_material };
}

/**
 * Get the default back material (HDF) for cabinets
 * Prioritizes HDF materials, falls back to thinnest available material
 */
export function getDefaultBackMaterial(materials: Material[]): Material | undefined {
  // First try to find HDF material
  const hdfMaterial = materials.find((m) => m.category === 'hdf');
  if (hdfMaterial) return hdfMaterial;

  // Fallback to thinnest material
  const sorted = [...materials].sort((a, b) => a.thickness - b.thickness);
  return sorted[0];
}
