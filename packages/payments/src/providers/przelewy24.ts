/**
 * Przelewy24 Payment Provider
 *
 * Implementation of Przelewy24 REST API integration.
 * Documentation: https://developers.przelewy24.pl/
 */

import { createHash } from 'crypto';
import {
  PaymentProvider,
  CreatePaymentParams,
  PaymentResult,
  PaymentStatusResult,
  P24TransactionRequest,
  P24RegisterResponse,
  P24VerifyParams,
  P24Notification,
} from '../types';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface P24Config {
  merchantId: number;
  posId: number;
  crc: string;
  apiKey: string;
  sandbox: boolean;
  urlReturn: string;
  urlStatus: string;
}

// ============================================================================
// PRZELEWY24 CLIENT
// ============================================================================

export class Przelewy24Client implements PaymentProvider {
  private config: P24Config;
  private baseUrl: string;

  constructor(config: P24Config) {
    this.config = config;
    this.baseUrl = config.sandbox
      ? 'https://sandbox.przelewy24.pl'
      : 'https://secure.przelewy24.pl';
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CREATE PAYMENT
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Register a new transaction and get redirect URL
   */
  async createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
    try {
      const request: P24TransactionRequest = {
        sessionId: params.externalOrderId,
        amount: params.amount,
        currency: 'PLN',
        description: params.description,
        email: params.customerEmail,
        country: 'PL',
        language: 'pl',
        urlReturn: `${this.config.urlReturn}?sessionId=${params.externalOrderId}`,
        urlStatus: this.config.urlStatus,
      };

      const result = await this.registerTransaction(request);

      return {
        success: true,
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
   * Register transaction with P24 API
   */
  private async registerTransaction(
    request: P24TransactionRequest
  ): Promise<P24RegisterResponse> {
    const sign = this.calculateSign({
      sessionId: request.sessionId,
      merchantId: this.config.merchantId,
      amount: request.amount,
      currency: request.currency,
      crc: this.config.crc,
    });

    const body = {
      merchantId: this.config.merchantId,
      posId: this.config.posId,
      sessionId: request.sessionId,
      amount: request.amount,
      currency: request.currency,
      description: request.description,
      email: request.email,
      country: request.country,
      language: request.language,
      urlReturn: request.urlReturn,
      urlStatus: request.urlStatus,
      sign,
      ...(request.client && { client: request.client }),
      ...(request.phone && { phone: request.phone }),
    };

    const response = await fetch(
      `${this.baseUrl}/api/v1/transaction/register`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${this.getAuthHeader()}`,
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (data.error !== 0) {
      throw new Error(
        `P24 register failed: ${data.error} - ${data.errorMessage || 'Unknown error'}`
      );
    }

    return {
      token: data.data.token,
      redirectUrl: `${this.baseUrl}/trnRequest/${data.data.token}`,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VERIFY TRANSACTION
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Verify a completed transaction
   * This should be called after receiving webhook notification
   */
  async verifyTransaction(params: P24VerifyParams): Promise<boolean> {
    const sign = this.calculateSign({
      sessionId: params.sessionId,
      orderId: params.orderId,
      amount: params.amount,
      currency: params.currency,
      crc: this.config.crc,
    });

    const body = {
      merchantId: this.config.merchantId,
      posId: this.config.posId,
      sessionId: params.sessionId,
      amount: params.amount,
      currency: params.currency,
      orderId: params.orderId,
      sign,
    };

    const response = await fetch(`${this.baseUrl}/api/v1/transaction/verify`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${this.getAuthHeader()}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return data.data?.status === 'success';
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GET PAYMENT STATUS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get transaction status by session ID
   * Note: P24 doesn't have a direct status check endpoint,
   * status is received via webhook
   */
  async getPaymentStatus(sessionId: string): Promise<PaymentStatusResult> {
    // P24 doesn't provide a direct status check API
    // Status must be tracked in our database from webhooks
    throw new Error(
      'P24 does not support direct status check. Use webhook notifications.'
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // WEBHOOK VERIFICATION
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Verify webhook notification signature
   */
  verifyWebhook(body: string, _signature: string): boolean {
    // P24 includes signature in the body itself
    const notification: P24Notification = JSON.parse(body);
    return this.verifyNotification(notification);
  }

  /**
   * Verify notification object
   */
  verifyNotification(notification: P24Notification): boolean {
    const expectedSign = this.calculateSign({
      sessionId: notification.sessionId,
      orderId: notification.orderId,
      amount: notification.amount,
      currency: notification.currency,
      crc: this.config.crc,
    });

    return notification.sign === expectedSign;
  }

  /**
   * Parse notification body
   */
  parseNotification(body: string): P24Notification {
    return JSON.parse(body);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get Basic Auth header
   */
  private getAuthHeader(): string {
    const credentials = `${this.config.posId}:${this.config.apiKey}`;
    return Buffer.from(credentials).toString('base64');
  }

  /**
   * Calculate SHA-384 signature
   */
  private calculateSign(params: Record<string, unknown>): string {
    const json = JSON.stringify(params);
    return createHash('sha384').update(json).digest('hex');
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create Przelewy24 client from environment variables
 */
export function createP24Client(): Przelewy24Client {
  const config: P24Config = {
    merchantId: parseInt(process.env.P24_MERCHANT_ID || '0', 10),
    posId: parseInt(process.env.P24_POS_ID || '0', 10),
    crc: process.env.P24_CRC || '',
    apiKey: process.env.P24_API_KEY || '',
    sandbox: process.env.P24_SANDBOX === 'true',
    urlReturn: process.env.P24_URL_RETURN || '',
    urlStatus: process.env.P24_URL_STATUS || '',
  };

  // Validate required fields
  if (!config.merchantId || !config.crc || !config.apiKey) {
    throw new Error('Missing P24 config: merchantId, crc, or apiKey');
  }

  return new Przelewy24Client(config);
}
