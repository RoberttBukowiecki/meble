/**
 * GET /api/admin/analytics - Historical analytics data
 *
 * Supports two auth modes:
 * 1. Direct browser request with Supabase session cookies
 * 2. Internal server-to-server request with X-Admin-User-Id header
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Check for internal server-to-server request
    const adminUserId = request.headers.get('X-Admin-User-Id');

    let supabase;

    if (adminUserId) {
      // Internal request - use service client
      supabase = createServiceClient();

      // Verify admin status
      const { data: isAdmin } = await supabase.rpc('is_admin' as never, { p_user_id: adminUserId } as never);
      if (!isAdmin) {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
          { status: 403 }
        );
      }
    } else {
      // Direct browser request - use cookie-based auth
      supabase = await createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
          { status: 401 }
        );
      }

      const { data: isAdmin } = await supabase.rpc('is_admin' as never, { p_user_id: user.id } as never);
      if (!isAdmin) {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
          { status: 403 }
        );
      }
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d'; // 7d, 30d, 90d, 1y
    const metric = searchParams.get('metric'); // revenue, users, exports, orders

    // Calculate date range
    const endDate = new Date();
    let startDate = new Date();

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
    const { data: analytics, error } = await supabase
      .from('analytics_daily')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) {
      throw error;
    }

    // Format response based on requested metric
    const formattedData = ((analytics || []) as any[]).map(day => ({
      date: day.date,
      revenue: {
        total: day.total_revenue,
        credits: day.credits_revenue,
        shop: day.shop_revenue,
        orders: day.orders_revenue,
        commissions: day.commission_revenue,
        tenants: day.tenant_revenue,
      },
      users: {
        new: day.new_users,
        active: day.active_users,
      },
      exports: {
        total: day.total_exports,
        paid: day.paid_exports,
        free: day.free_exports,
      },
      orders: {
        quotes: day.quotes_requested,
        created: day.orders_created,
        completed: day.orders_completed,
      },
      tenants: {
        new: day.new_tenants,
        active: day.active_tenants,
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
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch analytics' } },
      { status: 500 }
    );
  }
}

// POST - Trigger analytics update
export async function POST(request: NextRequest) {
  try {
    // Check for internal server-to-server request
    const adminUserId = request.headers.get('X-Admin-User-Id');

    let supabase;

    if (adminUserId) {
      supabase = createServiceClient();

      const { data: isAdmin } = await supabase.rpc('is_admin' as never, { p_user_id: adminUserId } as never);
      if (!isAdmin) {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
          { status: 403 }
        );
      }
    } else {
      supabase = await createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
          { status: 401 }
        );
      }

      const { data: isAdmin } = await supabase.rpc('is_admin' as never, { p_user_id: user.id } as never);
      if (!isAdmin) {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
          { status: 403 }
        );
      }
    }

    // Update today's analytics
    await supabase.rpc('update_daily_analytics' as never);

    return NextResponse.json({
      success: true,
      message: 'Analytics updated',
    });
  } catch (error) {
    console.error('Analytics update error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update analytics' } },
      { status: 500 }
    );
  }
}
