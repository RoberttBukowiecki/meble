/**
 * Monetization Configuration
 *
 * Core business logic configuration for the monetization system.
 */

import { z } from 'zod';

// ============================================================================
// COMMISSION CONFIGURATION
// ============================================================================

/**
 * Commission tier definition
 */
export interface CommissionTier {
  minOrderValue: number; // w groszach
  maxOrderValue?: number; // w groszach, undefined = no limit
  rate: number; // 0.05 = 5%
}

/**
 * Default commission tiers for producer orders
 */
export const COMMISSION_TIERS: CommissionTier[] = [
  { minOrderValue: 0, maxOrderValue: 50000, rate: 0.08 }, // 8% do 500 zł
  { minOrderValue: 50000, maxOrderValue: 200000, rate: 0.06 }, // 6% 500-2000 zł
  { minOrderValue: 200000, maxOrderValue: 500000, rate: 0.05 }, // 5% 2000-5000 zł
  { minOrderValue: 500000, rate: 0.04 }, // 4% powyżej 5000 zł
];

/**
 * Calculate commission for an order
 */
export function calculateCommission(orderValueGrosze: number): number {
  const tier = COMMISSION_TIERS.find(
    (t) =>
      orderValueGrosze >= t.minOrderValue &&
      (t.maxOrderValue === undefined || orderValueGrosze < t.maxOrderValue)
  );

  if (!tier) {
    return Math.round(orderValueGrosze * COMMISSION_TIERS[0].rate);
  }

  return Math.round(orderValueGrosze * tier.rate);
}

/**
 * Get commission rate for order value
 */
export function getCommissionRate(orderValueGrosze: number): number {
  const tier = COMMISSION_TIERS.find(
    (t) =>
      orderValueGrosze >= t.minOrderValue &&
      (t.maxOrderValue === undefined || orderValueGrosze < t.maxOrderValue)
  );

  return tier?.rate ?? COMMISSION_TIERS[0].rate;
}

// ============================================================================
// ORDER CONFIGURATION
// ============================================================================

export const ORDER_STATUS = [
  'draft',
  'quoted',
  'pending_payment',
  'paid',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const;

export type OrderStatus = (typeof ORDER_STATUS)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, { en: string; pl: string }> = {
  draft: { en: 'Draft', pl: 'Szkic' },
  quoted: { en: 'Quoted', pl: 'Wycenione' },
  pending_payment: { en: 'Pending Payment', pl: 'Oczekuje na płatność' },
  paid: { en: 'Paid', pl: 'Opłacone' },
  confirmed: { en: 'Confirmed', pl: 'Potwierdzone' },
  processing: { en: 'Processing', pl: 'W realizacji' },
  shipped: { en: 'Shipped', pl: 'Wysłane' },
  delivered: { en: 'Delivered', pl: 'Dostarczone' },
  cancelled: { en: 'Cancelled', pl: 'Anulowane' },
  refunded: { en: 'Refunded', pl: 'Zwrócone' },
};

/**
 * Order status transitions
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ['quoted', 'cancelled'],
  quoted: ['pending_payment', 'cancelled'],
  pending_payment: ['paid', 'cancelled'],
  paid: ['confirmed', 'refunded'],
  confirmed: ['processing', 'cancelled', 'refunded'],
  processing: ['shipped', 'cancelled', 'refunded'],
  shipped: ['delivered'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

// ============================================================================
// PAYMENT CONFIGURATION
// ============================================================================

export const PAYMENT_STATUS = [
  'pending',
  'processing',
  'completed',
  'failed',
  'refunded',
  'cancelled',
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[number];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, { en: string; pl: string }> = {
  pending: { en: 'Pending', pl: 'Oczekuje' },
  processing: { en: 'Processing', pl: 'Przetwarzanie' },
  completed: { en: 'Completed', pl: 'Zakończona' },
  failed: { en: 'Failed', pl: 'Nieudana' },
  refunded: { en: 'Refunded', pl: 'Zwrócona' },
  cancelled: { en: 'Cancelled', pl: 'Anulowana' },
};

// ============================================================================
// PRODUCER CONFIGURATION
// ============================================================================

export const PRODUCER_API_TYPES = ['rest', 'email', 'webhook', 'manual'] as const;

export type ProducerApiType = (typeof PRODUCER_API_TYPES)[number];

export const PRODUCER_SERVICES = [
  { id: 'cutting', namePl: 'Cięcie', nameEn: 'Cutting', defaultEnabled: true },
  { id: 'edging', namePl: 'Okleinowanie', nameEn: 'Edge Banding', defaultEnabled: true },
  { id: 'drilling', namePl: 'Wiercenie', nameEn: 'Drilling', defaultEnabled: false },
  { id: 'cnc', namePl: 'CNC', nameEn: 'CNC Machining', defaultEnabled: false },
  { id: 'delivery', namePl: 'Dostawa', nameEn: 'Delivery', defaultEnabled: true },
] as const;

export type ProducerService = (typeof PRODUCER_SERVICES)[number]['id'];

// ============================================================================
// QUOTE CONFIGURATION
// ============================================================================

export const QUOTE_CONFIG = {
  /** Quote validity in hours */
  validityHours: 48,

  /** Quote validity in milliseconds */
  validityMs: 48 * 60 * 60 * 1000,

  /** Minimum order value in grosze */
  minimumOrderValue: 10000, // 100 zł

  /** Default shipping cost in grosze (if not calculated) */
  defaultShippingCost: 5000, // 50 zł
} as const;

