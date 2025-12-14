# Plan Monetyzacji Aplikacji Meblarz

## Spis treści
1. [Podsumowanie modeli biznesowych](#1-podsumowanie-modeli-biznesowych)
2. [Model 1: Płatny Export + Mini-sklep](#2-model-1-płatny-export--mini-sklep)
3. [Model 2: White-label dla Tenantów](#3-model-2-white-label-dla-tenantów)
4. [Model 3: Zamówienia z prowizją](#4-model-3-zamówienia-z-prowizją)
5. [Integracja płatności PayU/Przelewy24](#5-integracja-płatności-payu--przelewy24)
6. [Architektura techniczna](#6-architektura-techniczna)
7. [Schemat bazy danych](#7-schemat-bazy-danych)
8. [Plan implementacji](#8-plan-implementacji)

---

## 1. Podsumowanie modeli biznesowych

| Model | Użytkownik | Sposób rozliczenia | Priorytet |
|-------|------------|-------------------|-----------|
| Export + Mini-sklep | B2C (każdy) | Kredyty/paczki eksportów | Wysoki |
| White-label Tenant | B2B (hurtownie) | Umowa B2B | Średni |
| Zamówienia prowizyjne | B2C via B2B | % od zamówienia | Wysoki |

---

## 2. Model 1: Płatny Export + Mini-sklep

### 2.1 Problem do rozwiązania

> "Płacenie za jeden export to przesada - user chce zrobić małą zmianę i nie chce płacić ponownie"

### 2.2 Rozwiązanie: System kredytów eksportowych

**Zamiast płatności za pojedynczy export → system "paczek eksportów" lub kredytów:**

```
┌─────────────────────────────────────────────────────────────┐
│                    PAKIETY EKSPORTÓW                        │
├─────────────────────────────────────────────────────────────┤
│  🆓 Darmowy      │  0 zł    │  1 export/projekt (preview)  │
│  📦 Starter      │  19 zł   │  5 eksportów                 │
│  📦 Standard     │  49 zł   │  20 eksportów                │
│  📦 Pro          │  99 zł   │  Unlimited (30 dni)          │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Mechanizm "Smart Export" - rozwiązanie problemu małych zmian

**Koncepcja: Grupowanie eksportów tego samego projektu**

```typescript
// Logika: Eksport tego samego projektu w ciągu 24h = 1 kredyt
interface ExportSession {
  projectHash: string;      // Hash projektu (materiały + części)
  firstExportAt: Date;
  exportsCount: number;
  creditsUsed: 1;           // Zawsze 1 kredyt na sesję 24h
}

// Algorytm:
// 1. Użytkownik eksportuje projekt → oblicz hash projektu
// 2. Sprawdź czy istnieje aktywna sesja (< 24h) dla tego hasha
// 3. Jeśli tak → darmowy re-export (ta sama sesja)
// 4. Jeśli nie → nowa sesja, zużyj 1 kredyt
```

**Alternatywa: Export z limitem "rewizji"**
```
1 kredyt = 1 projekt + 3 darmowe rewizje w ciągu 7 dni
```

### 2.4 Flow dla użytkowników

```
┌─────────────────────────────────────────────────────────────┐
│                    NIEZALOGOWANY USER                       │
├─────────────────────────────────────────────────────────────┤
│  1. Projektuje mebel w aplikacji                           │
│  2. Klika "Eksportuj CSV"                                  │
│  3. Widzi podgląd (watermark: "PREVIEW")                   │
│  4. Opcje:                                                 │
│     a) Zaloguj się (jeśli ma kredyty → export)            │
│     b) Kup pakiet jako gość (email + płatność)            │
│     c) Zarejestruj się i kup pakiet                       │
│  5. Po płatności → automatyczny export + email z linkiem  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    ZALOGOWANY USER                          │
├─────────────────────────────────────────────────────────────┤
│  1. Projektuje mebel                                       │
│  2. Klika "Eksportuj CSV"                                  │
│  3. System sprawdza kredyty:                               │
│     - Ma kredyty → Export + dekrementacja                  │
│     - Brak kredytów → Modal "Dokup pakiet"                 │
│  4. Historia eksportów w profilu                           │
└─────────────────────────────────────────────────────────────┘
```

### 2.5 Mini-sklep z akcesoriami

**Moment sprzedaży: Po eksporcie (upsell)**

```
┌─────────────────────────────────────────────────────────────┐
│              🎉 Export zakończony!                          │
│                                                             │
│  Twój projekt zawiera:                                     │
│  • 12 płyt meblowych                                       │
│  • 2 szafki kuchenne                                       │
│  • 1 szuflada                                              │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📦 Polecane produkty do Twojego projektu:                 │
│                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                    │
│  │ Prowad- │  │ Zawiasy │  │ Uchwyty │                    │
│  │ nice    │  │ ciche   │  │ meblowe │                    │
│  │ 89 zł   │  │ 45 zł   │  │ 29 zł   │                    │
│  │[Dodaj]  │  │[Dodaj]  │  │[Dodaj]  │                    │
│  └─────────┘  └─────────┘  └─────────┘                    │
│                                                             │
│  [Pobierz CSV]        [Przejdź do koszyka (3)]            │
└─────────────────────────────────────────────────────────────┘
```

**Logika rekomendacji produktów:**
```typescript
interface ProductRecommendation {
  // Na podstawie projektu automatycznie sugeruj:
  triggers: {
    hasCabinets: ['prowadnice', 'zawiasy', 'uchwyty'];
    hasDrawers: ['prowadnice_szufladowe', 'organizery'];
    hasKitchen: ['blaty_robocze', 'zlewozmywaki'];
    totalParts > 20: ['narzędzia_montażowe'];
  };
}
```

---

## 3. Model 2: White-label dla Tenantów

### 3.1 Koncepcja

```
┌─────────────────────────────────────────────────────────────┐
│  Hurtownia "PłytyMax" chce własną aplikację:               │
│                                                             │
│  plytymax.meblarz.pl  lub  projektant.plytymax.pl          │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  [Logo PłytyMax]              [Zaloguj] [Koszyk]     │ │
│  │                                                       │ │
│  │  Projektant Mebli PłytyMax                           │ │
│  │  ══════════════════════════                          │ │
│  │                                                       │ │
│  │  Materiały z katalogu PłytyMax:                      │ │
│  │  • Płyta Egger H3700 ST10                           │ │
│  │  • Płyta Kronospan K001 PW                          │ │
│  │  • HDF biały 3mm                                    │ │
│  │                                                       │ │
│  │  [Eksport CSV]  [Zamów w PłytyMax]                  │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Konfiguracja Tenanta

```typescript
interface TenantConfig {
  // Identyfikacja
  id: string;                    // 'plytymax'
  subdomain: string;             // 'plytymax.meblarz.pl'
  customDomain?: string;         // 'projektant.plytymax.pl'

  // Branding
  branding: {
    logo: string;
    primaryColor: string;
    secondaryColor: string;
    favicon: string;
    companyName: string;
  };

  // Materiały
  materials: {
    useCustomCatalog: boolean;   // true = tylko materiały tenanta
    catalogUrl?: string;         // API do pobierania katalogu
    allowUserMaterials: boolean; // czy user może dodać własne
  };

  // Export
  export: {
    format: 'csv' | 'xlsx' | 'custom';
    customColumns?: string[];    // Mapowanie na ich system
    includeOrderCode: boolean;   // Kody produktowe tenanta
    sendToEmail?: string;        // Kopia eksportu do hurtowni
  };

  // Sklep/Akcesoria
  shop: {
    enabled: boolean;
    source: 'meblarz' | 'tenant' | 'both';
    tenantProductsUrl?: string;  // API do produktów tenanta
  };

  // Rozliczenia
  billing: {
    model: 'free' | 'per_export' | 'per_order' | 'flat_fee';
    commission?: number;         // % od zamówień
    flatFee?: number;           // Miesięczna opłata
  };
}
```

### 3.3 Wykrywanie Tenanta

```typescript
// middleware.ts
export function detectTenant(request: NextRequest): TenantConfig | null {
  const host = request.headers.get('host');

  // 1. Subdomena: plytymax.meblarz.pl
  const subdomainMatch = host?.match(/^([^.]+)\.meblarz\.pl$/);
  if (subdomainMatch) {
    return getTenantBySubdomain(subdomainMatch[1]);
  }

  // 2. Custom domain: projektant.plytymax.pl
  const tenant = getTenantByCustomDomain(host);
  if (tenant) return tenant;

  // 3. Query param (dev): ?tenant=plytymax
  const tenantParam = request.nextUrl.searchParams.get('tenant');
  if (tenantParam) {
    return getTenantBySubdomain(tenantParam);
  }

  return null; // Domyślna wersja Meblarz
}
```

### 3.4 Architektura Multi-tenant

```
┌─────────────────────────────────────────────────────────────┐
│                     ARCHITEKTURA                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ meblarz.pl  │  │ plytymax.  │  │ drewnoland. │        │
│  │             │  │ meblarz.pl │  │ meblarz.pl  │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                │
│         └────────────────┼────────────────┘                │
│                          ▼                                 │
│              ┌───────────────────────┐                     │
│              │    Next.js App        │                     │
│              │  (jedna instancja)    │                     │
│              └───────────┬───────────┘                     │
│                          │                                 │
│         ┌────────────────┼────────────────┐               │
│         ▼                ▼                ▼               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Supabase  │  │  Tenant DB  │  │  Tenant API │        │
│  │  (główna)   │  │  (config)   │  │  (katalogi) │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Model 3: Zamówienia z prowizją

### 4.1 Flow zamówienia

```
┌─────────────────────────────────────────────────────────────┐
│                FLOW ZAMÓWIENIA                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  USER                  MEBLARZ                PRODUCENT     │
│   │                       │                       │         │
│   │  1. Projektuje        │                       │         │
│   │─────────────────────► │                       │         │
│   │                       │                       │         │
│   │  2. "Zamów w          │                       │         │
│   │     Hurtowni X"       │                       │         │
│   │─────────────────────► │                       │         │
│   │                       │                       │         │
│   │  3. Wycena            │  4. Request           │         │
│   │◄─────────────────────│─────────────────────► │         │
│   │   (ceny od producenta)│   (dane projektu)    │         │
│   │                       │                       │         │
│   │  5. Akceptacja        │                       │         │
│   │     + Płatność        │                       │         │
│   │─────────────────────► │                       │         │
│   │                       │                       │         │
│   │                       │  6. Zamówienie        │         │
│   │                       │─────────────────────► │         │
│   │                       │                       │         │
│   │                       │  7. Prowizja X%       │         │
│   │                       │◄─────────────────────│         │
│   │                       │                       │         │
│   │  8. Potwierdzenie     │                       │         │
│   │◄─────────────────────│                       │         │
│   │                       │                       │         │
│   │                    9. Realizacja              │         │
│   │◄─────────────────────────────────────────────│         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Integracja z Producentami

```typescript
interface ProducerIntegration {
  id: string;
  name: string;                    // "Hurtownia Drewnoland"

  // API Integration
  api: {
    type: 'rest' | 'email' | 'manual';
    endpoint?: string;             // REST API producenta
    authMethod?: 'apiKey' | 'oauth' | 'basic';
    webhookUrl?: string;           // Callback dla statusów
  };

  // Pricing
  pricing: {
    source: 'api' | 'catalog' | 'manual_quote';
    catalogId?: string;            // ID katalogu cen
    markupPercent?: number;        // Narzut Meblarz
  };

  // Commission
  commission: {
    type: 'percentage' | 'fixed' | 'tiered';
    value: number;                 // np. 5%
    tiers?: Array<{
      minOrderValue: number;
      commission: number;
    }>;
  };

  // Delivery
  delivery: {
    regions: string[];             // Obsługiwane regiony
    estimatedDays: number;
    shippingCalculation: 'flat' | 'weight' | 'api';
  };
}
```

### 4.3 UI Wyboru Producenta

```
┌─────────────────────────────────────────────────────────────┐
│           Zamów materiały do swojego projektu               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Twój projekt wymaga:                                      │
│  • 12 płyt Egger H3700 (18mm) - łącznie 4.2 m²            │
│  • 4 płyty HDF biały (3mm) - łącznie 1.1 m²               │
│  • Obrzeże ABS 2mm - 24 mb                                 │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Wybierz dostawcę:                                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ ★★★★★ Drewnoland                                    │  │
│  │ 📍 Warszawa | 🚚 2-3 dni | 💰 od 450 zł             │  │
│  │ ✓ Cięcie na wymiar  ✓ Okleinowanie                 │  │
│  │                                    [Wybierz]        │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ ★★★★☆ PłytyMax                                     │  │
│  │ 📍 Kraków | 🚚 3-5 dni | 💰 od 420 zł              │  │
│  │ ✓ Cięcie na wymiar  ✗ Okleinowanie                 │  │
│  │                                    [Wybierz]        │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  [← Wróć do projektu]     [Eksportuj CSV zamiast]         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.4 Model danych zamówienia

```typescript
interface Order {
  id: string;
  userId: string;
  projectId: string;
  producerId: string;

  // Status
  status: 'draft' | 'quoted' | 'pending_payment' | 'paid' |
          'processing' | 'shipped' | 'delivered' | 'cancelled';

  // Items (z eksportu CSV)
  items: Array<{
    partId: string;
    materialCode: string;      // Kod producenta
    dimensions: { x: number; y: number; thickness: number };
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    services?: string[];       // ['cutting', 'edging']
  }>;

  // Pricing
  subtotal: number;
  shipping: number;
  commission: number;          // Prowizja Meblarz
  total: number;

  // Payment
  paymentMethod: 'payu' | 'przelewy24' | 'transfer';
  paymentId?: string;
  paidAt?: Date;

  // Delivery
  deliveryAddress: Address;
  estimatedDelivery?: Date;
  trackingNumber?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 5. Integracja płatności PayU / Przelewy24

### 5.1 Strategia integracji

```
┌─────────────────────────────────────────────────────────────┐
│              PRIORYTETY INTEGRACJI                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Faza 1 (MVP):                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  PayU / Przelewy24                                  │  │
│  │  • Jednorazowe płatności (pakiety eksportów)       │  │
│  │  • Płatności za zamówienia                         │  │
│  │  • BLIK, karty, przelewy                           │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  Faza 2 (później):                                         │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Stripe                                             │  │
│  │  • Subskrypcje (Pro unlimited)                     │  │
│  │  • Międzynarodowe płatności                        │  │
│  │  • Billing portal                                  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Architektura PayU

```typescript
// /apps/payments/lib/payu/client.ts

interface PayUConfig {
  posId: string;
  secondKey: string;
  oauthClientId: string;
  oauthClientSecret: string;
  sandbox: boolean;
}

class PayUClient {
  // Autoryzacja
  async getAccessToken(): Promise<string>;

  // Tworzenie zamówienia
  async createOrder(params: {
    customerIp: string;
    merchantPosId: string;
    description: string;
    currencyCode: 'PLN';
    totalAmount: number;        // W groszach!
    buyer?: {
      email: string;
      firstName?: string;
      lastName?: string;
    };
    products: Array<{
      name: string;
      unitPrice: number;
      quantity: number;
    }>;
    notifyUrl: string;          // Webhook URL
    continueUrl: string;        // Redirect po płatności
  }): Promise<{
    orderId: string;
    redirectUri: string;        // Redirect na PayU
  }>;

  // Weryfikacja statusu
  async getOrderStatus(orderId: string): Promise<OrderStatus>;

  // Webhook handling
  verifyNotification(body: string, signature: string): boolean;
}
```

### 5.3 Przelewy24 jako alternatywa

```typescript
// /apps/payments/lib/przelewy24/client.ts

interface P24Config {
  merchantId: number;
  posId: number;
  crc: string;
  apiKey: string;
  sandbox: boolean;
}

class Przelewy24Client {
  // Rejestracja transakcji
  async registerTransaction(params: {
    sessionId: string;
    amount: number;             // W groszach
    currency: 'PLN';
    description: string;
    email: string;
    urlReturn: string;
    urlStatus: string;          // Webhook
  }): Promise<{
    token: string;
    redirectUrl: string;
  }>;

  // Weryfikacja transakcji
  async verifyTransaction(params: {
    sessionId: string;
    orderId: number;
    amount: number;
  }): Promise<boolean>;
}
```

### 5.4 Unified Payment Interface

```typescript
// /apps/payments/lib/payments/index.ts

interface PaymentProvider {
  createPayment(params: CreatePaymentParams): Promise<PaymentResult>;
  verifyPayment(params: VerifyPaymentParams): Promise<boolean>;
  handleWebhook(payload: unknown, signature: string): Promise<WebhookResult>;
}

// Factory pattern dla przełączania providerów
function getPaymentProvider(type: 'payu' | 'przelewy24' | 'stripe'): PaymentProvider {
  switch (type) {
    case 'payu': return new PayUProvider();
    case 'przelewy24': return new Przelewy24Provider();
    case 'stripe': return new StripeProvider();
  }
}
```

### 5.5 Webhook Handling

```typescript
// /apps/payments/app/api/webhooks/payu/route.ts

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('OpenPayU-Signature');

  // 1. Weryfikacja podpisu
  if (!payuClient.verifyNotification(body, signature)) {
    return new Response('Invalid signature', { status: 401 });
  }

  const notification = JSON.parse(body);

  // 2. Update w bazie
  await supabase
    .from('payments')
    .update({
      status: notification.order.status,
      payu_order_id: notification.order.orderId,
      updated_at: new Date().toISOString(),
    })
    .eq('external_order_id', notification.order.extOrderId);

  // 3. Jeśli COMPLETED → przyznaj kredyty / potwierdź zamówienie
  if (notification.order.status === 'COMPLETED') {
    await handlePaymentCompleted(notification.order.extOrderId);
  }

  return new Response('OK');
}
```

---

## 6. Architektura techniczna

### 6.1 Nowe moduły do implementacji

```
apps/
├── app/                          # Główna aplikacja
│   └── src/
│       ├── features/
│       │   ├── export/           # Rozszerzony moduł eksportu
│       │   │   ├── ExportDialog.tsx (update)
│       │   │   ├── ExportCreditsCheck.tsx (new)
│       │   │   └── ExportUpsell.tsx (new)
│       │   │
│       │   ├── shop/             # Mini-sklep (new)
│       │   │   ├── ProductRecommendations.tsx
│       │   │   ├── Cart.tsx
│       │   │   ├── Checkout.tsx
│       │   │   └── hooks/useRecommendations.ts
│       │   │
│       │   ├── orders/           # Zamówienia (new)
│       │   │   ├── ProducerSelector.tsx
│       │   │   ├── OrderSummary.tsx
│       │   │   ├── OrderTracking.tsx
│       │   │   └── hooks/useOrder.ts
│       │   │
│       │   └── tenant/           # Multi-tenant (new)
│       │       ├── TenantProvider.tsx
│       │       ├── TenantBranding.tsx
│       │       └── hooks/useTenant.ts
│       │
│       └── lib/
│           ├── credits/          # System kredytów (new)
│           │   ├── useCredits.ts
│           │   └── creditService.ts
│           │
│           └── tenant/           # Tenant utils (new)
│               └── tenantService.ts
│
├── payments/                     # Aplikacja płatności (update)
│   └── src/
│       ├── lib/
│       │   ├── payu/            # PayU integration (new)
│       │   └── przelewy24/      # P24 integration (new)
│       │
│       └── app/api/
│           └── webhooks/
│               ├── payu/        # PayU webhooks (new)
│               └── p24/         # P24 webhooks (new)
│
└── admin/                        # Panel admina (new - opcjonalnie)
    └── src/
        ├── tenants/             # Zarządzanie tenantami
        ├── orders/              # Podgląd zamówień
        └── analytics/           # Statystyki
```

### 6.2 Diagram przepływu danych

```
┌─────────────────────────────────────────────────────────────┐
│                    ARCHITEKTURA SYSTEMU                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    FRONTEND                          │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────────────────┐ │   │
│  │  │ Projekt │  │ Export  │  │ Zamówienie/Sklep    │ │   │
│  │  │ 3D      │──│ Dialog  │──│                     │ │   │
│  │  └─────────┘  └────┬────┘  └──────────┬──────────┘ │   │
│  └─────────────────────┼─────────────────┼────────────┘   │
│                        │                 │                 │
│  ─────────────────────────────────────────────────────────  │
│                        │                 │                 │
│  ┌─────────────────────┼─────────────────┼────────────┐   │
│  │                 API LAYER             │             │   │
│  │  ┌──────────────────▼─────────────────▼──────────┐ │   │
│  │  │              Next.js API Routes               │ │   │
│  │  │  /api/export  /api/orders  /api/shop         │ │   │
│  │  └───────────────────┬───────────────────────────┘ │   │
│  └──────────────────────┼─────────────────────────────┘   │
│                         │                                  │
│  ─────────────────────────────────────────────────────────  │
│                         │                                  │
│  ┌──────────────────────┼─────────────────────────────┐   │
│  │               SERVICES LAYER                        │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐   │   │
│  │  │ Credit     │  │ Order      │  │ Payment    │   │   │
│  │  │ Service    │  │ Service    │  │ Service    │   │   │
│  │  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘   │   │
│  └────────┼───────────────┼───────────────┼──────────┘   │
│           │               │               │               │
│  ─────────────────────────────────────────────────────────  │
│           │               │               │               │
│  ┌────────▼───────────────▼───────────────▼──────────┐   │
│  │                   SUPABASE                         │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │   │
│  │  │ users    │  │ orders   │  │ export_credits   │ │   │
│  │  │ tenants  │  │ products │  │ payments         │ │   │
│  │  └──────────┘  └──────────┘  └──────────────────┘ │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │              EXTERNAL SERVICES                      │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │   │
│  │  │ PayU     │  │ P24      │  │ Producer APIs    │ │   │
│  │  └──────────┘  └──────────┘  └──────────────────┘ │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Schemat bazy danych

### 7.1 Nowe tabele Supabase

```sql
-- ============================================
-- KREDYTY EKSPORTOWE
-- ============================================

CREATE TABLE export_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Dla niezalogowanych (guest checkout)
  guest_email TEXT,
  guest_token TEXT UNIQUE,  -- Token do dostępu

  -- Kredyty
  credits_total INT NOT NULL DEFAULT 0,
  credits_used INT NOT NULL DEFAULT 0,

  -- Typ pakietu
  package_type TEXT NOT NULL,  -- 'starter', 'standard', 'pro'

  -- Ważność (dla Pro unlimited)
  valid_until TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT credits_check CHECK (credits_used <= credits_total),
  CONSTRAINT user_or_guest CHECK (user_id IS NOT NULL OR guest_email IS NOT NULL)
);

-- ============================================
-- SESJE EKSPORTOWE (Smart Export)
-- ============================================

CREATE TABLE export_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_id UUID REFERENCES export_credits(id) ON DELETE CASCADE,

  -- Identyfikacja projektu
  project_hash TEXT NOT NULL,  -- Hash projektu

  -- Sesja
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,  -- started_at + 24h
  exports_count INT DEFAULT 1,

  UNIQUE(credit_id, project_hash)
);

-- ============================================
-- TENANCI (White-label)
-- ============================================

CREATE TABLE tenants (
  id TEXT PRIMARY KEY,  -- 'plytymax'

  -- Domeny
  subdomain TEXT UNIQUE NOT NULL,  -- 'plytymax'
  custom_domain TEXT UNIQUE,       -- 'projektant.plytymax.pl'

  -- Branding
  company_name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3b82f6',
  secondary_color TEXT DEFAULT '#1e40af',
  favicon_url TEXT,

  -- Konfiguracja
  config JSONB DEFAULT '{}'::jsonb,

  -- Rozliczenia B2B
  billing_model TEXT DEFAULT 'free',  -- 'free', 'per_export', 'commission'
  commission_rate DECIMAL(5,2),

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MATERIAŁY TENANTA
-- ============================================

CREATE TABLE tenant_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,

  -- Dane materiału
  code TEXT NOT NULL,           -- Kod producenta
  name TEXT NOT NULL,
  thickness DECIMAL(6,2),       -- mm
  category TEXT,                -- 'board', 'hdf', 'edge'
  color TEXT,
  price_per_m2 DECIMAL(10,2),

  -- Dostępność
  in_stock BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, code)
);

-- ============================================
-- PRODUCENCI (dla zamówień)
-- ============================================

CREATE TABLE producers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Dane
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  description TEXT,

  -- Kontakt
  email TEXT,
  phone TEXT,
  website TEXT,

  -- Lokalizacja
  city TEXT,
  regions TEXT[],  -- Obsługiwane regiony

  -- Integracja
  api_type TEXT DEFAULT 'email',  -- 'rest', 'email', 'manual'
  api_config JSONB DEFAULT '{}'::jsonb,

  -- Prowizja
  commission_type TEXT DEFAULT 'percentage',
  commission_value DECIMAL(5,2) DEFAULT 5.00,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ZAMÓWIENIA
-- ============================================

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,  -- 'ORD-2024-001234'

  -- Relacje
  user_id UUID REFERENCES auth.users(id),
  producer_id UUID REFERENCES producers(id),
  tenant_id TEXT REFERENCES tenants(id),

  -- Dane projektu
  project_data JSONB NOT NULL,  -- Snapshot projektu

  -- Status
  status TEXT DEFAULT 'draft',

  -- Ceny
  subtotal DECIMAL(10,2) NOT NULL,
  shipping DECIMAL(10,2) DEFAULT 0,
  commission DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'PLN',

  -- Płatność
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT,
  payment_id TEXT,
  paid_at TIMESTAMPTZ,

  -- Dostawa
  delivery_address JSONB,
  estimated_delivery DATE,
  tracking_number TEXT,
  delivered_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- POZYCJE ZAMÓWIENIA
-- ============================================

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,

  -- Dane części
  part_name TEXT NOT NULL,
  material_code TEXT,
  material_name TEXT,

  -- Wymiary
  length_mm DECIMAL(10,2),
  width_mm DECIMAL(10,2),
  thickness_mm DECIMAL(6,2),

  -- Ilość i cena
  quantity INT DEFAULT 1,
  unit_price DECIMAL(10,2),
  total_price DECIMAL(10,2),

  -- Usługi dodatkowe
  services JSONB DEFAULT '[]'::jsonb,  -- ['cutting', 'edging']

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PŁATNOŚCI
-- ============================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relacje (jedno z poniższych)
  order_id UUID REFERENCES orders(id),
  credit_purchase_id UUID REFERENCES export_credits(id),

  -- Dane płatności
  provider TEXT NOT NULL,         -- 'payu', 'przelewy24', 'stripe'
  external_order_id TEXT UNIQUE,  -- Nasz ID dla providera
  provider_order_id TEXT,         -- ID od providera

  -- Kwota
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'PLN',

  -- Status
  status TEXT DEFAULT 'pending',

  -- Szczegóły
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PRODUKTY SKLEPOWE (akcesoria)
-- ============================================

CREATE TABLE shop_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Właściciel (null = Meblarz, tenant_id = tenant)
  tenant_id TEXT REFERENCES tenants(id),

  -- Dane produktu
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,

  -- Ceny
  price DECIMAL(10,2) NOT NULL,
  compare_at_price DECIMAL(10,2),  -- Cena przed promocją

  -- Kategoria
  category TEXT,  -- 'prowadnice', 'zawiasy', 'uchwyty', 'narzedzia'

  -- Tagi do rekomendacji
  recommendation_tags TEXT[],  -- ['has_drawers', 'kitchen']

  -- Media
  image_url TEXT,
  gallery_urls TEXT[],

  -- Dostępność
  in_stock BOOLEAN DEFAULT true,
  stock_quantity INT,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, slug)
);

-- ============================================
-- KOSZYK
-- ============================================

CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Właściciel
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,  -- Dla niezalogowanych

  -- Produkt
  product_id UUID REFERENCES shop_products(id) ON DELETE CASCADE,
  quantity INT DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT user_or_session CHECK (user_id IS NOT NULL OR session_id IS NOT NULL),
  UNIQUE(user_id, product_id),
  UNIQUE(session_id, product_id)
);

-- ============================================
-- INDEXY
-- ============================================

CREATE INDEX idx_export_credits_user ON export_credits(user_id);
CREATE INDEX idx_export_credits_guest ON export_credits(guest_token);
CREATE INDEX idx_export_sessions_hash ON export_sessions(project_hash);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_payments_external ON payments(external_order_id);
CREATE INDEX idx_shop_products_category ON shop_products(category);
CREATE INDEX idx_cart_items_user ON cart_items(user_id);
CREATE INDEX idx_cart_items_session ON cart_items(session_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE export_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own data
CREATE POLICY "Users can manage own credits" ON export_credits
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own orders" ON orders
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own cart" ON cart_items
  FOR ALL USING (auth.uid() = user_id);

-- Public read for products
CREATE POLICY "Anyone can read products" ON shop_products
  FOR SELECT USING (is_active = true);
```

---

## 8. Plan implementacji

### 8.1 Fazy projektu

```
┌─────────────────────────────────────────────────────────────┐
│                    ROADMAP IMPLEMENTACJI                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  FAZA 1: Fundament                                         │
│  ════════════════════════════════════════                  │
│  □ Schemat bazy danych (Supabase migrations)               │
│  □ Integracja PayU/Przelewy24                              │
│  □ Unified Payment Interface                                │
│  □ Webhook handlers                                        │
│                                                             │
│  FAZA 2: System kredytów i płatny export                   │
│  ════════════════════════════════════════                  │
│  □ Credit Service (przyznawanie, zużywanie)                │
│  □ Smart Export (sesje 24h)                                │
│  □ UI: Modal zakupu pakietu                                │
│  □ UI: Export z weryfikacją kredytów                       │
│  □ Guest checkout flow                                     │
│                                                             │
│  FAZA 3: Mini-sklep i rekomendacje                         │
│  ════════════════════════════════════════                  │
│  □ Product catalog (admin)                                 │
│  □ Recommendation engine                                   │
│  □ UI: Post-export upsell                                  │
│  □ Koszyk i checkout                                       │
│                                                             │
│  FAZA 4: Zamówienia u producentów                          │
│  ════════════════════════════════════════                  │
│  □ Producer management                                     │
│  □ Order creation flow                                     │
│  □ Pricing/quoting system                                  │
│  □ Order tracking                                          │
│  □ Commission settlement                                   │
│                                                             │
│  FAZA 5: White-label tenanci                               │
│  ════════════════════════════════════════                  │
│  □ Tenant detection middleware                             │
│  □ Branding system                                         │
│  □ Tenant material catalogs                                │
│  □ Custom export formats                                   │
│  □ Tenant admin panel                                      │
│                                                             │
│  FAZA 6: Polish & Analytics                                │
│  ════════════════════════════════════════                  │
│  □ Admin dashboard                                         │
│  □ Analytics i raportowanie                                │
│  □ Email notifications                                     │
│  □ Stripe integration (subskrypcje)                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Szczegółowe zadania - Faza 1

```
FAZA 1: Fundament
═══════════════════════════════════════════════════════════════

1.1 Baza danych
────────────────
□ Utworzenie migracji Supabase dla wszystkich tabel
□ Konfiguracja RLS policies
□ Utworzenie indeksów
□ Seed data dla testów

1.2 PayU Integration
────────────────
□ Rejestracja konta sandbox PayU
□ Implementacja PayUClient class
□ Endpoint POST /api/payments/payu/create
□ Endpoint POST /api/webhooks/payu
□ Weryfikacja podpisów webhook
□ Handling statusów (PENDING, COMPLETED, CANCELED)

1.3 Przelewy24 Integration
────────────────
□ Rejestracja konta sandbox P24
□ Implementacja Przelewy24Client class
□ Endpoint POST /api/payments/p24/create
□ Endpoint POST /api/webhooks/p24
□ Weryfikacja transakcji

1.4 Unified Payment Interface
────────────────
□ PaymentProvider interface
□ Factory function getPaymentProvider()
□ Abstrakcja nad różnymi providerami
□ Testy jednostkowe
```

### 8.3 Szczegółowe zadania - Faza 2

```
FAZA 2: System kredytów i płatny export
═══════════════════════════════════════════════════════════════

2.1 Credit Service
────────────────
□ creditService.ts - logika biznesowa
  - purchaseCredits()
  - useCredit()
  - getBalance()
  - checkSmartExportSession()

□ useCredits.ts - React hook
  - Stan kredytów
  - Sync z Supabase
  - Real-time updates

2.2 Smart Export Logic
────────────────
□ Funkcja hashProject() - generowanie hash projektu
□ Logika sesji eksportowych
□ Automatyczne czyszczenie expired sessions (cron)

2.3 UI Components
────────────────
□ CreditsPurchaseModal.tsx
  - Wybór pakietu
  - Integracja z PayU/P24
  - Loading states

□ ExportCreditsCheck.tsx
  - HOC/wrapper dla ExportDialog
  - Sprawdzanie kredytów przed eksportem
  - Redirect do zakupu

□ Update ExportDialog.tsx
  - Integracja z credit check
  - Pokazywanie salda kredytów
  - Info o Smart Export

2.4 Guest Checkout
────────────────
□ GuestCheckoutForm.tsx - email + pakiet
□ Generowanie guest_token
□ Email z linkiem do eksportu
□ Merge kredytów po rejestracji
```

### 8.4 API Endpoints - przegląd

```typescript
// ============================================
// API ROUTES OVERVIEW
// ============================================

// PAYMENTS
POST /api/payments/create          // Inicjalizacja płatności
POST /api/webhooks/payu            // PayU webhook
POST /api/webhooks/p24             // Przelewy24 webhook
GET  /api/payments/[id]/status     // Status płatności

// CREDITS
GET  /api/credits                  // Pobierz saldo kredytów
POST /api/credits/use              // Zużyj kredyt (export)
GET  /api/credits/session/[hash]   // Sprawdź sesję Smart Export

// EXPORT
POST /api/export                   // Eksport z walidacją kredytów
GET  /api/export/[token]           // Pobranie eksportu (guest)

// ORDERS
GET  /api/orders                   // Lista zamówień usera
POST /api/orders                   // Utwórz zamówienie
GET  /api/orders/[id]              // Szczegóły zamówienia
PATCH /api/orders/[id]             // Update zamówienia

// PRODUCERS
GET  /api/producers                // Lista producentów
GET  /api/producers/[id]/quote     // Wycena od producenta

// SHOP
GET  /api/shop/products            // Lista produktów
GET  /api/shop/recommendations     // Rekomendacje na podstawie projektu
POST /api/shop/cart                // Dodaj do koszyka
GET  /api/shop/cart                // Pobierz koszyk
DELETE /api/shop/cart/[id]         // Usuń z koszyka

// TENANT
GET  /api/tenant                   // Konfiguracja aktualnego tenanta
GET  /api/tenant/materials         // Materiały tenanta
```

---

## Podsumowanie

### Kluczowe decyzje

1. **Smart Export** rozwiązuje problem "płacenia za małe zmiany" - użytkownik ma 24h na darmowe re-exporty tego samego projektu

2. **Pakiety kredytów** zamiast pojedynczych płatności - łatwiejsze dla użytkownika, lepszy UX

3. **Guest checkout** - nie wymuszamy rejestracji, ale zachęcamy do niej (merge kredytów)

4. **Jedna aplikacja, multi-tenant** - efektywność kosztowa, łatwość utrzymania

5. **PayU/P24 first, Stripe later** - szybkie wejście na polski rynek

### Ryzyka i mitygacje

| Ryzyko | Mitygacja |
|--------|-----------|
| Użytkownicy omijają płatności (screenshot) | Watermark na preview, wartość w formacie CSV |
| Niska konwersja guest → registered | Bonus kredytów za rejestrację |
| Problemy z integracją producentów | Start z email-based, API później |
| Skomplikowany multi-tenant | Faza 5 - po walidacji innych modeli |

---

*Dokument utworzony: 14 grudnia 2025*
*Wersja: 1.0*
