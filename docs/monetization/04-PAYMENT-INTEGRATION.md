# Integracja Płatności

## 1. Przegląd

```
┌─────────────────────────────────────────────────────────────┐
│              STRATEGIA INTEGRACJI PŁATNOŚCI                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  FAZA 1 (MVP) - Polski rynek                               │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                                                      │  │
│  │   PayU              Przelewy24                      │  │
│  │   ════              ═══════════                     │  │
│  │   • BLIK            • BLIK                          │  │
│  │   • Karty           • Karty                         │  │
│  │   • Przelewy        • Przelewy                      │  │
│  │   • Google Pay      • Apple Pay                     │  │
│  │                                                      │  │
│  │   Główny provider   Backup / alternatywa            │  │
│  │                                                      │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  FAZA 2 (Później) - Międzynarodowy                         │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                                                      │  │
│  │   Stripe                                            │  │
│  │   ══════                                            │  │
│  │   • Subskrypcje (Pro unlimited)                    │  │
│  │   • Międzynarodowe karty                           │  │
│  │   • Billing portal                                 │  │
│  │   • Invoicing                                      │  │
│  │                                                      │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Konfiguracja środowiska

### 2.1 Zmienne środowiskowe

```bash
# Plik: apps/payments/.env.local

# ══════════════════════════════════════════════════════════════
# PAYU
# ══════════════════════════════════════════════════════════════

# Sandbox (testowe)
PAYU_POS_ID=300746
PAYU_SECOND_KEY=b6ca15b0d1020e8094d9b5f8d163db54
PAYU_OAUTH_CLIENT_ID=300746
PAYU_OAUTH_CLIENT_SECRET=2ee86a66e5d97e3fadc400c9f19b065d

# Production (produkcyjne) - odkomentuj gdy gotowe
# PAYU_POS_ID=your_production_pos_id
# PAYU_SECOND_KEY=your_production_second_key
# PAYU_OAUTH_CLIENT_ID=your_production_client_id
# PAYU_OAUTH_CLIENT_SECRET=your_production_client_secret

PAYU_SANDBOX=true
PAYU_NOTIFY_URL=https://your-domain.pl/api/webhooks/payu
PAYU_CONTINUE_URL=https://your-domain.pl/payment/success

# ══════════════════════════════════════════════════════════════
# PRZELEWY24
# ══════════════════════════════════════════════════════════════

# Sandbox
P24_MERCHANT_ID=your_sandbox_merchant_id
P24_POS_ID=your_sandbox_pos_id
P24_CRC=your_sandbox_crc
P24_API_KEY=your_sandbox_api_key

# Production - odkomentuj gdy gotowe
# P24_MERCHANT_ID=your_production_merchant_id
# P24_POS_ID=your_production_pos_id
# P24_CRC=your_production_crc
# P24_API_KEY=your_production_api_key

P24_SANDBOX=true
P24_URL_RETURN=https://your-domain.pl/payment/success
P24_URL_STATUS=https://your-domain.pl/api/webhooks/p24

# ══════════════════════════════════════════════════════════════
# STRIPE (FAZA 2)
# ══════════════════════════════════════════════════════════════

# STRIPE_SECRET_KEY=sk_test_xxx
# STRIPE_PUBLISHABLE_KEY=pk_test_xxx
# STRIPE_WEBHOOK_SECRET=whsec_xxx

# ══════════════════════════════════════════════════════════════
# GENERAL
# ══════════════════════════════════════════════════════════════

NEXT_PUBLIC_SITE_URL=https://your-domain.pl
```

---

## 3. Implementacja PayU

### 3.1 Klient PayU

```typescript
// Plik: packages/payments/src/providers/payu/client.ts

import crypto from 'crypto';

export interface PayUConfig {
  posId: string;
  secondKey: string;
  oauthClientId: string;
  oauthClientSecret: string;
  sandbox: boolean;
  notifyUrl: string;
  continueUrl: string;
}

export interface PayUOrderRequest {
  customerIp: string;
  description: string;
  totalAmount: number; // w groszach
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

export class PayUClient {
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

  // ══════════════════════════════════════════════════════════
  // AUTORYZACJA OAUTH
  // ══════════════════════════════════════════════════════════

  async getAccessToken(): Promise<string> {
    // Sprawdź czy token jest jeszcze ważny
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.accessToken;
    }

