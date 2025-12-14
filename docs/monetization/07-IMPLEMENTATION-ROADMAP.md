# Plan Implementacji

## 1. Przegląd faz

```
┌─────────────────────────────────────────────────────────────┐
│                    ROADMAP IMPLEMENTACJI                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  FAZA 1: Fundament                                         │
│  ══════════════════                                        │
│  • Schemat bazy danych                                     │
│  • Integracja PayU/P24                                     │
│  • Unified Payment Service                                 │
│                                                             │
│  FAZA 2: Płatny Export                                     │
│  ═════════════════════                                     │
│  • System kredytów (zalogowani + goście)                   │
│  • Smart Export (sesje 24h)                                │
│  • UI zakupu i eksportu                                    │
│                                                             │
│  FAZA 3: Mini-sklep                                        │
│  ══════════════════                                        │
│  • Katalog produktów                                       │
│  • Rekomendacje                                            │
│  • Koszyk i checkout                                       │
│                                                             │
│  FAZA 4: Zamówienia                                        │
│  ══════════════════                                        │
│  • Integracja producentów                                  │
│  • Flow zamówienia                                         │
│  • Tracking i prowizje                                     │
│                                                             │
│  FAZA 5: White-label                                       │
│  ════════════════════                                      │
│  • Multi-tenant middleware                                 │
│  • Branding system                                         │
│  • Katalogi materiałów                                     │
│                                                             │
│  FAZA 6: Admin & Analytics                                 │
│  ═════════════════════════                                 │
│  • Panel administracyjny                                   │
│  • Raportowanie                                            │
│  • Stripe (subskrypcje)                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Faza 1: Fundament

### 2.1 Zadania

```
□ 1.1 Baza danych
  □ 1.1.1 Utworzenie typów ENUM (payment_status, order_status, etc.)
  □ 1.1.2 Migracja: export_credits
  □ 1.1.3 Migracja: guest_credits
  □ 1.1.4 Migracja: export_sessions
  □ 1.1.5 Migracja: payments
  □ 1.1.6 Konfiguracja RLS policies
  □ 1.1.7 Utworzenie funkcji pomocniczych (use_export_credit, etc.)
  □ 1.1.8 Seed data dla testów

□ 1.2 Package payments
  □ 1.2.1 Inicjalizacja packages/payments
  □ 1.2.2 PayUClient class
  □ 1.2.3 Przelewy24Client class
  □ 1.2.4 PaymentProvider interface
  □ 1.2.5 getPaymentProvider factory
  □ 1.2.6 PaymentService class
  □ 1.2.7 Unit testy

□ 1.3 API Endpoints
  □ 1.3.1 POST /api/payments/create
  □ 1.3.2 GET /api/payments/:id/status
  □ 1.3.3 POST /api/webhooks/payu
  □ 1.3.4 POST /api/webhooks/p24

□ 1.4 Konfiguracja
  □ 1.4.1 Zmienne środowiskowe (.env.example)
  □ 1.4.2 packages/config/payment-providers.config.ts
  □ 1.4.3 packages/config/pricing.config.ts
```

### 2.2 Deliverables

- [ ] Działające migracje Supabase
- [ ] Package `@meble/payments` z klientami PayU i P24
- [ ] Działające webhooki płatności
- [ ] Testy integracyjne z sandbox

### 2.3 Definition of Done

- Można utworzyć płatność PayU/P24 i otrzymać redirect URL
- Webhook poprawnie aktualizuje status płatności w bazie
- Testy przechodzą w sandbox mode

---

## 3. Faza 2: Płatny Export

### 3.1 Zadania

```
□ 2.1 Credit Service
  □ 2.1.1 creditService.ts - core logic
  □ 2.1.2 useCredits hook (zalogowani)
  □ 2.1.3 useGuestCredits hook
  □ 2.1.4 useGuestSession hook
  □ 2.1.5 hashProject utility

□ 2.2 Smart Export
  □ 2.2.1 Logika sesji eksportowych
  □ 2.2.2 API endpoint sprawdzania sesji
  □ 2.2.3 Cron job do czyszczenia expired sessions

□ 2.3 UI Components
  □ 2.3.1 CreditsPurchaseModal (zalogowani)
  □ 2.3.2 GuestPurchaseModal
  □ 2.3.3 CreditsDisplay component
  □ 2.3.4 Aktualizacja ExportDialog
  □ 2.3.5 PaymentSuccessPage
  □ 2.3.6 PaymentFailedPage

□ 2.4 Guest Flow
  □ 2.4.1 Session management (localStorage)
  □ 2.4.2 Guest checkout bez rejestracji
  □ 2.4.3 Email recovery
  □ 2.4.4 Migracja kredytów przy rejestracji

