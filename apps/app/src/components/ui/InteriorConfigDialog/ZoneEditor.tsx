"use client";

/**
 * Zone Editor - Re-export from refactored module
 *
 * This file maintains backwards compatibility with existing imports.
 * The actual implementation has been refactored into smaller components
 * in the ZoneEditor/ folder.
 */

// Re-export everything from the refactored module
export {
  ZoneEditor,
  ZoneTypeSelector,
  HeightConfig,
  WidthConfig,
  ShelvesEditor,
  DrawersEditor,
  NestedEditor,
  ZONE_TYPE_COLORS,
} from "./ZoneEditor/index";

// Default export for backwards compatibility
export { default } from "./ZoneEditor/index";
