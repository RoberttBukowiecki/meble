/**
 * AI Enhancer - Selective AI calls for complex understanding
 *
 * Uses AI ONLY when rule-based parsing fails or for final generation.
 * This keeps costs minimal while maintaining quality.
 */

import type {
  WizardState,
  ProjectData,
  CabinetDesign,
  GeneratedOutput,
  UserProfile,
} from './types';
import type { CabinetParams, CabinetType } from '@/types/cabinet';
import { CABINET_PRESETS } from '@/lib/config';

// ============================================================================
// Cost Tracking
// ============================================================================

interface TokenUsage {
  input: number;
  output: number;
  estimatedCost: number;
}

let sessionTokenUsage: TokenUsage = {
  input: 0,
  output: 0,
  estimatedCost: 0,
};

export function getSessionTokenUsage(): TokenUsage {
  return { ...sessionTokenUsage };
}

export function resetSessionTokenUsage(): void {
  sessionTokenUsage = { input: 0, output: 0, estimatedCost: 0 };
}

// ============================================================================
// AI Call Decision Logic
// ============================================================================

/**
 * Determine if AI is needed for understanding user message
 * Returns false if rule-based parsing should suffice
 */
export function needsAIForUnderstanding(
  message: string,
  phase: string,
  extractedData: Partial<ProjectData>
): boolean {
  // If rule-based extraction got something, no AI needed
  if (Object.keys(extractedData).length > 0) {
    return false;
  }

  // Check if message is too complex for rules
  const isComplex =
    message.length > 200 || // Long messages
    message.split(/[,.;]/).length > 3 || // Multiple clauses
    /ale|jednak|chociaż|z drugiej strony/i.test(message); // Complex reasoning

  return isComplex;
}

/**
 * Lightweight AI call for clarification (uses haiku-equivalent)
 */
export async function clarifyWithAI(
  message: string,
  phase: string,
  context: string
): Promise<{ understood: boolean; extractedData: Partial<ProjectData>; clarificationNeeded?: string }> {
  // This would call a fast, cheap model
  // For now, return a fallback

  return {
    understood: false,
    extractedData: {},
    clarificationNeeded: 'Czy mógłbyś to powiedzieć innymi słowami?',
  };
}

// ============================================================================
// Final Generation (Main AI use case)
// ============================================================================

/**
 * Generate final cabinet configurations from collected data
 * This is where we use AI for intelligent generation
 */
export async function generateFinalOutput(
  projectData: ProjectData,
  userProfile: UserProfile
): Promise<GeneratedOutput> {
  // For now, use rule-based generation
  // AI would be used here for optimization and smart defaults

  const cabinets = projectData.cabinets.map((design, index) => {
    const params = designToCabinetParams(design);
    const materials = {
      bodyMaterialId: projectData.defaultBodyMaterial || 'white-18mm',
      frontMaterialId: projectData.defaultFrontMaterial || 'white-matt',
    };

    // Calculate position based on index and layout
    const position = calculateCabinetPosition(design, index, projectData);

    return {
      params,
      materials,
      position,
      rotation: 0,
    };
  });

  const summary = generateOutputSummary(cabinets, projectData);

  return {
    cabinets,
    summary,
  };
}

/**
 * Convert wizard design to full CabinetParams
 */
function designToCabinetParams(design: CabinetDesign): CabinetParams {
  const preset = CABINET_PRESETS[design.type] || CABINET_PRESETS.KITCHEN;

  const baseParams = {
    ...preset,
    type: design.type,
    width: design.width,
    height: design.height,
    depth: design.depth,
  };

  switch (design.type) {
    case 'KITCHEN':
      return {
        ...baseParams,
        type: 'KITCHEN',
        shelfCount: design.shelfCount ?? 1,
        hasDoors: design.hasDoors ?? true,
        topBottomPlacement: 'inset',
        hasBack: true,
        backOverlapRatio: 0.667,
        backMountType: 'overlap',
      };

    case 'DRAWER':
      return {
        ...baseParams,
        type: 'DRAWER',
        drawerCount: design.drawerCount ?? 4,
        drawerSlideType: 'SIDE_MOUNT',
        hasInternalDrawers: false,
        topBottomPlacement: 'inset',
        hasBack: true,
        backOverlapRatio: 0.667,
        backMountType: 'overlap',
      };

    case 'WALL':
      return {
        ...baseParams,
        type: 'WALL',
        shelfCount: design.shelfCount ?? 1,
        hasDoors: design.hasDoors ?? true,
        topBottomPlacement: 'inset',
        hasBack: true,
        backOverlapRatio: 0.667,
        backMountType: 'overlap',
      };

    case 'BOOKSHELF':
      return {
        ...baseParams,
        type: 'BOOKSHELF',
        shelfCount: design.shelfCount ?? 4,
        topBottomPlacement: 'inset',
        hasBack: true,
        backOverlapRatio: 0.667,
        backMountType: 'overlap',
      };

    case 'WARDROBE':
      return {
        ...baseParams,
        type: 'WARDROBE',
        shelfCount: design.shelfCount ?? 2,
        doorCount: 2,
        topBottomPlacement: 'inset',
        hasBack: true,
        backOverlapRatio: 0.667,
        backMountType: 'overlap',
      };

    default:
      return baseParams as CabinetParams;
  }
}