□ 2.5 API Endpoints
  □ 2.5.1 GET /api/credits
  □ 2.5.2 POST /api/credits/use
  □ 2.5.3 GET /api/credits/session/:hash
  □ 2.5.4 GET /api/guest/credits
  □ 2.5.5 POST /api/guest/credits/use
  □ 2.5.6 POST /api/guest/recover
  □ 2.5.7 POST /api/export
```

### 3.2 Deliverables

- [ ] Działający system kredytów dla zalogowanych
- [ ] Działający system kredytów dla gości
- [ ] Smart Export (darmowe rewizje 24h)
- [ ] Płatność i eksport end-to-end

### 3.3 Definition of Done

- Użytkownik może kupić kredyty przez PayU/P24
- Po płatności kredyty są automatycznie przyznane
- Export zużywa kredyt lub używa istniejącej sesji
- Gość może kupić i użyć kredyty bez rejestracji

---

## 4. Faza 3: Mini-sklep

### 4.1 Zadania

```
□ 3.1 Baza danych
  □ 3.1.1 Migracja: shop_products
  □ 3.1.2 Migracja: cart_items
  □ 3.1.3 Seed: przykładowe produkty

□ 3.2 Katalog produktów
  □ 3.2.1 ProductCard component
  □ 3.2.2 ProductGrid component
  □ 3.2.3 ProductFilters component
  □ 3.2.4 ProductDetail page

□ 3.3 Rekomendacje
  □ 3.3.1 Algorytm rekomendacji
  □ 3.3.2 RecommendationEngine service
  □ 3.3.3 PostExportUpsell component

□ 3.4 Koszyk
  □ 3.4.1 useCart hook
  □ 3.4.2 CartDrawer component
  □ 3.4.3 CartItem component
  □ 3.4.4 CartSummary component

□ 3.5 Checkout
  □ 3.5.1 CheckoutPage
  □ 3.5.2 AddressForm component
  □ 3.5.3 PaymentMethodSelector
  □ 3.5.4 OrderConfirmation page

□ 3.6 API Endpoints
  □ 3.6.1 GET /api/shop/products
  □ 3.6.2 GET /api/shop/products/:slug
  □ 3.6.3 GET /api/shop/recommendations
  □ 3.6.4 GET /api/shop/cart
  □ 3.6.5 POST /api/shop/cart
  □ 3.6.6 PATCH /api/shop/cart/:id
  □ 3.6.7 DELETE /api/shop/cart/:id
  □ 3.6.8 POST /api/shop/checkout
```

### 4.2 Deliverables

- [ ] Katalog produktów z filtrowaniem
- [ ] System rekomendacji po eksporcie
- [ ] Koszyk (zalogowani + goście)
- [ ] Checkout z płatnością

### 4.3 Definition of Done

- Po eksporcie wyświetlają się rekomendowane produkty
- Można dodać produkty do koszyka
- Można sfinalizować zakup przez PayU/P24

---

## 5. Faza 4: Zamówienia u Producentów

### 5.1 Zadania

```
□ 4.1 Baza danych
  □ 4.1.1 Migracja: producers
  □ 4.1.2 Migracja: orders
  □ 4.1.3 Migracja: order_items
  □ 4.1.4 Seed: testowi producenci

□ 4.2 Producer Management
  □ 4.2.1 ProducerService class
  □ 4.2.2 QuoteService class
  □ 4.2.3 EmailOrderSender (dla email-based)
  □ 4.2.4 Producer API client (dla REST)

□ 4.3 UI Components
  □ 4.3.1 ProducerSelector component
  □ 4.3.2 ProducerCard component
  □ 4.3.3 QuoteDisplay component
  □ 4.3.4 OrderSummary component
  □ 4.3.5 ServiceSelector (cięcie, okleinowanie)
  □ 4.3.6 DeliveryAddressForm

□ 4.4 Order Flow
  □ 4.4.1 CreateOrderPage
  □ 4.4.2 OrderDetailsPage
  □ 4.4.3 OrderTrackingPage
  □ 4.4.4 OrderHistoryPage

□ 4.5 Commission System
  □ 4.5.1 CommissionCalculator
  □ 4.5.2 Commission tracking w bazie
  □ 4.5.3 Settlement reports

□ 4.6 API Endpoints
  □ 4.6.1 GET /api/producers
  □ 4.6.2 GET /api/producers/:id
  □ 4.6.3 POST /api/producers/:id/quote
  □ 4.6.4 GET /api/orders
  □ 4.6.5 POST /api/orders
  □ 4.6.6 GET /api/orders/:id
  □ 4.6.7 PATCH /api/orders/:id
  □ 4.6.8 POST /api/orders/:id/pay
