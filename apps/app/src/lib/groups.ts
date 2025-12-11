import { sanitizeName } from './naming';

const MANUAL_GROUP_PREFIX = 'manual::';
const SEPARATOR = '::';

export interface ManualGroupIdentifier {
  furnitureId: string;
  name: string;
}

export function buildManualGroupId(furnitureId: string, groupName: string): string {
  return `${MANUAL_GROUP_PREFIX}${furnitureId}${SEPARATOR}${groupName}`;
}

export function parseManualGroupId(groupId: string): ManualGroupIdentifier | null {
  if (!groupId.startsWith(MANUAL_GROUP_PREFIX)) return null;
  const withoutPrefix = groupId.slice(MANUAL_GROUP_PREFIX.length);
  const separatorIndex = withoutPrefix.indexOf(SEPARATOR);
  if (separatorIndex === -1) return null;

  const furnitureId = withoutPrefix.slice(0, separatorIndex);
  const name = withoutPrefix.slice(separatorIndex + SEPARATOR.length);
  if (!furnitureId) return null;

  const normalized = sanitizeName(name);
  if (!normalized) return null;

  return { furnitureId, name: normalized };
}
