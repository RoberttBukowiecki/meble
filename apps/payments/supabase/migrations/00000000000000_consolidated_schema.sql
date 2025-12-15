-- ============================================================================
-- CONSOLIDATED SCHEMA FOR MEBLARZ
-- ============================================================================
-- This file consolidates all migrations into one clean schema.
-- Removes Stripe integration, fixes all conflicts and bugs.
--
-- Run this on a FRESH Supabase database.
--
-- Tables created:
--   - profiles (auth/users extension)
--   - export_credits, guest_credits, export_sessions, export_history
--   - payments
--   - shop_products, shop_product_variants, cart_items, shop_orders, shop_order_items
--   - producers, producer_quotes, producer_orders, commissions
--   - tenants, tenant_users, tenant_materials, tenant_usage, tenant_export_configs
--   - admin_users, audit_logs, analytics_daily
--   - tenant_subscriptions, tenant_invoices, payout_requests
-- ============================================================================

-- ============================================================================
-- SECTION 1: EXTENSIONS
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SECTION 2: CUSTOM TYPES
-- ============================================================================

-- Payment status
CREATE TYPE payment_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'refunded',
  'cancelled'
);

-- Payment provider
CREATE TYPE payment_provider AS ENUM (
  'payu',
  'przelewy24',
  'stripe',
  'manual'
);

-- Credit package type
CREATE TYPE credit_package_type AS ENUM (
  'single',
  'starter',
  'standard',
  'pro',
  'migrated_guest',
  'bonus'
);

-- Shop order status
CREATE TYPE shop_order_status AS ENUM (
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded'
);

-- Producer order status
CREATE TYPE producer_order_status AS ENUM (
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

-- Producer API type
CREATE TYPE producer_api_type AS ENUM (
  'rest',
  'email',
  'webhook',
  'manual'
);

-- Tenant plan
CREATE TYPE tenant_plan AS ENUM (
  'starter',
  'professional',
  'enterprise'
);

-- Tenant status
CREATE TYPE tenant_status AS ENUM (
  'pending',
  'active',
  'suspended',
  'cancelled'
);

-- Tenant user role
CREATE TYPE tenant_user_role AS ENUM (
  'owner',
  'admin',
  'member'
);

-- Admin role
CREATE TYPE admin_role AS ENUM (
  'super_admin',
  'admin',
  'support',
  'finance'
);

-- Audit action
CREATE TYPE audit_action AS ENUM (
  'create',
  'update',
  'delete',
  'login',
  'logout',
  'export',
  'payment',
  'refund',
  'suspend',
  'activate',
  'config_change'
);

-- Tenant subscription status (renamed from subscription_status to avoid conflict)
CREATE TYPE tenant_subscription_status AS ENUM (
  'trial',
  'active',
  'past_due',
  'cancelled',
  'expired'
);

-- Invoice status
CREATE TYPE invoice_status AS ENUM (
  'draft',
  'pending',
  'paid',
  'overdue',
  'cancelled'
);

-- Payout status
CREATE TYPE payout_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled'
);

-- ============================================================================
-- SECTION 3: HELPER FUNCTIONS
-- ============================================================================

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 4: USER PROFILES (Supabase Auth extension)
-- ============================================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Display info
  full_name TEXT,
  display_name TEXT,
  avatar_url TEXT,

  -- Contact
  email TEXT UNIQUE,
  phone TEXT,

  -- Billing (for future use)
  billing_address JSONB,

  -- Preferences
  preferred_locale TEXT DEFAULT 'pl',
  newsletter_subscribed BOOLEAN DEFAULT false,
  marketing_consent BOOLEAN DEFAULT false,

  -- Feature flags
  is_beta_tester BOOLEAN DEFAULT false,

  -- Account status
  is_active BOOLEAN DEFAULT true,
  banned_at TIMESTAMPTZ,
  ban_reason TEXT,

  -- Analytics
  first_login_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  login_count INT DEFAULT 0,

  -- Registration source
  registration_source TEXT DEFAULT 'direct',

  -- Tenant association (nullable - user may not belong to a tenant)
  tenant_id UUID,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_tenant ON profiles(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_profiles_active ON profiles(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING ((SELECT auth.uid()) = id);

CREATE POLICY "Service role full access" ON profiles
  FOR ALL USING (auth.role() = 'service_role');

-- Updated at trigger
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, first_login_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- SECTION 5: EXPORT CREDITS (for logged-in users)
-- ============================================================================

CREATE TABLE export_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Credits
  credits_total INT NOT NULL DEFAULT 0,
  credits_used INT NOT NULL DEFAULT 0,

  -- Package type
  package_type credit_package_type NOT NULL,

  -- For Pro package (unlimited) - expiration date
  valid_until TIMESTAMPTZ,

  -- Link to payment
  payment_id UUID,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT credits_balance_check CHECK (credits_used <= credits_total OR credits_total = -1),
  CONSTRAINT credits_positive CHECK (credits_total >= -1)
);

-- Indexes
CREATE INDEX idx_export_credits_user_id ON export_credits(user_id);
CREATE INDEX idx_export_credits_valid ON export_credits(valid_until)
  WHERE valid_until IS NOT NULL;

-- RLS
ALTER TABLE export_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own credits" ON export_credits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage credits" ON export_credits
  FOR ALL USING (auth.role() = 'service_role');

-- Updated at trigger
CREATE TRIGGER update_export_credits_updated_at
  BEFORE UPDATE ON export_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 6: GUEST CREDITS (for non-logged users)
-- ============================================================================

CREATE TABLE guest_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Browser session identification
  session_id TEXT UNIQUE NOT NULL,

  -- Optional email (for recovery and merge on registration)
  email TEXT,

  -- Credits
  credits_total INT NOT NULL DEFAULT 0,
  credits_used INT NOT NULL DEFAULT 0,

  -- Validity (30 days from last purchase)
  expires_at TIMESTAMPTZ NOT NULL,

  -- Last payment
  last_payment_id UUID,

  -- Migration tracking
  migrated_to_user_id UUID REFERENCES auth.users(id),
  migrated_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT guest_credits_balance CHECK (credits_used <= credits_total)
);

-- Indexes
CREATE INDEX idx_guest_credits_session ON guest_credits(session_id);
CREATE INDEX idx_guest_credits_email ON guest_credits(email) WHERE email IS NOT NULL;
CREATE INDEX idx_guest_credits_expires ON guest_credits(expires_at);
CREATE INDEX idx_guest_credits_not_migrated ON guest_credits(migrated_to_user_id)
  WHERE migrated_to_user_id IS NULL;

