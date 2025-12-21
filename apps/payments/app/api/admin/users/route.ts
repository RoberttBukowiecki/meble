/**
 * GET /api/admin/users - List users with credits and payments info
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify admin access
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        },
        { status: 401 }
      );
    }

    const { data: isAdmin } = await supabase.rpc('is_admin' as never, {
      p_user_id: user.id,
    } as never);
    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin access required' },
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    // Build query for profiles
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(
        `email.ilike.%${search}%,full_name.ilike.%${search}%,display_name.ilike.%${search}%`
      );
    }

    query = query.range(offset, offset + limit - 1);

    const { data: profiles, error: profilesError, count } = await query;

    if (profilesError) {
      throw profilesError;
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          users: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        },
      });
    }

    // Get user IDs for batch queries
    const userIds = profiles.map((p) => p.id);

    // Fetch credits for all users
    const { data: credits } = await supabase
      .from('export_credits')
      .select('user_id, credits_total, credits_used')
      .in('user_id', userIds);

    // Fetch payment counts for all users
    const { data: paymentCounts } = await supabase
      .from('payments')
      .select('user_id')
      .in('user_id', userIds)
      .eq('status', 'completed');

    // Create lookup maps
    const creditsMap = new Map<
      string,
      { total: number; used: number }
    >();
    credits?.forEach((c) => {
      if (!c.user_id) return;
      const existing = creditsMap.get(c.user_id) || { total: 0, used: 0 };
      creditsMap.set(c.user_id, {
        total: existing.total + c.credits_total,
        used: existing.used + c.credits_used,
      });
    });

    const paymentsMap = new Map<string, number>();
    paymentCounts?.forEach((p) => {
      if (!p.user_id) return;
      paymentsMap.set(p.user_id, (paymentsMap.get(p.user_id) || 0) + 1);
    });

    // Format users
    const users = profiles.map((profile) => {
      const userCredits = creditsMap.get(profile.id) || { total: 0, used: 0 };
      return {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
        isActive: profile.is_active,
        isBetaTester: profile.is_beta_tester,
        preferredLocale: profile.preferred_locale,
        loginCount: profile.login_count || 0,
        lastLoginAt: profile.last_login_at,
        createdAt: profile.created_at,
        creditsTotal: userCredits.total,
        creditsUsed: userCredits.used,
        paymentsCount: paymentsMap.get(profile.id) || 0,
      };
    });

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages,
        },
      },
    });
  } catch (error) {
    console.error('Admin users list error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to fetch users' },
      },
      { status: 500 }
    );
  }
}
