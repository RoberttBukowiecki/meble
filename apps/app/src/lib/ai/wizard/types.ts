/**
 * Furniture Design Wizard - Type Definitions
 *
 * Conversational wizard that guides users through furniture design
 * with adaptive questioning based on user expertise level.
 */

import type { CabinetParams, CabinetType, CabinetMaterials } from '@/types/cabinet';
import type { CountertopSegment } from '@/types/countertop';

// ============================================================================
// User Profiling
// ============================================================================

/**
 * User expertise level - detected from conversation patterns
 */
export type UserExpertiseLevel = 'beginner' | 'intermediate' | 'professional';

/**
 * Signals used to detect user expertise
 */
export interface ExpertiseSignals {
  /** Uses technical terms (np. "prowadnice", "zawiasy", "korpus") */
  usesTechnicalTerms: boolean;
  /** Specifies exact dimensions in mm */
  specifiesPreciseDimensions: boolean;
  /** Mentions specific materials/brands */
  mentionsMaterials: boolean;
  /** References industry standards */
  referencesStandards: boolean;
  /** Asks about construction details */
  asksAboutConstruction: boolean;
  /** Confidence score 0-1 */
  confidence: number;
}

/**
 * User profile built during conversation
 */
export interface UserProfile {
  expertiseLevel: UserExpertiseLevel;
  signals: ExpertiseSignals;
  /** Preferred unit system (mm vs cm) */
  preferredUnits: 'mm' | 'cm';
  /** Language detected */
  language: 'pl' | 'en';
  /** Number of messages exchanged */
  messageCount: number;
}

// ============================================================================
// Conversation State Machine
// ============================================================================

/**
 * Wizard conversation phases
 */
export type WizardPhase =
  | 'greeting'           // Initial greeting, ask what to design
  | 'project_type'       // Determine: kitchen, wardrobe, single cabinet, etc.
  | 'room_dimensions'    // Room size (if applicable)
  | 'layout_style'       // L-shape, U-shape, linear, etc.
  | 'cabinet_details'    // Individual cabinet configuration
  | 'countertop'         // Countertop configuration
  | 'appliances'         // Built-in appliances (sink, cooktop, etc.)
  | 'materials'          // Material selection
  | 'accessories'        // Handles, legs, etc.
  | 'review'             // Review and confirm
  | 'complete';          // Generation complete

/**
 * Project types the wizard can handle
 */
export type ProjectType =
  | 'kitchen_full'       // Full kitchen layout
  | 'kitchen_partial'    // Part of kitchen (e.g., just base cabinets)
  | 'wardrobe'           // Single wardrobe or wardrobe system
  | 'closet_system'      // Built-in closet
  | 'bookshelf'          // Bookshelf or shelving unit
  | 'bathroom_vanity'    // Bathroom furniture
  | 'single_cabinet'     // Just one cabinet
  | 'custom';            // Custom/other

/**
 * Kitchen layout styles
 */
export type KitchenLayout = 'linear' | 'l_shape' | 'u_shape' | 'island' | 'galley';

/**
 * Collected project data
 */
export interface ProjectData {
  type?: ProjectType;
  name?: string;

  // Room info
  roomWidth?: number;      // mm
  roomDepth?: number;      // mm
  roomHeight?: number;     // mm

  // Kitchen specific
  kitchenLayout?: KitchenLayout;
  wallLengths?: number[];  // Length of each wall segment

  // Cabinet collection
  cabinets: CabinetDesign[];

  // Countertop
  countertopThickness?: number;
  countertopMaterialId?: string;
  countertopOverhang?: number;

  // Appliances & cutouts
  appliances: ApplianceConfig[];

  // Materials (defaults)
  defaultBodyMaterial?: string;
  defaultFrontMaterial?: string;

  // Accessories
  handleStyle?: string;
  legStyle?: string;
}

/**
 * Individual cabinet design from wizard
 */
export interface CabinetDesign {
  id: string;
  type: CabinetType;
  position: 'base' | 'wall' | 'tall';
  width: number;
  height: number;
  depth: number;

  // Interior
  shelfCount?: number;
  drawerCount?: number;
  hasDoors?: boolean;

