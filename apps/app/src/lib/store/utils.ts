import { Euler, Quaternion, Vector3 } from 'three';
import type { Material, Part, ProjectState } from '@/types';

let collisionDetectionTimeout: NodeJS.Timeout | null = null;

const COLLISION_DETECTION_DEBOUNCE_MS = 100;

export const getCabinetTransform = (parts: Part[]) => {
  const center = new Vector3();
  if (parts.length > 0) {
    parts.forEach((p) => center.add(new Vector3().fromArray(p.position)));
    center.divideScalar(parts.length);
  }

  const referencePart =
    parts.find((p) => p.cabinetMetadata?.role === 'BOTTOM') ?? parts[0];

  const rotation = referencePart?.rotation
    ? new Quaternion().setFromEuler(new Euler().fromArray(referencePart.rotation))
    : new Quaternion();

  return { center, rotation };
};

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
