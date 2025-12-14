-- ============================================================================
-- PRODUCERS & ORDERS SCHEMA
-- Migration: 20241214000005_producers.sql
-- Description: Adds tables for producers, quotes, orders, and commissions
-- ============================================================================

-- ============================================================================
-- ORDER STATUS TYPE
-- ============================================================================

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

CREATE TYPE producer_api_type AS ENUM (
  'rest',
  'email',
  'webhook',
  'manual'
);

-- ============================================================================
-- PRODUCERS
-- ============================================================================

CREATE TABLE producers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic info
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,

  -- Contact
  email TEXT NOT NULL,
  phone TEXT,
  website TEXT,

  -- Address
  address JSONB, -- {street, city, postal_code, country}

  -- Services offered
  services TEXT[] DEFAULT '{}', -- ['cutting', 'edging', 'drilling', 'cnc', 'delivery']

  -- Materials supported (references material types)
  supported_materials TEXT[] DEFAULT '{}',

  -- API integration
  api_type producer_api_type DEFAULT 'email',
  api_config JSONB DEFAULT '{}', -- API credentials, endpoints, etc.

  -- Pricing
  base_cutting_price INT, -- per linear meter in grosz
  base_edging_price INT, -- per linear meter in grosz
  minimum_order_value INT DEFAULT 10000, -- 100 zł minimum

  -- Delivery
  delivery_regions TEXT[] DEFAULT '{}', -- postal code prefixes
  delivery_base_cost INT DEFAULT 5000, -- 50 zł base
  free_delivery_threshold INT, -- order value for free delivery

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  rating DECIMAL(3, 2), -- 0.00 - 5.00
  total_orders INT DEFAULT 0,

  -- Commission rate override (null = use default tiers)
  commission_rate DECIMAL(4, 3), -- 0.050 = 5%

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_producers_slug ON producers(slug);
CREATE INDEX idx_producers_active ON producers(is_active) WHERE is_active = true;
CREATE INDEX idx_producers_services ON producers USING GIN(services);
CREATE INDEX idx_producers_regions ON producers USING GIN(delivery_regions);

-- RLS
ALTER TABLE producers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active producers" ON producers
  FOR SELECT USING (is_active = true);

CREATE POLICY "Service role can manage producers" ON producers
  FOR ALL USING (auth.role() = 'service_role');

-- Updated at trigger
CREATE TRIGGER update_producers_updated_at
  BEFORE UPDATE ON producers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PRODUCER QUOTES
-- ============================================================================

CREATE TABLE producer_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  producer_id UUID NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  guest_session_id TEXT,

  -- Quote details
  quote_number TEXT UNIQUE NOT NULL,

  -- Project data (snapshot)
  project_data JSONB NOT NULL, -- parts, materials, etc.
  project_hash TEXT NOT NULL,

  -- Services requested
  services TEXT[] DEFAULT '{}',

  -- Pricing breakdown (in grosz)
  cutting_cost INT DEFAULT 0,
  edging_cost INT DEFAULT 0,
  drilling_cost INT DEFAULT 0,
  material_cost INT DEFAULT 0,
  other_costs INT DEFAULT 0,
  subtotal INT NOT NULL,
  delivery_cost INT DEFAULT 0,
  total INT NOT NULL,
  currency TEXT DEFAULT 'PLN',

  -- Validity
  valid_until TIMESTAMPTZ NOT NULL,
  is_expired BOOLEAN GENERATED ALWAYS AS (valid_until < NOW()) STORED,

  -- Status
  status TEXT DEFAULT 'pending', -- pending, accepted, rejected, expired

  -- Producer response
  producer_notes TEXT,
  estimated_days INT, -- estimated production time

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint
  CONSTRAINT quote_has_owner CHECK (user_id IS NOT NULL OR guest_session_id IS NOT NULL)
);

