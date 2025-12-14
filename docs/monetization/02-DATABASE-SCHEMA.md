# Schemat Bazy Danych

## 1. Diagram ERD

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ENTITY RELATIONSHIP DIAGRAM                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐        │
│  │    users     │         │export_credits│         │guest_credits │        │
│  │  (auth.users)│────────►│              │         │              │        │
│  └──────────────┘    1:N  └──────┬───────┘         └──────┬───────┘        │
│         │                        │                        │                 │
│         │                        │ 1:N                    │ 1:N             │
│         │                        ▼                        ▼                 │
│         │                 ┌──────────────┐         ┌──────────────┐        │
│         │                 │export_sessions│        │export_sessions│        │
│         │                 └──────────────┘         │   (guest)    │        │
│         │                                          └──────────────┘        │
│         │                                                                   │
│         │ 1:N      ┌──────────────┐                                        │
│         └─────────►│   orders     │◄───────────────┐                       │
│                    └──────┬───────┘                │                       │
│                           │                        │                       │
│                           │ 1:N                    │ N:1                   │
│                           ▼                        │                       │
│                    ┌──────────────┐         ┌──────────────┐               │
│                    │ order_items  │         │  producers   │               │
│                    └──────────────┘         └──────────────┘               │
│                                                                             │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐        │
│  │   tenants    │────────►│tenant_materials│       │   payments   │        │
│  └──────────────┘    1:N  └──────────────┘         └──────────────┘        │
│         │                                                 ▲                 │
│         │ 1:N                                             │                 │
│         ▼                                                 │                 │
│  ┌──────────────┐                              ┌──────────┴─────┐          │
│  │shop_products │◄─────────────────────────────│  cart_items    │          │
│  └──────────────┘                         N:1  └────────────────┘          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Migracje SQL

### 2.1 Typy ENUM

```sql
-- Plik: supabase/migrations/001_create_enums.sql

-- Status płatności
CREATE TYPE payment_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'refunded',
  'cancelled'
);

-- Status zamówienia
CREATE TYPE order_status AS ENUM (
  'draft',
  'quoted',
  'pending_payment',
  'paid',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded'
);

-- Typ pakietu kredytów
CREATE TYPE credit_package_type AS ENUM (
  'single',
  'starter',
  'standard',
  'pro',
  'migrated_guest',
  'bonus'
);

-- Model rozliczeń tenanta
CREATE TYPE tenant_billing_model AS ENUM (
  'free',
  'flat_fee',
  'per_export',
  'commission'
);

-- Provider płatności
CREATE TYPE payment_provider AS ENUM (
  'payu',
  'przelewy24',
  'stripe',
  'manual'
);
```

### 2.2 Tabela: export_credits (zalogowani)

```sql
-- Plik: supabase/migrations/002_create_export_credits.sql

CREATE TABLE export_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Kredyty
  credits_total INT NOT NULL DEFAULT 0,
  credits_used INT NOT NULL DEFAULT 0,

  -- Typ pakietu
  package_type credit_package_type NOT NULL,

  -- Dla pakietu Pro (unlimited) - data wygaśnięcia
  valid_until TIMESTAMPTZ,

  -- Powiązanie z płatnością
  payment_id UUID,

  -- Metadane
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT credits_balance_check CHECK (credits_used <= credits_total),
  CONSTRAINT credits_positive CHECK (credits_total >= 0)
);

-- Indexy
CREATE INDEX idx_export_credits_user_id ON export_credits(user_id);
CREATE INDEX idx_export_credits_valid ON export_credits(valid_until)
  WHERE valid_until IS NOT NULL;

-- RLS
ALTER TABLE export_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own credits" ON export_credits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage credits" ON export_credits
  FOR ALL USING (auth.role() = 'service_role');

-- Trigger do updated_at
CREATE TRIGGER update_export_credits_updated_at
  BEFORE UPDATE ON export_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 2.3 Tabela: guest_credits (niezalogowani)

```sql
-- Plik: supabase/migrations/003_create_guest_credits.sql

