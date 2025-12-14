# Przegląd Modeli Biznesowych

## 1. Podsumowanie

Aplikacja Meblarz monetyzuje się przez 3 komplementarne modele:

```
┌─────────────────────────────────────────────────────────────┐
│                    MODELE MONETYZACJI                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   MODEL 1       │  │   MODEL 2       │  │   MODEL 3   │ │
│  │   Płatny        │  │   White-label   │  │   Zamówienia│ │
│  │   Export        │  │   Tenanci       │  │   Prowizja  │ │
│  │                 │  │                 │  │             │ │
│  │   B2C           │  │   B2B           │  │   B2C → B2B │ │
│  │   Kredyty       │  │   Umowa         │  │   % order   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Model 1: Płatny Export + Mini-sklep

### 2.1 Opis

Użytkownicy płacą za możliwość eksportu projektu do pliku CSV. System działa zarówno dla zalogowanych jak i niezalogowanych użytkowników.

### 2.2 Typy użytkowników

| Typ | Identyfikacja | Przechowywanie kredytów | Ważność |
|-----|---------------|-------------------------|---------|
| Zalogowany | `user_id` (Supabase Auth) | Tabela `export_credits` | Bezterminowo |
| Gość | `session_id` (localStorage) | Tabela `guest_credits` | 30 dni |

### 2.3 Pakiety kredytów

```typescript
// Zdefiniowane w: packages/config/pricing.config.ts

export const EXPORT_PACKAGES = {
  single: {
    id: 'single',
    name: 'Pojedynczy export',
    credits: 1,
    price: 900,        // grosze = 9 zł
    currency: 'PLN',
    guestOnly: true,   // Tylko dla niezalogowanych
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    credits: 5,
    price: 1900,       // 19 zł
    currency: 'PLN',
    savings: '50%',
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    credits: 20,
    price: 4900,       // 49 zł
    currency: 'PLN',
    savings: '70%',
    popular: true,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    credits: -1,       // Unlimited
    price: 9900,       // 99 zł
    currency: 'PLN',
    validDays: 30,
    features: ['unlimited_exports', 'priority_support'],
  },
} as const;
```

### 2.4 Smart Export - rozwiązanie problemu rewizji

**Problem:** Użytkownik nie chce płacić ponownie za małą zmianę w projekcie.

**Rozwiązanie:** Sesja eksportowa - eksporty tego samego projektu w ciągu 24h zużywają tylko 1 kredyt.

```
┌─────────────────────────────────────────────────────────────┐
│                    SMART EXPORT                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Export #1 (12:00)                                         │
│  └── Projekt hash: abc123                                  │
│      └── Zużyto: 1 kredyt                                  │
│      └── Sesja ważna do: następny dzień 12:00              │
│                                                             │
│  Export #2 (14:30) - mała zmiana                           │
│  └── Projekt hash: abc123 (ten sam)                        │
│      └── Zużyto: 0 kredytów (ta sama sesja)               │
│                                                             │
│  Export #3 (następny dzień 15:00)                          │
│  └── Projekt hash: abc123                                  │
│      └── Sesja wygasła → Zużyto: 1 kredyt                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Algorytm hashowania projektu:**
```typescript
function hashProject(project: Project): string {
  const data = {
    parts: project.parts.map(p => ({
      materialId: p.materialId,
      dimensions: [p.width, p.height, p.depth],
    })),
    materials: project.materials.map(m => m.id),
  };
  return crypto.createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex')
    .substring(0, 16);
}
```

### 2.5 Mini-sklep (Upsell)

Po udanym eksporcie pokazujemy rekomendowane produkty:

