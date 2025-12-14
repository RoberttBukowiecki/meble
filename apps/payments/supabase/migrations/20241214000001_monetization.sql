-- ============================================================================
-- MONETIZATION SCHEMA
-- Migration: 20241214000001_monetization.sql
-- Description: Adds tables for credits, payments, exports, and guest sessions
-- ============================================================================

-- ============================================================================
-- CUSTOM TYPES
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

-- ============================================================================
-- HELPER FUNCTIONS
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
-- EXPORT CREDITS (for logged-in users)
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
-- GUEST CREDITS (for non-logged users)
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

-- Updated at trigger
CREATE TRIGGER update_guest_credits_updated_at
  BEFORE UPDATE ON guest_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- EXPORT SESSIONS (Smart Export - 24h free re-exports)
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
  expires_at TIMESTAMPTZ NOT NULL, -- started_at + 24h

  -- Export counter within session
  exports_count INT DEFAULT 1,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints - must have exactly one credit reference
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

-- ============================================================================
-- PAYMENTS
-- ============================================================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Payment type
  payment_type TEXT NOT NULL, -- 'credit_purchase', 'order', 'shop'

  -- Owner (one of these)
  user_id UUID REFERENCES auth.users(id),
  guest_session_id TEXT,

  -- Provider
  provider payment_provider NOT NULL,

  -- Identifiers
  external_order_id TEXT UNIQUE NOT NULL, -- Our ID for provider
  provider_order_id TEXT,                  -- ID from provider
  provider_transaction_id TEXT,            -- Transaction ID from provider

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

  -- Metadata (package info, etc.)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Constraint - must have owner
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
-- EXPORT HISTORY (for tracking and analytics)
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

  -- Whether this was a free re-export (within session)
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

-- ============================================================================
-- FUNCTIONS: Credit Balance
-- ============================================================================

-- Get user's credit balance
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
        WHEN ec.credits_total = -1 THEN 999999 -- Unlimited
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

-- Get guest credit balance
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

-- ============================================================================
-- FUNCTIONS: Use Credit
-- ============================================================================

-- Use export credit (for logged-in user)
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
  -- 1. Check for active session for this project
  SELECT es.* INTO v_existing_session
  FROM export_sessions es
  JOIN export_credits ec ON es.credit_id = ec.id
  WHERE ec.user_id = p_user_id
    AND es.project_hash = p_project_hash
    AND es.expires_at > NOW();

  IF FOUND THEN
    -- Session exists - free re-export
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

  -- 2. Find credit to use
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
      'Brak dostępnych kredytów'::TEXT,
      false;
    RETURN;
  END IF;

  -- 3. Use credit (if not unlimited)
  IF v_credit_record.credits_total != -1 THEN
    UPDATE export_credits
    SET credits_used = credits_used + 1
    WHERE id = v_credit_record.id;
  END IF;

  -- 4. Create new session
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

-- Use guest credit
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
  -- 1. Check for active session
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

  -- 2. Find guest credit
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

  -- 3. Use credit
  UPDATE guest_credits
  SET credits_used = credits_used + 1
  WHERE id = v_credit_record.id;

  -- 4. Create session
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

-- ============================================================================
-- FUNCTIONS: Migrate Guest Credits on Registration
-- ============================================================================

CREATE OR REPLACE FUNCTION migrate_guest_credits_on_signup()
RETURNS TRIGGER AS $$
DECLARE
  guest_record RECORD;
  remaining_credits INT;
BEGIN
  -- Find guest_credits with matching email
  FOR guest_record IN
    SELECT * FROM guest_credits
    WHERE email = NEW.email
      AND migrated_to_user_id IS NULL
      AND expires_at > NOW()
      AND credits_used < credits_total
  LOOP
    remaining_credits := guest_record.credits_total - guest_record.credits_used;

    -- Transfer credits to new user
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

    -- Mark as migrated
    UPDATE guest_credits
    SET
      migrated_to_user_id = NEW.id,
      migrated_at = NOW()
    WHERE id = guest_record.id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-migration
CREATE TRIGGER on_auth_user_created_migrate_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION migrate_guest_credits_on_signup();

-- ============================================================================
-- CLEANUP: Expired sessions (run periodically via cron)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  -- Delete expired export sessions
  DELETE FROM export_sessions
  WHERE expires_at < NOW() - INTERVAL '7 days';

  -- Delete old guest credits
  DELETE FROM guest_credits
  WHERE expires_at < NOW() - INTERVAL '30 days'
    AND migrated_to_user_id IS NULL;
END;
$$ LANGUAGE plpgsql;
