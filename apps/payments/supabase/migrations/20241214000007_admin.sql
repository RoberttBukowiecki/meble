-- ============================================================================
-- ADMIN & ANALYTICS SCHEMA
-- Migration: 20241214000007_admin.sql
-- Description: Admin panel, analytics, audit logs, tenant billing
-- ============================================================================

-- ============================================================================
-- ADMIN USERS
-- ============================================================================

CREATE TYPE admin_role AS ENUM (
  'super_admin',  -- Full access
  'admin',        -- Manage users, tenants, view analytics
  'support',      -- View only, handle support tickets
  'finance'       -- View payments, commissions, payouts
);

CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  role admin_role NOT NULL DEFAULT 'support',

  -- Permissions (granular override)
  permissions JSONB DEFAULT '{}'::jsonb,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

CREATE INDEX idx_admin_users_user ON admin_users(user_id);
CREATE INDEX idx_admin_users_role ON admin_users(role);

-- RLS
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

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================

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

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Actor
  user_id UUID REFERENCES auth.users(id),
  admin_id UUID REFERENCES admin_users(id),
  ip_address INET,
  user_agent TEXT,

  -- Action
  action audit_action NOT NULL,
  resource_type TEXT NOT NULL, -- 'user', 'tenant', 'order', 'payment', etc.
  resource_id TEXT,

  -- Details
  old_values JSONB,
  new_values JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- RLS - Only admins can read audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit logs" ON audit_logs
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true)
  );

CREATE POLICY "Service role full access" ON audit_logs
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- ANALYTICS - DAILY AGGREGATES
-- ============================================================================

CREATE TABLE analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,

  -- User metrics
  new_users INT DEFAULT 0,
  active_users INT DEFAULT 0,

  -- Export metrics
  total_exports INT DEFAULT 0,
  paid_exports INT DEFAULT 0,
  free_exports INT DEFAULT 0,

  -- Revenue metrics (in grosz)
  credits_revenue INT DEFAULT 0,
  shop_revenue INT DEFAULT 0,
  orders_revenue INT DEFAULT 0,
  commission_revenue INT DEFAULT 0,
  tenant_revenue INT DEFAULT 0,
  total_revenue INT DEFAULT 0,

  -- Order metrics
  quotes_requested INT DEFAULT 0,
  orders_created INT DEFAULT 0,
  orders_completed INT DEFAULT 0,

  -- Tenant metrics
  new_tenants INT DEFAULT 0,
  active_tenants INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(date)
);

CREATE INDEX idx_analytics_daily_date ON analytics_daily(date DESC);

-- RLS
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read analytics" ON analytics_daily
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM admin_users WHERE is_active = true)
  );

CREATE POLICY "Service role full access" ON analytics_daily
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- TENANT SUBSCRIPTIONS (PayU/P24 based)
-- ============================================================================

CREATE TYPE subscription_status AS ENUM (
  'trial',
  'active',
  'past_due',
  'cancelled',
  'expired'
);

CREATE TABLE tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Plan
  plan tenant_plan NOT NULL,

  -- Status
  status subscription_status DEFAULT 'trial',

  -- Billing cycle
  billing_cycle TEXT DEFAULT 'monthly', -- 'monthly', 'yearly'
  price INT NOT NULL, -- in grosz

  -- Dates
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- Payment tracking
  last_payment_id UUID REFERENCES payments(id),
  last_payment_at TIMESTAMPTZ,
  next_payment_due TIMESTAMPTZ,
  failed_payments INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenant_subscriptions_tenant ON tenant_subscriptions(tenant_id);
CREATE INDEX idx_tenant_subscriptions_status ON tenant_subscriptions(status);
CREATE INDEX idx_tenant_subscriptions_next_payment ON tenant_subscriptions(next_payment_due);

-- RLS
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

-- ============================================================================
-- TENANT INVOICES
-- ============================================================================

