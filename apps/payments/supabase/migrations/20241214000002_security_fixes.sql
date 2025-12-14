-- ============================================================================
-- FIX: Security improvements for RLS policies
-- Migration: 20241214000002_security_fixes.sql
-- Description: Adds proper RLS to guest_credits, export_sessions, export_history
-- ============================================================================

-- ============================================================================
-- GUEST CREDITS: Enable RLS with service-role-only access
-- ============================================================================
-- Guest credits should only be accessible via backend service role.
-- Client-side access is handled via API endpoints that use session_id from headers.

ALTER TABLE guest_credits ENABLE ROW LEVEL SECURITY;

-- Only service role can access guest_credits (no client-side access)
CREATE POLICY "Service role only access" ON guest_credits
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- EXPORT SESSIONS: Enable RLS with proper access control
-- ============================================================================

ALTER TABLE export_sessions ENABLE ROW LEVEL SECURITY;

-- Users can read their own export sessions (via linked export_credits)
CREATE POLICY "Users can read own sessions" ON export_sessions
  FOR SELECT USING (
    credit_id IN (
      SELECT id FROM export_credits WHERE user_id = auth.uid()
    )
  );

-- Service role has full access (for guests and management)
CREATE POLICY "Service role full access" ON export_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- EXPORT HISTORY: Add service role policy
-- ============================================================================

-- Service role has full access for guest exports
CREATE POLICY "Service role full access" ON export_history
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- PAYMENTS: Ensure guest payments are only accessible via service role
-- ============================================================================
-- Already has RLS enabled with user-only read. Add explicit note that
-- guest payments are handled via service role in webhooks.

-- No changes needed - current policies are correct:
-- - Users can read own payments (via user_id)
-- - Service role can manage all payments (for webhooks and guest payments)
