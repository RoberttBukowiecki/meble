/**
 * AI Configuration - Cost optimization and limits
 *
 * Defines pricing, limits, and strategies for cost-effective AI usage.
 */

// ============================================================================
// Model Configuration
// ============================================================================

export const AI_MODELS = {
  /** Fast, cheap model for clarifications */
  FAST: {
    id: "claude-3-haiku-20240307",
    inputCostPer1k: 0.00025,
    outputCostPer1k: 0.00125,
    maxTokens: 4096,
  },
  /** Standard model for generation */
  STANDARD: {
    id: "claude-sonnet-4-20250514",
    inputCostPer1k: 0.003,
    outputCostPer1k: 0.015,
    maxTokens: 8192,
  },
  /** Best model for complex tasks (rarely used) */
  PREMIUM: {
    id: "claude-opus-4-20250514",
    inputCostPer1k: 0.015,
    outputCostPer1k: 0.075,
    maxTokens: 8192,
  },
} as const;

// ============================================================================
// Cost Limits
// ============================================================================

export const COST_LIMITS = {
  /** Maximum cost per wizard session (USD) */
  MAX_SESSION_COST: 0.10,

  /** Maximum cost per single AI call (USD) */
  MAX_CALL_COST: 0.02,

  /** Cost threshold to switch to cheaper model */
  DOWNGRADE_THRESHOLD: 0.05,

  /** Warn user when approaching limit (% of max) */
  WARNING_THRESHOLD: 0.8,
} as const;

// ============================================================================
// Token Limits
// ============================================================================

export const TOKEN_LIMITS = {
  /** Max tokens for clarification calls */
  CLARIFICATION_MAX: 500,

  /** Max tokens for generation calls */
  GENERATION_MAX: 2000,

  /** Max conversation context to send */
  CONTEXT_MAX: 1000,

  /** Tokens to reserve for response */
  RESPONSE_RESERVE: 500,
} as const;

// ============================================================================
// Caching Configuration
// ============================================================================

export const CACHE_CONFIG = {
  /** Enable response caching */
  ENABLED: true,

  /** Cache TTL in seconds */
  TTL: 3600, // 1 hour

  /** Max cached responses */
  MAX_ENTRIES: 100,

  /** Hash algorithm for cache keys */
  HASH_ALGO: "sha256",
} as const;

// ============================================================================
// Cost Estimation
// ============================================================================

/**
 * Estimate cost for a given operation
 */
export function estimateCost(
  model: keyof typeof AI_MODELS,
  inputTokens: number,
  outputTokens: number
): number {
  const config = AI_MODELS[model];
  return (
    (inputTokens / 1000) * config.inputCostPer1k +
    (outputTokens / 1000) * config.outputCostPer1k
  );
}

/**
 * Estimate tokens from text (rough approximation)
 * ~4 chars per token for Polish text
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Check if operation would exceed limits
 */
export function wouldExceedLimit(
  currentSessionCost: number,
  estimatedCost: number
): boolean {
  return currentSessionCost + estimatedCost > COST_LIMITS.MAX_SESSION_COST;
}

/**
 * Get recommended model based on budget
 */
export function getRecommendedModel(
  currentSessionCost: number
): keyof typeof AI_MODELS {
  if (currentSessionCost > COST_LIMITS.DOWNGRADE_THRESHOLD) {
    return "FAST";
  }
  return "STANDARD";
}

// ============================================================================
// Wizard-Specific Configuration
// ============================================================================

export const WIZARD_CONFIG = {
  /** Use AI for understanding (vs rule-based only) */
  AI_UNDERSTANDING_ENABLED: false, // Disabled by default for cost

  /** Use AI for generation (vs rule-based only) */
  AI_GENERATION_ENABLED: false, // Can be enabled for better results

  /** Minimum messages before using AI for clarification */
  MIN_MESSAGES_BEFORE_AI: 3,

  /** Confidence threshold for AI clarification */
  CLARIFICATION_THRESHOLD: 0.3,

  /** Enable voice input (requires additional API) */
  VOICE_INPUT_ENABLED: false,

  /** Voice transcription model */
  VOICE_MODEL: "whisper-1",
} as const;

// ============================================================================
// Feature Flags
// ============================================================================

export const AI_FEATURES = {
  /** Show token usage in UI */
  SHOW_TOKEN_USAGE: false,

  /** Allow users to enable AI mode */
  USER_AI_TOGGLE: true,

  /** Log all AI calls for debugging */
  DEBUG_LOGGING: process.env.NODE_ENV === "development",

  /** Use streaming responses */
  STREAMING_ENABLED: false,
} as const;
