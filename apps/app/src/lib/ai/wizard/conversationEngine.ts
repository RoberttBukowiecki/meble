/**
 * Conversation Engine - Core wizard logic
 *
 * Handles conversation flow, state transitions, and data extraction.
 * Uses minimal AI calls - most logic is rule-based for cost efficiency.
 */

import type {
  WizardState,
  WizardPhase,
  WizardMessage,
  ProjectData,
  CabinetDesign,
  ApplianceConfig,
  UserProfile,
  ProjectType,
  KitchenLayout,
  QuestionTemplate,
} from './types';
import { createInitialWizardState, DEFAULT_PROJECT_DATA } from './types';
import { updateUserProfile, parseDimension } from './userProfiler';
import {
  QUESTION_TEMPLATES,
  getQuestionText,
  getQuickReplies,
} from './questionTemplates';

// ============================================================================
// Phase Transition Logic
// ============================================================================

/**
 * Determine next phase based on current state and collected data
 */
export function getNextPhase(state: WizardState): WizardPhase {
  const { phase, projectData } = state;

  switch (phase) {
    case 'greeting':
      return 'project_type';

    case 'project_type':
      // If project type is determined, move to dimensions
      if (projectData.type) {
        return 'room_dimensions';
      }
      return 'project_type';

    case 'room_dimensions':
      // For kitchens, ask about layout; for others, go to cabinet details
      if (
        projectData.type === 'kitchen_full' ||
        projectData.type === 'kitchen_partial'
      ) {
        return 'layout_style';
      }
      return 'cabinet_details';

    case 'layout_style':
      return 'cabinet_details';

    case 'cabinet_details':
      // Check if we have enough cabinet info
      if (projectData.cabinets.length > 0) {
        // For kitchens, ask about appliances
        if (projectData.type?.startsWith('kitchen')) {
          return 'appliances';
        }
        return 'materials';
      }
      return 'cabinet_details';

    case 'appliances':
      return 'countertop';

    case 'countertop':
      return 'materials';

    case 'materials':
      // Check if both body and front materials are set
      if (projectData.defaultBodyMaterial && projectData.defaultFrontMaterial) {
        return 'accessories';
      }
      return 'materials';

    case 'accessories':
      return 'review';

    case 'review':
      return 'complete';

    case 'complete':
      return 'complete';

    default:
      return 'greeting';
  }
}

/**
 * Check if phase can be skipped based on project type
 */
export function shouldSkipPhase(phase: WizardPhase, projectData: ProjectData): boolean {
  // Skip appliances for non-kitchen projects
  if (phase === 'appliances' && !projectData.type?.startsWith('kitchen')) {
    return true;
  }

  // Skip countertop for non-kitchen projects
  if (phase === 'countertop' && !projectData.type?.startsWith('kitchen')) {
    return true;
  }

  // Skip layout for single cabinet
  if (phase === 'layout_style' && projectData.type === 'single_cabinet') {
    return true;
  }

  return false;
}

// ============================================================================
// Response Parsing (Rule-based, no AI)
// ============================================================================

/**
 * Extract project type from user message
 */
function extractProjectType(message: string): ProjectType | null {
  const lower = message.toLowerCase();

  // Kitchen patterns
  if (/kuchni|kitchen/i.test(lower)) {
    if (/cał|pełn|komplet|full/i.test(lower)) {
      return 'kitchen_full';
    }
    if (/częś|partial|doln|górn|base|wall/i.test(lower)) {
      return 'kitchen_partial';
    }
    return 'kitchen_full'; // Default to full kitchen
  }

  // Wardrobe patterns
  if (/szaf|wardrobe|garderob|closet/i.test(lower)) {
    if (/system|walk-in|wnęk/i.test(lower)) {
      return 'closet_system';
    }
    return 'wardrobe';
  }

  // Bookshelf
  if (/regał|półk|książ|bookshelf|shelv/i.test(lower)) {
    return 'bookshelf';
  }

  // Single cabinet
  if (/szafk|pojedyncz|jedn|cabinet|single/i.test(lower)) {
    return 'single_cabinet';
  }

  // Bathroom
  if (/łazienk|bathroom|vanity|umywalk/i.test(lower)) {
    return 'bathroom_vanity';
  }

  return null;
}

/**
 * Extract kitchen layout from user message
 */
