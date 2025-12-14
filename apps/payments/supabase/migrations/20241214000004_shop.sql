-- ============================================================================
-- MINI-SHOP SCHEMA
-- Migration: 20241214000004_shop.sql
-- Description: Adds tables for shop products, cart, and orders
-- ============================================================================

-- ============================================================================
-- SHOP PRODUCTS
-- ============================================================================

CREATE TABLE shop_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic info
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  name_pl TEXT NOT NULL,
  description TEXT,
  description_pl TEXT,

  -- Category
  category TEXT NOT NULL, -- 'prowadnice', 'zawiasy', 'uchwyty', 'narzedzia', 'akcesoria'

  -- Pricing (in grosz)
  price INT NOT NULL,
  compare_at_price INT, -- Original price for showing discounts
  currency TEXT DEFAULT 'PLN',

  -- Inventory
  sku TEXT UNIQUE,
  stock_quantity INT DEFAULT 0,
  track_inventory BOOLEAN DEFAULT true,

  -- Media
  images TEXT[] DEFAULT '{}', -- Array of image URLs
  thumbnail_url TEXT,

  -- SEO & Display
  meta_title TEXT,
  meta_description TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,

  -- Recommendation tags for post-export upsell
  recommendation_tags TEXT[] DEFAULT '{}', -- 'has_drawers', 'has_cabinets', etc.

  -- External links (affiliate)
  external_url TEXT,
  is_affiliate BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_shop_products_category ON shop_products(category);
CREATE INDEX idx_shop_products_active ON shop_products(is_active) WHERE is_active = true;
CREATE INDEX idx_shop_products_featured ON shop_products(is_featured) WHERE is_featured = true;
CREATE INDEX idx_shop_products_slug ON shop_products(slug);
CREATE INDEX idx_shop_products_tags ON shop_products USING GIN(recommendation_tags);

-- RLS
ALTER TABLE shop_products ENABLE ROW LEVEL SECURITY;

-- Everyone can read active products
CREATE POLICY "Anyone can read active products" ON shop_products
  FOR SELECT USING (is_active = true);

-- Service role can manage products
CREATE POLICY "Service role can manage products" ON shop_products
  FOR ALL USING (auth.role() = 'service_role');

-- Updated at trigger
CREATE TRIGGER update_shop_products_updated_at
  BEFORE UPDATE ON shop_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PRODUCT VARIANTS (for size, color variations)
-- ============================================================================

CREATE TABLE shop_product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES shop_products(id) ON DELETE CASCADE,

  -- Variant info
  name TEXT NOT NULL, -- e.g., "300mm", "Srebrny"
  sku TEXT UNIQUE,

  -- Pricing (override product price if set)
  price INT,

  -- Inventory
  stock_quantity INT DEFAULT 0,

  -- Attributes (JSON for flexibility)
  attributes JSONB DEFAULT '{}', -- {"size": "300mm", "color": "silver"}

  -- Status
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_product_variants_product ON shop_product_variants(product_id);

-- RLS
ALTER TABLE shop_product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active variants" ON shop_product_variants
  FOR SELECT USING (is_active = true);

CREATE POLICY "Service role can manage variants" ON shop_product_variants
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- SHOPPING CART
-- ============================================================================

CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner (one of these)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_session_id TEXT,

  -- Product reference
  product_id UUID NOT NULL REFERENCES shop_products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES shop_product_variants(id) ON DELETE SET NULL,

  -- Quantity
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),

  -- Price snapshot at time of adding (for price change protection)
  unit_price INT NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT cart_has_owner CHECK (user_id IS NOT NULL OR guest_session_id IS NOT NULL),
  CONSTRAINT unique_user_product UNIQUE NULLS NOT DISTINCT (user_id, product_id, variant_id),
  CONSTRAINT unique_guest_product UNIQUE NULLS NOT DISTINCT (guest_session_id, product_id, variant_id)
);