-- Indexes
CREATE INDEX idx_quotes_producer ON producer_quotes(producer_id);
CREATE INDEX idx_quotes_user ON producer_quotes(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_quotes_guest ON producer_quotes(guest_session_id) WHERE guest_session_id IS NOT NULL;
CREATE INDEX idx_quotes_hash ON producer_quotes(project_hash);
CREATE INDEX idx_quotes_valid ON producer_quotes(valid_until) WHERE status = 'pending';

-- RLS
ALTER TABLE producer_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own quotes" ON producer_quotes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage quotes" ON producer_quotes
  FOR ALL USING (auth.role() = 'service_role');

-- Updated at trigger
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON producer_quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PRODUCER ORDERS
-- ============================================================================

CREATE TABLE producer_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  producer_id UUID NOT NULL REFERENCES producers(id),
  quote_id UUID REFERENCES producer_quotes(id),
  user_id UUID REFERENCES auth.users(id),
  guest_session_id TEXT,
  guest_email TEXT,

  -- Order number
  order_number TEXT UNIQUE NOT NULL,

  -- Status
  status producer_order_status DEFAULT 'draft',
  status_history JSONB DEFAULT '[]'::jsonb,

  -- Project data (snapshot from quote or direct)
  project_data JSONB NOT NULL,
  project_hash TEXT NOT NULL,

  -- Services
  services TEXT[] DEFAULT '{}',

  -- Pricing (in grosz)
  subtotal INT NOT NULL,
  delivery_cost INT DEFAULT 0,
  discount_amount INT DEFAULT 0,
  total INT NOT NULL,
  currency TEXT DEFAULT 'PLN',

  -- Commission
  commission_rate DECIMAL(4, 3) NOT NULL, -- e.g., 0.050 = 5%
  commission_amount INT NOT NULL, -- calculated commission in grosz

  -- Delivery
  delivery_address JSONB, -- {name, street, city, postal_code, country, phone}
  delivery_method TEXT,
  tracking_number TEXT,
  estimated_delivery DATE,

  -- Payment
  payment_id UUID REFERENCES payments(id),
  paid_at TIMESTAMPTZ,

  -- Producer communication
  producer_order_id TEXT, -- ID in producer's system
  producer_notes TEXT,
  customer_notes TEXT,

  -- Timestamps
  confirmed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint
  CONSTRAINT order_has_owner CHECK (
    user_id IS NOT NULL OR (guest_session_id IS NOT NULL AND guest_email IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX idx_producer_orders_producer ON producer_orders(producer_id);
CREATE INDEX idx_producer_orders_user ON producer_orders(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_producer_orders_guest ON producer_orders(guest_session_id) WHERE guest_session_id IS NOT NULL;
CREATE INDEX idx_producer_orders_status ON producer_orders(status);
CREATE INDEX idx_producer_orders_number ON producer_orders(order_number);
CREATE INDEX idx_producer_orders_created ON producer_orders(created_at DESC);

-- RLS
ALTER TABLE producer_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own orders" ON producer_orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage orders" ON producer_orders
  FOR ALL USING (auth.role() = 'service_role');

-- Updated at trigger
CREATE TRIGGER update_producer_orders_updated_at
  BEFORE UPDATE ON producer_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMISSIONS TRACKING
-- ============================================================================

CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference
  order_id UUID NOT NULL REFERENCES producer_orders(id) ON DELETE CASCADE,
  producer_id UUID NOT NULL REFERENCES producers(id),

  -- Commission details
  order_value INT NOT NULL, -- total order value
  commission_rate DECIMAL(4, 3) NOT NULL,
  commission_amount INT NOT NULL,
  currency TEXT DEFAULT 'PLN',

  -- Status
  status TEXT DEFAULT 'pending', -- pending, paid, cancelled
  paid_at TIMESTAMPTZ,

  -- Settlement
  settlement_batch TEXT, -- batch ID for grouped payouts
  settlement_date DATE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_commissions_order ON commissions(order_id);
CREATE INDEX idx_commissions_producer ON commissions(producer_id);
CREATE INDEX idx_commissions_status ON commissions(status);
CREATE INDEX idx_commissions_settlement ON commissions(settlement_batch) WHERE settlement_batch IS NOT NULL;

-- RLS
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage commissions" ON commissions
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Generate quote number
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

-- Generate producer order number
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

-- Calculate commission based on tiers
CREATE OR REPLACE FUNCTION calculate_commission(
  p_order_value INT,
  p_producer_rate DECIMAL DEFAULT NULL
)
RETURNS TABLE (
  rate DECIMAL(4, 3),
  amount INT
) AS $$
DECLARE
  v_rate DECIMAL(4, 3);
BEGIN
  -- Use producer-specific rate if provided
  IF p_producer_rate IS NOT NULL THEN
    v_rate := p_producer_rate;
  ELSE
    -- Default tier-based commission
    v_rate := CASE
      WHEN p_order_value < 50000 THEN 0.080  -- 8% under 500 zł
      WHEN p_order_value < 200000 THEN 0.060 -- 6% 500-2000 zł
      WHEN p_order_value < 500000 THEN 0.050 -- 5% 2000-5000 zł
      ELSE 0.040                              -- 4% over 5000 zł
    END;
  END IF;

  RETURN QUERY SELECT
    v_rate,
    ROUND(p_order_value * v_rate)::INT;
END;
$$ LANGUAGE plpgsql;

-- Update order status with history
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
  -- Get current status
  SELECT status, status_history INTO v_current_status, v_history
  FROM producer_orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Add to history
  v_history := v_history || jsonb_build_object(
    'from', v_current_status,
    'to', p_new_status,
    'at', NOW(),
    'notes', p_notes
  );

  -- Update order
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

-- Revoke public access
REVOKE EXECUTE ON FUNCTION update_order_status(UUID, producer_order_status, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION update_order_status(UUID, producer_order_status, TEXT) FROM authenticated;

-- ============================================================================
-- SEED DATA: Sample Producers
-- ============================================================================

INSERT INTO producers (
  name, slug, description, email, phone, website,
  address, services, api_type,
  base_cutting_price, base_edging_price, minimum_order_value,
  delivery_regions, delivery_base_cost, free_delivery_threshold,
  is_active, is_verified, rating
) VALUES
(
  'MebloPłyta Kraków',
  'meblopiyta-krakow',
  'Profesjonalne cięcie i okleinowanie płyt meblowych. Ponad 20 lat doświadczenia.',
  'zamowienia@mebloplyty.pl',
  '+48 12 345 67 89',
  'https://mebloplyty.pl',
  '{"street": "ul. Przemysłowa 15", "city": "Kraków", "postal_code": "30-001", "country": "PL"}',
  ARRAY['cutting', 'edging', 'drilling'],
  'email',
  250, -- 2.50 zł/mb cięcie
  350, -- 3.50 zł/mb okleinowanie
  15000, -- 150 zł minimum
  ARRAY['30', '31', '32', '33', '34'],
  4900, -- 49 zł dostawa
  50000, -- darmowa od 500 zł
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
  280, -- 2.80 zł/mb cięcie
  380, -- 3.80 zł/mb okleinowanie
  20000, -- 200 zł minimum
  ARRAY['00', '01', '02', '03', '04', '05', '06', '07', '08', '09'],
  5900, -- 59 zł dostawa
  80000, -- darmowa od 800 zł
  true, true, 4.72
),
(
  'Płyty24 Poznań',
  'plyty24-poznan',
  'Szybka realizacja zamówień. Cięcie w 24h.',
  'kontakt@plyty24.pl',
  '+48 61 888 99 00',
  'https://plyty24.pl',
  '{"street": "ul. Logistyczna 8", "city": "Poznań", "postal_code": "60-001", "country": "PL"}',
  ARRAY['cutting', 'edging', 'delivery'],
  'webhook',
  230, -- 2.30 zł/mb cięcie
  320, -- 3.20 zł/mb okleinowanie
  10000, -- 100 zł minimum
  ARRAY['60', '61', '62', '63', '64'],
  3900, -- 39 zł dostawa
  40000, -- darmowa od 400 zł
  true, true, 4.65
),
(
  'DrewnoMax Gdańsk',
  'drewnomax-gdansk',
  'Kompleksowa obsługa stolarzy. Materiały i usługi.',
  'zamowienia@drewnomax.pl',
  '+48 58 777 88 99',
  'https://drewnomax.pl',
  '{"street": "ul. Portowa 22", "city": "Gdańsk", "postal_code": "80-001", "country": "PL"}',
  ARRAY['cutting', 'edging', 'drilling', 'delivery'],
  'email',
  260, -- 2.60 zł/mb cięcie
  340, -- 3.40 zł/mb okleinowanie
  12000, -- 120 zł minimum
  ARRAY['80', '81', '82', '83', '84'],
  5500, -- 55 zł dostawa
  60000, -- darmowa od 600 zł
  true, false, 4.50
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE producers IS 'Furniture cutting service providers';
COMMENT ON TABLE producer_quotes IS 'Price quotes from producers for projects';
COMMENT ON TABLE producer_orders IS 'Orders placed with producers';
COMMENT ON TABLE commissions IS 'Commission tracking for producer orders';
COMMENT ON FUNCTION calculate_commission IS 'Calculate commission based on order value tiers or producer-specific rate';
