/**
 * @meble/config
 *
 * Centralized configuration for the Meblarz monetization system.
 *
 * Usage:
 * ```ts
 * import { EXPORT_PACKAGES } from '@meble/config/pricing';
 * import { payuConfig } from '@meble/config/payment-providers';
 * import { DEFAULT_TENANT_CONFIG } from '@meble/config/tenant';
 * ```
 */

export * from './pricing.config';
export * from './payment-providers.config';
export * from './tenant.config';
export * from './monetization.config';
