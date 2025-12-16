/**
 * Corner Cabinet Domain Module
 *
 * Handles corner cabinet operations including:
 * - Creating corner configurations
 * - Calculating panel positions (origin at external front corner)
 * - L-shape geometry calculations
 * - Validating corner configurations
 *
 * Coordinate system:
 * - Origin (0,0,0) at external front corner at floor level
 * - X axis: Points RIGHT (along arm A width)
 * - Y axis: Points UP (height)
 * - Z axis: Points BACK (into the corner)
 */

import type {
  CornerConfig,
  CornerInternalCabinetParams,
  InternalCornerType,
  CornerOrientation,
  CornerFrontType,
  CornerPanelGeometry,
  CornerMountType,
  WallSharingMode,
  EdgeBandingLShape,
} from '@/types';
import type { ValidationResult } from './types';
import { validResult, invalidResult } from './types';
import { DEFAULT_BACK_OVERLAP_RATIO } from '@/lib/config';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default corner cabinet configuration values
 */
export const CORNER_DEFAULTS = {
  W: 900,
  D: 900,
  bodyDepth: 560,
  bottomMount: 'inset' as CornerMountType,
  topMount: 'inset' as CornerMountType,
  panelGeometry: 'TWO_RECT' as CornerPanelGeometry,
  frontRail: true,
  frontRailMount: 'inset' as CornerMountType,
  frontRailWidth: 100,
  frontType: 'ANGLED' as CornerFrontType,
  frontAngle: 45,
  doorGap: 2,
  wallSharingMode: 'FULL_ISOLATION' as WallSharingMode,
  cornerOrientation: 'LEFT' as CornerOrientation,
} as const;

/**
 * Corner cabinet dimension limits (mm)
 */
export const CORNER_LIMITS = {
  MIN_W: 600,
  MAX_W: 1500,
  MIN_D: 600,
  MAX_D: 1500,
  MIN_BODY_DEPTH: 300,
  MAX_BODY_DEPTH: 800,
  MIN_HEIGHT: 200,
  MAX_HEIGHT: 2500,
  MIN_FRONT_RAIL_WIDTH: 50,
  MAX_FRONT_RAIL_WIDTH: 200,
} as const;

// ============================================================================
// Types
// ============================================================================

/**
 * L-shape cut-out dimensions
 */
export interface LShapeCutDimensions {
  cutX: number; // Width of the cut-out
  cutY: number; // Depth of the cut-out
}

/**
 * Panel position and dimensions
 */
export interface PanelGeometry {
  position: [number, number, number];
  dimensions: [number, number]; // [width, height/depth]
  rotation: [number, number, number];
}

/**
 * Calculated panel positions for corner cabinet
 */