function extractKitchenLayout(message: string): KitchenLayout | null {
  const lower = message.toLowerCase();

  if (/liniow|linear|prosta|jedna ścian/i.test(lower)) {
    return 'linear';
  }
  if (/[luł][-\s]?(kształt|shape)|narożn|róg|corner/i.test(lower)) {
    return 'l_shape';
  }
  if (/u[-\s]?(kształt|shape)|trzy ścian/i.test(lower)) {
    return 'u_shape';
  }
  if (/wysp|island/i.test(lower)) {
    return 'island';
  }
  if (/galley|korytarz|wąsk/i.test(lower)) {
    return 'galley';
  }

  return null;
}

/**
 * Extract dimensions from user message
 */
function extractDimensions(
  message: string
): { width?: number; height?: number; depth?: number; lengths?: number[] } {
  const result: { width?: number; height?: number; depth?: number; lengths?: number[] } = {};

  // Pattern: "3m na 4m" or "300 x 400"
  const dimensionPattern = /(\d+(?:[.,]\d+)?)\s*(mm|cm|m)?\s*(?:na|x|×|przez)\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|m)?/gi;
  const match = dimensionPattern.exec(message);

  if (match) {
    const val1 = parseFloat(match[1].replace(',', '.'));
    const unit1 = match[2] || 'cm';
    const val2 = parseFloat(match[3].replace(',', '.'));
    const unit2 = match[4] || unit1;

    result.width = convertToMm(val1, unit1);
    result.depth = convertToMm(val2, unit2);
  }

  // Pattern: single dimension "ściana 320cm"
  const singlePattern = /(\d+(?:[.,]\d+)?)\s*(mm|cm|m)/gi;
  const singles: RegExpExecArray[] = [];
  let singleMatch: RegExpExecArray | null;
  while ((singleMatch = singlePattern.exec(message)) !== null) {
    singles.push(singleMatch);
  }

  if (singles.length > 0 && !result.width) {
    result.lengths = singles.map((m) =>
      convertToMm(parseFloat(m[1].replace(',', '.')), m[2])
    );
    result.width = result.lengths[0];
  }

  // Height pattern: "wysokość 250cm"
  const heightPattern = /wysoko[śsc][ćc]?\s*:?\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|m)?/gi;
  const heightMatch = heightPattern.exec(message);
  if (heightMatch) {
    result.height = convertToMm(
      parseFloat(heightMatch[1].replace(',', '.')),
      heightMatch[2] || 'cm'
    );
  }

  return result;
}

function convertToMm(value: number, unit: string): number {
  switch (unit.toLowerCase()) {
    case 'mm':
      return Math.round(value);
    case 'cm':
      return Math.round(value * 10);
    case 'm':
      return Math.round(value * 1000);
    default:
      return Math.round(value * 10); // Assume cm
  }
}

/**
 * Extract cabinet count or configuration from message
 */
function extractCabinetInfo(
  message: string
): Partial<CabinetDesign>[] {
  const cabinets: Partial<CabinetDesign>[] = [];
  const lower = message.toLowerCase();

  // Pattern: "5 szafek" or "4-5 szafek"
  const countPattern = /(\d+)(?:\s*-\s*\d+)?\s*szaf/gi;
  const countMatch = countPattern.exec(lower);

  if (countMatch) {
    const count = parseInt(countMatch[1], 10);
    for (let i = 0; i < count; i++) {
      cabinets.push({
        id: `cab_${i}`,
        type: 'KITCHEN',
        position: 'base',
        width: 600, // Default 60cm
        height: 720,
        depth: 560,
        features: [],
      });
    }
  }

  // Pattern: specific widths "60+80+60"
  const widthPattern = /(\d{2,3})(?:\s*[+x×,]\s*(\d{2,3}))+/g;
  const widthMatch = widthPattern.exec(message);

  if (widthMatch) {
    const widths = message.match(/\d{2,3}/g);
    if (widths) {
      cabinets.length = 0; // Clear previous
      widths.forEach((w, i) => {
        const width = parseInt(w, 10);
        // If small number, assume cm; if large, assume mm
        const widthMm = width < 200 ? width * 10 : width;
        cabinets.push({
          id: `cab_${i}`,
          type: 'KITCHEN',
          position: 'base',
          width: widthMm,
          height: 720,
          depth: 560,
          features: [],
        });
      });
    }
  }

  // Check for drawers/shelves preference
  if (/szuflad/i.test(lower)) {
    cabinets.forEach((cab) => {
      const drawerMatch = lower.match(/(\d+)\s*szuflad/);
      cab.drawerCount = drawerMatch ? parseInt(drawerMatch[1], 10) : 3;
    });
  }

  if (/półk/i.test(lower)) {
    cabinets.forEach((cab) => {
      const shelfMatch = lower.match(/(\d+)\s*półk/);
      cab.shelfCount = shelfMatch ? parseInt(shelfMatch[1], 10) : 1;
    });
  }

  return cabinets;
}

