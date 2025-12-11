import type { HistoryEntryType } from '@/types';

/**
 * Maximum number of entries in the undo stack
 */
export const HISTORY_MAX_LENGTH = 100;

/**
 * Maximum number of milestone entries to preserve
 */
export const HISTORY_MAX_MILESTONES = 10;

/**
 * Optional hard limit for history size in bytes (~10MB)
 */
export const HISTORY_MAX_SIZE_BYTES = 10_000_000;

/**
 * Current persist version for store migration
 */
export const HISTORY_PERSIST_VERSION = 3;

/**
 * Polish labels for UI display of history operations
 * NOTE: These will be moved to i18n system before release
 */
export const HISTORY_LABELS: Record<HistoryEntryType, string> = {
  ADD_PART: 'Dodano część',
  REMOVE_PART: 'Usunięto część',
  UPDATE_PART: 'Zaktualizowano część',
  TRANSFORM_PART: 'Przesunięto część',
  DUPLICATE_PART: 'Powielono część',
  TRANSFORM_CABINET: 'Przesunięto szafkę',
  ADD_CABINET: 'Dodano szafkę',
  REMOVE_CABINET: 'Usunięto szafkę',
  UPDATE_CABINET: 'Zaktualizowano szafkę',
  DUPLICATE_CABINET: 'Powielono szafkę',
  REGENERATE_CABINET: 'Przebudowano szafkę',
  SELECTION: 'Wybór elementu',
  MILESTONE: 'Punkt kontrolny',
};