-- RLS
ALTER TABLE guest_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only access" ON guest_credits
  FOR ALL USING (auth.role() = 'service_role');

-- Updated at trigger
CREATE TRIGGER update_guest_credits_updated_at
  BEFORE UPDATE ON guest_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 7: EXPORT SESSIONS (Smart Export - 24h free re-exports)
-- ============================================================================

CREATE TABLE export_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to credits (one of two)
  credit_id UUID REFERENCES export_credits(id) ON DELETE CASCADE,
  guest_credit_id UUID REFERENCES guest_credits(id) ON DELETE CASCADE,

  -- Project hash
  project_hash TEXT NOT NULL,

  -- Session timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- Export counter within session
  exports_count INT DEFAULT 1,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT export_session_one_credit CHECK (
    (credit_id IS NOT NULL AND guest_credit_id IS NULL) OR
    (credit_id IS NULL AND guest_credit_id IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX idx_export_sessions_credit ON export_sessions(credit_id) WHERE credit_id IS NOT NULL;
CREATE INDEX idx_export_sessions_guest ON export_sessions(guest_credit_id) WHERE guest_credit_id IS NOT NULL;
CREATE INDEX idx_export_sessions_hash ON export_sessions(project_hash);
CREATE INDEX idx_export_sessions_expires ON export_sessions(expires_at);

-- RLS
ALTER TABLE export_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sessions" ON export_sessions
  FOR SELECT USING (
    credit_id IN (
      SELECT id FROM export_credits WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access" ON export_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- SECTION 8: PAYMENTS
-- ============================================================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Payment type
  payment_type TEXT NOT NULL,

  -- Owner (one of these)
  user_id UUID REFERENCES auth.users(id),
  guest_session_id TEXT,

  -- Provider
  provider payment_provider NOT NULL,

  -- Identifiers
  external_order_id TEXT UNIQUE NOT NULL,
  provider_order_id TEXT,
  provider_transaction_id TEXT,

  -- Amount (in grosz)
  amount INT NOT NULL,
  currency TEXT DEFAULT 'PLN',

  -- Status
  status payment_status DEFAULT 'pending',
  status_history JSONB DEFAULT '[]'::jsonb,

  -- Provider response details
  provider_response JSONB DEFAULT '{}'::jsonb,

  -- URLs
  redirect_url TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Constraint
  CONSTRAINT payment_has_owner CHECK (
    user_id IS NOT NULL OR guest_session_id IS NOT NULL
  )
);

-- Indexes
CREATE INDEX idx_payments_user ON payments(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_payments_guest ON payments(guest_session_id) WHERE guest_session_id IS NOT NULL;
CREATE INDEX idx_payments_external ON payments(external_order_id);
CREATE INDEX idx_payments_provider ON payments(provider_order_id) WHERE provider_order_id IS NOT NULL;
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created ON payments(created_at DESC);

-- RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage payments" ON payments
  FOR ALL USING (auth.role() = 'service_role');

-- Updated at trigger
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 9: EXPORT HISTORY
-- ============================================================================

CREATE TABLE export_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner
  user_id UUID REFERENCES auth.users(id),
  guest_session_id TEXT,

  -- Session reference
  session_id UUID REFERENCES export_sessions(id),

  -- Project info
  project_hash TEXT NOT NULL,
  parts_count INT NOT NULL,

  -- Export details
  format TEXT DEFAULT 'csv',
  columns TEXT[],

  -- Whether this was a free re-export
  is_free_reexport BOOLEAN DEFAULT false,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_export_history_user ON export_history(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_export_history_guest ON export_history(guest_session_id) WHERE guest_session_id IS NOT NULL;
CREATE INDEX idx_export_history_created ON export_history(created_at DESC);

-- RLS
ALTER TABLE export_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own export history" ON export_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full access" ON export_history
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- SECTION 10: CREDIT FUNCTIONS
-- ============================================================================

-- Get user's credit balance (BACKEND ONLY)
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
    COALESCE(SUM(CASE WHEN ec.credits_total = -1 THEN 0 ELSE ec.credits_total END), 0)::INT as total_credits,
    COALESCE(SUM(ec.credits_used), 0)::INT as used_credits,
    COALESCE(SUM(
      CASE
        WHEN ec.credits_total = -1 THEN 999999
        ELSE ec.credits_total - ec.credits_used
      END
    ), 0)::INT as available_credits,
    BOOL_OR(ec.credits_total = -1 AND (ec.valid_until IS NULL OR ec.valid_until > NOW())) as has_unlimited,
    MAX(ec.valid_until) FILTER (WHERE ec.credits_total = -1) as unlimited_expires_at
  FROM export_credits ec
  WHERE ec.user_id = p_user_id
    AND (ec.valid_until IS NULL OR ec.valid_until > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Secure version using auth.uid()
CREATE OR REPLACE FUNCTION get_my_credit_balance()
RETURNS TABLE (
  total_credits INT,
  used_credits INT,
  available_credits INT,
  has_unlimited BOOLEAN,
  unlimited_expires_at TIMESTAMPTZ
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY SELECT * FROM get_user_credit_balance(v_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get guest credit balance (BACKEND ONLY)
CREATE OR REPLACE FUNCTION get_guest_credit_balance(p_session_id TEXT)
RETURNS TABLE (
  available_credits INT,
  expires_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (gc.credits_total - gc.credits_used)::INT as available_credits,
    gc.expires_at
  FROM guest_credits gc
  WHERE gc.session_id = p_session_id
    AND gc.expires_at > NOW()
    AND gc.migrated_to_user_id IS NULL
  ORDER BY gc.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Use export credit (BACKEND ONLY)
CREATE OR REPLACE FUNCTION use_export_credit(
  p_user_id UUID,
  p_project_hash TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  session_id UUID,
  credits_remaining INT,
  message TEXT,
  is_free_reexport BOOLEAN
) AS $$
DECLARE
  v_credit_id UUID;
  v_session_id UUID;
  v_existing_session RECORD;
  v_credit_record RECORD;
BEGIN
  -- Check for active session
  SELECT es.* INTO v_existing_session
  FROM export_sessions es
  JOIN export_credits ec ON es.credit_id = ec.id
  WHERE ec.user_id = p_user_id
    AND es.project_hash = p_project_hash
    AND es.expires_at > NOW();

  IF FOUND THEN
    UPDATE export_sessions
    SET exports_count = exports_count + 1
    WHERE id = v_existing_session.id;

    RETURN QUERY SELECT
      true,
      v_existing_session.id,
      (SELECT COALESCE(available_credits, 0) FROM get_user_credit_balance(p_user_id)),
      'Darmowy re-export (sesja aktywna)'::TEXT,
      true;
    RETURN;
  END IF;

  -- Find credit to use
  SELECT * INTO v_credit_record
  FROM export_credits
  WHERE user_id = p_user_id
    AND (
      (credits_total = -1 AND (valid_until IS NULL OR valid_until > NOW()))
      OR (credits_used < credits_total)
    )
  ORDER BY
    CASE WHEN credits_total = -1 THEN 0 ELSE 1 END,
    created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      false,
      NULL::UUID,
      0,
      'Brak dostępnych kredytów'::TEXT,
      false;
    RETURN;
  END IF;

  -- Use credit
  IF v_credit_record.credits_total != -1 THEN
    UPDATE export_credits
    SET credits_used = credits_used + 1
    WHERE id = v_credit_record.id;
  END IF;

  -- Create session
  INSERT INTO export_sessions (credit_id, project_hash, expires_at)
  VALUES (v_credit_record.id, p_project_hash, NOW() + INTERVAL '24 hours')
  RETURNING id INTO v_session_id;

  RETURN QUERY SELECT
    true,
    v_session_id,
    (SELECT COALESCE(available_credits, 0) FROM get_user_credit_balance(p_user_id)),
    'Kredyt zużyty, sesja aktywna 24h'::TEXT,
    false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Secure version
CREATE OR REPLACE FUNCTION use_my_export_credit(p_project_hash TEXT)
RETURNS TABLE (
  success BOOLEAN,
  session_id UUID,
  credits_remaining INT,
  message TEXT,
  is_free_reexport BOOLEAN
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 0, 'Nie jesteś zalogowany'::TEXT, false;
    RETURN;
  END IF;

  RETURN QUERY SELECT * FROM use_export_credit(v_user_id, p_project_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Use guest credit (BACKEND ONLY)
CREATE OR REPLACE FUNCTION use_guest_credit(
  p_session_id TEXT,
  p_project_hash TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  export_session_id UUID,
  credits_remaining INT,
  message TEXT,
  is_free_reexport BOOLEAN
) AS $$
DECLARE
  v_guest_credit_id UUID;
  v_session_id UUID;
  v_existing_session RECORD;
  v_credit_record RECORD;
BEGIN
  -- Check for active session
  SELECT es.* INTO v_existing_session
  FROM export_sessions es
  JOIN guest_credits gc ON es.guest_credit_id = gc.id
  WHERE gc.session_id = p_session_id
    AND es.project_hash = p_project_hash
    AND es.expires_at > NOW();

  IF FOUND THEN
    UPDATE export_sessions
    SET exports_count = exports_count + 1
    WHERE id = v_existing_session.id;

    RETURN QUERY SELECT
      true,
      v_existing_session.id,
      (SELECT COALESCE(available_credits, 0) FROM get_guest_credit_balance(p_session_id)),
      'Darmowy re-export (sesja aktywna)'::TEXT,
      true;
    RETURN;
  END IF;

  -- Find guest credit
  SELECT * INTO v_credit_record
  FROM guest_credits
  WHERE session_id = p_session_id
    AND expires_at > NOW()
    AND migrated_to_user_id IS NULL
    AND credits_used < credits_total
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      false,
      NULL::UUID,
      0,
      'Brak dostępnych kredytów'::TEXT,
      false;
    RETURN;
  END IF;

  -- Use credit
  UPDATE guest_credits
  SET credits_used = credits_used + 1
  WHERE id = v_credit_record.id;

  -- Create session
  INSERT INTO export_sessions (guest_credit_id, project_hash, expires_at)
  VALUES (v_credit_record.id, p_project_hash, NOW() + INTERVAL '24 hours')
  RETURNING id INTO v_session_id;

  RETURN QUERY SELECT
    true,
    v_session_id,
    (SELECT COALESCE(available_credits, 0) FROM get_guest_credit_balance(p_session_id)),
    'Kredyt zużyty, sesja aktywna 24h'::TEXT,
    false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_my_credit_balance() TO authenticated;
GRANT EXECUTE ON FUNCTION use_my_export_credit(TEXT) TO authenticated;

-- Revoke public access to backend functions
REVOKE EXECUTE ON FUNCTION get_user_credit_balance(UUID) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION use_export_credit(UUID, TEXT) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION get_guest_credit_balance(TEXT) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION use_guest_credit(TEXT, TEXT) FROM PUBLIC, authenticated, anon;

-- ============================================================================
-- SECTION 11: GUEST CREDITS MIGRATION
-- ============================================================================

CREATE OR REPLACE FUNCTION migrate_guest_credits_on_signup()
RETURNS TRIGGER AS $$
DECLARE
  guest_record RECORD;
  remaining_credits INT;
BEGIN
  FOR guest_record IN
    SELECT * FROM guest_credits
    WHERE email = NEW.email
      AND migrated_to_user_id IS NULL
      AND expires_at > NOW()
      AND credits_used < credits_total
  LOOP
    remaining_credits := guest_record.credits_total - guest_record.credits_used;

    INSERT INTO export_credits (user_id, credits_total, credits_used, package_type, metadata)
    VALUES (
      NEW.id,
      remaining_credits,
      0,
      'migrated_guest',
      jsonb_build_object(
        'migrated_from_guest_id', guest_record.id,
        'original_session_id', guest_record.session_id,
        'migrated_at', NOW()
      )
    );

    UPDATE guest_credits
    SET migrated_to_user_id = NEW.id, migrated_at = NOW()
    WHERE id = guest_record.id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_migrate_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION migrate_guest_credits_on_signup();

-- ============================================================================
-- SECTION 12: SHOP PRODUCTS
-- ============================================================================

CREATE TABLE shop_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_pl TEXT NOT NULL,
  description TEXT,
  description_pl TEXT,

  category TEXT NOT NULL,

  price INT NOT NULL,
  compare_at_price INT,
  currency TEXT DEFAULT 'PLN',

  sku TEXT UNIQUE,
  stock_quantity INT DEFAULT 0,
  track_inventory BOOLEAN DEFAULT true,

  images TEXT[] DEFAULT '{}',
  thumbnail_url TEXT,

  meta_title TEXT,
  meta_description TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,

  recommendation_tags TEXT[] DEFAULT '{}',

  external_url TEXT,
  is_affiliate BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shop_products_category ON shop_products(category);
CREATE INDEX idx_shop_products_active ON shop_products(is_active) WHERE is_active = true;
CREATE INDEX idx_shop_products_featured ON shop_products(is_featured) WHERE is_featured = true;
CREATE INDEX idx_shop_products_slug ON shop_products(slug);
CREATE INDEX idx_shop_products_tags ON shop_products USING GIN(recommendation_tags);

ALTER TABLE shop_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active products" ON shop_products
  FOR SELECT USING (is_active = true);

CREATE POLICY "Service role can manage products" ON shop_products
  FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER update_shop_products_updated_at
  BEFORE UPDATE ON shop_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 13: SHOP PRODUCT VARIANTS
-- ============================================================================

CREATE TABLE shop_product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES shop_products(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  price INT,
  stock_quantity INT DEFAULT 0,
  attributes JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_variants_product ON shop_product_variants(product_id);

ALTER TABLE shop_product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active variants" ON shop_product_variants
  FOR SELECT USING (is_active = true);

CREATE POLICY "Service role can manage variants" ON shop_product_variants
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- SECTION 14: CART ITEMS
-- ============================================================================

CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_session_id TEXT,

  product_id UUID NOT NULL REFERENCES shop_products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES shop_product_variants(id) ON DELETE SET NULL,

  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price INT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT cart_has_owner CHECK (user_id IS NOT NULL OR guest_session_id IS NOT NULL),
  CONSTRAINT unique_user_product UNIQUE NULLS NOT DISTINCT (user_id, product_id, variant_id),
  CONSTRAINT unique_guest_product UNIQUE NULLS NOT DISTINCT (guest_session_id, product_id, variant_id)
);

CREATE INDEX idx_cart_items_user ON cart_items(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_cart_items_guest ON cart_items(guest_session_id) WHERE guest_session_id IS NOT NULL;
CREATE INDEX idx_cart_items_product ON cart_items(product_id);

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own cart" ON cart_items
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all carts" ON cart_items
  FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER update_cart_items_updated_at
  BEFORE UPDATE ON cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 15: SHOP ORDERS
-- ============================================================================

CREATE TABLE shop_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  order_number TEXT UNIQUE NOT NULL,

  user_id UUID REFERENCES auth.users(id),
  guest_session_id TEXT,
  guest_email TEXT,

  status shop_order_status DEFAULT 'pending',

  subtotal INT NOT NULL,
  shipping_cost INT DEFAULT 0,
  discount_amount INT DEFAULT 0,
  total INT NOT NULL,
  currency TEXT DEFAULT 'PLN',

  shipping_address JSONB,

  payment_id UUID REFERENCES payments(id),
  paid_at TIMESTAMPTZ,

  shipping_method TEXT,
  tracking_number TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  customer_notes TEXT,
  internal_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT shop_order_has_owner CHECK (
    user_id IS NOT NULL OR (guest_session_id IS NOT NULL AND guest_email IS NOT NULL)
  )
);

CREATE INDEX idx_shop_orders_user ON shop_orders(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_shop_orders_guest ON shop_orders(guest_session_id) WHERE guest_session_id IS NOT NULL;
CREATE INDEX idx_shop_orders_status ON shop_orders(status);
CREATE INDEX idx_shop_orders_number ON shop_orders(order_number);
CREATE INDEX idx_shop_orders_created ON shop_orders(created_at DESC);

ALTER TABLE shop_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own orders" ON shop_orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage orders" ON shop_orders
  FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER update_shop_orders_updated_at
  BEFORE UPDATE ON shop_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 16: SHOP ORDER ITEMS
-- ============================================================================

CREATE TABLE shop_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,

  product_id UUID REFERENCES shop_products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES shop_product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_sku TEXT,
  variant_name TEXT,

  unit_price INT NOT NULL,
  quantity INT NOT NULL,
  total_price INT NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shop_order_items_order ON shop_order_items(order_id);

ALTER TABLE shop_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own order items" ON shop_order_items
  FOR SELECT USING (
    order_id IN (SELECT id FROM shop_orders WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role can manage order items" ON shop_order_items
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- SECTION 17: SHOP FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  v_number TEXT;
  v_count INT;
BEGIN
  v_number := 'SHOP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-';
  SELECT COUNT(*) + 1 INTO v_count
  FROM shop_orders
  WHERE DATE(created_at) = CURRENT_DATE;
  v_number := v_number || LPAD(v_count::TEXT, 4, '0');
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_cart_total(p_user_id UUID)
RETURNS TABLE (item_count INT, subtotal INT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(ci.quantity), 0)::INT,
    COALESCE(SUM(ci.unit_price * ci.quantity), 0)::INT
  FROM cart_items ci
  WHERE ci.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_guest_cart_total(p_session_id TEXT)
RETURNS TABLE (item_count INT, subtotal INT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(ci.quantity), 0)::INT,
    COALESCE(SUM(ci.unit_price * ci.quantity), 0)::INT
  FROM cart_items ci
  WHERE ci.guest_session_id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION get_guest_cart_total(TEXT) FROM PUBLIC, authenticated, anon;

-- ============================================================================
-- SECTION 18: PRODUCERS
-- ============================================================================

CREATE TABLE producers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner (for payout access)
  owner_user_id UUID REFERENCES auth.users(id),

  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,

  email TEXT NOT NULL,
  phone TEXT,
  website TEXT,

  address JSONB,

  services TEXT[] DEFAULT '{}',
  supported_materials TEXT[] DEFAULT '{}',

  api_type producer_api_type DEFAULT 'email',
  api_config JSONB DEFAULT '{}',

  base_cutting_price INT,
  base_edging_price INT,
  minimum_order_value INT DEFAULT 10000,

  delivery_regions TEXT[] DEFAULT '{}',
  delivery_base_cost INT DEFAULT 5000,
  free_delivery_threshold INT,

  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  rating DECIMAL(3, 2),
  total_orders INT DEFAULT 0,

  commission_rate DECIMAL(4, 3),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_producers_slug ON producers(slug);
CREATE INDEX idx_producers_active ON producers(is_active) WHERE is_active = true;
CREATE INDEX idx_producers_services ON producers USING GIN(services);
CREATE INDEX idx_producers_regions ON producers USING GIN(delivery_regions);
CREATE INDEX idx_producers_owner ON producers(owner_user_id) WHERE owner_user_id IS NOT NULL;

ALTER TABLE producers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active producers" ON producers
  FOR SELECT USING (is_active = true);

CREATE POLICY "Service role can manage producers" ON producers
  FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER update_producers_updated_at
  BEFORE UPDATE ON producers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 19: PRODUCER QUOTES
-- ============================================================================

CREATE TABLE producer_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  producer_id UUID NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  guest_session_id TEXT,

  quote_number TEXT UNIQUE NOT NULL,

  project_data JSONB NOT NULL,
  project_hash TEXT NOT NULL,

  services TEXT[] DEFAULT '{}',

  cutting_cost INT DEFAULT 0,
  edging_cost INT DEFAULT 0,
  drilling_cost INT DEFAULT 0,
  material_cost INT DEFAULT 0,
  other_costs INT DEFAULT 0,
  subtotal INT NOT NULL,
  delivery_cost INT DEFAULT 0,
  total INT NOT NULL,
  currency TEXT DEFAULT 'PLN',

  valid_until TIMESTAMPTZ NOT NULL,
  is_expired BOOLEAN GENERATED ALWAYS AS (valid_until < NOW()) STORED,

  status TEXT DEFAULT 'pending',

  producer_notes TEXT,
  estimated_days INT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT quote_has_owner CHECK (user_id IS NOT NULL OR guest_session_id IS NOT NULL)
);

CREATE INDEX idx_quotes_producer ON producer_quotes(producer_id);
CREATE INDEX idx_quotes_user ON producer_quotes(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_quotes_guest ON producer_quotes(guest_session_id) WHERE guest_session_id IS NOT NULL;
CREATE INDEX idx_quotes_hash ON producer_quotes(project_hash);
CREATE INDEX idx_quotes_valid ON producer_quotes(valid_until) WHERE status = 'pending';

ALTER TABLE producer_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own quotes" ON producer_quotes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage quotes" ON producer_quotes
  FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON producer_quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 20: PRODUCER ORDERS
-- ============================================================================

CREATE TABLE producer_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  producer_id UUID NOT NULL REFERENCES producers(id),
  quote_id UUID REFERENCES producer_quotes(id),
  user_id UUID REFERENCES auth.users(id),
  guest_session_id TEXT,
  guest_email TEXT,

  order_number TEXT UNIQUE NOT NULL,

  status producer_order_status DEFAULT 'draft',
  status_history JSONB DEFAULT '[]'::jsonb,

  project_data JSONB NOT NULL,
  project_hash TEXT NOT NULL,

  services TEXT[] DEFAULT '{}',

  subtotal INT NOT NULL,
  delivery_cost INT DEFAULT 0,
  discount_amount INT DEFAULT 0,
  total INT NOT NULL,
  currency TEXT DEFAULT 'PLN',

  commission_rate DECIMAL(4, 3) NOT NULL,
  commission_amount INT NOT NULL,

  delivery_address JSONB,
  delivery_method TEXT,
  tracking_number TEXT,
  estimated_delivery DATE,

  payment_id UUID REFERENCES payments(id),
  paid_at TIMESTAMPTZ,

  producer_order_id TEXT,
  producer_notes TEXT,
  customer_notes TEXT,

  confirmed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT order_has_owner CHECK (
    user_id IS NOT NULL OR (guest_session_id IS NOT NULL AND guest_email IS NOT NULL)
  )
);

CREATE INDEX idx_producer_orders_producer ON producer_orders(producer_id);
CREATE INDEX idx_producer_orders_user ON producer_orders(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_producer_orders_guest ON producer_orders(guest_session_id) WHERE guest_session_id IS NOT NULL;
CREATE INDEX idx_producer_orders_status ON producer_orders(status);
CREATE INDEX idx_producer_orders_number ON producer_orders(order_number);
CREATE INDEX idx_producer_orders_created ON producer_orders(created_at DESC);

ALTER TABLE producer_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own orders" ON producer_orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage orders" ON producer_orders
  FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER update_producer_orders_updated_at
  BEFORE UPDATE ON producer_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 21: COMMISSIONS
-- ============================================================================

CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  order_id UUID NOT NULL REFERENCES producer_orders(id) ON DELETE CASCADE,
  producer_id UUID NOT NULL REFERENCES producers(id),

  order_value INT NOT NULL,
  commission_rate DECIMAL(4, 3) NOT NULL,
  commission_amount INT NOT NULL,
  currency TEXT DEFAULT 'PLN',

  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMPTZ,

  settlement_batch TEXT,
  settlement_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_commissions_order ON commissions(order_id);
CREATE INDEX idx_commissions_producer ON commissions(producer_id);
CREATE INDEX idx_commissions_status ON commissions(status);
CREATE INDEX idx_commissions_settlement ON commissions(settlement_batch) WHERE settlement_batch IS NOT NULL;

ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage commissions" ON commissions
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- SECTION 22: PRODUCER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TEXT AS $$
DECLARE
  v_number TEXT;
  v_count INT;
BEGIN
  v_number := 'QUO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-';
  SELECT COUNT(*) + 1 INTO v_count
  FROM producer_quotes
  WHERE DATE(created_at) = CURRENT_DATE;
  v_number := v_number || LPAD(v_count::TEXT, 4, '0');
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_producer_order_number()
RETURNS TEXT AS $$
DECLARE
  v_number TEXT;
  v_count INT;
BEGIN
  v_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-';
  SELECT COUNT(*) + 1 INTO v_count
  FROM producer_orders
  WHERE DATE(created_at) = CURRENT_DATE;
  v_number := v_number || LPAD(v_count::TEXT, 4, '0');
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_commission(
  p_order_value INT,
  p_producer_rate DECIMAL DEFAULT NULL
)
RETURNS TABLE (rate DECIMAL(4, 3), amount INT) AS $$
DECLARE
  v_rate DECIMAL(4, 3);
BEGIN
  IF p_producer_rate IS NOT NULL THEN
    v_rate := p_producer_rate;
  ELSE
    v_rate := CASE
      WHEN p_order_value < 50000 THEN 0.080
      WHEN p_order_value < 200000 THEN 0.060
      WHEN p_order_value < 500000 THEN 0.050
      ELSE 0.040
    END;
  END IF;

  RETURN QUERY SELECT v_rate, ROUND(p_order_value * v_rate)::INT;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_order_status(
  p_order_id UUID,
  p_new_status producer_order_status,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_status producer_order_status;
  v_history JSONB;
BEGIN
  SELECT status, status_history INTO v_current_status, v_history
  FROM producer_orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN RETURN FALSE; END IF;

  v_history := v_history || jsonb_build_object(
    'from', v_current_status,
    'to', p_new_status,
    'at', NOW(),
    'notes', p_notes
  );

  UPDATE producer_orders
  SET
    status = p_new_status,
    status_history = v_history,
    confirmed_at = CASE WHEN p_new_status = 'confirmed' THEN NOW() ELSE confirmed_at END,
    shipped_at = CASE WHEN p_new_status = 'shipped' THEN NOW() ELSE shipped_at END,
    delivered_at = CASE WHEN p_new_status = 'delivered' THEN NOW() ELSE delivered_at END,
    cancelled_at = CASE WHEN p_new_status = 'cancelled' THEN NOW() ELSE cancelled_at END
  WHERE id = p_order_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION update_order_status(UUID, producer_order_status, TEXT) FROM PUBLIC, authenticated;

-- ============================================================================
-- SECTION 23: TENANTS
-- ============================================================================

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,

  owner_user_id UUID NOT NULL REFERENCES auth.users(id),

  plan tenant_plan DEFAULT 'starter',
  status tenant_status DEFAULT 'pending',

  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  company_name TEXT,
  company_nip TEXT,

  branding JSONB DEFAULT '{}'::jsonb,

  custom_domain TEXT UNIQUE,
  domain_verified BOOLEAN DEFAULT false,
  domain_verification_token TEXT,

  settings JSONB DEFAULT '{}'::jsonb,

  max_materials INT DEFAULT 50,
  max_users INT DEFAULT 5,
  max_exports_per_month INT DEFAULT 100,

  current_month_exports INT DEFAULT 0,
  last_usage_reset TIMESTAMPTZ DEFAULT NOW(),

  billing_email TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,

  activated_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_domain ON tenants(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX idx_tenants_owner ON tenants(owner_user_id);
CREATE INDEX idx_tenants_status ON tenants(status);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can read own tenant" ON tenants
  FOR SELECT USING (auth.uid() = owner_user_id);

CREATE POLICY "Owners can update own tenant" ON tenants
  FOR UPDATE USING (auth.uid() = owner_user_id);

CREATE POLICY "Service role can manage tenants" ON tenants
  FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add FK to profiles after tenants table exists
ALTER TABLE profiles
  ADD CONSTRAINT fk_profiles_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;

-- ============================================================================
-- SECTION 24: TENANT USERS
-- ============================================================================

CREATE TABLE tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  role tenant_user_role DEFAULT 'member',
  permissions JSONB DEFAULT '{}'::jsonb,

  is_active BOOLEAN DEFAULT true,
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (tenant_id, user_id)
);

CREATE INDEX idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX idx_tenant_users_user ON tenant_users(user_id);

ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own memberships" ON tenant_users
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Tenant owners/admins can manage users" ON tenant_users
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Service role can manage tenant users" ON tenant_users
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- SECTION 25: TENANT MATERIALS
-- ============================================================================

CREATE TABLE tenant_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  category TEXT,

  thickness DECIMAL(6, 2),
  width DECIMAL(8, 2),
  height DECIMAL(8, 2),

  color TEXT,
  texture TEXT,
  image_url TEXT,

  price_per_m2 INT,
  price_per_sheet INT,

  in_stock BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,

  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (tenant_id, code)
);

CREATE INDEX idx_tenant_materials_tenant ON tenant_materials(tenant_id);
CREATE INDEX idx_tenant_materials_category ON tenant_materials(category);
CREATE INDEX idx_tenant_materials_active ON tenant_materials(is_active) WHERE is_active = true;

ALTER TABLE tenant_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can read materials" ON tenant_materials
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Tenant admins can manage materials" ON tenant_materials
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Service role can manage tenant materials" ON tenant_materials
  FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER update_tenant_materials_updated_at
  BEFORE UPDATE ON tenant_materials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 26: TENANT USAGE
-- ============================================================================

CREATE TABLE tenant_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  year INT NOT NULL,
  month INT NOT NULL,

  exports_count INT DEFAULT 0,
  unique_users INT DEFAULT 0,
  projects_created INT DEFAULT 0,
  api_calls INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (tenant_id, year, month)
);

CREATE INDEX idx_tenant_usage_tenant ON tenant_usage(tenant_id);
CREATE INDEX idx_tenant_usage_period ON tenant_usage(year, month);

ALTER TABLE tenant_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant owners can read usage" ON tenant_usage
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Service role can manage usage" ON tenant_usage
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- SECTION 27: TENANT EXPORT CONFIGS
-- ============================================================================

CREATE TABLE tenant_export_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,

  columns JSONB NOT NULL,
  format_options JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenant_export_configs_tenant ON tenant_export_configs(tenant_id);

ALTER TABLE tenant_export_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can read export configs" ON tenant_export_configs
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Tenant admins can manage export configs" ON tenant_export_configs
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Service role can manage export configs" ON tenant_export_configs
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- SECTION 28: TENANT FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_tenant_by_host(p_host TEXT)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  name TEXT,
  plan tenant_plan,
  status tenant_status,
  branding JSONB,
  settings JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.slug, t.name, t.plan, t.status, t.branding, t.settings
  FROM tenants t
  WHERE t.custom_domain = p_host
    AND t.domain_verified = true
    AND t.status = 'active';

  IF FOUND THEN RETURN; END IF;

  IF p_host LIKE '%.meblarz.pl' THEN
    RETURN QUERY
    SELECT t.id, t.slug, t.name, t.plan, t.status, t.branding, t.settings
    FROM tenants t
    WHERE t.slug = SPLIT_PART(p_host, '.', 1)
      AND t.status = 'active';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_tenant_exports(p_tenant_id UUID)
RETURNS VOID AS $$
DECLARE
  v_year INT := EXTRACT(YEAR FROM NOW());
  v_month INT := EXTRACT(MONTH FROM NOW());
BEGIN
  UPDATE tenants SET current_month_exports = current_month_exports + 1
  WHERE id = p_tenant_id;

  INSERT INTO tenant_usage (tenant_id, year, month, exports_count)
  VALUES (p_tenant_id, v_year, v_month, 1)
  ON CONFLICT (tenant_id, year, month)
  DO UPDATE SET exports_count = tenant_usage.exports_count + 1, updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reset_tenant_monthly_counters()
RETURNS VOID AS $$
BEGIN
  UPDATE tenants
  SET current_month_exports = 0, last_usage_reset = NOW()
  WHERE last_usage_reset < DATE_TRUNC('month', NOW());
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 29: ADMIN USERS
-- ============================================================================

CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  role admin_role NOT NULL DEFAULT 'support',
  permissions JSONB DEFAULT '{}'::jsonb,

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

CREATE INDEX idx_admin_users_user ON admin_users(user_id);
CREATE INDEX idx_admin_users_role ON admin_users(role);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read admin users" ON admin_users
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true)
  );

CREATE POLICY "Super admins can manage admin users" ON admin_users
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE role = 'super_admin' AND is_active = true)
  );

CREATE POLICY "Service role full access" ON admin_users
  FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 30: AUDIT LOGS
-- ============================================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID REFERENCES auth.users(id),
  admin_id UUID REFERENCES admin_users(id),
  ip_address INET,
  user_agent TEXT,

  action audit_action NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,

  old_values JSONB,
  new_values JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit logs" ON audit_logs
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true)
  );

CREATE POLICY "Service role full access" ON audit_logs
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- SECTION 31: ANALYTICS DAILY
-- ============================================================================

CREATE TABLE analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,

  new_users INT DEFAULT 0,
  active_users INT DEFAULT 0,

  total_exports INT DEFAULT 0,
  paid_exports INT DEFAULT 0,
  free_exports INT DEFAULT 0,

  credits_revenue INT DEFAULT 0,
  shop_revenue INT DEFAULT 0,
  orders_revenue INT DEFAULT 0,
  commission_revenue INT DEFAULT 0,
  tenant_revenue INT DEFAULT 0,
  total_revenue INT DEFAULT 0,

  quotes_requested INT DEFAULT 0,
  orders_created INT DEFAULT 0,
  orders_completed INT DEFAULT 0,

  new_tenants INT DEFAULT 0,
  active_tenants INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(date)
);

CREATE INDEX idx_analytics_daily_date ON analytics_daily(date DESC);

ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read analytics" ON analytics_daily
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true)
  );

CREATE POLICY "Service role full access" ON analytics_daily
  FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER update_analytics_daily_updated_at
  BEFORE UPDATE ON analytics_daily
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 32: TENANT SUBSCRIPTIONS
-- ============================================================================

CREATE TABLE tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  plan tenant_plan NOT NULL,
  status tenant_subscription_status DEFAULT 'trial',

  billing_cycle TEXT DEFAULT 'monthly',
  price INT NOT NULL,

  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  last_payment_id UUID REFERENCES payments(id),
  last_payment_at TIMESTAMPTZ,
  next_payment_due TIMESTAMPTZ,
  failed_payments INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenant_subscriptions_tenant ON tenant_subscriptions(tenant_id);
CREATE INDEX idx_tenant_subscriptions_status ON tenant_subscriptions(status);
CREATE INDEX idx_tenant_subscriptions_next_payment ON tenant_subscriptions(next_payment_due);

ALTER TABLE tenant_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant owners can read own subscription" ON tenant_subscriptions
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_user_id = auth.uid())
  );

CREATE POLICY "Admins can manage subscriptions" ON tenant_subscriptions
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true)
  );