/**
 * Extract appliance information from message
 */
function extractAppliances(message: string): ApplianceConfig[] {
  const appliances: ApplianceConfig[] = [];
  const lower = message.toLowerCase();

  if (/zlew|sink/i.test(lower)) {
    appliances.push({
      type: 'sink',
      width: 800,
      cutoutRequired: true,
    });
  }

  if (/płyt|cooktop|indukcj|gaz/i.test(lower)) {
    const is80 = /80|szerok/i.test(lower);
    appliances.push({
      type: 'cooktop',
      width: is80 ? 800 : 600,
      cutoutRequired: true,
    });
  }

  if (/piekarnik|oven/i.test(lower)) {
    appliances.push({
      type: 'oven',
      width: 600,
      cutoutRequired: false,
    });
  }

  if (/okap|hood/i.test(lower)) {
    appliances.push({
      type: 'hood',
      width: 600,
    });
  }

  if (/zmywark|dishwasher/i.test(lower)) {
    appliances.push({
      type: 'dishwasher',
      width: 600,
    });
  }

  if (/lodówk|fridge|refrigerator/i.test(lower)) {
    appliances.push({
      type: 'fridge',
      width: 600,
    });
  }

  return appliances;
}

/**
 * Extract material preferences from message
 */
function extractMaterials(message: string): { body?: string; front?: string } {
  const lower = message.toLowerCase();
  const result: { body?: string; front?: string } = {};

  // Body material
  if (/biał|white/i.test(lower) && /korpus|wewnątrz|środek/i.test(lower)) {
    result.body = 'white';
  } else if (/dąb|oak|drewn/i.test(lower) && /korpus/i.test(lower)) {
    result.body = 'oak';
  }

  // Front material (if not specifically about body)
  if (/biał|white/i.test(lower) && !/korpus/i.test(lower)) {
    result.front = 'white';
  }
  if (/szar|grey|gray|antracyt/i.test(lower)) {
    result.front = 'grey';
  }
  if (/dąb|oak|drewn/i.test(lower) && !/korpus/i.test(lower)) {
    result.front = 'oak';
  }
  if (/połysk|gloss/i.test(lower)) {
    result.front = (result.front || 'white') + '_gloss';
  }
  if (/mat(?!eriał)/i.test(lower)) {
    result.front = (result.front || 'white') + '_matt';
  }

  return result;
}

// ============================================================================
// Main Conversation Processing
// ============================================================================

/**
 * Process user message and update wizard state
 */
export function processUserMessage(
  userMessage: string,
  currentState: WizardState
): WizardState {
  // Update user profile based on message
  const updatedProfile = updateUserProfile(userMessage, currentState.userProfile);

  // Create user message record
  const userMessageRecord: WizardMessage = {
    id: `msg_${Date.now()}`,
    role: 'user',
    content: userMessage,
    timestamp: new Date(),
    phase: currentState.phase,
  };

  // Extract data based on current phase
  const extractedData = extractDataForPhase(userMessage, currentState.phase, currentState.projectData);

  // Merge extracted data with existing project data
  const updatedProjectData = mergeProjectData(currentState.projectData, extractedData);

  // Update message with extracted data
  userMessageRecord.extractedData = extractedData;

  // Determine if we should advance to next phase
  let nextPhase = currentState.phase;
  if (hasEnoughDataForPhase(currentState.phase, updatedProjectData)) {
    nextPhase = getNextPhase({
      ...currentState,
      projectData: updatedProjectData,
    });

    // Skip phases that don't apply
    while (shouldSkipPhase(nextPhase, updatedProjectData)) {
      nextPhase = getNextPhase({
        ...currentState,
        phase: nextPhase,
        projectData: updatedProjectData,
      });
    }
  }

  // Generate assistant response
  const { response, quickReplies } = generateAssistantResponse(
    nextPhase,
    updatedProfile,
    updatedProjectData
  );

  const assistantMessage: WizardMessage = {
    id: `msg_${Date.now() + 1}`,
    role: 'assistant',
    content: response,
    timestamp: new Date(),
    phase: nextPhase,
  };

  return {
    ...currentState,
    phase: nextPhase,
    userProfile: updatedProfile,
    projectData: updatedProjectData,
    messages: [...currentState.messages, userMessageRecord, assistantMessage],
    currentQuestion: response,
    suggestedOptions: quickReplies,
    isProcessing: false,
  };
}

