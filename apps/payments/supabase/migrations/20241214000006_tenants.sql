-- ============================================================================
-- WHITE-LABEL TENANTS SCHEMA
-- Migration: 20241214000006_tenants.sql
-- Description: Adds tables for multi-tenant white-label system
-- ============================================================================

-- ============================================================================
-- TENANT PLANS
-- ============================================================================

CREATE TYPE tenant_plan AS ENUM (
  'starter',    -- Basic branding, limited materials
  'professional', -- Full branding, custom materials
  'enterprise'  -- Custom domain, API access, dedicated support
);

CREATE TYPE tenant_status AS ENUM (
  'pending',
  'active',
  'suspended',
  'cancelled'
);

-- ============================================================================
-- TENANTS
-- ============================================================================

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  slug TEXT UNIQUE NOT NULL, -- subdomain: {slug}.meblarz.pl
  name TEXT NOT NULL,

  -- Owner
  owner_user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Plan and status
  plan tenant_plan DEFAULT 'starter',
  status tenant_status DEFAULT 'pending',

  -- Contact
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  company_name TEXT,
  company_nip TEXT, -- Polish tax ID

  -- Branding
  branding JSONB DEFAULT '{}'::jsonb,
  -- {
  --   "logo_url": "https://...",
  --   "logo_dark_url": "https://...",
  --   "favicon_url": "https://...",
  --   "primary_color": "#3B82F6",
  --   "secondary_color": "#10B981",
  --   "accent_color": "#F59E0B",
  --   "font_family": "Inter",
  --   "custom_css": "..."
  -- }

  -- Custom domain (enterprise only)
  custom_domain TEXT UNIQUE,
  domain_verified BOOLEAN DEFAULT false,
  domain_verification_token TEXT,

  -- Settings
  settings JSONB DEFAULT '{}'::jsonb,
  -- {
  --   "show_powered_by": true,
  --   "default_language": "pl",
  --   "allowed_export_formats": ["csv"],
  --   "custom_export_columns": [...],
  --   "watermark_exports": false
  -- }

  -- Limits (based on plan)
  max_materials INT DEFAULT 50,
  max_users INT DEFAULT 5,
  max_exports_per_month INT DEFAULT 100,

  -- Usage tracking
  current_month_exports INT DEFAULT 0,
  last_usage_reset TIMESTAMPTZ DEFAULT NOW(),

  -- Billing
  billing_email TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,

  -- Timestamps
  activated_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_domain ON tenants(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX idx_tenants_owner ON tenants(owner_user_id);
CREATE INDEX idx_tenants_status ON tenants(status);

-- RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can read own tenant" ON tenants
  FOR SELECT USING (auth.uid() = owner_user_id);

CREATE POLICY "Owners can update own tenant" ON tenants
  FOR UPDATE USING (auth.uid() = owner_user_id);

CREATE POLICY "Service role can manage tenants" ON tenants
  FOR ALL USING (auth.role() = 'service_role');

-- Updated at trigger
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TENANT USERS (team members)
-- ============================================================================

CREATE TYPE tenant_user_role AS ENUM (
  'owner',
  'admin',
  'member'
);

CREATE TABLE tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Role
  role tenant_user_role DEFAULT 'member',

  -- Permissions (JSON for flexibility)
  permissions JSONB DEFAULT '{}'::jsonb,
  -- {
  --   "can_manage_materials": true,
  --   "can_manage_branding": false,
  --   "can_view_analytics": true,
  --   "can_invite_users": false
  -- }

  -- Status
  is_active BOOLEAN DEFAULT true,
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE (tenant_id, user_id)
);

-- Indexes
CREATE INDEX idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX idx_tenant_users_user ON tenant_users(user_id);

-- RLS
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
-- TENANT MATERIALS
-- ============================================================================

CREATE TABLE tenant_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Material info
  code TEXT NOT NULL, -- internal code
  name TEXT NOT NULL,
  description TEXT,

  -- Category
  category TEXT, -- 'plyta', 'blat', 'okleinowanie', etc.

  -- Dimensions
  thickness DECIMAL(6, 2), -- in mm
  width DECIMAL(8, 2), -- standard sheet width in mm
  height DECIMAL(8, 2), -- standard sheet height in mm

  -- Appearance
  color TEXT,
  texture TEXT, -- 'mat', 'polysk', 'struktura'
  image_url TEXT,

  -- Pricing (optional)
  price_per_m2 INT, -- in grosz
  price_per_sheet INT, -- in grosz

  -- Stock
  in_stock BOOLEAN DEFAULT true,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Status
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE (tenant_id, code)
);