CREATE POLICY "Service role full access" ON tenant_subscriptions
  FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER update_tenant_subscriptions_updated_at
  BEFORE UPDATE ON tenant_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 33: TENANT INVOICES
-- ============================================================================

CREATE TABLE tenant_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES tenant_subscriptions(id),

  invoice_number TEXT UNIQUE NOT NULL,

  subtotal INT NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 23.00,
  tax_amount INT NOT NULL,
  total INT NOT NULL,

  status invoice_status DEFAULT 'pending',

  payment_id UUID REFERENCES payments(id),
  paid_at TIMESTAMPTZ,

  period_start DATE,
  period_end DATE,
  due_date DATE NOT NULL,

  seller_data JSONB NOT NULL,
  buyer_data JSONB NOT NULL,
  line_items JSONB NOT NULL,

  pdf_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenant_invoices_tenant ON tenant_invoices(tenant_id);
CREATE INDEX idx_tenant_invoices_status ON tenant_invoices(status);
CREATE INDEX idx_tenant_invoices_due ON tenant_invoices(due_date);

ALTER TABLE tenant_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant owners can read own invoices" ON tenant_invoices
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_user_id = auth.uid())
  );

CREATE POLICY "Admins can manage invoices" ON tenant_invoices
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true)
  );

