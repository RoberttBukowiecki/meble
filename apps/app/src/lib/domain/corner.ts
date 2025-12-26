/**
 * Corner Cabinet Domain Module
 *
 * Handles corner cabinet operations:
 * - Full rectangular cabinet (W × H × D) positioned in a corner
 * - Two vertical sides: internal (at wall) and external (where other cabinet joins)
 * - Front opening divided into: closed panel + door
 *
 * Coordinate system:
 * - Origin (0,0,0) at front-left corner at floor level
 * - X axis: Points RIGHT (0 to W)
 * - Y axis: Points UP (0 to H)
 * - Z axis: Points BACK (0 to D, into the corner)
 */

import type {
  CornerConfig,
  CornerInternalCabinetParams,
  CornerWallSide,
  CornerDoorPosition,
  CornerFrontType,
  CornerMountType,
} from "@/types";
import type { ValidationResult } from "./types";
import { validResult, invalidResult } from "./types";
import { DEFAULT_BACK_OVERLAP_RATIO } from "@/lib/config";

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default corner cabinet configuration values
 */
export const CORNER_DEFAULTS = {
  W: 1050, // Full cabinet width (calculated so frontPanel + t = 580mm = standard cabinet depth)
  D: 580, // Cabinet depth (same as standard KITCHEN cabinet)
  bottomMount: "inset" as CornerMountType,
  topMount: "inset" as CornerMountType,
  frontType: "SINGLE" as CornerFrontType,
  doorGap: 2,
  wallSide: "LEFT" as CornerWallSide,
  doorPosition: "RIGHT" as CornerDoorPosition,
  doorWidth: 450, // Default door width
} as const;

/**
 * Corner cabinet dimension limits (mm)
 */
export const CORNER_LIMITS = {
  MIN_W: 400,
  MAX_W: 1500,
  MIN_D: 300,
  MAX_D: 900,
  MIN_HEIGHT: 200,
  MAX_HEIGHT: 2500,
  MIN_DOOR_WIDTH: 200,
  MAX_DOOR_WIDTH: 800,
} as const;

// ============================================================================
// CornerDomain Module
// ============================================================================

