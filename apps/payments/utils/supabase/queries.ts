import { cache } from 'react';
import type { createClient } from './server';

type TypedSupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Get authenticated user from Supabase Auth
 */
export const getUser = cache(async (supabase: TypedSupabaseClient) => {
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Get user profile from profiles table
 */
export const getUserProfile = cache(async (supabase: TypedSupabaseClient) => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .single();
  return profile;
});

/**
 * Get user's credit balance
 */
export const getUserCredits = cache(async (supabase: TypedSupabaseClient) => {
  const { data, error } = await supabase.rpc('get_my_credit_balance');

  if (error || !data?.[0]) {
    return {
      totalCredits: 0,
      usedCredits: 0,
      availableCredits: 0,
      hasUnlimited: false,
      unlimitedExpiresAt: null,
    };
  }

  const balance = data[0];
  return {
    totalCredits: balance.total_credits,
    usedCredits: balance.used_credits,
    availableCredits: balance.available_credits,
    hasUnlimited: balance.has_unlimited,
    unlimitedExpiresAt: balance.unlimited_expires_at,
  };
});

/**
 * Get shop products
 */
export const getShopProducts = cache(async (supabase: TypedSupabaseClient) => {
  const { data: products, error } = await supabase
    .from('shop_products')
    .select('*, shop_product_variants(*)')
    .eq('is_active', true)
    .order('sort_order')
    .order('created_at', { ascending: false });

  return products;
});

/**
 * Get featured shop products
 */
export const getFeaturedProducts = cache(async (supabase: TypedSupabaseClient) => {
  const { data: products, error } = await supabase
    .from('shop_products')
    .select('*')
    .eq('is_active', true)
    .eq('is_featured', true)
    .order('sort_order')
    .limit(6);

  return products;
});

/**
 * @deprecated Use getUserProfile instead
 */
export const getUserDetails = getUserProfile;

/**
 * Get Stripe products with prices (for subscription pricing page)
 */
export const getProducts = cache(async (supabase: TypedSupabaseClient) => {
  const { data: products } = await supabase
    .from('products')
    .select('*, prices(*)')
    .eq('active', true)
    .order('metadata->index')
    .order('unit_amount', { referencedTable: 'prices' });

  return products;
});

/**
 * Get user's active subscription
 */
export const getSubscription = cache(async (supabase: TypedSupabaseClient) => {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*, prices(*, products(*))')
    .in('status', ['trialing', 'active'])
    .maybeSingle();

  return subscription;
});
