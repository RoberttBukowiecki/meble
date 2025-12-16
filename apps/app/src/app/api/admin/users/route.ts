/**
 * GET /api/admin/users
 *
 * List users with pagination and search.
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

    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    // Build profiles query
    let profilesQuery = adminSupabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply search filter
    if (search) {
      profilesQuery = profilesQuery.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    // Apply pagination
    profilesQuery = profilesQuery.range(offset, offset + limit - 1);

    // Fetch profiles and all credits in parallel
    // Note: We fetch all credits and filter client-side to avoid N+1 queries
    // For small-medium user bases this is more efficient than a JOIN or subquery
    const [profilesResult, creditsResult] = await Promise.all([
      profilesQuery,
      adminSupabase.from('export_credits').select('user_id, credits_total, credits_used'),
    ]);

    const { data: profiles, error, count } = profilesResult;

    if (error) {
      console.error('Users query error:', error);
      return NextResponse.json(
        { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch users' } },
        { status: 500 }
      );
    }

    const { data: credits } = creditsResult;

    // Create credits map
    const creditsMap = new Map(
      (credits || []).map((c: { user_id: string; credits_total: number; credits_used: number }) => [
        c.user_id,
        { total: c.credits_total || 0, used: c.credits_used || 0 },
      ])
    );

    // Format users
    const users = (profiles || []).map((profile: Record<string, unknown>) => {
      const userCredits = creditsMap.get(profile.id as string) || { total: 0, used: 0 };
      return {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
        isActive: profile.is_active,
        isAdmin: profile.is_admin || false,
        credits: {
          total: userCredits.total,
          used: userCredits.used,
          available: userCredits.total - userCredits.used,
        },
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      },
    });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