    const response = await fetch(`${this.baseUrl}/pl/standard/user/oauth/authorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.config.oauthClientId,
        client_secret: this.config.oauthClientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error(`PayU OAuth failed: ${response.status}`);
    }

    const data = await response.json();

    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000;

    return this.accessToken;
  }

  // ══════════════════════════════════════════════════════════
  // TWORZENIE ZAMÓWIENIA
  // ══════════════════════════════════════════════════════════

  async createOrder(request: PayUOrderRequest): Promise<PayUOrderResponse> {
    const token = await this.getAccessToken();

    const orderData = {
      notifyUrl: this.config.notifyUrl,
      continueUrl: this.config.continueUrl,
      customerIp: request.customerIp,
      merchantPosId: this.config.posId,
      description: request.description,
      currencyCode: request.currencyCode,
      totalAmount: request.totalAmount.toString(),
      extOrderId: request.extOrderId,
      buyer: request.buyer,
      products: request.products.map(p => ({
        name: p.name,
        unitPrice: p.unitPrice.toString(),
        quantity: p.quantity.toString(),
      })),
    };

    const response = await fetch(`${this.baseUrl}/api/v2_1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(orderData),
      redirect: 'manual', // Ważne! PayU zwraca redirect
    });

    // PayU zwraca 302 redirect z Location header
    if (response.status === 302) {
      const location = response.headers.get('Location');
      const body = await response.json();

      return {
        status: body.status,
        redirectUri: location || body.redirectUri,
        orderId: body.orderId,
        extOrderId: request.extOrderId,
      };
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`PayU create order failed: ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  // ══════════════════════════════════════════════════════════
  // POBIERANIE STATUSU
  // ══════════════════════════════════════════════════════════

  async getOrderStatus(orderId: string): Promise<PayUOrderStatus> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}/api/v2_1/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`PayU get order failed: ${response.status}`);
    }

    return response.json();
  }

  // ══════════════════════════════════════════════════════════
  // WERYFIKACJA WEBHOOKA
  // ══════════════════════════════════════════════════════════

  verifySignature(body: string, signatureHeader: string): boolean {
    // Header format: signature=xxx;algorithm=SHA-256;...
    const parts = signatureHeader.split(';');
    const signaturePart = parts.find(p => p.startsWith('signature='));

    if (!signaturePart) {
      return false;
    }

    const receivedSignature = signaturePart.split('=')[1];

    // Oblicz expected signature
    const concatenated = body + this.config.secondKey;
    const expectedSignature = crypto
      .createHash('md5')
      .update(concatenated)
      .digest('hex');

    return receivedSignature === expectedSignature;
  }

  // ══════════════════════════════════════════════════════════
  // PARSOWANIE NOTYFIKACJI
  // ══════════════════════════════════════════════════════════

  parseNotification(body: string): PayUNotification {
    return JSON.parse(body);
  }
}

// ══════════════════════════════════════════════════════════
// TYPY
// ══════════════════════════════════════════════════════════

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

export type PayUStatus =
  | 'NEW'
  | 'PENDING'
  | 'WAITING_FOR_CONFIRMATION'
  | 'COMPLETED'
  | 'CANCELED'
  | 'REJECTED';
```

### 3.2 Webhook Handler PayU

```typescript
// Plik: apps/payments/app/api/webhooks/payu/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PayUClient, PayUNotification } from '@meble/payments';
import { payuConfig } from '@meble/config/payment-providers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const payuClient = new PayUClient(payuConfig);

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signatureHeader = request.headers.get('OpenPayU-Signature');

    // 1. Weryfikacja podpisu
    if (!signatureHeader || !payuClient.verifySignature(body, signatureHeader)) {
      console.error('PayU webhook: Invalid signature');
      return new NextResponse('Invalid signature', { status: 401 });
    }

    // 2. Parsowanie notyfikacji
    const notification: PayUNotification = payuClient.parseNotification(body);
    const { order } = notification;

    console.log(`PayU webhook: Order ${order.extOrderId} status: ${order.status}`);

    // 3. Aktualizacja płatności w bazie
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: mapPayUStatus(order.status),
        provider_order_id: order.orderId,
        provider_response: notification,
        updated_at: new Date().toISOString(),
        ...(order.status === 'COMPLETED' && {
          completed_at: new Date().toISOString(),
        }),
      })
      .eq('external_order_id', order.extOrderId);

    if (updateError) {
      console.error('PayU webhook: DB update failed', updateError);
      return new NextResponse('Database error', { status: 500 });
    }

    // 4. Jeśli COMPLETED - przyznaj kredyty lub potwierdź zamówienie
    if (order.status === 'COMPLETED') {
      await handlePaymentCompleted(order.extOrderId);
    }

    return new NextResponse('OK', { status: 200 });

  } catch (error) {
    console.error('PayU webhook error:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

// ══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════

function mapPayUStatus(payuStatus: string): string {
  const statusMap: Record<string, string> = {
    NEW: 'pending',
    PENDING: 'processing',
    WAITING_FOR_CONFIRMATION: 'processing',
    COMPLETED: 'completed',
    CANCELED: 'cancelled',
    REJECTED: 'failed',
  };
  return statusMap[payuStatus] || 'pending';
}

async function handlePaymentCompleted(externalOrderId: string) {
  // Pobierz dane płatności
  const { data: payment, error } = await supabase
    .from('payments')
    .select('*')
    .eq('external_order_id', externalOrderId)
    .single();

  if (error || !payment) {
    console.error('Payment not found:', externalOrderId);
    return;
  }

  switch (payment.payment_type) {
    case 'credit_purchase':
      await grantCredits(payment);
      break;
    case 'order':
      await confirmOrder(payment);
      break;
    case 'shop':
      await confirmShopOrder(payment);
      break;
  }
}

async function grantCredits(payment: any) {
  // Pobierz package info z metadata
  const packageId = payment.metadata?.packageId;
  const packages = await import('@meble/config/pricing');
  const pkg = packages.EXPORT_PACKAGES[packageId];

  if (!pkg) {
    console.error('Unknown package:', packageId);
    return;
  }

  if (payment.user_id) {
    // Zalogowany user
    await supabase.from('export_credits').insert({
      user_id: payment.user_id,
      credits_total: pkg.credits,
      credits_used: 0,
      package_type: packageId,
      valid_until: pkg.validDays
        ? new Date(Date.now() + pkg.validDays * 24 * 60 * 60 * 1000).toISOString()
        : null,
      payment_id: payment.id,
    });
  } else if (payment.guest_session_id) {
    // Guest
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dni

    await supabase.from('guest_credits').upsert({
      session_id: payment.guest_session_id,
      email: payment.metadata?.email,
      credits_total: pkg.credits,
      credits_used: 0,
      expires_at: expiresAt.toISOString(),
      last_payment_id: payment.id,
    }, {
      onConflict: 'session_id',
    });
  }

  console.log(`Credits granted: ${pkg.credits} for payment ${payment.id}`);
}

async function confirmOrder(payment: any) {
  await supabase
    .from('orders')
    .update({
      status: 'paid',
      payment_status: 'completed',
      paid_at: new Date().toISOString(),
    })
    .eq('id', payment.order_id);

  // TODO: Wyślij zamówienie do producenta
  // TODO: Wyślij email potwierdzający

  console.log(`Order confirmed: ${payment.order_id}`);
}

async function confirmShopOrder(payment: any) {
  // TODO: Obsługa zamówień sklepowych
  console.log(`Shop order confirmed: ${payment.id}`);
}
```

---

## 4. Implementacja Przelewy24

### 4.1 Klient Przelewy24

```typescript
// Plik: packages/payments/src/providers/przelewy24/client.ts

import crypto from 'crypto';

export interface P24Config {
  merchantId: number;
  posId: number;
  crc: string;
  apiKey: string;
  sandbox: boolean;
  urlReturn: string;
  urlStatus: string;
}

export interface P24TransactionRequest {
  sessionId: string;
  amount: number; // w groszach
  currency: 'PLN';
  description: string;
  email: string;
  country: 'PL';
  language: 'pl' | 'en';
  urlReturn: string;
  urlStatus: string;
  client?: string;
  address?: string;
  zip?: string;
  city?: string;
  phone?: string;
}

export class Przelewy24Client {
  private config: P24Config;
  private baseUrl: string;

  constructor(config: P24Config) {
    this.config = config;
    this.baseUrl = config.sandbox
      ? 'https://sandbox.przelewy24.pl'
      : 'https://secure.przelewy24.pl';
  }

  // ══════════════════════════════════════════════════════════
  // REJESTRACJA TRANSAKCJI
  // ══════════════════════════════════════════════════════════

  async registerTransaction(request: P24TransactionRequest): Promise<P24RegisterResponse> {
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

    const response = await fetch(`${this.baseUrl}/api/v1/transaction/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${this.getAuthHeader()}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.error !== 0) {
      throw new Error(`P24 register failed: ${data.error} - ${data.errorMessage}`);
    }