/**
 * Calculate cabinet position in 3D space
 */
function calculateCabinetPosition(
  design: CabinetDesign,
  index: number,
  projectData: ProjectData
): [number, number, number] {
  // Simple linear arrangement for now
  // Could be enhanced with AI for smart layout

  let xOffset = 0;

  // Calculate X position based on previous cabinets
  for (let i = 0; i < index; i++) {
    const prevCabinet = projectData.cabinets[i];
    if (prevCabinet.position === design.position) {
      xOffset += prevCabinet.width;
    }
  }

  // Y position based on cabinet type
  let yOffset = 0;
  if (design.position === 'wall') {
    yOffset = 1400; // Wall cabinets at 1.4m height
  }

  // Z position - depth/2 from wall
  const zOffset = design.depth / 2;

  return [xOffset + design.width / 2, yOffset, zOffset];
}

/**
 * Generate human-readable summary
 */
function generateOutputSummary(
  cabinets: GeneratedOutput['cabinets'],
  projectData: ProjectData
): string {
  const lines: string[] = [];

  lines.push(`Wygenerowano ${cabinets.length} szafek:`);

  const byPosition = cabinets.reduce(
    (acc, cab) => {
      const pos = cab.position[1] > 1000 ? 'wall' : 'base';
      acc[pos] = (acc[pos] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  if (byPosition.base) {
    lines.push(`- ${byPosition.base} szafek dolnych`);
  }
  if (byPosition.wall) {
    lines.push(`- ${byPosition.wall} szafek górnych`);
  }

  if (projectData.appliances.length > 0) {
    lines.push(`\nUwzględniono ${projectData.appliances.length} sprzętów AGD.`);
  }

  lines.push('\nKliknij "Utwórz projekt" aby dodać meble do sceny 3D.');

  return lines.join('\n');
}

// ============================================================================
// Smart Suggestions (Optional AI enhancement)
// ============================================================================

/**
 * Get smart suggestions for current phase
 * Uses AI only if enabled and budget allows
 */
export async function getSmartSuggestions(
  state: WizardState,
  enableAI: boolean = false
): Promise<string[]> {
  // Rule-based suggestions first
  const ruleSuggestions = getRuleBasedSuggestions(state);

  if (!enableAI || ruleSuggestions.length >= 3) {
    return ruleSuggestions;
  }

  // AI enhancement would go here
  return ruleSuggestions;
}

function getRuleBasedSuggestions(state: WizardState): string[] {
  const { phase, projectData } = state;

  switch (phase) {
    case 'cabinet_details':
      if (projectData.kitchenLayout === 'l_shape') {
        return [
          'Szafka narożna 90cm',
          '4 szafki dolne 60cm',
          '3 szafki górne 80cm',
        ];
      }
      break;

    case 'appliances':
      if (projectData.cabinets.length >= 4) {
        return [
          'Zlew + płyta + piekarnik',
          'Zlew, płyta 80cm, okap',
          'Pełne wyposażenie',
        ];
      }
      break;
  }

  return [];
}

// ============================================================================
// Prompt Templates (for future AI calls)
// ============================================================================

export const SYSTEM_PROMPTS = {
  clarification: `Jesteś asystentem do projektowania mebli.
Przeanalizuj wiadomość użytkownika i wyodrębnij informacje o:
- Typ projektu (kuchnia, szafa, regał)
- Wymiary (w mm)
- Preferencje materiałów
- Sprzęty AGD

Odpowiedz TYLKO JSON w formacie:
{
  "understood": true/false,
  "data": { /* wyodrębnione dane */ },
  "clarification": "pytanie jeśli czegoś nie rozumiesz"
}`,

  generation: `Jesteś ekspertem od projektowania mebli skrzyniowych.
Na podstawie zebranych wymagań wygeneruj optymalne parametry szafek.

Zasady:
1. Standardowa grubość płyty: 18mm
2. Wysokość szafki dolnej: 720mm (bez nóżek)
3. Głębokość szafki dolnej: 560-580mm
4. Szerokości standardowe: 300, 400, 450, 500, 600, 800, 900, 1000mm
5. Szafka pod zlew: min 800mm szerokości
6. Szafka pod płytę: szerokość płyty + 40mm

Zwróć JSON z tablicą szafek i ich parametrami.`,
};
