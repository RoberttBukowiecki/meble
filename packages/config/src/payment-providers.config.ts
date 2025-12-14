/**
 * Payment Providers Configuration
 *
 * Configuration for PayU, Przelewy24, and Stripe payment providers.
 * Actual credentials should come from environment variables.
 */

import { z } from 'zod';

// ============================================================================
// PAYU CONFIGURATION
// ============================================================================

export const PayUConfigSchema = z.object({
  posId: z.string(),
  secondKey: z.string(),
  oauthClientId: z.string(),
  oauthClientSecret: z.string(),
  sandbox: z.boolean().default(true),
  notifyUrl: z.string().url(),
  continueUrl: z.string().url(),
});

export type PayUConfig = z.infer<typeof PayUConfigSchema>;

/**
 * Get PayU configuration from environment variables
 */
export function getPayUConfig(): PayUConfig {
  return PayUConfigSchema.parse({
    posId: process.env.PAYU_POS_ID,
    secondKey: process.env.PAYU_SECOND_KEY,
    oauthClientId: process.env.PAYU_OAUTH_CLIENT_ID,
    oauthClientSecret: process.env.PAYU_OAUTH_CLIENT_SECRET,
    sandbox: process.env.PAYU_SANDBOX === 'true',
    notifyUrl: process.env.PAYU_NOTIFY_URL,
    continueUrl: process.env.PAYU_CONTINUE_URL,
  });
}

/**
 * PayU API URLs
 */
export const PAYU_URLS = {
  sandbox: 'https://secure.snd.payu.com',
  production: 'https://secure.payu.com',
} as const;

/**
 * PayU status mapping to internal status
 */
export const PAYU_STATUS_MAP: Record<string, string> = {
  NEW: 'pending',
  PENDING: 'processing',
  WAITING_FOR_CONFIRMATION: 'processing',
  COMPLETED: 'completed',
  CANCELED: 'cancelled',
  REJECTED: 'failed',
};

// ============================================================================
// PRZELEWY24 CONFIGURATION
// ============================================================================

export const P24ConfigSchema = z.object({
  merchantId: z.number(),
  posId: z.number(),
  crc: z.string(),
  apiKey: z.string(),
  sandbox: z.boolean().default(true),
  urlReturn: z.string().url(),
  urlStatus: z.string().url(),
});

export type P24Config = z.infer<typeof P24ConfigSchema>;

/**
 * Get Przelewy24 configuration from environment variables
 */
export function getP24Config(): P24Config {
  return P24ConfigSchema.parse({
    merchantId: parseInt(process.env.P24_MERCHANT_ID || '0'),
    posId: parseInt(process.env.P24_POS_ID || '0'),
    crc: process.env.P24_CRC,
    apiKey: process.env.P24_API_KEY,
    sandbox: process.env.P24_SANDBOX === 'true',
    urlReturn: process.env.P24_URL_RETURN,
    urlStatus: process.env.P24_URL_STATUS,
  });
}

/**
 * Przelewy24 API URLs
 */
export const P24_URLS = {
  sandbox: 'https://sandbox.przelewy24.pl',
  production: 'https://secure.przelewy24.pl',
} as const;

// ============================================================================
// STRIPE CONFIGURATION (FAZA 2)
// ============================================================================

export const StripeConfigSchema = z.object({
  secretKey: z.string(),
  publishableKey: z.string(),
  webhookSecret: z.string(),
});

export type StripeConfig = z.infer<typeof StripeConfigSchema>;

/**
 * Get Stripe configuration from environment variables
 */
export function getStripeConfig(): StripeConfig {
  return StripeConfigSchema.parse({
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  });
}

// ============================================================================
// PAYMENT PROVIDER SELECTION
// ============================================================================

export type PaymentProvider = 'payu' | 'przelewy24' | 'stripe';

export const AVAILABLE_PROVIDERS: PaymentProvider[] = ['payu', 'przelewy24'];

export const DEFAULT_PROVIDER: PaymentProvider = 'payu';

/**
 * Provider display information
 */
export const PROVIDER_INFO: Record<
  PaymentProvider,
  {
    name: string;
    logo: string;
    methods: string[];
  }
> = {
  payu: {
    name: 'PayU',
    logo: '/images/providers/payu.svg',
    methods: ['BLIK', 'Karty', 'Przelewy', 'Google Pay'],
  },
  przelewy24: {
    name: 'Przelewy24',
    logo: '/images/providers/p24.svg',
    methods: ['BLIK', 'Karty', 'Przelewy', 'Apple Pay'],
  },
  stripe: {
    name: 'Stripe',
    logo: '/images/providers/stripe.svg',
    methods: ['Cards', 'Apple Pay', 'Google Pay'],
  },
};

// ============================================================================
// WEBHOOK CONFIGURATION
// ============================================================================

export const WEBHOOK_CONFIG = {
  /** Maximum retries for webhook processing */
  maxRetries: 3,

  /** Timeout for webhook processing in ms */
  timeout: 30000,

  /** IP whitelist for PayU webhooks (optional) */
  payuIpWhitelist: [
    '185.68.14.10',
    '185.68.14.11',
    '185.68.14.12',
    '185.68.14.13',
  ],
} as const;

// ============================================================================
// CURRENCY CONFIGURATION
// ============================================================================

export const SUPPORTED_CURRENCIES = ['PLN'] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: SupportedCurrency = 'PLN';

/**
 * Format price for display
 */
export function formatPrice(
  amountInGrosze: number,
  currency: SupportedCurrency = 'PLN'
): string {
  const amount = amountInGrosze / 100;
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency,
  }).format(amount);
}