CREATE TABLE guest_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identyfikacja sesji przeglądarki
  session_id TEXT UNIQUE NOT NULL,

  -- Opcjonalny email (do recovery i merge przy rejestracji)
  email TEXT,

  -- Kredyty
  credits_total INT NOT NULL DEFAULT 0,
  credits_used INT NOT NULL DEFAULT 0,

  -- Ważność (30 dni od ostatniego zakupu)
  expires_at TIMESTAMPTZ NOT NULL,

  -- Ostatnia płatność
  last_payment_id UUID,

  -- Czy już zmigrowano do konta
  migrated_to_user_id UUID REFERENCES auth.users(id),
  migrated_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT guest_credits_balance CHECK (credits_used <= credits_total)
);

-- Indexy
CREATE INDEX idx_guest_credits_session ON guest_credits(session_id);
CREATE INDEX idx_guest_credits_email ON guest_credits(email) WHERE email IS NOT NULL;
CREATE INDEX idx_guest_credits_expires ON guest_credits(expires_at);

-- RLS (public read/write z ograniczeniami po stronie API)
ALTER TABLE guest_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read guest credits by session" ON guest_credits
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage guest credits" ON guest_credits
  FOR ALL USING (auth.role() = 'service_role');
```

### 2.4 Tabela: export_sessions (Smart Export)

```sql
-- Plik: supabase/migrations/004_create_export_sessions.sql

CREATE TABLE export_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Powiązanie z kredytami (jedno z dwóch)
  credit_id UUID REFERENCES export_credits(id) ON DELETE CASCADE,
  guest_credit_id UUID REFERENCES guest_credits(id) ON DELETE CASCADE,

  -- Hash projektu
  project_hash TEXT NOT NULL,

  -- Sesja
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL, -- started_at + 24h

  -- Licznik eksportów w sesji
  exports_count INT DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT export_session_one_credit CHECK (
    (credit_id IS NOT NULL AND guest_credit_id IS NULL) OR
    (credit_id IS NULL AND guest_credit_id IS NOT NULL)
  )
);

-- Indexy
CREATE INDEX idx_export_sessions_credit ON export_sessions(credit_id);
CREATE INDEX idx_export_sessions_guest ON export_sessions(guest_credit_id);
CREATE INDEX idx_export_sessions_hash ON export_sessions(project_hash);
CREATE INDEX idx_export_sessions_expires ON export_sessions(expires_at);

-- Unique constraint - jedna aktywna sesja per projekt per kredyt
CREATE UNIQUE INDEX idx_export_sessions_active_credit
  ON export_sessions(credit_id, project_hash)
  WHERE credit_id IS NOT NULL AND expires_at > NOW();

CREATE UNIQUE INDEX idx_export_sessions_active_guest
  ON export_sessions(guest_credit_id, project_hash)
  WHERE guest_credit_id IS NOT NULL AND expires_at > NOW();
```

### 2.5 Tabela: tenants

```sql
-- Plik: supabase/migrations/005_create_tenants.sql

CREATE TABLE tenants (
  id TEXT PRIMARY KEY, -- np. 'plytymax'

  -- Domeny
  subdomain TEXT UNIQUE NOT NULL,
  custom_domain TEXT UNIQUE,

  -- Branding
  company_name TEXT NOT NULL,
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT DEFAULT '#3b82f6',
  secondary_color TEXT DEFAULT '#1e40af',

  -- Kontakt
  contact_email TEXT,
  contact_phone TEXT,
  website_url TEXT,

  -- Konfiguracja (szczegóły w JSONB)
  config JSONB DEFAULT '{
    "materials": {
      "useCustomCatalog": false,
      "allowUserMaterials": true
    },
    "export": {
      "format": "csv",
      "includeOrderCode": false
    },
    "shop": {
      "enabled": true,
      "source": "both"
    },
    "features": {
      "ordersEnabled": false,
      "analyticsEnabled": true
    }
  }'::jsonb,

  -- Rozliczenia B2B
  billing_model tenant_billing_model DEFAULT 'free',
  billing_config JSONB DEFAULT '{}'::jsonb,
  -- Przykład dla commission: {"rate": 0.05}
  -- Przykład dla flat_fee: {"monthlyFee": 500, "currency": "PLN"}

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexy
CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_custom_domain ON tenants(custom_domain)
  WHERE custom_domain IS NOT NULL;