-- Indexes
CREATE INDEX idx_cart_items_user ON cart_items(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_cart_items_guest ON cart_items(guest_session_id) WHERE guest_session_id IS NOT NULL;
CREATE INDEX idx_cart_items_product ON cart_items(product_id);

-- RLS
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own cart" ON cart_items
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all carts" ON cart_items
  FOR ALL USING (auth.role() = 'service_role');

-- Updated at trigger
CREATE TRIGGER update_cart_items_updated_at
  BEFORE UPDATE ON cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SHOP ORDERS
-- ============================================================================

CREATE TYPE shop_order_status AS ENUM (
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded'
);

CREATE TABLE shop_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Order number (human readable)
  order_number TEXT UNIQUE NOT NULL,

  -- Owner
  user_id UUID REFERENCES auth.users(id),
  guest_session_id TEXT,
  guest_email TEXT,

  -- Status
  status shop_order_status DEFAULT 'pending',

  -- Amounts (in grosz)
  subtotal INT NOT NULL,
  shipping_cost INT DEFAULT 0,
  discount_amount INT DEFAULT 0,
  total INT NOT NULL,
  currency TEXT DEFAULT 'PLN',

  -- Shipping address
  shipping_address JSONB, -- {name, street, city, postal_code, country, phone}

  -- Payment
  payment_id UUID REFERENCES payments(id),
  paid_at TIMESTAMPTZ,

  -- Shipping
  shipping_method TEXT,
  tracking_number TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  -- Notes
  customer_notes TEXT,
  internal_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint
  CONSTRAINT shop_order_has_owner CHECK (
    user_id IS NOT NULL OR (guest_session_id IS NOT NULL AND guest_email IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX idx_shop_orders_user ON shop_orders(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_shop_orders_guest ON shop_orders(guest_session_id) WHERE guest_session_id IS NOT NULL;
CREATE INDEX idx_shop_orders_status ON shop_orders(status);
CREATE INDEX idx_shop_orders_number ON shop_orders(order_number);
CREATE INDEX idx_shop_orders_created ON shop_orders(created_at DESC);

-- RLS
ALTER TABLE shop_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own orders" ON shop_orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage orders" ON shop_orders
  FOR ALL USING (auth.role() = 'service_role');

-- Updated at trigger
CREATE TRIGGER update_shop_orders_updated_at
  BEFORE UPDATE ON shop_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ORDER ITEMS
-- ============================================================================

CREATE TABLE shop_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,

  -- Product snapshot (denormalized for order history)
  product_id UUID REFERENCES shop_products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES shop_product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_sku TEXT,
  variant_name TEXT,

  -- Pricing
  unit_price INT NOT NULL,
  quantity INT NOT NULL,
  total_price INT NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_shop_order_items_order ON shop_order_items(order_id);

-- RLS
ALTER TABLE shop_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own order items" ON shop_order_items
  FOR SELECT USING (
    order_id IN (SELECT id FROM shop_orders WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role can manage order items" ON shop_order_items
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  v_number TEXT;
  v_count INT;
BEGIN
  -- Format: SHOP-YYYYMMDD-XXXX
  v_number := 'SHOP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-';

  -- Get today's count
  SELECT COUNT(*) + 1 INTO v_count
  FROM shop_orders
  WHERE DATE(created_at) = CURRENT_DATE;

  v_number := v_number || LPAD(v_count::TEXT, 4, '0');

  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Get cart total for user
CREATE OR REPLACE FUNCTION get_cart_total(p_user_id UUID)
RETURNS TABLE (
  item_count INT,
  subtotal INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(ci.quantity), 0)::INT as item_count,
    COALESCE(SUM(ci.unit_price * ci.quantity), 0)::INT as subtotal
  FROM cart_items ci
  WHERE ci.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get cart total for guest
CREATE OR REPLACE FUNCTION get_guest_cart_total(p_session_id TEXT)
RETURNS TABLE (
  item_count INT,
  subtotal INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(ci.quantity), 0)::INT as item_count,
    COALESCE(SUM(ci.unit_price * ci.quantity), 0)::INT as subtotal
  FROM cart_items ci
  WHERE ci.guest_session_id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke public access to cart functions (service role only for guests)
REVOKE EXECUTE ON FUNCTION get_guest_cart_total(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_guest_cart_total(TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION get_guest_cart_total(TEXT) FROM anon;

-- ============================================================================
-- SEED DATA: Sample Products
-- ============================================================================

INSERT INTO shop_products (slug, name, name_pl, description, description_pl, category, price, compare_at_price, stock_quantity, is_featured, recommendation_tags, images) VALUES
-- Prowadnice (Drawer Slides)
('prowadnica-blum-tandembox-500', 'Blum Tandembox 500mm', 'Prowadnica Blum Tandembox 500mm', 'High-quality drawer slide system', 'Wysokiej jakości system prowadnic szufladowych', 'prowadnice', 8900, 10900, 50, true, ARRAY['has_drawers'], ARRAY['https://placehold.co/400x300?text=Blum+500']),
('prowadnica-blum-tandembox-400', 'Blum Tandembox 400mm', 'Prowadnica Blum Tandembox 400mm', 'High-quality drawer slide system', 'Wysokiej jakości system prowadnic szufladowych', 'prowadnice', 7900, NULL, 50, false, ARRAY['has_drawers'], ARRAY['https://placehold.co/400x300?text=Blum+400']),
('prowadnica-hettich-quadro-500', 'Hettich Quadro 500mm', 'Prowadnica Hettich Quadro 500mm', 'Silent system drawer slides', 'Prowadnice z systemem cichego domykania', 'prowadnice', 6900, NULL, 30, false, ARRAY['has_drawers'], ARRAY['https://placehold.co/400x300?text=Hettich+500']),

-- Zawiasy (Hinges)
('zawias-blum-clip-top-110', 'Blum Clip Top 110°', 'Zawias Blum Clip Top 110°', 'Soft-close cabinet hinge', 'Zawias meblowy z cichym domykiem', 'zawiasy', 1490, NULL, 200, true, ARRAY['has_cabinets'], ARRAY['https://placehold.co/400x300?text=Blum+Clip']),
('zawias-hettich-sensys-110', 'Hettich Sensys 110°', 'Zawias Hettich Sensys 110°', 'Premium soft-close hinge', 'Premium zawias z cichym domykiem', 'zawiasy', 1290, NULL, 150, false, ARRAY['has_cabinets'], ARRAY['https://placehold.co/400x300?text=Hettich+Sensys']),
('zawias-grass-tiomos-110', 'Grass Tiomos 110°', 'Zawias Grass Tiomos 110°', 'Tool-free adjustment hinge', 'Zawias z regulacją bez narzędzi', 'zawiasy', 1390, 1590, 100, false, ARRAY['has_cabinets'], ARRAY['https://placehold.co/400x300?text=Grass+Tiomos']),

-- Uchwyty (Handles)
('uchwyt-nowoczesny-128mm', 'Modern Handle 128mm', 'Uchwyt Nowoczesny 128mm', 'Brushed steel modern handle', 'Nowoczesny uchwyt ze stali szczotkowanej', 'uchwyty', 2490, NULL, 100, true, ARRAY['has_cabinets', 'has_drawers'], ARRAY['https://placehold.co/400x300?text=Handle+128']),
('uchwyt-klasyczny-96mm', 'Classic Handle 96mm', 'Uchwyt Klasyczny 96mm', 'Traditional brass handle', 'Klasyczny uchwyt mosiężny', 'uchwyty', 1990, NULL, 80, false, ARRAY['has_cabinets'], ARRAY['https://placehold.co/400x300?text=Handle+96']),
('galka-ceramiczna-biala', 'White Ceramic Knob', 'Gałka Ceramiczna Biała', 'Elegant ceramic cabinet knob', 'Elegancka gałka ceramiczna', 'uchwyty', 990, NULL, 150, false, ARRAY['has_cabinets'], ARRAY['https://placehold.co/400x300?text=Knob+White']),

-- Narzędzia (Tools)
('wkretarka-bosch-gsr', 'Bosch GSR 12V', 'Wkrętarka Bosch GSR 12V', 'Cordless drill/driver', 'Akumulatorowa wkrętarka', 'narzedzia', 34900, 39900, 20, true, ARRAY['large_project'], ARRAY['https://placehold.co/400x300?text=Bosch+GSR']),
('konfirmaty-zestaw-100', 'Confirmat Set 100pcs', 'Konfirmaty Zestaw 100szt', 'Furniture assembly screws', 'Wkręty do montażu mebli', 'narzedzia', 2990, NULL, 100, false, ARRAY['has_cabinets', 'large_project'], ARRAY['https://placehold.co/400x300?text=Confirmat']),

-- Akcesoria (Accessories)
('oswietlenie-led-szafka', 'LED Cabinet Light', 'Oświetlenie LED do Szafki', 'Motion-activated cabinet light', 'Oświetlenie szafki z czujnikiem ruchu', 'akcesoria', 4990, NULL, 40, true, ARRAY['has_cabinets'], ARRAY['https://placehold.co/400x300?text=LED+Light']),
('organizer-szuflady', 'Drawer Organizer', 'Organizer do Szuflady', 'Adjustable drawer dividers', 'Regulowane przegrody do szuflady', 'akcesoria', 3490, NULL, 60, false, ARRAY['has_drawers'], ARRAY['https://placehold.co/400x300?text=Organizer']);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE shop_products IS 'Mini-shop product catalog for furniture accessories';
COMMENT ON TABLE shop_product_variants IS 'Product size/color variants';
COMMENT ON TABLE cart_items IS 'Shopping cart items for users and guests';
COMMENT ON TABLE shop_orders IS 'Completed shop orders';
COMMENT ON TABLE shop_order_items IS 'Individual items within shop orders';
