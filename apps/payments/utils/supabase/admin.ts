/**
 * Supabase Admin Utilities
 *
 * Service role client for server-side operations that bypass RLS.
 * Use with caution - only in secure server-side contexts.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from 'types_db';

// Service role client - bypasses RLS
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// ============================================================================
// USER PROFILE MANAGEMENT
// ============================================================================

/**
 * Get user profile by ID
 */
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw new Error(`Failed to get user profile: ${error.message}`);
  return data;
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  userId: string,
  updates: {
    full_name?: string;
    display_name?: string;
    avatar_url?: string;
    billing_address?: Record<string, unknown>;
    preferred_locale?: string;
    newsletter_subscribed?: boolean;
  }
) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update user profile: ${error.message}`);
  return data;
};

// ============================================================================
// CREDITS MANAGEMENT
// ============================================================================

/**
 * Add credits to user
 */
export const addUserCredits = async (
  userId: string,
  credits: number,
  packageType: 'single' | 'starter' | 'standard' | 'pro' | 'bonus',
  paymentId?: string,
  validUntil?: Date
) => {
  const { data, error } = await supabaseAdmin
    .from('export_credits')
    .insert({
      user_id: userId,
      credits_total: credits,
      credits_used: 0,
      package_type: packageType,
      payment_id: paymentId,
      valid_until: validUntil?.toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to add credits: ${error.message}`);
  return data;
};

/**
 * Add guest credits
 */
export const addGuestCredits = async (
  sessionId: string,
  credits: number,
  email?: string,
  paymentId?: string
) => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiration

  const { data, error } = await supabaseAdmin
    .from('guest_credits')
    .upsert({
      session_id: sessionId,
      credits_total: credits,
      credits_used: 0,
      email,
      expires_at: expiresAt.toISOString(),
      last_payment_id: paymentId,
    }, {
      onConflict: 'session_id',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to add guest credits: ${error.message}`);
  return data;
};

/**
 * Get user credit balance using service role
 */
export const getUserCreditBalance = async (userId: string) => {
  const { data, error } = await supabaseAdmin.rpc('get_user_credit_balance', {
    p_user_id: userId,
  });

  if (error) throw new Error(`Failed to get credit balance: ${error.message}`);
  return data?.[0] || {
    total_credits: 0,
    used_credits: 0,
    available_credits: 0,
    has_unlimited: false,
    unlimited_expires_at: null,
  };
};

/**
 * Get guest credit balance using service role
 */
export const getGuestCreditBalance = async (sessionId: string) => {
  const { data, error } = await supabaseAdmin.rpc('get_guest_credit_balance', {
    p_session_id: sessionId,
  });

  if (error) throw new Error(`Failed to get guest credit balance: ${error.message}`);
  return data?.[0] || {
    available_credits: 0,
    expires_at: null,
  };
};

/**
 * Use export credit (service role)
 */
export const useExportCredit = async (userId: string, projectHash: string) => {
  const { data, error } = await supabaseAdmin.rpc('use_export_credit', {
    p_user_id: userId,
    p_project_hash: projectHash,
  });

  if (error) throw new Error(`Failed to use credit: ${error.message}`);
  return data?.[0];
};

/**
 * Use guest credit (service role)
 */
export const useGuestCredit = async (sessionId: string, projectHash: string) => {
  const { data, error } = await supabaseAdmin.rpc('use_guest_credit', {
    p_session_id: sessionId,
    p_project_hash: projectHash,
  });

  if (error) throw new Error(`Failed to use guest credit: ${error.message}`);
  return data?.[0];
};

// ============================================================================
// ADMIN MANAGEMENT
// ============================================================================

/**
 * Check if user is admin
 */
export const isUserAdmin = async (userId: string) => {
  const { data, error } = await supabaseAdmin
    .from('admin_users')
    .select('id, role')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  return !!data;
};

/**
 * Get admin role
 */
export const getAdminRole = async (userId: string) => {
  const { data, error } = await supabaseAdmin
    .from('admin_users')
    .select('role')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  return data?.role || null;
};

// ============================================================================
// DEPRECATED STRIPE FUNCTIONS (stubs for backwards compatibility)
// ============================================================================

/** @deprecated Stripe is not used - this function will throw */
export const upsertProductRecord = async (_product: unknown) => {
  throw new Error('Stripe integration has been removed. upsertProductRecord is deprecated.');
};

/** @deprecated Stripe is not used - this function will throw */
export const upsertPriceRecord = async (_price: unknown) => {
  throw new Error('Stripe integration has been removed. upsertPriceRecord is deprecated.');
};

/** @deprecated Stripe is not used - this function will throw */
export const deleteProductRecord = async (_product: unknown) => {
  throw new Error('Stripe integration has been removed. deleteProductRecord is deprecated.');
};

/** @deprecated Stripe is not used - this function will throw */
export const deletePriceRecord = async (_price: unknown) => {
  throw new Error('Stripe integration has been removed. deletePriceRecord is deprecated.');
};

/** @deprecated Stripe is not used - this function will throw */
export const createOrRetrieveCustomer = async (_params: { email: string; uuid: string }) => {
  throw new Error('Stripe integration has been removed. createOrRetrieveCustomer is deprecated.');
};

/** @deprecated Stripe is not used - this function will throw */
export const manageSubscriptionStatusChange = async (
  _subscriptionId: string,
  _customerId: string,
  _createAction?: boolean
) => {
  throw new Error('Stripe integration has been removed. manageSubscriptionStatusChange is deprecated.');
};
