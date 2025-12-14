/**
 * Payment Types
 */

// ============================================================================
// COMMON TYPES
// ============================================================================

export type PaymentProviderType = 'payu' | 'przelewy24' | 'stripe';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'cancelled';

export interface CreatePaymentParams {
  /** Amount in grosz (1/100 PLN) */
  amount: number;
  /** Currency code */
  currency: string;
  /** Payment description */
  description: string;
  /** Our internal order ID */
  externalOrderId: string;
  /** Customer email */
  customerEmail: string;
  /** Customer IP address */
  customerIp: string;
  /** URL to redirect after payment */
  returnUrl: string;
  /** Products/items in the order */
  products?: ProductItem[];
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface ProductItem {
  name: string;
  /** Price in grosz */
  price: number;
  quantity: number;
}

export interface PaymentResult {
  success: boolean;
  /** Internal payment ID */
  paymentId?: string;
  /** URL to redirect user to payment page */
  redirectUrl?: string;
  /** Provider's order ID */
  providerOrderId?: string;
  /** Error message if failed */
  error?: string;
}

export interface PaymentStatusResult {
  status: PaymentStatus;
  amount: number;
  currency: string;
  completedAt?: Date;
  providerOrderId?: string;
}

// ============================================================================
// PAYU TYPES
// ============================================================================

export interface PayUOrderRequest {
  customerIp: string;
  description: string;
  /** Amount in grosz */
  totalAmount: number;
  currencyCode: 'PLN';
  extOrderId: string;
  buyer?: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    language?: 'pl' | 'en';
  };
  products: Array<{
    name: string;
    /** Price in grosz */
    unitPrice: number;
    quantity: number;
  }>;
}

export interface PayUOrderResponse {
  status: {
    statusCode: string;
  };
  redirectUri: string;
  orderId: string;
  extOrderId: string;
}

export type PayUStatus =
  | 'NEW'
  | 'PENDING'
  | 'WAITING_FOR_CONFIRMATION'
  | 'COMPLETED'
  | 'CANCELED'
  | 'REJECTED';

export interface PayUNotification {
  order: {
    orderId: string;
    extOrderId: string;
    orderCreateDate: string;
    notifyUrl: string;
    customerIp: string;
    status: PayUStatus;
    totalAmount: string;
    currencyCode: string;
    products: Array<{
      name: string;
      unitPrice: string;
      quantity: string;
    }>;
  };
}

export interface PayUOrderStatus {
  orders: Array<{
    orderId: string;
    extOrderId: string;
    orderCreateDate: string;
    status: PayUStatus;
    totalAmount: string;
    currencyCode: string;
  }>;
  status: {
    statusCode: string;
  };
}

// ============================================================================
// PRZELEWY24 TYPES
// ============================================================================

export interface P24TransactionRequest {
  sessionId: string;
  /** Amount in grosz */
  amount: number;
  currency: 'PLN';
  description: string;
  email: string;
  country: 'PL';
  language: 'pl' | 'en';
  urlReturn: string;
  urlStatus: string;
  client?: string;
  phone?: string;
}

export interface P24RegisterResponse {
  token: string;
  redirectUrl: string;
}

export interface P24VerifyParams {
  sessionId: string;
  orderId: number;
  amount: number;
  currency: 'PLN';
}

export interface P24Notification {
  merchantId: number;
  posId: number;
  sessionId: string;
  amount: number;
  originAmount: number;
  currency: string;
  orderId: number;
  methodId: number;
  statement: string;
  sign: string;
}

// ============================================================================
// PROVIDER INTERFACE
// ============================================================================

export interface PaymentProvider {
  /**
   * Create a new payment
   */
  createPayment(params: CreatePaymentParams): Promise<PaymentResult>;

  /**
   * Get payment status
   */
  getPaymentStatus(orderId: string): Promise<PaymentStatusResult>;

  /**
   * Verify webhook signature
   */
  verifyWebhook(body: string, signature: string): boolean;
}