```

### 5.2 Deliverables

- [ ] Lista producentów z filtrami
- [ ] System wycen
- [ ] Pełny flow zamówienia
- [ ] Tracking zamówień
- [ ] Obliczanie prowizji

### 5.3 Definition of Done

- Użytkownik może wybrać producenta i otrzymać wycenę
- Można złożyć i opłacić zamówienie
- Producent otrzymuje zamówienie (email/API)
- Prowizja jest obliczana i zapisywana

---

## 6. Faza 5: White-label Tenanci

### 6.1 Zadania

```
□ 5.1 Baza danych
  □ 5.1.1 Migracja: tenants
  □ 5.1.2 Migracja: tenant_materials
  □ 5.1.3 Migracja: tenant_usage
  □ 5.1.4 Seed: testowy tenant

□ 5.2 Tenant Detection
  □ 5.2.1 Middleware tenant detection
  □ 5.2.2 TenantService class
  □ 5.2.3 Tenant caching

□ 5.3 React Integration
  □ 5.3.1 TenantProvider context
  □ 5.3.2 useTenant hook
  □ 5.3.3 Layout integration

□ 5.4 Branding
  □ 5.4.1 TenantLogo component
  □ 5.4.2 TenantTheme (CSS variables)
  □ 5.4.3 Dynamic favicon
  □ 5.4.4 Tailwind tenant colors

□ 5.5 Materials
  □ 5.5.1 useTenantMaterials hook
  □ 5.5.2 TenantMaterialSelector component
  □ 5.5.3 Material import (CSV)

□ 5.6 Export
  □ 5.6.1 Tenant export configuration
  □ 5.6.2 Custom column mapping
  □ 5.6.3 useExport hook update

□ 5.7 DNS & Domains
  □ 5.7.1 Wildcard subdomain setup
  □ 5.7.2 Custom domain support
  □ 5.7.3 Domain verification

□ 5.8 API Endpoints
  □ 5.8.1 GET /api/tenant
  □ 5.8.2 GET /api/tenant/materials
```

### 6.2 Deliverables

- [ ] Działający multi-tenant z subdomenami
- [ ] Custom branding per tenant
- [ ] Katalog materiałów tenanta
- [ ] Custom export format

### 6.3 Definition of Done

- Subdomena tenant.meblarz.pl pokazuje branding tenanta
- Materiały tenanta są dostępne w aplikacji
- Export używa konfiguracji tenanta

---

## 7. Faza 6: Admin & Analytics

### 7.1 Zadania

```
□ 6.1 Admin Dashboard
  □ 6.1.1 Inicjalizacja apps/admin
  □ 6.1.2 Auth (admin only)
  □ 6.1.3 Dashboard overview
  □ 6.1.4 Revenue charts

□ 6.2 Zarządzanie
  □ 6.2.1 Users management
  □ 6.2.2 Orders management
  □ 6.2.3 Producers management
  □ 6.2.4 Tenants management
  □ 6.2.5 Products management

□ 6.3 Analytics
  □ 6.3.1 Revenue tracking
  □ 6.3.2 Conversion funnels
  □ 6.3.3 User acquisition
  □ 6.3.4 Tenant usage stats

□ 6.4 Reporting
  □ 6.4.1 Commission reports
  □ 6.4.2 Tenant invoicing
  □ 6.4.3 Export to CSV/PDF

□ 6.5 Stripe Integration
  □ 6.5.1 Stripe setup
  □ 6.5.2 Subscription plans
  □ 6.5.3 Billing portal
  □ 6.5.4 Webhooks

□ 6.6 Notifications
  □ 6.6.1 Email templates
  □ 6.6.2 Order notifications
  □ 6.6.3 Payment confirmations
  □ 6.6.4 Credit expiry warnings
```

### 7.2 Deliverables

- [ ] Panel administracyjny
- [ ] Dashboardy analityczne
- [ ] System raportowania
- [ ] Subskrypcje Stripe

### 7.3 Definition of Done

- Admin może zarządzać wszystkimi aspektami systemu
- Raporty prowizji są generowane automatycznie
- Subskrypcje Pro działają przez Stripe

---

## 8. Priorytety i zależności

```
┌─────────────────────────────────────────────────────────────┐
│                    DEPENDENCY GRAPH                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    ┌─────────┐                             │
│                    │ FAZA 1  │                             │
│                    │Fundament│                             │
│                    └────┬────┘                             │
│                         │                                  │
│            ┌────────────┼────────────┐                     │
│            │            │            │                     │
│            ▼            ▼            ▼                     │
│      ┌─────────┐  ┌─────────┐  ┌─────────┐               │
│      │ FAZA 2  │  │ FAZA 3  │  │ FAZA 5  │               │
│      │ Export  │  │  Sklep  │  │ Tenant  │               │
│      └────┬────┘  └────┬────┘  └─────────┘               │
│           │            │                                  │
│           └──────┬─────┘                                  │
│                  │                                        │
│                  ▼                                        │
│            ┌─────────┐                                    │
│            │ FAZA 4  │                                    │
│            │Zamówienia│                                    │
│            └────┬────┘                                    │
│                 │                                         │
│                 ▼                                         │
│           ┌─────────┐                                     │
│           │ FAZA 6  │                                     │
│           │  Admin  │                                     │
│           └─────────┘                                     │
│                                                             │
│  LEGENDA:                                                  │
│  ───────                                                   │
│  → Wymagana zależność                                     │
│  Faza 2,3,5 mogą być realizowane równolegle po Fazie 1   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. MVP (Minimum Viable Product)

