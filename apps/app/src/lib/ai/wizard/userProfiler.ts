/**
 * User Profiler - Detects expertise level from conversation
 *
 * Analyzes user messages to determine if they're a professional,
 * intermediate user, or beginner. Adjusts question complexity accordingly.
 *
 * Cost-optimized: Uses pattern matching, not AI calls.
 */

import type { UserProfile, ExpertiseSignals, UserExpertiseLevel } from './types';

// ============================================================================
// Technical Vocabulary Detection
// ============================================================================

/**
 * Technical terms that indicate professional knowledge
 * Grouped by category for weighted scoring
 */
const TECHNICAL_TERMS = {
  // Construction terms (wysokie punkty)
  construction: [
    'korpus', 'wieniec', 'plecy', 'prowadnic', 'zawias', 'eurozawias',
    'cokół', 'blenda', 'listwa', 'wkręt', 'konfirmat', 'kołek',
    'nakładka', 'wpust', 'czop', 'frez', 'okleina', 'abs', 'pvc',
    'laminat', 'hpl', 'mdf', 'hdf', 'płyta', 'wiórowa', 'melamina',
  ],

  // Dimension terms (średnie punkty)
  dimensions: [
    'mm', 'milimetr', 'grubość', 'głębokość', 'rozstaw', 'odsadzka',
    'nawis', 'luz', 'tolerancja', 'moduł', 'skok', 'raster',
  ],

  // Hardware terms (średnie punkty)
  hardware: [
    'blum', 'hettich', 'grass', 'hafele', 'gtv', 'gamet',
    'tandembox', 'metabox', 'aventos', 'tip-on', 'servo-drive',
    'quadro', 'movento', 'legrabox', 'antaro',
    'softclose', 'cichy domyk', 'amortyzator', 'podnośnik',
  ],

  // Material brands/types (średnie punkty)
  materials: [
    'egger', 'kronospan', 'pfleiderer', 'cleaf', 'fenix', 'dekton',
    'corian', 'silestone', 'quartz', 'granit', 'konglomerat',
    'postforming', 'compact', 'slim',
  ],

  // Process terms (wysokie punkty - wskazują na doświadczenie produkcyjne)
  process: [
    'rozkrój', 'optymalizacja', 'cnc', 'formatowanie', 'okleinowanie',
    'wiercenie', 'frezowanie', 'lakierowanie', 'montaż', 'pakowanie',
    'komisja', 'reklamacja', 'tolerancja',
  ],
};

/**
 * Patterns indicating professional communication style
 */
const PROFESSIONAL_PATTERNS = [
  // Precise dimensions with units
  /\d{2,4}\s*(mm|cm)\b/gi,
  // Module notation
  /\d+[xX×]\d+[xX×]\d+/g,
  // Technical abbreviations
  /\b(DTD|MDF|HDF|HPL|ABS|PVC|CNC)\b/gi,
  // Material codes (e.g., "U999", "H3700")
  /\b[A-Z]\d{3,4}\b/g,
  // Drawer slide specs
  /\b\d{2,3}(kg|mm)\b/gi,
];

/**
 * Patterns indicating beginner communication
 */
const BEGINNER_PATTERNS = [
  // Vague dimensions
  /mniej więcej|około|jakieś|koło/gi,
  // Uncertain language
  /nie wiem|nie jestem pewn|może|chyba/gi,
  // General descriptions
  /ładn|fajn|normaln|zwykł|prosty|takie? jak/gi,
  // Questions about basics
  /co to jest|jak to działa|po co/gi,
];

// ============================================================================
// Profiling Logic
// ============================================================================

/**
 * Analyze a single message for expertise signals
 */
export function analyzeMessage(
  message: string,
  currentProfile: UserProfile
): ExpertiseSignals {
  const lowerMessage = message.toLowerCase();
  const signals: ExpertiseSignals = {
    usesTechnicalTerms: false,
    specifiesPreciseDimensions: false,
    mentionsMaterials: false,
    referencesStandards: false,
    asksAboutConstruction: false,
    confidence: currentProfile.signals.confidence,
  };

  // Count technical terms by category
  let technicalScore = 0;

  for (const [category, terms] of Object.entries(TECHNICAL_TERMS)) {
    for (const term of terms) {
      if (lowerMessage.includes(term)) {
        technicalScore += category === 'construction' || category === 'process' ? 2 : 1;
        signals.usesTechnicalTerms = true;

        if (category === 'materials' || category === 'hardware') {
          signals.mentionsMaterials = true;
        }
      }
    }
  }

  // Check for precise dimensions
  const dimensionMatches = message.match(/\d{2,4}\s*(mm)\b/gi);
  if (dimensionMatches && dimensionMatches.length > 0) {
    signals.specifiesPreciseDimensions = true;
    technicalScore += dimensionMatches.length;
  }

  // Check professional patterns
  for (const pattern of PROFESSIONAL_PATTERNS) {
    if (pattern.test(message)) {
      technicalScore += 1;
    }
  }

  // Check for construction questions (indicates interest but maybe learning)
  if (/jak (zrobić|zamontować|połączyć|przymocować)/i.test(message)) {
    signals.asksAboutConstruction = true;
  }

  // Check beginner patterns (reduce score)
  let beginnerScore = 0;
  for (const pattern of BEGINNER_PATTERNS) {
    const matches = message.match(pattern);
    if (matches) {
      beginnerScore += matches.length;
    }
  }

  // Calculate confidence based on evidence
  const netScore = technicalScore - beginnerScore;
  signals.confidence = Math.min(1, Math.max(0, (netScore + 5) / 10));

  return signals;
}

