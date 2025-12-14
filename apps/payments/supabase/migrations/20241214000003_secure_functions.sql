-- ============================================================================
-- SECURE FUNCTIONS MIGRATION
-- Migration: 20241214000003_secure_functions.sql
-- Description: Fix SECURITY DEFINER functions to use auth.uid() instead of
--              accepting caller-supplied user IDs (security vulnerability fix)
-- ============================================================================

-- ============================================================================
-- REVOKE PUBLIC ACCESS TO SENSITIVE FUNCTIONS
-- ============================================================================

-- Revoke execute from public (anon) and authenticated roles
-- These functions should only be called via service_role from backend

REVOKE EXECUTE ON FUNCTION get_user_credit_balance(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_user_credit_balance(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION get_user_credit_balance(UUID) FROM anon;

REVOKE EXECUTE ON FUNCTION use_export_credit(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION use_export_credit(UUID, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION use_export_credit(UUID, TEXT) FROM anon;

REVOKE EXECUTE ON FUNCTION get_guest_credit_balance(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION get_guest_credit_balance(TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION get_guest_credit_balance(TEXT) FROM anon;

REVOKE EXECUTE ON FUNCTION use_guest_credit(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION use_guest_credit(TEXT, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION use_guest_credit(TEXT, TEXT) FROM anon;

-- ============================================================================
-- NEW SECURE FUNCTIONS FOR AUTHENTICATED USERS
-- These use auth.uid() instead of accepting user_id parameter
-- ============================================================================

-- Get current user's credit balance (secure version)
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
  -- Get user ID from JWT claims
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

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
  WHERE ec.user_id = v_user_id
    AND (ec.valid_until IS NULL OR ec.valid_until > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users only
GRANT EXECUTE ON FUNCTION get_my_credit_balance() TO authenticated;

-- Use export credit for current user (secure version)
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
  v_credit_id UUID;
  v_session_id UUID;
  v_existing_session RECORD;
  v_credit_record RECORD;
BEGIN
  -- Get user ID from JWT claims
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT
      false,
      NULL::UUID,
      0,
      'Nie jesteś zalogowany'::TEXT,
      false;
    RETURN;
  END IF;

  -- 1. Check for active session for this project
  SELECT es.* INTO v_existing_session
  FROM export_sessions es
  JOIN export_credits ec ON es.credit_id = ec.id
  WHERE ec.user_id = v_user_id
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
      (SELECT COALESCE(available_credits, 0) FROM get_user_credit_balance(v_user_id)),
      'Darmowy re-export (sesja aktywna)'::TEXT,
      true;
    RETURN;
  END IF;

  -- 2. Find credit to use
  SELECT * INTO v_credit_record
  FROM export_credits
  WHERE user_id = v_user_id
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
    (SELECT COALESCE(available_credits, 0) FROM get_user_credit_balance(v_user_id)),
    'Kredyt zużyty, sesja aktywna 24h'::TEXT,
    false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users only
GRANT EXECUTE ON FUNCTION use_my_export_credit(TEXT) TO authenticated;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION get_my_credit_balance() IS
'Secure function to get current authenticated user''s credit balance.
Uses auth.uid() internally - cannot be called with arbitrary user IDs.';

COMMENT ON FUNCTION use_my_export_credit(TEXT) IS
'Secure function to use export credit for the current authenticated user.
Uses auth.uid() internally - cannot be called with arbitrary user IDs.
Implements Smart Export: 24h free re-exports for same project hash.';

COMMENT ON FUNCTION get_user_credit_balance(UUID) IS
'BACKEND ONLY - Restricted to service_role.
Use get_my_credit_balance() for client-side calls.';

COMMENT ON FUNCTION use_export_credit(UUID, TEXT) IS
'BACKEND ONLY - Restricted to service_role.
Use use_my_export_credit(TEXT) for client-side calls.';

COMMENT ON FUNCTION get_guest_credit_balance(TEXT) IS
'BACKEND ONLY - Restricted to service_role.
Guest credits must be managed through backend API.';

COMMENT ON FUNCTION use_guest_credit(TEXT, TEXT) IS
'BACKEND ONLY - Restricted to service_role.
Guest credits must be managed through backend API.';