/**
 * Extract relevant data based on current phase
 */
function extractDataForPhase(
  message: string,
  phase: WizardPhase,
  existingData: ProjectData
): Partial<ProjectData> {
  switch (phase) {
    case 'greeting':
    case 'project_type': {
      const type = extractProjectType(message);
      return type ? { type } : {};
    }

    case 'room_dimensions': {
      const dims = extractDimensions(message);
      return {
        roomWidth: dims.width,
        roomDepth: dims.depth,
        roomHeight: dims.height,
        wallLengths: dims.lengths,
      };
    }

    case 'layout_style': {
      const layout = extractKitchenLayout(message);
      return layout ? { kitchenLayout: layout } : {};
    }

    case 'cabinet_details': {
      const cabinets = extractCabinetInfo(message);
      if (cabinets.length > 0) {
        return {
          cabinets: [
            ...existingData.cabinets,
            ...cabinets.map((c) => ({
              id: c.id || `cab_${Date.now()}`,
              type: c.type || 'KITCHEN',
              position: c.position || 'base',
              width: c.width || 600,
              height: c.height || 720,
              depth: c.depth || 560,
              shelfCount: c.shelfCount,
              drawerCount: c.drawerCount,
              hasDoors: c.hasDoors,
              features: c.features || [],
            })) as CabinetDesign[],
          ],
        };
      }
      return {};
    }

    case 'appliances': {
      const appliances = extractAppliances(message);
      return appliances.length > 0
        ? { appliances: [...existingData.appliances, ...appliances] }
        : {};
    }

    case 'countertop': {
      const dims = extractDimensions(message);
      return {
        countertopThickness: dims.height || 38, // Height field reused for thickness
      };
    }

    case 'materials': {
      const materials = extractMaterials(message);
      return {
        defaultBodyMaterial: materials.body || existingData.defaultBodyMaterial,
        defaultFrontMaterial: materials.front || existingData.defaultFrontMaterial,
      };
    }

    case 'accessories': {
      // Handle accessories extraction
      const lower = message.toLowerCase();
      const result: Partial<ProjectData> = {};

      if (/listwa|listw|bar|rail/i.test(lower)) {
        result.handleStyle = 'rail';
      } else if (/gałk|knob/i.test(lower)) {
        result.handleStyle = 'knob';
      } else if (/tip-on|bez uchwy|handleless/i.test(lower)) {
        result.handleStyle = 'push-to-open';
      }

      return result;
    }

    default:
      return {};
  }
}

/**
 * Check if we have enough data to advance from current phase
 */
function hasEnoughDataForPhase(phase: WizardPhase, data: ProjectData): boolean {
  switch (phase) {
    case 'greeting':
      return true; // Always advance from greeting
    case 'project_type':
      return !!data.type;
    case 'room_dimensions':
      return !!(data.roomWidth || data.wallLengths?.length);
    case 'layout_style':
      return !!data.kitchenLayout;
    case 'cabinet_details':
      return data.cabinets.length > 0;
    case 'appliances':
      return data.appliances.length > 0;
    case 'countertop':
      return !!data.countertopThickness;
    case 'materials':
      return !!(data.defaultBodyMaterial && data.defaultFrontMaterial);
    case 'accessories':
      return !!data.handleStyle;
    case 'review':
      return true;
    default:
      return false;
  }
}

/**
 * Merge new data into existing project data
 */
function mergeProjectData(
  existing: ProjectData,
  newData: Partial<ProjectData>
): ProjectData {
  return {
    ...existing,
    ...newData,
    cabinets: newData.cabinets || existing.cabinets,
    appliances: newData.appliances || existing.appliances,
  };
}

/**
 * Generate assistant response for current phase
 */
function generateAssistantResponse(
  phase: WizardPhase,
  profile: UserProfile,
  data: ProjectData
): { response: string; quickReplies: string[] } {
  const templates = QUESTION_TEMPLATES[phase];

  if (!templates || templates.length === 0) {
    // Complete phase
    if (phase === 'complete') {
      return {
        response: generateSummary(data, profile),
        quickReplies: ['Wygeneruj projekt', 'Zmień coś', 'Zacznij od nowa'],
      };
    }
    return { response: 'Kontynuujmy...', quickReplies: [] };
  }

  // Select appropriate template
  const template = selectTemplate(templates, phase, data);

  // Get question text for user level
  const variables = buildTemplateVariables(data);
  const response = getQuestionText(template, profile.expertiseLevel, variables);
  const quickReplies = getQuickReplies(template, profile.expertiseLevel);

  return { response, quickReplies };
}

