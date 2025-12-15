/**
 * Tenant Configuration
 *
 * Configuration types and defaults for multi-tenant (white-label) system.
 */

import { z } from 'zod';
import { APP_NAME } from '@meble/constants';

// ============================================================================
// TENANT CONFIGURATION SCHEMA
// ============================================================================

export const TenantBrandingSchema = z.object({
  companyName: z.string(),
  logo: z.string().url().optional(),
  favicon: z.string().url().optional(),
  primaryColor: z.string().default('#3b82f6'),
  secondaryColor: z.string().default('#1e40af'),
});

export const TenantContactSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
});

export const TenantMaterialsConfigSchema = z.object({
  /** Use tenant's custom material catalog */
  useCustomCatalog: z.boolean().default(false),

  /** URL to fetch materials from (if external API) */
  catalogUrl: z.string().url().optional(),

  /** Allow users to add their own materials */
  allowUserMaterials: z.boolean().default(true),

  /** Default material category to show */
  defaultCategory: z.string().optional(),
});

export const TenantExportConfigSchema = z.object({
  /** Export format */
  format: z.enum(['csv', 'xlsx', 'json']).default('csv'),

  /** Custom columns to include */
  customColumns: z.array(z.string()).optional(),

  /** Column name mapping (internal -> tenant's naming) */
  columnMapping: z.record(z.string()).optional(),

  /** Include tenant's product codes */
  includeOrderCode: z.boolean().default(false),

  /** CSV separator */
  separator: z.string().default(';'),

  /** Send copy of export to tenant's email */
  sendCopyToEmail: z.string().email().optional(),
});

export const TenantShopConfigSchema = z.object({
  /** Enable shop/accessories */
  enabled: z.boolean().default(true),

  /** Product source */
  source: z.enum(['e-meble', 'tenant', 'both']).default('both'),

  /** URL to fetch tenant's products (if external) */
  productsUrl: z.string().url().optional(),
});

export const TenantFeaturesConfigSchema = z.object({
  /** Enable orders to producers */
  ordersEnabled: z.boolean().default(false),

  /** Enable analytics for tenant */
  analyticsEnabled: z.boolean().default(true),

  /** Show "Powered by e-meble" badge */
  showPoweredBy: z.boolean().default(true),

  /** Custom CSS URL */
  customCssUrl: z.string().url().optional(),
});

export const TenantBillingConfigSchema = z.object({
  model: z.enum(['free', 'flat_fee', 'per_export', 'commission']).default('free'),

  /** For flat_fee model */
  flatFee: z
    .object({
      amount: z.number(),
      currency: z.string().default('PLN'),
      interval: z.enum(['monthly', 'yearly']).default('monthly'),
    })
    .optional(),

  /** For per_export model */
  perExport: z
    .object({
      pricePerExport: z.number(),
      currency: z.string().default('PLN'),
      freeExportsPerMonth: z.number().default(0),
    })
    .optional(),

  /** For commission model */
  commission: z
    .object({
      rate: z.number().min(0).max(1), // 0.05 = 5%
      minCommission: z.number().optional(),
      maxCommission: z.number().optional(),
    })
    .optional(),
});

export const TenantConfigSchema = z.object({
  id: z.string(),
  subdomain: z.string(),
  customDomain: z.string().optional(),

  branding: TenantBrandingSchema,
  contact: TenantContactSchema.optional(),

  materials: TenantMaterialsConfigSchema.default({}),
  export: TenantExportConfigSchema.default({}),
  shop: TenantShopConfigSchema.default({}),
  features: TenantFeaturesConfigSchema.default({}),
  billing: TenantBillingConfigSchema.default({}),
});

export type TenantConfig = z.infer<typeof TenantConfigSchema>;
export type TenantBranding = z.infer<typeof TenantBrandingSchema>;
export type TenantMaterialsConfig = z.infer<typeof TenantMaterialsConfigSchema>;
export type TenantExportConfig = z.infer<typeof TenantExportConfigSchema>;
export type TenantShopConfig = z.infer<typeof TenantShopConfigSchema>;
export type TenantFeaturesConfig = z.infer<typeof TenantFeaturesConfigSchema>;
export type TenantBillingConfig = z.infer<typeof TenantBillingConfigSchema>;
export type TenantBillingModel = TenantBillingConfig['model'];

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

export const DEFAULT_TENANT_BRANDING: TenantBranding = {
  companyName: APP_NAME,
  primaryColor: '#3b82f6',
  secondaryColor: '#1e40af',
};

export const DEFAULT_TENANT_CONFIG: Partial<TenantConfig> = {
  branding: DEFAULT_TENANT_BRANDING,
  materials: {
    useCustomCatalog: false,
    allowUserMaterials: true,
  },
  export: {
    format: 'csv',
    includeOrderCode: false,
    separator: ';',
  },
  shop: {
    enabled: true,
    source: 'both',
  },
  features: {
    ordersEnabled: false,
    analyticsEnabled: true,
    showPoweredBy: true,
  },
  billing: {
    model: 'free',
  },
};

// ============================================================================
// TENANT DETECTION
// ============================================================================

/**
 * Main e-meble domain
 */
export const MAIN_DOMAIN = 'e-meble.com';

/**
 * Reserved subdomains that cannot be used by tenants
 */
export const RESERVED_SUBDOMAINS = [
  'www',
  'app',
  'api',
  'admin',
  'dashboard',
  'auth',
  'login',
  'signup',
  'register',
  'payments',
  'checkout',
  'billing',
  'support',
  'help',
  'docs',
  'blog',
  'status',
  'cdn',
  'assets',
  'static',
  'mail',
  'email',
] as const;

/**
 * Check if a subdomain is valid for tenant use
 */
export function isValidTenantSubdomain(subdomain: string): boolean {
  if (RESERVED_SUBDOMAINS.includes(subdomain as any)) {
    return false;
  }

  // Must be alphanumeric with optional hyphens, 3-30 chars
  const pattern = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;
  return pattern.test(subdomain);
}

// ============================================================================
// TENANT MATERIAL CATEGORIES
// ============================================================================

export const TENANT_MATERIAL_CATEGORIES = [
  { id: 'board', namePl: 'Płyty meblowe', nameEn: 'Furniture Boards' },
  { id: 'hdf', namePl: 'HDF', nameEn: 'HDF' },
  { id: 'mdf', namePl: 'MDF', nameEn: 'MDF' },
  { id: 'plywood', namePl: 'Sklejka', nameEn: 'Plywood' },
  { id: 'edge', namePl: 'Obrzeża', nameEn: 'Edge Banding' },
  { id: 'laminate', namePl: 'Laminaty', nameEn: 'Laminates' },
  { id: 'accessory', namePl: 'Akcesoria', nameEn: 'Accessories' },
] as const;

export type TenantMaterialCategory = (typeof TENANT_MATERIAL_CATEGORIES)[number]['id'];

// ============================================================================
// CSS VARIABLES
// ============================================================================

/**
 * CSS variable names for tenant theming
 */
export const TENANT_CSS_VARIABLES = {
  primary: '--tenant-primary',
  secondary: '--tenant-secondary',
  primaryForeground: '--tenant-primary-foreground',
  secondaryForeground: '--tenant-secondary-foreground',
} as const;

/**
 * Generate CSS variables string for tenant
 */
export function generateTenantCssVariables(branding: TenantBranding): string {
  return `
    :root {
      ${TENANT_CSS_VARIABLES.primary}: ${branding.primaryColor};
      ${TENANT_CSS_VARIABLES.secondary}: ${branding.secondaryColor};
    }
  `.trim();
}
