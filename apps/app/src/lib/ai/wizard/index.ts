/**
 * Furniture Design Wizard - Main Export
 *
 * Conversational wizard for designing furniture through natural language.
 * Adapts to user expertise level for optimal experience.
 */

// Types
export type {
  WizardState,
  WizardPhase,
  WizardMessage,
  WizardRequest,
  WizardResponse,
  UserProfile,
  UserExpertiseLevel,
  ProjectData,
  ProjectType,
  KitchenLayout,
  CabinetDesign,
  ApplianceConfig,
  GeneratedOutput,
  QuestionTemplate,
} from './types';

export {
  createInitialWizardState,
  DEFAULT_USER_PROFILE,
  DEFAULT_PROJECT_DATA,
} from './types';

// User Profiler
export {
  analyzeMessage,
  updateUserProfile,
  getQuestionStyle,
  formatDimension,
  parseDimension,
} from './userProfiler';

// Question Templates
export {
  QUESTION_TEMPLATES,
  getQuestionText,
  getQuickReplies,
} from './questionTemplates';

// Conversation Engine
export {
  processUserMessage,
  initializeWizard,
  getNextPhase,
  shouldSkipPhase,
} from './conversationEngine';

// AI Enhancer
export {
  needsAIForUnderstanding,
  clarifyWithAI,
  generateFinalOutput,
  getSmartSuggestions,
  getSessionTokenUsage,
  resetSessionTokenUsage,
  SYSTEM_PROMPTS,
} from './aiEnhancer';
