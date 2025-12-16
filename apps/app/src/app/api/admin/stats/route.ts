/**
 * GET /api/admin/stats
 *
 * Dashboard statistics - queries Supabase directly.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// Force dynamic - this route uses cookies for auth
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc('is_admin', { p_user_id: user.id });

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    // Use service role client to bypass RLS for admin queries
    const adminSupabase = createServiceRoleClient();

    // Get date ranges
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    // Fetch all stats in parallel
    const [
      usersResult,
      paymentsThisMonth,
      paymentsLastMonth,
      creditsResult,
      ordersResult,
      tenantsResult,
      pendingPayouts,
    ] = await Promise.all([
      // Total users
      adminSupabase.from('profiles').select('id', { count: 'exact', head: true }),

      // Revenue this month
      adminSupabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', startOfMonth.toISOString()),

      // Revenue last month
      adminSupabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', startOfLastMonth.toISOString())
        .lte('created_at', endOfLastMonth.toISOString()),

      // Credits stats
      adminSupabase.from('export_credits').select('credits_total, credits_used'),

      // Orders stats
      adminSupabase
        .from('producer_orders')
        .select('status, total')
        .gte('created_at', startOfMonth.toISOString()),

      // Tenants stats
      adminSupabase.from('tenants').select('status, plan'),

      // Pending payouts
      adminSupabase
        .from('payout_requests')
        .select('amount')
        .eq('status', 'pending'),
    ]);

    // Calculate revenue
    const revenueThisMonth = paymentsThisMonth.data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    const revenueLastMonth = paymentsLastMonth.data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    const revenueChange = revenueLastMonth > 0
      ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100
      : 0;

    // Calculate orders stats
    const ordersThisMonth = ordersResult.data || [];
    const completedOrders = ordersThisMonth.filter(o => o.status === 'delivered');
    const pendingOrders = ordersThisMonth.filter(o =>
      ['pending_payment', 'confirmed', 'processing', 'shipped'].includes(o.status)
    );

    // Calculate tenant stats
    const tenants = tenantsResult.data || [];
    const activeTenants = tenants.filter(t => t.status === 'active');
    const tenantsByPlan = {
      starter: tenants.filter(t => t.plan === 'starter').length,
      professional: tenants.filter(t => t.plan === 'professional').length,
      enterprise: tenants.filter(t => t.plan === 'enterprise').length,
    };

    // Pending payout amount
    const pendingPayoutAmount = pendingPayouts.data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    // Calculate active credits
    const activeCredits = creditsResult.data?.reduce(
      (sum, c) => sum + ((c.credits_total || 0) - (c.credits_used || 0)),
      0
    ) || 0;

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalUsers: usersResult.count || 0,
          activeCredits,
          activeTenants: activeTenants.length,
          totalTenants: tenants.length,
        },
        revenue: {
          thisMonth: revenueThisMonth,
          lastMonth: revenueLastMonth,
          changePercent: Math.round(revenueChange * 10) / 10,
        },
        orders: {
          thisMonth: ordersThisMonth.length,
          completed: completedOrders.length,
          pending: pendingOrders.length,
          totalValue: ordersThisMonth.reduce((sum, o) => sum + (o.total || 0), 0),
        },
        tenants: {
          total: tenants.length,
          active: activeTenants.length,
          byPlan: tenantsByPlan,
        },
        payouts: {
          pendingCount: pendingPayouts.data?.length || 0,
          pendingAmount: pendingPayoutAmount,
        },
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