CREATE INDEX idx_tenants_active ON tenants(is_active) WHERE is_active = true;
```

### 2.6 Tabela: tenant_materials

```sql
-- Plik: supabase/migrations/006_create_tenant_materials.sql

CREATE TABLE tenant_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Identyfikacja
  code TEXT NOT NULL,           -- Kod producenta np. "H3700-ST10"
  name TEXT NOT NULL,           -- "Egger Natural Halifax Oak"

  -- Właściwości
  category TEXT,                -- 'board', 'hdf', 'edge', 'accessory'
  thickness DECIMAL(6,2),       -- mm

  -- Wygląd
  color TEXT,                   -- Hex color do podglądu
  texture_url TEXT,             -- URL do tekstury

  -- Cena (opcjonalna)
  price_per_unit DECIMAL(10,2),
  price_unit TEXT DEFAULT 'm2', -- 'm2', 'mb', 'szt'
  currency TEXT DEFAULT 'PLN',

  -- Dostępność
  in_stock BOOLEAN DEFAULT true,
  stock_quantity INT,

  -- Metadane producenta
  manufacturer TEXT,            -- 'Egger', 'Kronospan'
  external_id TEXT,             -- ID w systemie tenanta
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, code)
);

-- Indexy
CREATE INDEX idx_tenant_materials_tenant ON tenant_materials(tenant_id);
CREATE INDEX idx_tenant_materials_category ON tenant_materials(category);
CREATE INDEX idx_tenant_materials_active ON tenant_materials(is_active)
  WHERE is_active = true;
```

### 2.7 Tabela: producers

```sql
-- Plik: supabase/migrations/007_create_producers.sql

CREATE TABLE producers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Podstawowe dane
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,

  -- Kontakt
  email TEXT NOT NULL,
  phone TEXT,
  website TEXT,

  -- Lokalizacja
  address JSONB,
  city TEXT,
  postal_code TEXT,
  regions TEXT[] DEFAULT '{}', -- Obsługiwane regiony dostawy

  -- Integracja API
  api_type TEXT DEFAULT 'email', -- 'rest', 'email', 'webhook', 'manual'
  api_config JSONB DEFAULT '{}'::jsonb,
  -- Przykład REST: {"endpoint": "https://api.producer.pl", "apiKey": "xxx"}
  -- Przykład email: {"orderEmail": "zamowienia@producer.pl"}

  -- Prowizja
  commission_type TEXT DEFAULT 'percentage', -- 'percentage', 'fixed', 'tiered'
  commission_config JSONB DEFAULT '{"rate": 0.05}'::jsonb,
  -- Przykład tiered: {"tiers": [{"min": 0, "rate": 0.08}, {"min": 500, "rate": 0.05}]}

  -- Usługi
  services JSONB DEFAULT '{
    "cutting": true,
    "edging": true,
    "drilling": false,
    "delivery": true
  }'::jsonb,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,

  -- Rating
  rating DECIMAL(2,1),
  reviews_count INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexy
CREATE INDEX idx_producers_slug ON producers(slug);
CREATE INDEX idx_producers_active ON producers(is_active) WHERE is_active = true;
CREATE INDEX idx_producers_regions ON producers USING GIN(regions);
```

### 2.8 Tabela: orders

```sql
-- Plik: supabase/migrations/008_create_orders.sql

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Numer zamówienia (czytelny)
  order_number TEXT UNIQUE NOT NULL,

  -- Relacje
  user_id UUID REFERENCES auth.users(id),
  producer_id UUID NOT NULL REFERENCES producers(id),
  tenant_id TEXT REFERENCES tenants(id),

  -- Dane projektu (snapshot)
  project_data JSONB NOT NULL,
  project_hash TEXT, -- Do powiązania z export_sessions

  -- Status
  status order_status DEFAULT 'draft',
  status_history JSONB DEFAULT '[]'::jsonb,

  -- Ceny (w groszach)
  subtotal INT NOT NULL,           -- Suma pozycji
  discount INT DEFAULT 0,          -- Rabat
  shipping INT DEFAULT 0,          -- Dostawa
  commission INT DEFAULT 0,        -- Prowizja Meblarz
  total INT NOT NULL,              -- Suma końcowa
  currency TEXT DEFAULT 'PLN',

  -- Płatność
  payment_status payment_status DEFAULT 'pending',
  payment_provider payment_provider,
  payment_id UUID,
  paid_at TIMESTAMPTZ,

  -- Dostawa
  delivery_address JSONB,
  delivery_notes TEXT,
  estimated_delivery DATE,
  shipped_at TIMESTAMPTZ,
  tracking_number TEXT,
  tracking_url TEXT,
  delivered_at TIMESTAMPTZ,

  -- Notatki
  customer_notes TEXT,
  internal_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generowanie numeru zamówienia
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'ORD-' ||
    TO_CHAR(NOW(), 'YYYY') || '-' ||
    LPAD(NEXTVAL('order_number_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE order_number_seq START 1;

CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL)
  EXECUTE FUNCTION generate_order_number();

-- Indexy
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_producer ON orders(producer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 2.9 Tabela: order_items

```sql
-- Plik: supabase/migrations/009_create_order_items.sql

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Dane części
  part_id TEXT,                 -- ID z projektu
  part_name TEXT NOT NULL,

  -- Materiał
  material_code TEXT,
  material_name TEXT,

  -- Wymiary (mm)
  length_mm DECIMAL(10,2) NOT NULL,
  width_mm DECIMAL(10,2) NOT NULL,
  thickness_mm DECIMAL(6,2) NOT NULL,

  -- Ilość i cena (grosze)
  quantity INT DEFAULT 1,
  unit_price INT NOT NULL,
  total_price INT NOT NULL,

  -- Usługi dodatkowe
  services JSONB DEFAULT '[]'::jsonb,
  -- Przykład: [{"type": "edging", "sides": ["top", "bottom"], "price": 500}]

  -- Notatki
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexy
CREATE INDEX idx_order_items_order ON order_items(order_id);
```

### 2.10 Tabela: payments

```sql
-- Plik: supabase/migrations/010_create_payments.sql

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Typ płatności
  payment_type TEXT NOT NULL, -- 'credit_purchase', 'order', 'shop'

  -- Relacje (jedno z poniższych)
  user_id UUID REFERENCES auth.users(id),
  guest_session_id TEXT,
  order_id UUID REFERENCES orders(id),

  -- Provider
  provider payment_provider NOT NULL,

  -- Identyfikatory
  external_order_id TEXT UNIQUE NOT NULL, -- Nasz ID dla providera
  provider_order_id TEXT,                  -- ID od providera
  provider_transaction_id TEXT,            -- ID transakcji

  -- Kwota (grosze)
  amount INT NOT NULL,
  currency TEXT DEFAULT 'PLN',

  -- Status
  status payment_status DEFAULT 'pending',
  status_history JSONB DEFAULT '[]'::jsonb,

  -- Szczegóły z providera
  provider_response JSONB DEFAULT '{}'::jsonb,

  -- URLs
  redirect_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Constraint
  CONSTRAINT payment_has_owner CHECK (
    user_id IS NOT NULL OR guest_session_id IS NOT NULL
  )
);

-- Indexy
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_guest ON payments(guest_session_id);
CREATE INDEX idx_payments_external ON payments(external_order_id);
CREATE INDEX idx_payments_provider ON payments(provider_order_id);
CREATE INDEX idx_payments_status ON payments(status);
```

### 2.11 Tabela: shop_products

```sql
-- Plik: supabase/migrations/011_create_shop_products.sql

CREATE TABLE shop_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Właściciel (null = Meblarz global)
  tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE,

  -- Identyfikacja
  slug TEXT NOT NULL,
  sku TEXT,

  -- Podstawowe dane
  name TEXT NOT NULL,
  description TEXT,
  short_description TEXT,

  -- Ceny (grosze)
  price INT NOT NULL,
  compare_at_price INT,          -- Cena przed promocją
  currency TEXT DEFAULT 'PLN',

  -- Kategoria
  category TEXT NOT NULL,        -- 'prowadnice', 'zawiasy', 'uchwyty', 'narzedzia'
  subcategory TEXT,

  -- Tagi do rekomendacji
  recommendation_tags TEXT[] DEFAULT '{}',
  -- Przykład: ['has_drawers', 'kitchen', 'large_project']

  -- Media
  image_url TEXT,
  gallery_urls TEXT[] DEFAULT '{}',

  -- Warianty (jeśli są)
  variants JSONB DEFAULT '[]'::jsonb,
  -- Przykład: [{"name": "Kolor", "options": ["Chrom", "Czarny", "Biały"]}]

  -- Dostępność
  in_stock BOOLEAN DEFAULT true,
  stock_quantity INT,
  track_inventory BOOLEAN DEFAULT false,

  -- SEO
  meta_title TEXT,
  meta_description TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,

  -- Sortowanie
  sort_order INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, slug)
);

-- Indexy
CREATE INDEX idx_shop_products_tenant ON shop_products(tenant_id);
CREATE INDEX idx_shop_products_category ON shop_products(category);
CREATE INDEX idx_shop_products_tags ON shop_products USING GIN(recommendation_tags);
CREATE INDEX idx_shop_products_active ON shop_products(is_active)
  WHERE is_active = true;
```

### 2.12 Tabela: cart_items

```sql
-- Plik: supabase/migrations/012_create_cart_items.sql

CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Właściciel (jedno z dwóch)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,

  -- Produkt
  product_id UUID NOT NULL REFERENCES shop_products(id) ON DELETE CASCADE,

  -- Wariant (jeśli wybrany)
  variant_selection JSONB DEFAULT '{}'::jsonb,
  -- Przykład: {"Kolor": "Chrom", "Rozmiar": "350mm"}

  -- Ilość
  quantity INT DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT cart_item_owner CHECK (
    (user_id IS NOT NULL AND session_id IS NULL) OR
    (user_id IS NULL AND session_id IS NOT NULL)
  ),

  CONSTRAINT cart_item_quantity_positive CHECK (quantity > 0)
);

-- Unique constraints - jeden produkt per user/session
CREATE UNIQUE INDEX idx_cart_items_user_product
  ON cart_items(user_id, product_id, variant_selection)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX idx_cart_items_session_product
  ON cart_items(session_id, product_id, variant_selection)
  WHERE session_id IS NOT NULL;

-- Indexy
CREATE INDEX idx_cart_items_user ON cart_items(user_id);
CREATE INDEX idx_cart_items_session ON cart_items(session_id);

-- RLS
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own cart" ON cart_items
  FOR ALL USING (auth.uid() = user_id);
```

### 2.13 Funkcje pomocnicze

```sql
-- Plik: supabase/migrations/013_create_functions.sql

-- Funkcja updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Funkcja do migracji guest credits przy rejestracji
CREATE OR REPLACE FUNCTION migrate_guest_credits_on_signup()
RETURNS TRIGGER AS $$
DECLARE
  guest_record RECORD;
  remaining_credits INT;
BEGIN
  -- Szukaj guest_credits z tym samym emailem
  FOR guest_record IN
    SELECT * FROM guest_credits
    WHERE email = NEW.email
      AND migrated_to_user_id IS NULL
      AND expires_at > NOW()
      AND credits_used < credits_total
  LOOP
    remaining_credits := guest_record.credits_total - guest_record.credits_used;

    -- Przenieś kredyty do nowego usera
    INSERT INTO export_credits (user_id, credits_total, credits_used, package_type, metadata)
    VALUES (
      NEW.id,
      remaining_credits,
      0,
      'migrated_guest',
      jsonb_build_object(
        'migrated_from_guest_id', guest_record.id,
        'migrated_at', NOW()
      )
    );

    -- Oznacz jako zmigrowane
    UPDATE guest_credits
    SET
      migrated_to_user_id = NEW.id,
      migrated_at = NOW()
    WHERE id = guest_record.id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_migrate_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION migrate_guest_credits_on_signup();

-- Funkcja do pobierania salda kredytów
CREATE OR REPLACE FUNCTION get_user_credit_balance(p_user_id UUID)
RETURNS TABLE (
  total_credits INT,
  used_credits INT,
  available_credits INT,
  has_unlimited BOOLEAN,
  unlimited_expires_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(credits_total), 0)::INT as total_credits,
    COALESCE(SUM(credits_used), 0)::INT as used_credits,
    COALESCE(SUM(credits_total - credits_used), 0)::INT as available_credits,
    BOOL_OR(credits_total = -1 AND (valid_until IS NULL OR valid_until > NOW())) as has_unlimited,
    MAX(valid_until) FILTER (WHERE credits_total = -1) as unlimited_expires_at
  FROM export_credits
  WHERE user_id = p_user_id
    AND (valid_until IS NULL OR valid_until > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funkcja do zużywania kredytu
CREATE OR REPLACE FUNCTION use_export_credit(
  p_user_id UUID,
  p_project_hash TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  session_id UUID,
  credits_remaining INT,
  message TEXT
) AS $$
DECLARE
  v_credit_id UUID;
  v_session_id UUID;
  v_existing_session RECORD;
  v_credit_record RECORD;
BEGIN
  -- 1. Sprawdź czy istnieje aktywna sesja dla tego projektu
  SELECT es.* INTO v_existing_session
  FROM export_sessions es
  JOIN export_credits ec ON es.credit_id = ec.id
  WHERE ec.user_id = p_user_id
    AND es.project_hash = p_project_hash
    AND es.expires_at > NOW();

  IF FOUND THEN
    -- Sesja istnieje - darmowy re-export
    UPDATE export_sessions
    SET exports_count = exports_count + 1
    WHERE id = v_existing_session.id;

    RETURN QUERY SELECT
      true,
      v_existing_session.id,
      (SELECT available_credits FROM get_user_credit_balance(p_user_id)),
      'Darmowy re-export (sesja aktywna)'::TEXT;
    RETURN;
  END IF;

  -- 2. Znajdź kredyt do zużycia
  SELECT * INTO v_credit_record
  FROM export_credits
  WHERE user_id = p_user_id
    AND (
      (credits_total = -1 AND (valid_until IS NULL OR valid_until > NOW())) -- Unlimited
      OR (credits_used < credits_total) -- Regular credits
    )
  ORDER BY
    CASE WHEN credits_total = -1 THEN 0 ELSE 1 END, -- Unlimited first
    created_at ASC -- FIFO
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      false,
      NULL::UUID,
      0,
      'Brak dostępnych kredytów'::TEXT;
    RETURN;
  END IF;

  -- 3. Zużyj kredyt (jeśli nie unlimited)
  IF v_credit_record.credits_total != -1 THEN
    UPDATE export_credits
    SET credits_used = credits_used + 1
    WHERE id = v_credit_record.id;
  END IF;

  -- 4. Utwórz nową sesję
  INSERT INTO export_sessions (credit_id, project_hash, expires_at)
  VALUES (v_credit_record.id, p_project_hash, NOW() + INTERVAL '24 hours')
  RETURNING id INTO v_session_id;

  RETURN QUERY SELECT
    true,
    v_session_id,
    (SELECT available_credits FROM get_user_credit_balance(p_user_id)),
    'Kredyt zużyty, sesja aktywna 24h'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 3. Diagram migracji

```
┌─────────────────────────────────────────────────────────────┐
│                    KOLEJNOŚĆ MIGRACJI                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  001_create_enums.sql                                      │
│       │                                                     │
│       ▼                                                     │
│  002_create_export_credits.sql                             │
│       │                                                     │
│       ▼                                                     │
│  003_create_guest_credits.sql                              │
│       │                                                     │
│       ▼                                                     │
│  004_create_export_sessions.sql                            │
│       │                                                     │
│       ▼                                                     │
│  005_create_tenants.sql                                    │
│       │                                                     │
│       ▼                                                     │
│  006_create_tenant_materials.sql                           │
│       │                                                     │
│       ▼                                                     │
│  007_create_producers.sql                                  │
│       │                                                     │
│       ▼                                                     │
│  008_create_orders.sql                                     │
│       │                                                     │
│       ▼                                                     │
│  009_create_order_items.sql                                │
│       │                                                     │
│       ▼                                                     │
│  010_create_payments.sql                                   │
│       │                                                     │
│       ▼                                                     │
│  011_create_shop_products.sql                              │
│       │                                                     │
│       ▼                                                     │
│  012_create_cart_items.sql                                 │
│       │                                                     │
│       ▼                                                     │
│  013_create_functions.sql                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

*Następny dokument: [03-API-SPECIFICATION.md](./03-API-SPECIFICATION.md)*