```
┌─────────────────────────────────────────────────────────────┐
│  🎉 Export zakończony!                                      │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📦 Polecane do Twojego projektu:                          │
│                                                             │
│  [Prowadnice]  [Zawiasy]  [Uchwyty]  [Narzędzia]          │
│     89 zł        45 zł      29 zł       149 zł            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Logika rekomendacji:**
- `hasDrawers` → prowadnice szufladowe, organizery
- `hasCabinets` → zawiasy, uchwyty
- `hasKitchen` → blaty, zlewozmywaki
- `totalParts > 20` → narzędzia montażowe

---

## 3. Model 2: White-label dla Tenantów (B2B)

### 3.1 Opis

Hurtownie/producenci płyt meblowych otrzymują własną wersję aplikacji na swojej subdomenie. Rozliczenie B2B (umowa).

### 3.2 Przykład

```
plytymax.meblarz.pl
├── Logo: PłytyMax
├── Kolory: Brand PłytyMax
├── Materiały: Katalog PłytyMax
├── Export: Format dopasowany do systemu PłytyMax
└── Produkty: Akcesoria od PłytyMax lub Meblarz
```

### 3.3 Modele rozliczeń z tenantami

| Model | Opis | Dla kogo |
|-------|------|----------|
| `free` | Darmowe, promujemy Meblarz | Mali partnerzy |
| `flat_fee` | Stała opłata miesięczna | Średni partnerzy |
| `per_export` | Opłata za każdy export | Duzi partnerzy |
| `commission` | % od zamówień przez apkę | Partnerzy z zamówieniami |

### 3.4 Korzyści dla tenanta

- Własny branding aplikacji
- Klienci projektują z ich materiałami
- Export kompatybilny z ich systemem
- Zwiększona sprzedaż materiałów
- Analytics użycia

---

## 4. Model 3: Zamówienia z prowizją

### 4.1 Opis

Użytkownik zamiast eksportować CSV, składa zamówienie bezpośrednio u producenta. Meblarz pobiera prowizję od wartości zamówienia.

### 4.2 Flow

```
USER                    MEBLARZ                  PRODUCENT
 │                         │                         │
 │  1. Projektuje mebel    │                         │
 │────────────────────────►│                         │
 │                         │                         │
 │  2. "Zamów materiały"   │                         │
 │────────────────────────►│                         │
 │                         │  3. Pobierz wycenę      │
 │                         │────────────────────────►│
 │                         │                         │
 │  4. Pokaż cenę          │◄────────────────────────│
 │◄────────────────────────│                         │
 │                         │                         │
 │  5. Zapłać              │                         │
 │────────────────────────►│                         │
 │                         │  6. Przekaż zamówienie  │
 │                         │────────────────────────►│
 │                         │                         │
 │                         │  7. Prowizja X%         │
 │                         │◄────────────────────────│
 │                         │                         │
 │  8. Dostawa             │                         │
 │◄──────────────────────────────────────────────────│
```

### 4.3 Struktura prowizji

```typescript
// packages/config/monetization.config.ts

export const COMMISSION_TIERS = [
  { minOrderValue: 0,     commission: 0.08 },  // 8% do 500 zł
  { minOrderValue: 500,   commission: 0.06 },  // 6% 500-2000 zł
  { minOrderValue: 2000,  commission: 0.05 },  // 5% 2000-5000 zł
  { minOrderValue: 5000,  commission: 0.04 },  // 4% powyżej 5000 zł
];
```

---

## 5. Macierz funkcjonalności

| Funkcja | Gość | Zalogowany | Tenant User | Zamówienie |
|---------|------|------------|-------------|------------|
| Projektowanie 3D | ✅ | ✅ | ✅ | ✅ |
| Podgląd CSV | ✅ (watermark) | ✅ | ✅ | ✅ |
| Export CSV | 💰 | 💰 (kredyty) | ✅/💰 | N/A |
| Smart Export 24h | ✅ | ✅ | ✅ | N/A |
| Historia projektów | ❌ | ✅ | ✅ | ✅ |
| Mini-sklep | ✅ | ✅ | ✅/Tenant | ❌ |
| Zamówienie | ❌ | ✅ | ✅ | ✅ |
| Materiały tenanta | ❌ | ❌ | ✅ | Zależy |

---

## 6. Metryki sukcesu

### KPIs do śledzenia

| Metryka | Opis | Cel |
|---------|------|-----|
| Conversion rate (guest) | % gości kupujących export | > 5% |
| Conversion rate (registered) | % zarejestrowanych kupujących | > 15% |
| Guest → Registered | % gości zakładających konto | > 20% |
| ARPU | Przychód na użytkownika | > 30 zł/mies |
| Order value | Średnia wartość zamówienia | > 500 zł |
| Commission revenue | Przychód z prowizji | Rosnący MoM |

---

*Następny dokument: [02-DATABASE-SCHEMA.md](./02-DATABASE-SCHEMA.md)*