/**
 * Update user profile based on new message
 */
export function updateUserProfile(
  message: string,
  currentProfile: UserProfile
): UserProfile {
  const newSignals = analyzeMessage(message, currentProfile);

  // Merge signals with existing (weighted average)
  const messageWeight = 0.3; // New message contributes 30%
  const mergedSignals: ExpertiseSignals = {
    usesTechnicalTerms:
      newSignals.usesTechnicalTerms || currentProfile.signals.usesTechnicalTerms,
    specifiesPreciseDimensions:
      newSignals.specifiesPreciseDimensions ||
      currentProfile.signals.specifiesPreciseDimensions,
    mentionsMaterials:
      newSignals.mentionsMaterials || currentProfile.signals.mentionsMaterials,
    referencesStandards:
      newSignals.referencesStandards || currentProfile.signals.referencesStandards,
    asksAboutConstruction:
      newSignals.asksAboutConstruction || currentProfile.signals.asksAboutConstruction,
    confidence:
      currentProfile.signals.confidence * (1 - messageWeight) +
      newSignals.confidence * messageWeight,
  };

  // Determine expertise level based on signals
  const expertiseLevel = determineExpertiseLevel(mergedSignals);

  // Detect unit preference
  const preferredUnits = message.match(/\d+\s*mm\b/gi)
    ? 'mm'
    : message.match(/\d+\s*cm\b/gi)
      ? 'cm'
      : currentProfile.preferredUnits;

  return {
    ...currentProfile,
    expertiseLevel,
    signals: mergedSignals,
    preferredUnits,
    messageCount: currentProfile.messageCount + 1,
  };
}

/**
 * Determine expertise level from accumulated signals
 */
function determineExpertiseLevel(signals: ExpertiseSignals): UserExpertiseLevel {
  // Count strong indicators
  const proIndicators = [
    signals.usesTechnicalTerms,
    signals.specifiesPreciseDimensions,
    signals.mentionsMaterials,
  ].filter(Boolean).length;

  // High confidence + multiple pro indicators = professional
  if (signals.confidence > 0.7 && proIndicators >= 2) {
    return 'professional';
  }

  // Medium confidence or some pro indicators = intermediate
  if (signals.confidence > 0.4 || proIndicators >= 1) {
    return 'intermediate';
  }

  return 'beginner';
}

/**
 * Get question complexity adjustment based on profile
 */
export function getQuestionStyle(profile: UserProfile): {
  usesTechnicalLanguage: boolean;
  providesExplanations: boolean;
  asksForPreciseDimensions: boolean;
  showsDefaultValues: boolean;
  suggestsStandards: boolean;
} {
  switch (profile.expertiseLevel) {
    case 'professional':
      return {
        usesTechnicalLanguage: true,
        providesExplanations: false,
        asksForPreciseDimensions: true,
        showsDefaultValues: false, // Pro knows what they want
        suggestsStandards: false,  // They know standards
      };

    case 'intermediate':
      return {
        usesTechnicalLanguage: true,
        providesExplanations: true, // Brief explanations
        asksForPreciseDimensions: true,
        showsDefaultValues: true,
        suggestsStandards: true,
      };

    case 'beginner':
    default:
      return {
        usesTechnicalLanguage: false,
        providesExplanations: true, // Full explanations
        asksForPreciseDimensions: false, // Accept "around 80cm"
        showsDefaultValues: true,
        suggestsStandards: true,
      };
  }
}

/**
 * Format dimension for user's preferred unit
 */
export function formatDimension(mm: number, profile: UserProfile): string {
  if (profile.preferredUnits === 'mm' || profile.expertiseLevel === 'professional') {
    return `${mm} mm`;
  }
  return `${mm / 10} cm`;
}

/**
 * Parse dimension from user input (handles various formats)
 */
export function parseDimension(input: string): number | null {
  // Remove spaces and normalize
  const normalized = input.toLowerCase().replace(/\s+/g, '');

  // Try to extract number and unit
  const match = normalized.match(/^(\d+(?:[.,]\d+)?)\s*(mm|cm|m)?$/);
  if (!match) return null;

  const value = parseFloat(match[1].replace(',', '.'));
  const unit = match[2] || 'cm'; // Default to cm for beginners

  switch (unit) {
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
