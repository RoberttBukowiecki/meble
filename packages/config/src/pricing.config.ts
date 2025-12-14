/**
 * Pricing Configuration
 *
 * Defines export packages, pricing tiers, and related constants.
 * All prices are in grosz (1/100 PLN) for precision.
 */

// ============================================================================
// EXPORT PACKAGES
// ============================================================================

export interface ExportPackage {
  id: string;
  name: string;
  namePl: string;
  description: string;
  descriptionPl: string;
  credits: number; // -1 = unlimited
  price: number; // w groszach
  currency: 'PLN';
  validDays?: number; // dla unlimited
  savings?: string; // np. "50%"
  popular?: boolean;
  guestOnly?: boolean;
  features?: string[];
}

export const EXPORT_PACKAGES: Record<string, ExportPackage> = {
  single: {
    id: 'single',
    name: 'Single Export',
    namePl: 'Pojedynczy export',
    description: 'One-time export',
    descriptionPl: 'Jednorazowy eksport projektu',
    credits: 1,
    price: 900, // 9 zł
    currency: 'PLN',
    guestOnly: true,
    features: ['1 export', 'Smart Export 24h'],
  },

  starter: {
    id: 'starter',
    name: 'Starter',
    namePl: 'Starter',
    description: '5 exports pack',
    descriptionPl: 'Pakiet 5 eksportów',
    credits: 5,
    price: 1900, // 19 zł
    currency: 'PLN',
    savings: '58%',
    features: ['5 exports', 'Smart Export 24h', 'Valid 30 days (guests)'],
  },

  standard: {
    id: 'standard',
    name: 'Standard',
    namePl: 'Standard',
    description: '20 exports pack',
    descriptionPl: 'Pakiet 20 eksportów',
    credits: 20,
    price: 4900, // 49 zł
    currency: 'PLN',
    savings: '73%',
    popular: true,
    features: [
      '20 exports',
      'Smart Export 24h',
      'Valid 30 days (guests)',
      'Best value',
    ],
  },

  pro: {
    id: 'pro',
    name: 'Pro',
    namePl: 'Pro',
    description: 'Unlimited exports for 30 days',
    descriptionPl: 'Nieograniczone eksporty przez 30 dni',
    credits: -1, // unlimited
    price: 9900, // 99 zł
    currency: 'PLN',
    validDays: 30,
    features: [
      'Unlimited exports',
      'Smart Export 24h',
      '30 days validity',
      'Priority support',
    ],
  },
} as const;

export type ExportPackageId = keyof typeof EXPORT_PACKAGES;

// ============================================================================
// EXPORT CONFIGURATION
// ============================================================================

export const DEFAULT_EXPORT_COLUMNS = [
  'furniture',
  'friendly_part_id',
  'part_name',
  'material',
  'thickness_mm',
  'length_x_mm',
  'width_y_mm',
] as const;

export const ALL_EXPORT_COLUMNS = [
  'furniture',
  'group',
  'part_id',
  'part_name',
  'friendly_part_id',
  'material',
  'thickness_mm',
  'length_x_mm',
  'width_y_mm',
  'notes',
  'cabinet',
  'cabinet_role',
  'drawer_index',
] as const;

export type ExportColumn = (typeof ALL_EXPORT_COLUMNS)[number];

export const EXPORT_COLUMN_LABELS: Record<ExportColumn, { en: string; pl: string }> = {
  furniture: { en: 'Furniture', pl: 'Mebel' },
  group: { en: 'Group', pl: 'Grupa' },
  part_id: { en: 'Part ID', pl: 'ID części' },
  part_name: { en: 'Part Name', pl: 'Nazwa części' },
  friendly_part_id: { en: 'Friendly ID', pl: 'ID przyjazne' },
  material: { en: 'Material', pl: 'Materiał' },
  thickness_mm: { en: 'Thickness (mm)', pl: 'Grubość (mm)' },
  length_x_mm: { en: 'Length X (mm)', pl: 'Długość X (mm)' },
  width_y_mm: { en: 'Width Y (mm)', pl: 'Szerokość Y (mm)' },
  notes: { en: 'Notes', pl: 'Notatki' },
  cabinet: { en: 'Cabinet', pl: 'Szafka' },
  cabinet_role: { en: 'Cabinet Role', pl: 'Rola w szafce' },
  drawer_index: { en: 'Drawer Index', pl: 'Indeks szuflady' },
};

// ============================================================================
// SMART EXPORT
// ============================================================================

/**
 * Smart Export Configuration
 *
 * Smart Export allows free re-exports of the same project within a session window.
 * This prevents users from being charged for minor corrections.
 */
export const SMART_EXPORT_CONFIG = {
  /** Session duration in hours */
  sessionDurationHours: 24,

  /** Session duration in milliseconds */
  sessionDurationMs: 24 * 60 * 60 * 1000,

  /** Maximum exports per session (0 = unlimited) */
  maxExportsPerSession: 0,
} as const;

// ============================================================================
// GUEST CREDITS
// ============================================================================

export const GUEST_CREDITS_CONFIG = {
  /** Days until guest credits expire */
  expirationDays: 30,

  /** Expiration in milliseconds */
  expirationMs: 30 * 24 * 60 * 60 * 1000,

  /** Bonus credits when guest registers */
  registrationBonus: 2,

  /** Whether to allow email recovery */
  allowEmailRecovery: true,
} as const;

// ============================================================================
// SHOP PRODUCTS
// ============================================================================

export const SHOP_CATEGORIES = [
  { id: 'prowadnice', namePl: 'Prowadnice', nameEn: 'Drawer Slides' },
  { id: 'zawiasy', namePl: 'Zawiasy', nameEn: 'Hinges' },
  { id: 'uchwyty', namePl: 'Uchwyty', nameEn: 'Handles' },
  { id: 'narzedzia', namePl: 'Narzędzia', nameEn: 'Tools' },
  { id: 'akcesoria', namePl: 'Akcesoria', nameEn: 'Accessories' },
] as const;

export type ShopCategory = (typeof SHOP_CATEGORIES)[number]['id'];

/**
 * Recommendation tags used to match products with projects
 */
export const RECOMMENDATION_TAGS = [
  'has_drawers',
  'has_cabinets',
  'has_kitchen',
  'has_wardrobe',
  'large_project',
  'small_project',
] as const;

export type RecommendationTag = (typeof RECOMMENDATION_TAGS)[number];
