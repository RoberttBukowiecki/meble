/**
 * Generator for top/bottom decorative panels
 * Supports: Blenda, Plinth (cokół), Trim strips, Full panels
 */

import {
  DecorativePanelsConfig,
  DecorativePanelConfig,
  DecorativePanelType,
} from '@/types';
import { GeneratedPart } from './types';
import { TRIM_STRIP_CONFIG } from '../config';

// ============================================================================
// Types
// ============================================================================

export interface DecorativePanelGeneratorConfig {
  cabinetId: string;
  furnitureId: string;
  cabinetWidth: number;
  cabinetHeight: number;
  cabinetDepth: number;
  frontMaterialId: string;
  frontThickness: number;
  bodyThickness: number;
  decorativePanels: DecorativePanelsConfig;
  /** Y offset added by legs (0 if no legs) */
  legOffset?: number;
}

// Panel type labels for naming
const PANEL_TYPE_NAMES: Record<DecorativePanelType, string> = {
  BLENDA: 'Blenda',
  PLINTH: 'Cokół',
  TRIM_STRIP: 'Listwa ozdobna',
  FULL_PANEL: 'Panel dekoracyjny',
};

// ============================================================================
// Main Generator
// ============================================================================

/**
 * Generate decorative top/bottom panels
 */
export function generateDecorativePanels(
  config: DecorativePanelGeneratorConfig
): GeneratedPart[] {
  const parts: GeneratedPart[] = [];
  const { decorativePanels, legOffset = 0 } = config;

  if (decorativePanels.top?.enabled) {
    const topPart = generatePanel(config, decorativePanels.top, 'TOP', legOffset);
    if (topPart) parts.push(topPart);
  }

  if (decorativePanels.bottom?.enabled) {
    const bottomPart = generatePanel(config, decorativePanels.bottom, 'BOTTOM', legOffset);
    if (bottomPart) parts.push(bottomPart);
  }

  return parts;
}

// ============================================================================
// Panel Generator
// ============================================================================

function generatePanel(
  config: DecorativePanelGeneratorConfig,
  panel: DecorativePanelConfig,
  position: 'TOP' | 'BOTTOM',
  legOffset: number
): GeneratedPart | null {
  const {
    cabinetId,
    furnitureId,
    cabinetWidth,
    cabinetHeight,
    cabinetDepth,
    frontMaterialId,
    frontThickness,
    bodyThickness,
  } = config;

  const materialId = panel.materialId ?? frontMaterialId;
  const panelHeight = panel.height;
  const recess = panel.recess ?? 0;

  // Calculate panel dimensions based on type
  let panelWidth = cabinetWidth;
  let panelDepth = frontThickness; // Default depth for most panels

  // Calculate position
  let positionY: number;
  let positionZ: number;

  switch (panel.type) {
    case 'BLENDA':
      // Blenda sits on top of cabinet, flush with front
      // Full width, uses front material thickness
      panelDepth = cabinetDepth; // Full depth to cover top
      positionY = cabinetHeight + panelHeight / 2 + legOffset;
      positionZ = 0;
      break;

    case 'PLINTH':
      // Plinth sits below cabinet with recess
      // Full width, depth based on recess
      panelDepth = cabinetDepth - recess;
      positionY = -panelHeight / 2 + legOffset;
      // Z position accounts for recess (moved back from front)
      positionZ = -recess / 2;
      break;

    case 'TRIM_STRIP':
      // Thin strip attached to front face
      panelDepth = panel.thickness ?? TRIM_STRIP_CONFIG.DEFAULT_THICKNESS;
      if (position === 'TOP') {
        positionY = cabinetHeight - panelHeight / 2 + legOffset;
      } else {
        positionY = panelHeight / 2 + legOffset;
      }
      // Positioned in front of cabinet
      positionZ = cabinetDepth / 2 + panelDepth / 2;
      break;

    case 'FULL_PANEL':
      // Full decorative panel like side fronts
      panelDepth = frontThickness;
      if (position === 'TOP') {
        positionY = cabinetHeight + panelHeight / 2 + legOffset;
      } else {
        positionY = -panelHeight / 2 + legOffset;
      }
      // Flush with cabinet front
      positionZ = cabinetDepth / 2 + panelDepth / 2;
      break;

    default:
      return null;
  }

  const panelName = `${PANEL_TYPE_NAMES[panel.type]} ${position === 'TOP' ? 'górna' : 'dolna'}`;

  return {
    name: panelName,
    furnitureId,
    group: cabinetId,
    shapeType: 'RECT',
    shapeParams: { type: 'RECT', x: panelWidth, y: panelHeight },
    width: panelWidth,
    height: panelHeight,
    depth: panelDepth,
    position: [0, positionY, positionZ],
    rotation: [0, 0, 0],
    materialId,
    edgeBanding: {
      type: 'RECT',
      top: position === 'TOP',
      bottom: position === 'BOTTOM',
      left: true,
      right: true,
    },
    cabinetMetadata: {
      cabinetId,
      role: position === 'TOP' ? 'DECORATIVE_TOP' : 'DECORATIVE_BOTTOM',
    },
  };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Check if config has any decorative panels
 */
export function hasDecorativePanels(
  config: DecorativePanelsConfig | undefined
): boolean {
  if (!config) return false;
  return !!(config.top?.enabled || config.bottom?.enabled);
}

/**
 * Get summary text for decorative panels
 */
export function getDecorativePanelsSummary(
  config: DecorativePanelsConfig | undefined
): string {
  if (!config) return 'Brak';

  const parts: string[] = [];

  if (config.top?.enabled) {
    parts.push(`${PANEL_TYPE_NAMES[config.top.type]} górna (${config.top.height}mm)`);
  }

  if (config.bottom?.enabled) {
    parts.push(`${PANEL_TYPE_NAMES[config.bottom.type]} dolna (${config.bottom.height}mm)`);
  }

  return parts.length > 0 ? parts.join(', ') : 'Brak';
}
