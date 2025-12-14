/**
 * Tenant Module
 *
 * Multi-tenant (white-label) functionality.
 */

export { TenantProvider, useTenant } from './context';
export {
  extractTenantSlug,
  isMainDomain,
  resolveTenant,
  clearTenantCache,
  tenantMiddleware,
} from './middleware';
export type { TenantInfo, TenantBranding, TenantSettings } from './middleware';
