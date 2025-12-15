/**
 * Payment Service
 *
 * Unified service for handling payments across different providers.
 * Abstracts PayU and Przelewy24 into a single interface.
 */

import { PayUClient, createPayUClient } from '../providers/payu';
import { Przelewy24Client, createP24Client } from '../providers/przelewy24';
import {
  PaymentProvider,
  PaymentProviderType,
  CreatePaymentParams,
  PaymentResult,
  PaymentStatusResult,
} from '../types';

// ============================================================================
// PROVIDER FACTORY
// ============================================================================

/**
 * Get payment provider by type
 */
export function getPaymentProvider(type: PaymentProviderType): PaymentProvider {
  switch (type) {
    case 'payu':
      return createPayUClient();
    case 'przelewy24':
      return createP24Client();
    case 'stripe':
      throw new Error('Stripe is not yet implemented');
    default:
      throw new Error(`Unknown payment provider: ${type}`);
  }
}

/**
 * Check if a payment provider is available (has required env vars)
 */
export function isProviderAvailable(type: PaymentProviderType): boolean {
  switch (type) {
    case 'payu':
      return !!(
        process.env.PAYU_POS_ID &&
        process.env.PAYU_SECOND_KEY &&
        process.env.PAYU_OAUTH_CLIENT_ID &&
        process.env.PAYU_OAUTH_CLIENT_SECRET
      );
    case 'przelewy24':
      return !!(
        process.env.P24_MERCHANT_ID &&
        process.env.P24_CRC &&
        process.env.P24_API_KEY
      );
    case 'stripe':
      return !!(
        process.env.STRIPE_SECRET_KEY &&
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
      );
    default:
      return false;
  }
}

/**
 * Get all available payment providers
 */
export function getAvailableProviders(): PaymentProviderType[] {
  const allProviders: PaymentProviderType[] = ['payu', 'przelewy24', 'stripe'];
  return allProviders.filter(isProviderAvailable);
}

// ============================================================================
// PAYMENT SERVICE
// ============================================================================

export interface CreditPurchaseParams {
  packageId: string;
  provider: PaymentProviderType;
  userId?: string;
  guestSessionId?: string;
  email: string;
  customerIp: string;
  returnUrl: string;
}

export interface PaymentServiceResult {
  success: boolean;
  paymentId?: string;
  externalOrderId?: string;
  redirectUrl?: string;
  error?: string;
}

export class PaymentService {
  private defaultProvider: PaymentProviderType = 'payu';

  /**
   * Create a credit purchase payment
   */
  async createCreditPurchase(
    params: CreditPurchaseParams,
    packageInfo: { name: string; price: number; credits: number }
  ): Promise<PaymentServiceResult> {
    try {
      // Generate external order ID
      const externalOrderId = this.generateOrderId('CRD');

      // Get provider
      const provider = getPaymentProvider(params.provider);

      // Create payment
      const result = await provider.createPayment({
        amount: packageInfo.price,
        currency: 'PLN',
        description: `e-meble - ${packageInfo.name}`,
        externalOrderId,
        customerEmail: params.email,
        customerIp: params.customerIp,
        returnUrl: params.returnUrl,
        products: [
          {
            name: packageInfo.name,
            price: packageInfo.price,
            quantity: 1,
          },
        ],
        metadata: {
          packageId: params.packageId,
          credits: packageInfo.credits,
          userId: params.userId,
          guestSessionId: params.guestSessionId,
        },
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      return {
        success: true,
        externalOrderId,
        redirectUrl: result.redirectUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create an order payment
   */
  async createOrderPayment(params: {
    orderId: string;
    orderNumber: string;
    amount: number;
    provider: PaymentProviderType;
    email: string;
    customerIp: string;
    returnUrl: string;
    items: Array<{ name: string; price: number; quantity: number }>;
  }): Promise<PaymentServiceResult> {
    try {
      const externalOrderId = this.generateOrderId('ORD');

      const provider = getPaymentProvider(params.provider);

      const result = await provider.createPayment({
        amount: params.amount,
        currency: 'PLN',
        description: `Zamówienie ${params.orderNumber}`,
        externalOrderId,
        customerEmail: params.email,
        customerIp: params.customerIp,
        returnUrl: params.returnUrl,
        products: params.items,
        metadata: {
          orderId: params.orderId,
          orderNumber: params.orderNumber,
        },
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      return {
        success: true,
        externalOrderId,
        redirectUrl: result.redirectUrl,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(
    provider: PaymentProviderType,
    providerOrderId: string
  ): Promise<PaymentStatusResult> {
    const paymentProvider = getPaymentProvider(provider);
    return paymentProvider.getPaymentStatus(providerOrderId);
  }

  /**
   * Generate unique order ID
   */
  private generateOrderId(prefix: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    return `${prefix}-${timestamp}-${random}`.toUpperCase();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let paymentServiceInstance: PaymentService | null = null;

export function getPaymentService(): PaymentService {
  if (!paymentServiceInstance) {
    paymentServiceInstance = new PaymentService();
  }
  return paymentServiceInstance;
}