CREATE POLICY "Service role full access" ON tenant_invoices
  FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER update_tenant_invoices_updated_at
  BEFORE UPDATE ON tenant_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 34: PAYOUT REQUESTS
-- ============================================================================

CREATE TABLE payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id UUID NOT NULL REFERENCES producers(id) ON DELETE CASCADE,

  amount INT NOT NULL,
  bank_account_hash TEXT,

  status payout_status DEFAULT 'pending',

  processed_by UUID REFERENCES admin_users(id),
  processed_at TIMESTAMPTZ,

  transfer_reference TEXT,
  transfer_date DATE,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payout_requests_producer ON payout_requests(producer_id);
CREATE INDEX idx_payout_requests_status ON payout_requests(status);

ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Producers can read own payouts" ON payout_requests
  FOR SELECT USING (
    producer_id IN (SELECT id FROM producers WHERE owner_user_id = auth.uid())
  );

CREATE POLICY "Admins can manage payouts" ON payout_requests
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM admin_users
      WHERE is_active = true AND role IN ('super_admin', 'admin', 'finance')
    )
  );

CREATE POLICY "Service role full access" ON payout_requests
  FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER update_payout_requests_updated_at
  BEFORE UPDATE ON payout_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 35: ADMIN FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = p_user_id AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_admin_role(p_user_id UUID DEFAULT auth.uid())