export interface CornerPanelPositions {
  bottom: PanelGeometry;
  top: PanelGeometry;
  leftSide: PanelGeometry;
  rightSide: PanelGeometry;
  frontRail?: PanelGeometry;
  backA: PanelGeometry;
  backB: PanelGeometry;
}

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
  createConfig: (
    cornerType: InternalCornerType = 'L_SHAPED',
    orientation: CornerOrientation = 'LEFT'
  ): CornerConfig => ({
    cornerType,
    cornerOrientation: orientation,
    W: CORNER_DEFAULTS.W,
    D: CORNER_DEFAULTS.D,
    bodyDepth: CORNER_DEFAULTS.bodyDepth,
    bottomMount: CORNER_DEFAULTS.bottomMount,
    topMount: CORNER_DEFAULTS.topMount,
    panelGeometry: CORNER_DEFAULTS.panelGeometry,
    frontRail: CORNER_DEFAULTS.frontRail,
    frontRailMount: CORNER_DEFAULTS.frontRailMount,
    frontRailWidth: CORNER_DEFAULTS.frontRailWidth,
    frontType: CORNER_DEFAULTS.frontType,
    frontAngle: CORNER_DEFAULTS.frontAngle,
    doorGap: CORNER_DEFAULTS.doorGap,
    wallSharingMode: CORNER_DEFAULTS.wallSharingMode,
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
    type: 'CORNER_INTERNAL',
    width, // = W
    height,
    depth, // = bodyDepth (for CabinetBaseParams compatibility)
    topBottomPlacement: 'inset',
    hasBack: true,
    backOverlapRatio: DEFAULT_BACK_OVERLAP_RATIO,
    backMountType: 'overlap',
    cornerConfig: { ...CornerDomain.createConfig(), ...cornerConfig },
  }),

  // ==========================================================================
  // UPDATERS - Functions that return modified copies (immutable)
  // ==========================================================================

  /**
   * Update external dimensions (W, D)
   */
  updateDimensions: (
    config: CornerConfig,
    W: number,
    D: number
  ): CornerConfig => ({
    ...config,
    W: Math.max(CORNER_LIMITS.MIN_W, Math.min(CORNER_LIMITS.MAX_W, W)),
    D: Math.max(CORNER_LIMITS.MIN_D, Math.min(CORNER_LIMITS.MAX_D, D)),
  }),

  /**
   * Update body depth
   */
  updateBodyDepth: (
    config: CornerConfig,
    bodyDepth: number
  ): CornerConfig => ({
    ...config,
    bodyDepth: Math.max(CORNER_LIMITS.MIN_BODY_DEPTH, Math.min(CORNER_LIMITS.MAX_BODY_DEPTH, bodyDepth)),
  }),

  /**
   * Update corner orientation (LEFT/RIGHT)
   */
  updateOrientation: (
    config: CornerConfig,
    orientation: CornerOrientation
  ): CornerConfig => ({
    ...config,
    cornerOrientation: orientation,
  }),

  /**
   * Update bottom mount type
   */
  updateBottomMount: (
    config: CornerConfig,
    mount: CornerMountType
  ): CornerConfig => ({
    ...config,
    bottomMount: mount,
  }),

  /**
   * Update top mount type
   */
  updateTopMount: (
    config: CornerConfig,
    mount: CornerMountType
  ): CornerConfig => ({
    ...config,
    topMount: mount,
  }),

  /**
   * Update panel geometry (TWO_RECT or L_SHAPE)
   */
  updatePanelGeometry: (
    config: CornerConfig,
    geometry: CornerPanelGeometry
  ): CornerConfig => ({
    ...config,
    panelGeometry: geometry,
  }),

  /**
   * Update front rail settings
   */
  updateFrontRail: (
    config: CornerConfig,
    enabled: boolean,
    mount?: CornerMountType,
    width?: number
  ): CornerConfig => ({
    ...config,
    frontRail: enabled,
    frontRailMount: mount ?? config.frontRailMount,
    frontRailWidth: width ?? config.frontRailWidth,
  }),

  /**
   * Update front type
   */
  updateFrontType: (
    config: CornerConfig,
    frontType: CornerFrontType
  ): CornerConfig => ({
    ...config,
    frontType,
  }),

  /**
   * Update front angle (for ANGLED type)
   */
  updateFrontAngle: (
    config: CornerConfig,
    angle: number
  ): CornerConfig => ({
    ...config,
    frontAngle: Math.max(30, Math.min(60, angle)),
  }),

  /**
   * Update hinge side (for SINGLE/BIFOLD types)
   */
  updateHingeSide: (
    config: CornerConfig,
    side: 'left' | 'right'
  ): CornerConfig => ({
    ...config,
    hingeSide: side,
  }),

  /**
   * Update wall sharing mode
   */
  updateWallSharingMode: (
    config: CornerConfig,
    mode: WallSharingMode
  ): CornerConfig => ({
    ...config,
    wallSharingMode: mode,
  }),

  // ==========================================================================
  // CALCULATORS - Pure calculation functions
  // ==========================================================================

  /**
   * Calculate L-shape cut-out dimensions
   * The cut-out is the inner corner that's removed to form the L-shape
   */
  calculateLShapeCut: (
    W: number,
    D: number,
    bodyDepth: number,
    isInset: boolean,
    thickness: number = 18
  ): LShapeCutDimensions => {
    // Cut dimensions = external dimension - body depth
    const baseCutX = W - bodyDepth;
    const baseCutY = D - bodyDepth;

    // Adjust for inset mounting (cut extends into the side thickness area)
    const cutX = isInset ? baseCutX + thickness : baseCutX;
    const cutY = isInset ? baseCutY + thickness : baseCutY;

    return { cutX, cutY };
  },

  /**
   * Check if L-shape geometry should be used
   * Falls back to TWO_RECT when SHARED_BOTH (can't band edges properly)
   */
  shouldUseLShape: (config: CornerConfig): boolean => {
    if (config.panelGeometry !== 'L_SHAPE') return false;

    // SHARED_BOTH makes L-shape edge banding incorrect
    if (config.wallSharingMode === 'SHARED_BOTH') {
      return false;
    }

    return true;
  },

  /**
   * Get edge banding configuration for L-shaped panels
   * Adjusts based on wall sharing mode
   */
  getEdgeBandingForLShape: (config: CornerConfig): EdgeBandingLShape => {
    const { wallSharingMode } = config;

    return {
      type: 'L_SHAPE',
      edge1: true,  // Front always visible
      edge2: true,  // Front-right always visible
      edge3: true,  // Inner step always visible
      edge4: true,  // Inner step always visible
      edge5: wallSharingMode !== 'SHARED_LEFT',  // Back-left hidden if shared
      edge6: wallSharingMode !== 'SHARED_RIGHT', // Outer-left hidden if shared
    };
  },

  /**
   * Calculate dead zone dimensions (the inaccessible corner area)
   * Dead zone = W - bodyDepth by D - bodyDepth
   */
  calculateDeadZone: (
    config: CornerConfig
  ): { width: number; depth: number } => ({
    width: config.W - config.bodyDepth,
    depth: config.D - config.bodyDepth,
  }),

  /**
   * Calculate diagonal front width (for ANGLED front type)
   * This is the hypotenuse of the dead zone triangle
   */
  calculateDiagonalWidth: (config: CornerConfig): number => {
    const deadZone = CornerDomain.calculateDeadZone(config);
    const doorGap = config.doorGap ?? CORNER_DEFAULTS.doorGap;

    // For 45° angle, it's the hypotenuse of dead zone square
    const rawWidth = Math.sqrt(deadZone.width ** 2 + deadZone.depth ** 2);

    // Subtract door gaps
    return Math.round(rawWidth - doorGap * 2);
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
    const bottomOffset = bottomMount === 'inset' ? 0 : thickness;
    const topOffset = topMount === 'inset' ? 0 : thickness;
    return cabinetHeight - bottomOffset - topOffset;
  },

  /**
   * Calculate panel positions for the corner cabinet
   * All positions are relative to origin at external front corner (0,0,0)
   */
  calculatePanelPositions: (
    config: CornerConfig,
    H: number,
    t: number,
    legOffset: number
  ): CornerPanelPositions => {
    const { W, D, bodyDepth, bottomMount, topMount, frontRail, frontRailWidth, wallSharingMode } = config;
    const railWidth = frontRailWidth ?? CORNER_DEFAULTS.frontRailWidth;

    // Calculate panel dimensions based on mount types
    const isBottomInset = bottomMount === 'inset';
    const isTopInset = topMount === 'inset';

    // Side height
    const sideHeight = CornerDomain.calculateSideHeight(H, bottomMount, topMount, t);
    const bottomOffset = isBottomInset ? 0 : t;
    const sideCenterY = bottomOffset + sideHeight / 2 + legOffset;

    // Check if sides are generated
    const hasLeftSide = wallSharingMode !== 'SHARED_LEFT' && wallSharingMode !== 'SHARED_BOTH';
    const hasRightSide = wallSharingMode !== 'SHARED_RIGHT' && wallSharingMode !== 'SHARED_BOTH';

    return {
      // Bottom panel - center of L-shape or two rects
      bottom: {
        position: [W / 2, t / 2 + legOffset, D / 2],
        dimensions: isBottomInset ? [W - 2 * t, D - 2 * t] : [W, D],
        rotation: [-Math.PI / 2, 0, 0],
      },

      // Top panel
      top: {
        position: [W / 2, H - t / 2 + legOffset, D / 2],
        dimensions: isTopInset ? [W - 2 * t, D - 2 * t] : [W, D],
        rotation: [-Math.PI / 2, 0, 0],
      },

      // Left side - only bodyDepth dimension
      leftSide: {
        position: [t / 2, sideCenterY, bodyDepth / 2],
        dimensions: [bodyDepth, sideHeight],
        rotation: [0, Math.PI / 2, 0],
      },

      // Right side - only bodyDepth dimension
      rightSide: {
        position: [W - bodyDepth / 2, sideCenterY, t / 2],
        dimensions: [bodyDepth, sideHeight],
        rotation: [0, 0, 0],
      },

      // Front rail (wieniec przedni)
      ...(frontRail && {
        frontRail: {
          position: [
            (hasLeftSide ? t : 0) + (W - bodyDepth - (hasLeftSide ? t : 0)) / 2,
            H - t / 2 + legOffset,
            railWidth / 2,
          ],
          dimensions: [W - bodyDepth - (hasLeftSide ? t : 0), railWidth],
          rotation: [-Math.PI / 2, 0, 0],
        },
      }),

      // Back panel A (arm A back)
      backA: {
        position: [W / 2, H / 2 + legOffset, D],
        dimensions: [W - (hasLeftSide ? t : 0), H],
        rotation: [0, 0, 0],
      },

      // Back panel B (arm B back)
      backB: {
        position: [0, H / 2 + legOffset, bodyDepth + (D - bodyDepth) / 2],
        dimensions: [D - bodyDepth, H],
        rotation: [0, Math.PI / 2, 0],
      },
    };
  },

  /**
   * Calculate shelf positions for corner cabinet
   * Returns Y positions for each shelf
   */
  calculateShelfPositions: (
    cabinetHeight: number,
    materialThickness: number,
    shelfCount: number
  ): number[] => {
    if (shelfCount <= 0) return [];

    const usableHeight = cabinetHeight - 2 * materialThickness;
    const spacing = usableHeight / (shelfCount + 1);

    return Array.from({ length: shelfCount }, (_, i) =>
      Math.round(materialThickness + spacing * (i + 1))
    );
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

    // bodyDepth validation
    if (config.bodyDepth < CORNER_LIMITS.MIN_BODY_DEPTH || config.bodyDepth > CORNER_LIMITS.MAX_BODY_DEPTH) {
      errors.push(`Głębokość korpusu musi być między ${CORNER_LIMITS.MIN_BODY_DEPTH}-${CORNER_LIMITS.MAX_BODY_DEPTH}mm`);
    }

    // bodyDepth must be less than W and D
    if (config.bodyDepth >= config.W) {
      errors.push('Głębokość korpusu musi być mniejsza niż szerokość W');
    }
    if (config.bodyDepth >= config.D) {
      errors.push('Głębokość korpusu musi być mniejsza niż głębokość D');
    }

    // Front rail width validation
    if (config.frontRail && config.frontRailWidth) {
      if (config.frontRailWidth < CORNER_LIMITS.MIN_FRONT_RAIL_WIDTH ||
          config.frontRailWidth > CORNER_LIMITS.MAX_FRONT_RAIL_WIDTH) {
        errors.push(`Szerokość wieńca musi być między ${CORNER_LIMITS.MIN_FRONT_RAIL_WIDTH}-${CORNER_LIMITS.MAX_FRONT_RAIL_WIDTH}mm`);
      }
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
      errors.push(`Wysokość musi być między ${CORNER_LIMITS.MIN_HEIGHT}-${CORNER_LIMITS.MAX_HEIGHT}mm`);
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
   * Check if corner has diagonal/angled front panel
   */
  hasDiagonalFront: (config: CornerConfig): boolean =>
    config.frontType === 'ANGLED',

  /**
   * Check if any walls are shared with adjacent cabinets
   */
  hasSharedWalls: (config: CornerConfig): boolean =>
    config.wallSharingMode !== 'FULL_ISOLATION',

  /**
   * Check if corner has any front (doors)
   */
  hasFront: (config: CornerConfig): boolean =>
    config.frontType !== 'NONE',

  /**
   * Check if left side should be generated
   */
  hasLeftSide: (config: CornerConfig): boolean =>
    config.wallSharingMode !== 'SHARED_LEFT' &&
    config.wallSharingMode !== 'SHARED_BOTH',

  /**
   * Check if right side should be generated
   */
  hasRightSide: (config: CornerConfig): boolean =>
    config.wallSharingMode !== 'SHARED_RIGHT' &&
    config.wallSharingMode !== 'SHARED_BOTH',

  /**
   * Get corner type label in Polish
   */
  getTypeLabel: (type: InternalCornerType): string => {
    const labels: Record<InternalCornerType, string> = {
      L_SHAPED: 'L-kształtna (diagonalna)',
      BLIND_CORNER: 'Ślepa narożna',
      LAZY_SUSAN: 'Karuzela (Lazy Susan)',
    };
    return labels[type];
  },

  /**
   * Get orientation label in Polish
   */
  getOrientationLabel: (orientation: CornerOrientation): string => {
    const labels: Record<CornerOrientation, string> = {
      LEFT: 'Lewa',
      RIGHT: 'Prawa',
    };
    return labels[orientation];
  },

  /**
   * Get front type label in Polish
   */
  getFrontTypeLabel: (frontType: CornerFrontType): string => {
    const labels: Record<CornerFrontType, string> = {
      NONE: 'Brak',
      SINGLE: 'Pojedyncze (proste)',
      BIFOLD: 'Składane',
      DOUBLE: 'Podwójne (L)',
      ANGLED: 'Pojedyncze (skośne)',
    };
    return labels[frontType];
  },

  /**
   * Get panel geometry label in Polish
   */
  getPanelGeometryLabel: (geometry: CornerPanelGeometry): string => {
    const labels: Record<CornerPanelGeometry, string> = {
      TWO_RECT: 'Dwa prostokąty',
      L_SHAPE: 'L-kształt',
    };
    return labels[geometry];
  },

  /**
   * Get human-readable summary of corner config
   */
  getSummary: (config: CornerConfig): string => {
    const type = CornerDomain.getTypeLabel(config.cornerType);
    const dims = `${config.W}×${config.D}mm`;
    const orientation = config.cornerOrientation === 'LEFT' ? 'L' : 'P';

    return `${type} ${dims} (${orientation})`;
  },
} as const;

// Default export for convenient imports
export default CornerDomain;