    return {
      token: data.data.token,
      redirectUrl: `${this.baseUrl}/trnRequest/${data.data.token}`,
    };
  }

  // ══════════════════════════════════════════════════════════
  // WERYFIKACJA TRANSAKCJI
  // ══════════════════════════════════════════════════════════

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
        'Authorization': `Basic ${this.getAuthHeader()}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return data.data?.status === 'success';
  }

  // ══════════════════════════════════════════════════════════
  // WERYFIKACJA NOTYFIKACJI
  // ══════════════════════════════════════════════════════════

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

  // ══════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════

  private getAuthHeader(): string {
    const credentials = `${this.config.posId}:${this.config.apiKey}`;
    return Buffer.from(credentials).toString('base64');
  }

  private calculateSign(params: Record<string, any>): string {
    const json = JSON.stringify(params);
    return crypto.createHash('sha384').update(json).digest('hex');
  }
}

// ══════════════════════════════════════════════════════════
// TYPY
// ══════════════════════════════════════════════════════════

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
```

### 4.2 Webhook Handler Przelewy24

```typescript
// Plik: apps/payments/app/api/webhooks/p24/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Przelewy24Client, P24Notification } from '@meble/payments';
import { p24Config } from '@meble/config/payment-providers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const p24Client = new Przelewy24Client(p24Config);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as P24Notification;

    console.log(`P24 webhook: Session ${body.sessionId} order ${body.orderId}`);

    // 1. Weryfikacja podpisu
    if (!p24Client.verifyNotification(body)) {
      console.error('P24 webhook: Invalid signature');
      return NextResponse.json({ error: 1 }, { status: 401 });
    }

    // 2. Weryfikacja transakcji w P24
    const isVerified = await p24Client.verifyTransaction({
      sessionId: body.sessionId,
      orderId: body.orderId,
      amount: body.amount,
      currency: 'PLN',
    });

    if (!isVerified) {
      console.error('P24 webhook: Transaction verification failed');

      await supabase
        .from('payments')
        .update({
          status: 'failed',
          provider_response: body,
          updated_at: new Date().toISOString(),
        })
        .eq('external_order_id', body.sessionId);

      return NextResponse.json({ error: 1 });
    }

    // 3. Aktualizacja płatności
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'completed',
        provider_order_id: body.orderId.toString(),
        provider_response: body,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('external_order_id', body.sessionId);

    if (updateError) {
      console.error('P24 webhook: DB update failed', updateError);
      return NextResponse.json({ error: 1 });
    }

    // 4. Przyznaj kredyty / potwierdź zamówienie
    await handlePaymentCompleted(body.sessionId);

    return NextResponse.json({ error: 0 });

  } catch (error) {
    console.error('P24 webhook error:', error);
    return NextResponse.json({ error: 1 }, { status: 500 });
  }
}

// handlePaymentCompleted - taka sama jak dla PayU
async function handlePaymentCompleted(externalOrderId: string) {
  // ... (identyczna implementacja jak w PayU)
}
```