-- Indexes
CREATE INDEX idx_tenant_materials_tenant ON tenant_materials(tenant_id);
CREATE INDEX idx_tenant_materials_category ON tenant_materials(category);
CREATE INDEX idx_tenant_materials_active ON tenant_materials(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE tenant_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can read materials" ON tenant_materials
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
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

-- Updated at trigger
CREATE TRIGGER update_tenant_materials_updated_at
  BEFORE UPDATE ON tenant_materials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TENANT USAGE TRACKING
-- ============================================================================

CREATE TABLE tenant_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Period
  year INT NOT NULL,
  month INT NOT NULL,

  -- Counters
  exports_count INT DEFAULT 0,
  unique_users INT DEFAULT 0,
  projects_created INT DEFAULT 0,
  api_calls INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE (tenant_id, year, month)
);

-- Indexes
CREATE INDEX idx_tenant_usage_tenant ON tenant_usage(tenant_id);
CREATE INDEX idx_tenant_usage_period ON tenant_usage(year, month);

-- RLS
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
-- TENANT EXPORT CONFIGS
-- ============================================================================

CREATE TABLE tenant_export_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Config name
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,

  -- Column configuration
  columns JSONB NOT NULL, -- array of column definitions
  -- [
  --   {"id": "part_name", "label": "Nazwa", "enabled": true},
  --   {"id": "width", "label": "Szerokość", "enabled": true, "suffix": "mm"},
  --   {"id": "custom_field", "label": "Pole własne", "source": "metadata.custom"}
  -- ]

  -- Format options
  format_options JSONB DEFAULT '{}'::jsonb,
  -- {
  --   "delimiter": ";",
  --   "include_header": true,
  --   "encoding": "utf-8",
  --   "decimal_separator": ","
  -- }

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tenant_export_configs_tenant ON tenant_export_configs(tenant_id);

-- RLS
ALTER TABLE tenant_export_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can read export configs" ON tenant_export_configs
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
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
-- HELPER FUNCTIONS
-- ============================================================================

-- Get tenant by slug or domain
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
  -- Try custom domain first
  RETURN QUERY
  SELECT
    t.id,
    t.slug,
    t.name,
    t.plan,
    t.status,
    t.branding,
    t.settings
  FROM tenants t
  WHERE t.custom_domain = p_host
    AND t.domain_verified = true
    AND t.status = 'active';

  IF FOUND THEN RETURN; END IF;

  -- Try subdomain pattern: {slug}.meblarz.pl
  IF p_host LIKE '%.meblarz.pl' THEN
    RETURN QUERY
    SELECT
      t.id,
      t.slug,
      t.name,
      t.plan,
      t.status,
      t.branding,
      t.settings
    FROM tenants t
    WHERE t.slug = SPLIT_PART(p_host, '.', 1)
      AND t.status = 'active';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment tenant export count
CREATE OR REPLACE FUNCTION increment_tenant_exports(p_tenant_id UUID)
RETURNS VOID AS $$
DECLARE
  v_year INT := EXTRACT(YEAR FROM NOW());
  v_month INT := EXTRACT(MONTH FROM NOW());
BEGIN
  -- Update tenant counter
  UPDATE tenants
  SET current_month_exports = current_month_exports + 1
  WHERE id = p_tenant_id;

  -- Update or insert usage record
  INSERT INTO tenant_usage (tenant_id, year, month, exports_count)
  VALUES (p_tenant_id, v_year, v_month, 1)
  ON CONFLICT (tenant_id, year, month)
  DO UPDATE SET
    exports_count = tenant_usage.exports_count + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reset monthly counters (call via cron)
CREATE OR REPLACE FUNCTION reset_tenant_monthly_counters()
RETURNS VOID AS $$
BEGIN
  UPDATE tenants
  SET
    current_month_exports = 0,
    last_usage_reset = NOW()
  WHERE last_usage_reset < DATE_TRUNC('month', NOW());
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SEED DATA: Sample Tenant
-- ============================================================================

-- Note: In production, tenants would be created through the registration flow
-- This is just for testing

-- First, we need a user to be the owner (skip in migration, create via app)
-- INSERT INTO tenants (slug, name, owner_user_id, contact_email, ...)

-- ============================================================================
-- PLAN LIMITS REFERENCE
-- ============================================================================

COMMENT ON TABLE tenants IS 'White-label tenant organizations.

Plan limits:
- starter: 50 materials, 5 users, 100 exports/month, subdomain only
- professional: 200 materials, 20 users, 500 exports/month, custom branding
- enterprise: unlimited materials/users/exports, custom domain, API access

Branding JSON structure:
{
  "logo_url": "https://...",
  "logo_dark_url": "https://...",
  "favicon_url": "https://...",
  "primary_color": "#3B82F6",
  "secondary_color": "#10B981",
  "accent_color": "#F59E0B",
  "background_color": "#FFFFFF",
  "text_color": "#1F2937",
  "font_family": "Inter",
  "border_radius": "0.5rem",
  "custom_css": ""
}
';

COMMENT ON FUNCTION get_tenant_by_host IS 'Resolve tenant from hostname (custom domain or subdomain)';
COMMENT ON FUNCTION increment_tenant_exports IS 'Track export usage for billing';
