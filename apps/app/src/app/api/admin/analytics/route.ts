/**
 * GET /api/admin/analytics
 *
 * Historical analytics data - queries Supabase directly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// Force dynamic - this route uses cookies for auth
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    // Use service role client for admin queries
    const adminSupabase = createServiceRoleClient();

    const period = request.nextUrl.searchParams.get('period') || '30d';

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Fetch analytics data
    const { data: analytics, error } = await adminSupabase
      .from('analytics_daily')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) {
      console.error('Analytics query error:', error);
      // Return empty data if table doesn't exist or other error
      return NextResponse.json({
        success: true,
        data: {
          period,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          totals: { revenue: 0, newUsers: 0, exports: 0, orders: 0 },
          daily: [],
        },
      });
    }

    // Format response
    const formattedData = (analytics || []).map((day: Record<string, unknown>) => ({
      date: day.date as string,
      revenue: {
        total: Number(day.total_revenue) || 0,
        credits: Number(day.credits_revenue) || 0,
        shop: Number(day.shop_revenue) || 0,
        orders: Number(day.orders_revenue) || 0,
        commissions: Number(day.commission_revenue) || 0,
        tenants: Number(day.tenant_revenue) || 0,
      },
      users: {
        new: Number(day.new_users) || 0,
        active: Number(day.active_users) || 0,
      },
      exports: {
        total: Number(day.total_exports) || 0,
        paid: Number(day.paid_exports) || 0,
        free: Number(day.free_exports) || 0,
      },
      orders: {
        quotes: Number(day.quotes_requested) || 0,
        created: Number(day.orders_created) || 0,
        completed: Number(day.orders_completed) || 0,
      },
      tenants: {
        new: Number(day.new_tenants) || 0,
        active: Number(day.active_tenants) || 0,
      },
    }));

    // Calculate totals
    const totals = formattedData.reduce(
      (acc, day) => ({
        revenue: acc.revenue + day.revenue.total,
        newUsers: acc.newUsers + day.users.new,
        exports: acc.exports + day.exports.total,
        orders: acc.orders + day.orders.created,
      }),
      { revenue: 0, newUsers: 0, exports: 0, orders: 0 }
    );

    return NextResponse.json({
      success: true,
      data: {
        period,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        totals,
        daily: formattedData,
      },
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