  // Special features
  features: string[];  // e.g., ['corner', 'sink_base', 'oven_housing']

  // Generated params (final output)
  params?: CabinetParams;
}

/**
 * Appliance configuration
 */
export interface ApplianceConfig {
  type: 'sink' | 'cooktop' | 'oven' | 'dishwasher' | 'fridge' | 'hood' | 'microwave';
  width: number;
  depth?: number;
  position?: string;  // Which cabinet it belongs to
  cutoutRequired?: boolean;
}

// ============================================================================
// Conversation Messages
// ============================================================================

/**
 * Message in conversation history
 */
export interface WizardMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  /** Extracted data from this message */
  extractedData?: Partial<ProjectData>;
  /** Phase when message was sent */
  phase: WizardPhase;
}

/**
 * Wizard conversation state
 */
export interface WizardState {
  /** Current phase */
  phase: WizardPhase;
  /** User profile (evolves during conversation) */
  userProfile: UserProfile;
  /** Collected project data */
  projectData: ProjectData;
  /** Conversation history */
  messages: WizardMessage[];
  /** Current question being asked */
  currentQuestion?: string;
  /** Suggested options for current question */
  suggestedOptions?: string[];
  /** Is wizard processing */
  isProcessing: boolean;
  /** Error if any */
  error?: string;
  /** Session ID for continuity */
  sessionId: string;
}

// ============================================================================
// API Types
// ============================================================================

/**
 * Request to wizard API
 */
export interface WizardRequest {
  sessionId: string;
  userMessage: string;
  /** Current state (for stateless API) */
  state: WizardState;
}

/**
 * Response from wizard API
 */
export interface WizardResponse {
  /** Assistant's reply */
  message: string;
  /** Updated state */
  state: WizardState;
  /** Quick reply options */
  quickReplies?: string[];
  /** If complete, the generated output */
  output?: GeneratedOutput;
  /** Tokens used (for cost tracking) */
  tokensUsed: {
    input: number;
    output: number;
  };
}

/**
 * Final generated output from wizard
 */
export interface GeneratedOutput {
  /** Ready-to-use cabinet configurations */
  cabinets: Array<{
    params: CabinetParams;
    materials: CabinetMaterials;
    position: [number, number, number];
    rotation: number;
  }>;
  /** Countertop segments if applicable */
  countertops?: CountertopSegment[];
  /** Summary for user */
  summary: string;
  /** Estimated cost breakdown */
  costEstimate?: {
    materials: number;
    hardware: number;
    total: number;
  };
}

// ============================================================================
// Question Templates
// ============================================================================

/**
 * Question template with variants for different expertise levels
 */
export interface QuestionTemplate {
  id: string;
  phase: WizardPhase;
  /** Question variants by expertise level */
  variants: {
    beginner: string;
    intermediate: string;
    professional: string;
  };
  /** Quick reply options by level */
  quickReplies?: {
    beginner: string[];
    intermediate: string[];
    professional: string[];
  };
  /** Fields this question collects */
  collectsFields: (keyof ProjectData)[];
  /** Validation for response */
  validation?: {
    type: 'number' | 'choice' | 'text' | 'dimensions';
    min?: number;
    max?: number;
    choices?: string[];
  };
}

// ============================================================================
// Defaults
// ============================================================================

export const DEFAULT_USER_PROFILE: UserProfile = {
  expertiseLevel: 'beginner',
  signals: {
    usesTechnicalTerms: false,
    specifiesPreciseDimensions: false,
    mentionsMaterials: false,
    referencesStandards: false,
    asksAboutConstruction: false,
    confidence: 0.5,
  },
  preferredUnits: 'cm',
  language: 'pl',
  messageCount: 0,
};

export const DEFAULT_PROJECT_DATA: ProjectData = {
  cabinets: [],
  appliances: [],
};

export const createInitialWizardState = (sessionId: string): WizardState => ({
  phase: 'greeting',
  userProfile: { ...DEFAULT_USER_PROFILE },
  projectData: { ...DEFAULT_PROJECT_DATA },
  messages: [],
  isProcessing: false,
  sessionId,
});