export const CornerDomain = {
  // Constants (exposed for external use)
  CORNER_DEFAULTS,
  CORNER_LIMITS,

  // ==========================================================================
  // CREATORS - Functions that create new configurations
  // ==========================================================================

  /**
   * Create a new corner configuration with defaults
   */
  createConfig: (wallSide: CornerWallSide = "LEFT"): CornerConfig => ({
    wallSide,
    W: CORNER_DEFAULTS.W,
    D: CORNER_DEFAULTS.D,
    bottomMount: CORNER_DEFAULTS.bottomMount,
    topMount: CORNER_DEFAULTS.topMount,
    frontType: CORNER_DEFAULTS.frontType,
    doorGap: CORNER_DEFAULTS.doorGap,
    doorPosition: CORNER_DEFAULTS.doorPosition,
    doorWidth: CORNER_DEFAULTS.doorWidth,
  }),

  /**
   * Create corner internal cabinet params with defaults
   */
  createParams: (
    width: number,
    height: number,
    depth: number,
    cornerConfig?: Partial<CornerConfig>
  ): CornerInternalCabinetParams => ({
    type: "CORNER_INTERNAL",
    width, // = W (full width)
    height,
    depth, // = D (cabinet depth)
    topBottomPlacement: "inset",
    hasBack: true,
    backOverlapRatio: DEFAULT_BACK_OVERLAP_RATIO,
    backMountType: "overlap",
    cornerConfig: { ...CornerDomain.createConfig(), ...cornerConfig },
  }),

  // ==========================================================================
  // UPDATERS - Functions that return modified copies (immutable)
  // ==========================================================================

  /**
   * Update dimensions (W, D)
   */
  updateDimensions: (config: CornerConfig, W: number, D: number): CornerConfig => ({
    ...config,
    W: Math.max(CORNER_LIMITS.MIN_W, Math.min(CORNER_LIMITS.MAX_W, W)),
    D: Math.max(CORNER_LIMITS.MIN_D, Math.min(CORNER_LIMITS.MAX_D, D)),
  }),

  /**
   * Update wall side (which side is at the wall)
   */
  updateWallSide: (config: CornerConfig, wallSide: CornerWallSide): CornerConfig => ({
    ...config,
    wallSide,
  }),

  /**
   * Update door position (which side of front has the door)
   */
  updateDoorPosition: (config: CornerConfig, doorPosition: CornerDoorPosition): CornerConfig => ({
    ...config,
    doorPosition,
  }),

  /**
   * Update door width
   */
  updateDoorWidth: (config: CornerConfig, doorWidth: number): CornerConfig => ({
    ...config,
    doorWidth: Math.max(
      CORNER_LIMITS.MIN_DOOR_WIDTH,
      Math.min(CORNER_LIMITS.MAX_DOOR_WIDTH, doorWidth)
    ),
  }),

  /**
   * Update bottom mount type
   */
  updateBottomMount: (config: CornerConfig, mount: CornerMountType): CornerConfig => ({
    ...config,
    bottomMount: mount,
  }),

  /**
   * Update top mount type
   */
  updateTopMount: (config: CornerConfig, mount: CornerMountType): CornerConfig => ({
    ...config,
    topMount: mount,
  }),

  /**
   * Update front type
   */
  updateFrontType: (config: CornerConfig, frontType: CornerFrontType): CornerConfig => ({
    ...config,
    frontType,
  }),

  /**
   * Update hinge side
   */
  updateHingeSide: (config: CornerConfig, side: "left" | "right"): CornerConfig => ({
    ...config,
    hingeSide: side,
  }),

  // ==========================================================================
  // CALCULATORS - Pure calculation functions
  // ==========================================================================

  /**
   * Calculate front closing panel width (opposite to door)
   */
  calculateFrontPanelWidth: (config: CornerConfig, bodyThickness: number): number => {
    const doorWidth = config.doorWidth ?? CORNER_DEFAULTS.doorWidth;
    const gap = config.doorGap ?? CORNER_DEFAULTS.doorGap;
    // Full width minus door minus gaps minus side thicknesses
    return config.W - doorWidth - gap * 3 - bodyThickness * 2;
  },

  /**
   * Calculate side height based on mount types
   */
  calculateSideHeight: (
    cabinetHeight: number,
    bottomMount: CornerMountType,
    topMount: CornerMountType,
    thickness: number
  ): number => {
    const bottomOffset = bottomMount === "inset" ? 0 : thickness;
    const topOffset = topMount === "inset" ? 0 : thickness;
    return cabinetHeight - bottomOffset - topOffset;
  },

  /**
   * Calculate the cabinet bounding box dimensions
   */
  calculateBoundingBox: (
    config: CornerConfig,
    cabinetHeight: number
  ): { width: number; height: number; depth: number } => ({
    width: config.W,
    height: cabinetHeight,
    depth: config.D,
  }),

  /**
   * Calculate interior space dimensions (inside the cabinet)
   */
  calculateInteriorSpace: (
    config: CornerConfig,
    cabinetHeight: number,
    bodyThickness: number,
    backThickness: number
  ): { width: number; height: number; depth: number } => ({
    width: config.W - bodyThickness * 2, // minus both sides
    height: cabinetHeight - bodyThickness * 2, // minus top/bottom (for inset)
    depth: config.D - bodyThickness - backThickness, // minus front and back
  }),

  // ==========================================================================
  // VALIDATORS - Functions that check validity
  // ==========================================================================

  /**
   * Validate corner configuration
   */
  validate: (config: CornerConfig): ValidationResult => {
    const errors: string[] = [];

    // W validation
    if (config.W < CORNER_LIMITS.MIN_W || config.W > CORNER_LIMITS.MAX_W) {
      errors.push(`Szerokość W musi być między ${CORNER_LIMITS.MIN_W}-${CORNER_LIMITS.MAX_W}mm`);
    }

    // D validation
    if (config.D < CORNER_LIMITS.MIN_D || config.D > CORNER_LIMITS.MAX_D) {
      errors.push(`Głębokość D musi być między ${CORNER_LIMITS.MIN_D}-${CORNER_LIMITS.MAX_D}mm`);
    }

    // Door width validation
    const doorWidth = config.doorWidth ?? CORNER_DEFAULTS.doorWidth;
    if (doorWidth < CORNER_LIMITS.MIN_DOOR_WIDTH || doorWidth > CORNER_LIMITS.MAX_DOOR_WIDTH) {
      errors.push(
        `Szerokość drzwi musi być między ${CORNER_LIMITS.MIN_DOOR_WIDTH}-${CORNER_LIMITS.MAX_DOOR_WIDTH}mm`
      );
    }

    // Door width must be less than cabinet width
    if (doorWidth >= config.W - 100) {
      errors.push("Szerokość drzwi musi być mniejsza niż szerokość szafki - 100mm");
    }

    return errors.length === 0 ? validResult() : invalidResult(...errors);
  },

  /**
   * Validate corner cabinet params
   */
  validateParams: (params: CornerInternalCabinetParams): ValidationResult => {
    const errors: string[] = [];

    // Height validation
    if (params.height < CORNER_LIMITS.MIN_HEIGHT || params.height > CORNER_LIMITS.MAX_HEIGHT) {
      errors.push(
        `Wysokość musi być między ${CORNER_LIMITS.MIN_HEIGHT}-${CORNER_LIMITS.MAX_HEIGHT}mm`
      );
    }

    // Validate corner config
    const configValidation = CornerDomain.validate(params.cornerConfig);
    if (!configValidation.valid) {
      errors.push(...configValidation.errors);
    }

    return errors.length === 0 ? validResult() : invalidResult(...errors);
  },

  // ==========================================================================
  // QUERIES - Functions that extract information
  // ==========================================================================

  /**
   * Check if corner has a front door
   */
  hasFront: (config: CornerConfig): boolean => config.frontType !== "NONE",

  /**
   * Check if wall is on left side
   */
  isWallLeft: (config: CornerConfig): boolean => config.wallSide === "LEFT",

  /**
   * Check if door is on left side
   */
  isDoorLeft: (config: CornerConfig): boolean => config.doorPosition === "LEFT",

  /**
   * Get wall side label in Polish
   */
  getWallSideLabel: (side: CornerWallSide): string => {
    const labels: Record<CornerWallSide, string> = {
      LEFT: "Lewa (przy ścianie)",
      RIGHT: "Prawa (przy ścianie)",
    };
    return labels[side];
  },

  /**
   * Get door position label in Polish
   */
  getDoorPositionLabel: (position: CornerDoorPosition): string => {
    const labels: Record<CornerDoorPosition, string> = {
      LEFT: "Drzwi po lewej",
      RIGHT: "Drzwi po prawej",
    };
    return labels[position];
  },

  /**
   * Get front type label in Polish
   */
  getFrontTypeLabel: (frontType: CornerFrontType): string => {
    const labels: Record<CornerFrontType, string> = {
      NONE: "Brak",
      SINGLE: "Drzwi + panel",
    };
    return labels[frontType];
  },

  /**
   * Get human-readable summary of corner config
   */
  getSummary: (config: CornerConfig): string => {
    const dims = `${config.W}×${config.D}mm`;
    const wall = config.wallSide === "LEFT" ? "L" : "P";
    const door = config.doorPosition === "LEFT" ? "L" : "P";

    return `Narożna ${dims} (ściana: ${wall}, drzwi: ${door})`;
  },
} as const;

// Default export for convenient imports
export default CornerDomain;
