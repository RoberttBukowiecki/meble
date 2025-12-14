/**
 * PayU Payment Provider
 *
 * Implementation of PayU REST API integration.
 * Documentation: https://developers.payu.com/en/restapi.html
 */

import { createHash } from 'crypto';
import {
  PaymentProvider,
  CreatePaymentParams,
  PaymentResult,
  PaymentStatusResult,
  PayUOrderRequest,
  PayUOrderResponse,
  PayUOrderStatus,
  PayUNotification,
  PayUStatus,
} from '../types';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface PayUConfig {
  posId: string;
  secondKey: string;
  oauthClientId: string;
  oauthClientSecret: string;
  sandbox: boolean;
  notifyUrl: string;
  continueUrl: string;
}

// ============================================================================
// PAYU CLIENT
// ============================================================================

export class PayUClient implements PaymentProvider {
  private config: PayUConfig;
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: PayUConfig) {
    this.config = config;
    this.baseUrl = config.sandbox
      ? 'https://secure.snd.payu.com'
      : 'https://secure.payu.com';
  }

  // ══════════════════════════════════════════════════════════════════════════
  // OAUTH AUTHORIZATION
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get OAuth access token (with caching)
   */
  async getAccessToken(): Promise<string> {
    // Check if token is still valid (with 60s buffer)
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.accessToken;
    }

    const response = await fetch(
      `${this.baseUrl}/pl/standard/user/oauth/authorize`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.config.oauthClientId,
          client_secret: this.config.oauthClientSecret,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`PayU OAuth failed: ${response.status} - ${error}`);
    }

    const data = await response.json();

    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000;

    return this.accessToken;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CREATE PAYMENT
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Create a new payment order
   */
  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    try {
      const token = await this.getAccessToken();

      const orderData: PayUOrderRequest & {
        notifyUrl: string;
        continueUrl: string;
        merchantPosId: string;
      } = {
        notifyUrl: this.config.notifyUrl,
        continueUrl: `${this.config.continueUrl}?orderId=${params.externalOrderId}`,
        customerIp: params.customerIp,
        merchantPosId: this.config.posId,
        description: params.description,
        currencyCode: 'PLN',
        totalAmount: params.amount,
        extOrderId: params.externalOrderId,
        buyer: {
          email: params.customerEmail,
          language: 'pl',
        },
        products:
          params.products?.map((p) => ({
            name: p.name,
            unitPrice: p.price,
            quantity: p.quantity,
          })) || [
            {
              name: params.description,
              unitPrice: params.amount,
              quantity: 1,
            },
          ],
      };

      const response = await fetch(`${this.baseUrl}/api/v2_1/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderData),
        redirect: 'manual', // Important! PayU returns 302 redirect
      });

      // PayU returns 302 redirect with Location header
      if (response.status === 302 || response.status === 200) {
        const location = response.headers.get('Location');

        // Try to parse body (may be empty on 302)
        let body: PayUOrderResponse | null = null;
        try {
          const text = await response.text();
          if (text) {
            body = JSON.parse(text);
          }
        } catch {
          // Ignore parse errors
        }

        const redirectUri = location || body?.redirectUri;

        if (!redirectUri) {
          throw new Error('No redirect URL received from PayU');
        }

        return {
          success: true,
          redirectUrl: redirectUri,
          providerOrderId: body?.orderId,
        };
      }

      // Error response
      const errorBody = await response.text();
      throw new Error(`PayU create order failed: ${response.status} - ${errorBody}`);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GET PAYMENT STATUS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get order status from PayU
   */
  async getPaymentStatus(orderId: string): Promise<PaymentStatusResult> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}/api/v2_1/orders/${orderId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`PayU get order failed: ${response.status}`);
    }

    const data: PayUOrderStatus = await response.json();
    const order = data.orders[0];

    return {
      status: this.mapPayUStatus(order.status),
      amount: parseInt(order.totalAmount, 10),
      currency: order.currencyCode,
      providerOrderId: order.orderId,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // WEBHOOK VERIFICATION
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Verify webhook signature
   *
   * PayU sends signature in header: OpenPayU-Signature
   * Format: signature=xxx;algorithm=MD5
   *
   * NOTE: MD5 is used here because it's required by PayU's API specification.
   * This is PayU's webhook verification protocol, not our choice.
   * See: https://developers.payu.com/en/restapi.html#notifications
   */
  verifyWebhook(body: string, signatureHeader: string): boolean {
    if (!signatureHeader) {
      return false;
    }

    // Parse signature header
    const parts = signatureHeader.split(';');
    const signaturePart = parts.find((p) => p.startsWith('signature='));

    if (!signaturePart) {
      return false;
    }

    const receivedSignature = signaturePart.split('=')[1];

    // Calculate expected signature: MD5(body + secondKey)
    const concatenated = body + this.config.secondKey;
    const expectedSignature = createHash('md5')
      .update(concatenated)
      .digest('hex');

    return receivedSignature === expectedSignature;
  }

  /**
   * Parse notification body
   */
  parseNotification(body: string): PayUNotification {
    return JSON.parse(body);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Map PayU status to internal status
   */
  private mapPayUStatus(
    payuStatus: PayUStatus
  ): PaymentStatusResult['status'] {
    const statusMap: Record<PayUStatus, PaymentStatusResult['status']> = {
      NEW: 'pending',
      PENDING: 'processing',
      WAITING_FOR_CONFIRMATION: 'processing',
      COMPLETED: 'completed',
      CANCELED: 'cancelled',
      REJECTED: 'failed',
    };
    return statusMap[payuStatus] || 'pending';
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create PayU client from environment variables
 */
export function createPayUClient(): PayUClient {
  const config: PayUConfig = {
    posId: process.env.PAYU_POS_ID || '',
    secondKey: process.env.PAYU_SECOND_KEY || '',
    oauthClientId: process.env.PAYU_OAUTH_CLIENT_ID || '',
    oauthClientSecret: process.env.PAYU_OAUTH_CLIENT_SECRET || '',
    sandbox: process.env.PAYU_SANDBOX === 'true',
    notifyUrl: process.env.PAYU_NOTIFY_URL || '',
    continueUrl: process.env.PAYU_CONTINUE_URL || '',
  };

  // Validate required fields
  const required = ['posId', 'secondKey', 'oauthClientId', 'oauthClientSecret'];
  for (const field of required) {
    if (!config[field as keyof PayUConfig]) {
      throw new Error(`Missing PayU config: ${field}`);
    }
  }

  return new PayUClient(config);
}