// ============================================================================
// ANALYTICS EVENTS
// ============================================================================

export const ANALYTICS_EVENTS = {
  // Export events
  EXPORT_STARTED: 'export_started',
  EXPORT_COMPLETED: 'export_completed',
  EXPORT_FAILED: 'export_failed',

  // Credit events
  CREDITS_PURCHASED: 'credits_purchased',
  CREDIT_USED: 'credit_used',
  CREDITS_MIGRATED: 'credits_migrated',

  // Order events
  ORDER_CREATED: 'order_created',
  ORDER_PAID: 'order_paid',
  ORDER_COMPLETED: 'order_completed',
  ORDER_CANCELLED: 'order_cancelled',

  // Shop events
  PRODUCT_VIEWED: 'product_viewed',
  PRODUCT_ADDED_TO_CART: 'product_added_to_cart',
  CHECKOUT_STARTED: 'checkout_started',
  CHECKOUT_COMPLETED: 'checkout_completed',

  // User events
  USER_REGISTERED: 'user_registered',
  GUEST_CONVERTED: 'guest_converted',
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

// ============================================================================
// LIMITS AND THRESHOLDS
// ============================================================================

export const LIMITS = {
  /** Maximum parts in a single export */
  maxPartsPerExport: 1000,

  /** Maximum file size for material import (bytes) */
  maxMaterialImportSize: 10 * 1024 * 1024, // 10 MB

  /** Maximum products per page in shop */
  maxProductsPerPage: 50,

  /** Maximum cart items */
  maxCartItems: 50,

  /** Rate limit for export API (requests per minute) */
  exportRateLimit: 10,

  /** Rate limit for payment creation (requests per minute) */
  paymentRateLimit: 5,
} as const;

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export const FEATURE_FLAGS = {
  /** Enable guest checkout */
  guestCheckoutEnabled: true,

  /** Enable Smart Export */
  smartExportEnabled: true,

  /** Enable mini-shop */
  shopEnabled: true,

  /** Enable producer orders */
  ordersEnabled: true,

  /** Enable multi-tenant */
  tenantsEnabled: false, // Faza 5

  /** Enable Stripe subscriptions */
  stripeEnabled: false, // Faza 6

  /** Show debug info in development */
  debugMode: process.env.NODE_ENV === 'development',
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag] ?? false;
}