---

## 5. Unified Payment Service

### 5.1 Interfejs abstrakcyjny

```typescript
// Plik: packages/payments/src/index.ts

export interface PaymentProvider {
  createPayment(params: CreatePaymentParams): Promise<PaymentResult>;
  verifyPayment?(params: VerifyPaymentParams): Promise<boolean>;
  getPaymentStatus(paymentId: string): Promise<PaymentStatus>;
}

export interface CreatePaymentParams {
  amount: number;
  currency: string;
  description: string;
  externalOrderId: string;
  customerEmail: string;
  customerIp: string;
  returnUrl: string;
  products?: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  success: boolean;
  paymentId: string;
  redirectUrl: string;
  providerOrderId?: string;
}

export interface PaymentStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  completedAt?: Date;
}

// Factory
export function getPaymentProvider(
  provider: 'payu' | 'przelewy24' | 'stripe'
): PaymentProvider {
  switch (provider) {
    case 'payu':
      return new PayUProvider();
    case 'przelewy24':
      return new Przelewy24Provider();
    case 'stripe':
      return new StripeProvider();
    default:
      throw new Error(`Unknown payment provider: ${provider}`);
  }
}
```

### 5.2 Serwis płatności

```typescript
// Plik: packages/payments/src/services/payment.service.ts

import { createClient } from '@supabase/supabase-js';
import { getPaymentProvider, CreatePaymentParams } from '../index';
import { EXPORT_PACKAGES } from '@meble/config/pricing';

export class PaymentService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async createCreditPurchase(params: {
    packageId: string;
    provider: 'payu' | 'przelewy24';
    userId?: string;
    guestSessionId?: string;
    email: string;
    customerIp: string;
    returnUrl: string;
  }) {
    const pkg = EXPORT_PACKAGES[params.packageId];
    if (!pkg) {
      throw new Error('Invalid package');
    }

    // Generuj external order ID
    const externalOrderId = `PAY-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    // Zapisz płatność do bazy
    const { data: payment, error } = await this.supabase
      .from('payments')
      .insert({
        payment_type: 'credit_purchase',
        provider: params.provider,
        external_order_id: externalOrderId,
        user_id: params.userId,
        guest_session_id: params.guestSessionId,
        amount: pkg.price,
        currency: pkg.currency,
        status: 'pending',
        metadata: {
          packageId: params.packageId,
          email: params.email,
        },
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create payment: ${error.message}`);
    }

    // Utwórz płatność u providera
    const paymentProvider = getPaymentProvider(params.provider);
    const result = await paymentProvider.createPayment({
      amount: pkg.price,
      currency: pkg.currency,
      description: `Meblarz - ${pkg.name}`,
      externalOrderId,
      customerEmail: params.email,
      customerIp: params.customerIp,
      returnUrl: params.returnUrl,
      products: [
        {
          name: pkg.name,
          price: pkg.price,
          quantity: 1,
        },
      ],
    });

    // Aktualizuj redirect URL
    await this.supabase
      .from('payments')
      .update({ redirect_url: result.redirectUrl })
      .eq('id', payment.id);

    return {
      paymentId: payment.id,
      externalOrderId,
      redirectUrl: result.redirectUrl,
    };
  }

  async createOrderPayment(params: {
    orderId: string;
    provider: 'payu' | 'przelewy24';
    customerIp: string;
    returnUrl: string;
  }) {
    // Pobierz zamówienie
    const { data: order } = await this.supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', params.orderId)
      .single();

    if (!order) {
      throw new Error('Order not found');
    }

    const externalOrderId = `ORD-${order.order_number}-${Date.now()}`;

    // Zapisz płatność
    const { data: payment } = await this.supabase
      .from('payments')
      .insert({
        payment_type: 'order',
        provider: params.provider,
        external_order_id: externalOrderId,
        user_id: order.user_id,
        order_id: order.id,
        amount: order.total,
        currency: order.currency,
        status: 'pending',
      })
      .select()
      .single();

    // Utwórz płatność u providera
    const paymentProvider = getPaymentProvider(params.provider);
    const result = await paymentProvider.createPayment({
      amount: order.total,
      currency: order.currency,
      description: `Zamówienie ${order.order_number}`,
      externalOrderId,
      customerEmail: order.delivery_address?.email,
      customerIp: params.customerIp,
      returnUrl: params.returnUrl,
      products: order.order_items.map((item: any) => ({
        name: item.part_name,
        price: item.unit_price,
        quantity: item.quantity,
      })),
    });

    return {
      paymentId: payment.id,
      redirectUrl: result.redirectUrl,
    };
  }
}
```

---

## 6. Flow płatności

```
┌─────────────────────────────────────────────────────────────┐
│                    FLOW PŁATNOŚCI                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  USER                    MEBLARZ                PROVIDER    │
│   │                         │                       │       │
│   │  1. Kliknij "Kup"       │                       │       │
│   │────────────────────────►│                       │       │
│   │                         │                       │       │
│   │                         │  2. POST /payments    │       │
│   │                         │      /create          │       │
│   │                         │──────────────────────►│       │
│   │                         │                       │       │
│   │                         │  3. redirectUrl       │       │
│   │                         │◄──────────────────────│       │
│   │                         │                       │       │
│   │  4. Redirect            │                       │       │
│   │◄────────────────────────│                       │       │
│   │                         │                       │       │
│   │  5. Płatność na         │                       │       │
│   │     stronie PayU/P24    │                       │       │
│   │─────────────────────────────────────────────────►       │
│   │                         │                       │       │
│   │                         │  6. Webhook           │       │
│   │                         │◄──────────────────────│       │
│   │                         │                       │       │
│   │                         │  7. Przyznaj kredyty  │       │
│   │                         │      lub potwierdź    │       │
│   │                         │      zamówienie       │       │
│   │                         │                       │       │
│   │  8. Redirect success    │                       │       │
│   │◄──────────────────────────────────────────────── │      │
│   │                         │                       │       │
│   │  9. Pokaż sukces        │                       │       │
│   │◄────────────────────────│                       │       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

*Następny dokument: [05-GUEST-MONETIZATION.md](./05-GUEST-MONETIZATION.md)*
