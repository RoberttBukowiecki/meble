import type {
  Part,
  HistoryEntry,
  HistoryEntryType,
  HistoryEntryKind,
  TransformSnapshot,
} from '@/types';

/**
 * Deep equality check for comparing history snapshots
 * @param a - First value to compare
 * @param b - Second value to compare
 * @returns true if values are deeply equal
 */
export function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!isEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
      return false;
    }
  }

  return true;
}

/**
 * Extract transform properties from a part for history snapshot
 * @param part - Part to extract transform from
 * @returns Transform snapshot with position, rotation, and optional scale
 */
export function pickTransform(part: Part): TransformSnapshot {
  return {
    position: [...part.position] as [number, number, number],
    rotation: [...part.rotation] as [number, number, number],
  };
}

/**
 * Extract material-related properties from a part
 * @param part - Part to extract material properties from
 * @returns Partial part with only material-related fields
 */
export function pickMaterialChange(part: Part): Partial<Part> {
  return {
    materialId: part.materialId,
    depth: part.depth,
  };
}

/**
 * Estimate the size in bytes of history stacks
 * Used to enforce optional size limits
 * @param undoStack - Array of undo entries
 * @param milestoneStack - Array of milestone entries
 * @returns Approximate size in bytes
 */
export function estimateByteSize(
  undoStack: HistoryEntry[],
  milestoneStack: HistoryEntry[]
): number {
  try {
    const json = JSON.stringify({ undoStack, milestoneStack });
    return new Blob([json]).size;
  } catch {
    // Fallback estimation if JSON stringification fails
    return (undoStack.length + milestoneStack.length) * 500; // ~500 bytes per entry
  }
}

/**
 * Infer the history entry kind from its type
 * Used for UI grouping and filtering
 * @param type - History entry type
 * @returns Corresponding kind category
 */
export function inferKindFromType(type: HistoryEntryType): HistoryEntryKind {
  if (type.includes('CABINET')) return 'cabinet';
  if (type.includes('MATERIAL')) return 'material';
  if (type === 'SELECTION') return 'selection';
  if (type.includes('GROUP')) return 'misc';
  if (type.includes('TRANSFORM') || type.includes('PART')) return 'geometry';
  return 'misc';
}

/**
 * Create a mapping between old and new part IDs after cabinet regeneration
 * Matches parts based on their properties and order
 * @param oldParts - Original parts before regeneration
 * @param newParts - New parts after regeneration
 * @returns Map of old part ID to new part ID
 */
export function createPartIdMap(
  oldParts: Part[],
  newParts: Part[]
): Record<string, string> {
  const map: Record<string, string> = {};

  // Match by cabinet metadata role and index for deterministic mapping
  oldParts.forEach((oldPart) => {
    if (!oldPart.cabinetMetadata) return;

    const matchingNew = newParts.find(
      (newPart) =>
        newPart.cabinetMetadata?.role === oldPart.cabinetMetadata?.role &&
        newPart.cabinetMetadata?.index === oldPart.cabinetMetadata?.index
    );

    if (matchingNew) {
      map[oldPart.id] = matchingNew.id;
    }
  });

  return map;
}

/**
 * Generate a unique ID for history entries and batches
 * @returns UUID string
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Pick only the specified fields from an object
 * Used for creating minimal history snapshots
 * @param obj - Source object
 * @param keys - Array of keys to extract
 * @returns Partial object with only specified fields
 */
export function pickFields<T extends Record<string, any>>(
  obj: T,
  keys: (keyof T)[]
): Partial<T> {
  const result: Partial<T> = {};
  keys.forEach((key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

/**
 * Determine the appropriate label for an updatePart operation
 * based on which fields were changed
 * @param patch - Partial part update
 * @returns Localized label string
 */
export function getUpdatePartLabel(patch: Partial<Part>): string {
  if ('name' in patch) return 'Zmieniono nazwę części';
  if ('materialId' in patch) return 'Zmieniono materiał części';
  if ('shapeParams' in patch) return 'Zmieniono wymiary części';
  if ('edgeBanding' in patch) return 'Zmieniono okleinowanie';
  if ('position' in patch || 'rotation' in patch) return 'Przesunięto część';
  if ('group' in patch) return 'Zmieniono grupę części';
  if ('notes' in patch) return 'Zmieniono notatki części';
  return 'Zaktualizowano część';
}