### 9.1 Zakres MVP

```
MVP = Faza 1 + Faza 2 (core)

Obejmuje:
✅ Płatności PayU/P24
✅ System kredytów (zalogowani + goście)
✅ Smart Export
✅ Podstawowy UI zakupu

Nie obejmuje (post-MVP):
❌ Mini-sklep
❌ Zamówienia u producentów
❌ White-label tenanci
❌ Panel admin
❌ Stripe subskrypcje
```

### 9.2 Zadania MVP

```
□ MVP.1 Baza danych
  □ Typy ENUM
  □ export_credits
  □ guest_credits
  □ export_sessions
  □ payments
  □ Funkcje SQL

□ MVP.2 Package payments
  □ PayUClient
  □ Przelewy24Client
  □ PaymentService

□ MVP.3 API
  □ POST /api/payments/create
  □ POST /api/webhooks/payu
  □ POST /api/webhooks/p24
  □ GET /api/credits
  □ POST /api/credits/use
  □ GET /api/guest/credits
  □ POST /api/guest/credits/use
  □ POST /api/export

□ MVP.4 UI
  □ GuestPurchaseModal
  □ CreditsDisplay
  □ Aktualizacja ExportDialog
  □ PaymentSuccessPage
```

---

## 10. Techniczny stack per faza

| Faza | Nowe technologie/pakiety |
|------|-------------------------|
| 1 | `@meble/payments`, Supabase migrations |
| 2 | `@tanstack/react-query` (jeśli brak) |
| 3 | `@tanstack/react-query`, image optimization |
| 4 | Email service (Resend/SendGrid), cron jobs |
| 5 | Vercel domains API, CSS variables |
| 6 | Chart library (Recharts), Stripe SDK |

---

## 11. Checklist przed produkcją

```
□ Bezpieczeństwo
  □ RLS policies przetestowane
  □ Brak hardcoded secrets
  □ Rate limiting na API
  □ Webhook signature verification
  □ CSRF protection

□ Płatności
  □ Konta produkcyjne PayU/P24
  □ Testy produkcyjne (mała kwota)
  □ Obsługa błędów płatności
  □ Refund flow

□ Monitoring
  □ Error tracking (Sentry)
  □ Logging
  □ Alerty na błędy płatności

□ Backup
  □ Backup bazy danych
  □ Point-in-time recovery

□ Legal
  □ Regulamin
  □ Polityka prywatności
  □ Obsługa RODO
```

---

## 12. Ryzyka i mitygacje

| Ryzyko | Prawdopodobieństwo | Impact | Mitygacja |
|--------|-------------------|--------|-----------|
| Problemy z PayU/P24 API | Średnie | Wysoki | Fallback między providerami |
| Niska konwersja | Średnie | Wysoki | A/B testy, optymalizacja UI |
| Fraud | Niskie | Wysoki | Limity per user, monitoring |
| Skalowanie | Niskie | Średni | Caching, DB indexes |
| Tenant isolation | Niskie | Wysoki | Testy, RLS policies |

---

*Koniec dokumentacji*

---

## Podsumowanie dokumentów

| # | Dokument | Zawartość |
|---|----------|-----------|
| 01 | OVERVIEW | Modele biznesowe, pakiety, Smart Export |
| 02 | DATABASE-SCHEMA | Migracje SQL, ERD, funkcje |
| 03 | API-SPECIFICATION | Endpointy, request/response |
| 04 | PAYMENT-INTEGRATION | PayU, P24, webhooks |
| 05 | GUEST-MONETIZATION | Session ID, kredyty gości |
| 06 | TENANT-SYSTEM | Multi-tenant, branding |
| 07 | IMPLEMENTATION-ROADMAP | Fazy, zadania, MVP |

---

*Dokumentacja utworzona: 14 grudnia 2025*
*Wersja: 1.0*
