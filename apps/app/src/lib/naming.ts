'use client';

/**
 * Shared helpers for user-facing names and inline renaming.
 */

export const NAME_MAX_LENGTH = 120;

/**
 * Trim and clamp a user-provided name. Returns null when the name
 * becomes empty after trimming.
 */
export function sanitizeName(value: string, maxLength: number = NAME_MAX_LENGTH): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}
