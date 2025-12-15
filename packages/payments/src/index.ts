/**
 * @meble/payments
 *
 * Payment and credit management package for e-meble.
 *
 * Provides:
 * - PayU integration
 * - Przelewy24 integration
 * - Unified PaymentService
 * - Credit management utilities
 */

// Types
export * from './types';

// Providers
export { PayUClient, createPayUClient, type PayUConfig } from './providers/payu';
export {
  Przelewy24Client,
  createP24Client,
  type P24Config,
} from './providers/przelewy24';

// Services
export {
  PaymentService,
  getPaymentService,
  getPaymentProvider,
  isProviderAvailable,
  getAvailableProviders,
  type CreditPurchaseParams,
  type PaymentServiceResult,
} from './services/payment.service';

export {
  hashProject,
  generateGuestSessionId,
  getCreditPackage,
  isValidPackageId,
  CREDIT_PACKAGES,
  SMART_EXPORT_CONFIG,
  GUEST_CREDITS_CONFIG,
  GUEST_SESSION_KEY,
  type ProjectData,
  type UserCreditBalance,
  type GuestCreditBalance,
  type UseCreditResult,
  type GuestSession,
  type CreditPackage,
} from './services/credit.service';