RETURNS admin_role AS $$
DECLARE
  v_role admin_role;
BEGIN
  SELECT role INTO v_role FROM admin_users
  WHERE user_id = p_user_id AND is_active = true;
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION log_audit_event(
  p_action audit_action,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
  v_admin_id UUID;
BEGIN
  SELECT id INTO v_admin_id FROM admin_users WHERE user_id = auth.uid();

  INSERT INTO audit_logs (
    user_id, admin_id, action, resource_type, resource_id,
    old_values, new_values, metadata
  ) VALUES (
    auth.uid(), v_admin_id, p_action, p_resource_type, p_resource_id,
    p_old_values, p_new_values, p_metadata
  ) RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_month TEXT;
  v_count INT;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  v_month := TO_CHAR(NOW(), 'MM');

  SELECT COUNT(*) + 1 INTO v_count
  FROM tenant_invoices
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
    AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW());

  RETURN 'FV/' || v_year || '/' || v_month || '/' || LPAD(v_count::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_daily_analytics()
RETURNS VOID AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
BEGIN
  INSERT INTO analytics_daily (date)
  VALUES (v_today)
  ON CONFLICT (date) DO NOTHING;

  -- Update export metrics
  UPDATE analytics_daily SET
    total_exports = (
      SELECT COUNT(*) FROM export_history
      WHERE DATE(created_at) = v_today
    ),
    paid_exports = (
      SELECT COUNT(*) FROM export_history
      WHERE DATE(created_at) = v_today AND is_free_reexport = false
    ),
    free_exports = (
      SELECT COUNT(*) FROM export_history
      WHERE DATE(created_at) = v_today AND is_free_reexport = true
    ),
    updated_at = NOW()
  WHERE date = v_today;

  -- Update revenue metrics
  UPDATE analytics_daily SET
    credits_revenue = COALESCE((
      SELECT SUM(amount) FROM payments
      WHERE DATE(created_at) = v_today
        AND status = 'completed'
        AND payment_type = 'credits'
    ), 0),
    shop_revenue = COALESCE((
      SELECT SUM(amount) FROM payments
      WHERE DATE(created_at) = v_today
        AND status = 'completed'
        AND payment_type = 'shop'
    ), 0),
    orders_revenue = COALESCE((
      SELECT SUM(amount) FROM payments
      WHERE DATE(created_at) = v_today
        AND status = 'completed'
        AND payment_type = 'order'
    ), 0),
    updated_at = NOW()
  WHERE date = v_today;

  -- Calculate total
  UPDATE analytics_daily SET
    total_revenue = credits_revenue + shop_revenue + orders_revenue + commission_revenue + tenant_revenue,
    updated_at = NOW()
  WHERE date = v_today;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 36: CLEANUP FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS VOID AS $$
BEGIN
  DELETE FROM export_sessions
  WHERE expires_at < NOW() - INTERVAL '7 days';

  DELETE FROM guest_credits
  WHERE expires_at < NOW() - INTERVAL '30 days'
    AND migrated_to_user_id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 37: SEED DATA (Optional)
-- ============================================================================

-- Sample shop products
INSERT INTO shop_products (slug, name, name_pl, description, description_pl, category, price, compare_at_price, stock_quantity, is_featured, recommendation_tags, images) VALUES
('prowadnica-blum-tandembox-500', 'Blum Tandembox 500mm', 'Prowadnica Blum Tandembox 500mm', 'High-quality drawer slide system', 'Wysokiej jakości system prowadnic szufladowych', 'prowadnice', 8900, 10900, 50, true, ARRAY['has_drawers'], ARRAY['https://placehold.co/400x300?text=Blum+500']),
('prowadnica-blum-tandembox-400', 'Blum Tandembox 400mm', 'Prowadnica Blum Tandembox 400mm', 'High-quality drawer slide system', 'Wysokiej jakości system prowadnic szufladowych', 'prowadnice', 7900, NULL, 50, false, ARRAY['has_drawers'], ARRAY['https://placehold.co/400x300?text=Blum+400']),
('zawias-blum-clip-top-110', 'Blum Clip Top 110°', 'Zawias Blum Clip Top 110°', 'Soft-close cabinet hinge', 'Zawias meblowy z cichym domykiem', 'zawiasy', 1490, NULL, 200, true, ARRAY['has_cabinets'], ARRAY['https://placehold.co/400x300?text=Blum+Clip']),
('uchwyt-nowoczesny-128mm', 'Modern Handle 128mm', 'Uchwyt Nowoczesny 128mm', 'Brushed steel modern handle', 'Nowoczesny uchwyt ze stali szczotkowanej', 'uchwyty', 2490, NULL, 100, true, ARRAY['has_cabinets', 'has_drawers'], ARRAY['https://placehold.co/400x300?text=Handle+128']),
('oswietlenie-led-szafka', 'LED Cabinet Light', 'Oświetlenie LED do Szafki', 'Motion-activated cabinet light', 'Oświetlenie szafki z czujnikiem ruchu', 'akcesoria', 4990, NULL, 40, true, ARRAY['has_cabinets'], ARRAY['https://placehold.co/400x300?text=LED+Light']);

-- Sample producers
INSERT INTO producers (
  name, slug, description, email, phone, website,
  address, services, api_type,
  base_cutting_price, base_edging_price, minimum_order_value,
  delivery_regions, delivery_base_cost, free_delivery_threshold,
  is_active, is_verified, rating
) VALUES
(
  'MebloPłyta Kraków',
  'mebloplyty-krakow',
  'Profesjonalne cięcie i okleinowanie płyt meblowych. Ponad 20 lat doświadczenia.',
  'zamowienia@mebloplyty.pl',
  '+48 12 345 67 89',
  'https://mebloplyty.pl',
  '{"street": "ul. Przemysłowa 15", "city": "Kraków", "postal_code": "30-001", "country": "PL"}',
  ARRAY['cutting', 'edging', 'drilling'],
  'email',
  250, 350, 15000,
  ARRAY['30', '31', '32', '33', '34'],
  4900, 50000,
  true, true, 4.85
),
(
  'CNC-Expert Warszawa',
  'cnc-expert-warszawa',
  'Specjaliści od obróbki CNC. Precyzyjne wiercenie i frezowanie.',
  'biuro@cnc-expert.pl',
  '+48 22 111 22 33',
  'https://cnc-expert.pl',
  '{"street": "ul. Fabryczna 42", "city": "Warszawa", "postal_code": "00-446", "country": "PL"}',
  ARRAY['cutting', 'edging', 'drilling', 'cnc'],
  'rest',
  280, 380, 20000,
  ARRAY['00', '01', '02', '03', '04', '05', '06', '07', '08', '09'],
  5900, 80000,
  true, true, 4.72
);

-- ============================================================================
-- SECTION 38: COMMENTS
-- ============================================================================

COMMENT ON TABLE profiles IS 'User profiles extending auth.users for Supabase Auth';
COMMENT ON TABLE export_credits IS 'Export credits for authenticated users';
COMMENT ON TABLE guest_credits IS 'Export credits for guest (anonymous) users';
COMMENT ON TABLE export_sessions IS 'Smart Export sessions - 24h free re-exports';
COMMENT ON TABLE payments IS 'All payment transactions (credits, shop, orders)';
COMMENT ON TABLE export_history IS 'History of all exports for analytics';
COMMENT ON TABLE shop_products IS 'Mini-shop product catalog';
COMMENT ON TABLE producers IS 'Furniture cutting service providers';
COMMENT ON TABLE tenants IS 'White-label tenant organizations';
COMMENT ON TABLE admin_users IS 'Admin panel access control';
COMMENT ON TABLE analytics_daily IS 'Daily aggregated analytics';

COMMENT ON FUNCTION get_my_credit_balance() IS 'Secure function to get current user credit balance (uses auth.uid())';
COMMENT ON FUNCTION use_my_export_credit(TEXT) IS 'Secure function to use credit for export (uses auth.uid())';
COMMENT ON FUNCTION is_admin(UUID) IS 'Check if user has admin access';

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