CREATE TYPE invoice_status AS ENUM (
  'draft',
  'pending',
  'paid',
  'overdue',
  'cancelled'
);

CREATE TABLE tenant_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES tenant_subscriptions(id),

  -- Invoice details
  invoice_number TEXT UNIQUE NOT NULL,

  -- Amounts (in grosz)
  subtotal INT NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 23.00, -- VAT
  tax_amount INT NOT NULL,
  total INT NOT NULL,

  -- Status
  status invoice_status DEFAULT 'pending',

  -- Payment
  payment_id UUID REFERENCES payments(id),
  paid_at TIMESTAMPTZ,

  -- Billing period
  period_start DATE,
  period_end DATE,
  due_date DATE NOT NULL,

  -- Invoice data (for PDF generation)
  seller_data JSONB NOT NULL,
  buyer_data JSONB NOT NULL,
  line_items JSONB NOT NULL,

  -- PDF storage
  pdf_url TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenant_invoices_tenant ON tenant_invoices(tenant_id);
CREATE INDEX idx_tenant_invoices_status ON tenant_invoices(status);
CREATE INDEX idx_tenant_invoices_due ON tenant_invoices(due_date);

-- RLS
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

-- ============================================================================
-- PAYOUT REQUESTS (for producers)
-- ============================================================================

CREATE TYPE payout_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled'
);

CREATE TABLE payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id UUID NOT NULL REFERENCES producers(id) ON DELETE CASCADE,

  -- Amount
  amount INT NOT NULL, -- in grosz

  -- Bank details (encrypted reference)
  bank_account_hash TEXT,

  -- Status
  status payout_status DEFAULT 'pending',

  -- Processing
  processed_by UUID REFERENCES admin_users(id),
  processed_at TIMESTAMPTZ,

  -- Transfer details
  transfer_reference TEXT,
  transfer_date DATE,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payout_requests_producer ON payout_requests(producer_id);
CREATE INDEX idx_payout_requests_status ON payout_requests(status);

-- RLS
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

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Check if user is admin
CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = p_user_id AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get admin role
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

-- Log audit event
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
  -- Get admin ID if user is admin
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

-- Generate invoice number
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

-- Update analytics for today
CREATE OR REPLACE FUNCTION update_daily_analytics()
RETURNS VOID AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
BEGIN
  INSERT INTO analytics_daily (date)
  VALUES (v_today)
  ON CONFLICT (date) DO NOTHING;

  -- Update user metrics
  UPDATE analytics_daily SET
    new_users = (
      SELECT COUNT(*) FROM auth.users
      WHERE DATE(created_at) = v_today
    ),
    updated_at = NOW()
  WHERE date = v_today;

  -- Update export metrics
  UPDATE analytics_daily SET
    total_exports = (
      SELECT COUNT(*) FROM export_history
      WHERE DATE(created_at) = v_today
    ),
    paid_exports = (
      SELECT COUNT(*) FROM export_history
      WHERE DATE(created_at) = v_today AND credits_used > 0
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
    commission_revenue = COALESCE((
      SELECT SUM(commission_amount) FROM commissions
      WHERE DATE(created_at) = v_today
        AND status = 'collected'
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
-- SUBSCRIPTION PRICING
-- ============================================================================

COMMENT ON TABLE tenant_subscriptions IS 'Tenant subscription management.

Pricing (PLN, netto):
- starter: 99 zł/month or 990 zł/year (2 months free)
- professional: 299 zł/month or 2990 zł/year
- enterprise: 799 zł/month or 7990 zł/year

Trial: 14 days for all plans
Grace period: 7 days after failed payment
';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_daily_updated_at
  BEFORE UPDATE ON analytics_daily
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_subscriptions_updated_at
  BEFORE UPDATE ON tenant_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_invoices_updated_at
  BEFORE UPDATE ON tenant_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payout_requests_updated_at
  BEFORE UPDATE ON payout_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