/**
 * Select the most appropriate template for current state
 */
function selectTemplate(
  templates: QuestionTemplate[],
  phase: WizardPhase,
  data: ProjectData
): QuestionTemplate {
  // For now, select first matching template
  // Could be extended with more sophisticated selection logic
  return templates[0];
}

/**
 * Build variables for template interpolation
 */
function buildTemplateVariables(data: ProjectData): Record<string, string> {
  return {
    wallLength: data.wallLengths?.[0]?.toString() || data.roomWidth?.toString() || '3000',
    suggestedCount: data.wallLengths?.[0]
      ? Math.floor(data.wallLengths[0] / 600).toString()
      : '5',
    projectType: data.type || 'projekt',
  };
}

/**
 * Generate final summary
 */
function generateSummary(data: ProjectData, profile: UserProfile): string {
  const lines: string[] = [];

  lines.push(`**Podsumowanie projektu**\n`);

  if (data.type) {
    const typeLabels: Record<string, string> = {
      kitchen_full: 'Kuchnia - pełna zabudowa',
      kitchen_partial: 'Kuchnia - częściowa',
      wardrobe: 'Szafa',
      closet_system: 'System garderobowy',
      bookshelf: 'Regał',
      single_cabinet: 'Pojedyncza szafka',
    };
    lines.push(`**Typ:** ${typeLabels[data.type] || data.type}`);
  }

  if (data.kitchenLayout) {
    const layoutLabels: Record<KitchenLayout, string> = {
      linear: 'Liniowa',
      l_shape: 'W kształcie L',
      u_shape: 'W kształcie U',
      island: 'Z wyspą',
      galley: 'Korytarzowa',
    };
    lines.push(`**Układ:** ${layoutLabels[data.kitchenLayout]}`);
  }

  if (data.roomWidth || data.wallLengths?.length) {
    const dims = data.wallLengths?.map((l) => `${l / 10}cm`).join(' + ') ||
      `${(data.roomWidth || 0) / 10}cm`;
    lines.push(`**Wymiary:** ${dims}`);
  }

  if (data.cabinets.length > 0) {
    lines.push(`\n**Szafki (${data.cabinets.length}):**`);
    const grouped = data.cabinets.reduce(
      (acc, cab) => {
        acc[cab.position] = (acc[cab.position] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    for (const [pos, count] of Object.entries(grouped)) {
      const posLabel = pos === 'base' ? 'Dolne' : pos === 'wall' ? 'Górne' : 'Wysokie';
      lines.push(`  - ${posLabel}: ${count}`);
    }
  }

  if (data.appliances.length > 0) {
    lines.push(`\n**Sprzęty AGD:**`);
    const appLabels: Record<string, string> = {
      sink: 'Zlew',
      cooktop: 'Płyta grzewcza',
      oven: 'Piekarnik',
      hood: 'Okap',
      dishwasher: 'Zmywarka',
      fridge: 'Lodówka',
    };
    for (const app of data.appliances) {
      lines.push(`  - ${appLabels[app.type] || app.type}`);
    }
  }

  if (data.defaultFrontMaterial) {
    lines.push(`\n**Fronty:** ${data.defaultFrontMaterial}`);
  }

  if (data.handleStyle) {
    const handleLabels: Record<string, string> = {
      rail: 'Listwy',
      knob: 'Gałki',
      'push-to-open': 'Tip-on (bezuchwytowe)',
    };
    lines.push(`**Uchwyty:** ${handleLabels[data.handleStyle] || data.handleStyle}`);
  }

  lines.push(`\n---\nCzy wszystko się zgadza?`);

  return lines.join('\n');
}

/**
 * Initialize wizard with greeting
 */
export function initializeWizard(sessionId: string): WizardState {
  const state = createInitialWizardState(sessionId);

  // Add initial greeting
  const greeting = getQuestionText(
    QUESTION_TEMPLATES.greeting[0],
    'beginner',
    {}
  );

  const greetingMessage: WizardMessage = {
    id: `msg_${Date.now()}`,
    role: 'assistant',
    content: greeting,
    timestamp: new Date(),
    phase: 'greeting',
  };

  return {
    ...state,
    messages: [greetingMessage],
    currentQuestion: greeting,
    suggestedOptions: getQuickReplies(QUESTION_TEMPLATES.greeting[0], 'beginner'),
  };
}
