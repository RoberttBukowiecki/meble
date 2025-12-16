/**
 * GET /api/admin/credits
 *
 * Credits overview and list - queries Supabase directly.
 * Provides comprehensive view of all credits in the system.
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
    const packageType = searchParams.get('packageType') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const offset = (page - 1) * limit;

    // Fetch all data in parallel for performance
    const [
      allCreditsForStats,
      userCreditsResult,
      guestCreditsResult,
      recentActivityResult,
    ] = await Promise.all([
      // All credits for stats calculation (lightweight - only needed fields)
      adminSupabase
        .from('export_credits')
        .select('user_id, credits_total, credits_used, package_type'),

      // User credits with profile info - main list
      (async () => {
        // Build base query for user credits
        let query = adminSupabase
          .from('export_credits')
          .select(`
            id,
            user_id,
            credits_total,
            credits_used,
            package_type,
            valid_until,
            payment_id,
            metadata,
            created_at,
            updated_at
          `, { count: 'exact' });

        // Apply package type filter
        if (packageType) {
          query = query.eq('package_type', packageType);
        }

        // Apply sorting
        const ascending = sortOrder === 'asc';
        if (sortBy === 'credits_available') {
          // For available credits, we need to sort client-side
          query = query.order('credits_total', { ascending });
        } else if (sortBy === 'credits_total' || sortBy === 'credits_used') {
          query = query.order(sortBy, { ascending });
        } else {
          query = query.order('created_at', { ascending });
        }

        // Apply pagination
        query = query.range(offset, offset + limit - 1);

        const { data: credits, error, count } = await query;

        if (error) {
          console.error('Credits query error:', error);
          return { credits: [], count: 0, profiles: new Map() };
        }

        // Get user profiles for these credits
        const userIds = (credits || []).map((c: { user_id: string }) => c.user_id);
        const { data: profiles } = await adminSupabase
          .from('profiles')
          .select('id, email, full_name, display_name')
          .in('id', userIds);

        const profilesMap = new Map(
          (profiles || []).map((p: { id: string; email: string; full_name: string | null; display_name: string | null }) => [
            p.id,
            { email: p.email, fullName: p.full_name, displayName: p.display_name },
          ])
        );

        // Filter by search if provided (client-side for email/name search)
        let filteredCredits = credits || [];
        if (search) {
          const searchLower = search.toLowerCase();
          filteredCredits = filteredCredits.filter((c: { user_id: string }) => {
            const profile = profilesMap.get(c.user_id);
            if (!profile) return false;
            return (
              profile.email?.toLowerCase().includes(searchLower) ||
              profile.fullName?.toLowerCase().includes(searchLower) ||
              profile.displayName?.toLowerCase().includes(searchLower)
            );
          });
        }

        return { credits: filteredCredits, count: search ? filteredCredits.length : count, profiles: profilesMap };
      })(),

      // Guest credits summary
      adminSupabase
        .from('guest_credits')
        .select('id, credits_total, credits_used, expires_at, migrated_to_user_id')
        .is('migrated_to_user_id', null)
        .gt('expires_at', new Date().toISOString()),

      // Recent credit activity (last 50 audit logs)
      adminSupabase
        .from('audit_logs')
        .select('id, action, resource_id, admin_user_id, old_values, new_values, metadata, created_at')
        .eq('resource_type', 'export_credits')
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    // Process stats from all credits data
    const allCreditsData = allCreditsForStats.data || [];
    const userIds = new Set<string>();
    let totalCredits = 0;
    let totalUsed = 0;
    let unlimitedUsers = 0;
    const byPackageType: Record<string, number> = {};

    (allCreditsData as Array<{ user_id: string; credits_total: number; credits_used: number; package_type: string }>).forEach((c) => {
      userIds.add(c.user_id);

      // Count by package type
      byPackageType[c.package_type] = (byPackageType[c.package_type] || 0) + 1;

      if (c.credits_total === -1) {
        unlimitedUsers++;
      } else {
        totalCredits += c.credits_total;
        totalUsed += c.credits_used;
      }
    });

    const stats = {
      totalCredits,
      totalUsed,
      totalAvailable: totalCredits - totalUsed,
      totalUsers: userIds.size,
      unlimitedUsers,
    };

    // Process guest credits
    const guestCredits = guestCreditsResult.data || [];
    const guestStats = {
      activeGuests: guestCredits.length,
      totalCredits: guestCredits.reduce((sum: number, g: { credits_total: number }) => sum + g.credits_total, 0),
      totalUsed: guestCredits.reduce((sum: number, g: { credits_used: number }) => sum + g.credits_used, 0),
    };

    // Format user credits with profile info
    const { credits: userCredits, count: totalCount, profiles: profilesMap } = userCreditsResult;
    const formattedCredits = (userCredits as Array<{
      id: string;
      user_id: string;
      credits_total: number;
      credits_used: number;
      package_type: string;
      valid_until: string | null;
      payment_id: string | null;
      metadata: Record<string, unknown> | null;
      created_at: string;
      updated_at: string;
    }>).map((credit) => {
      const profile = profilesMap.get(credit.user_id) || { email: 'Unknown', fullName: null, displayName: null };
      return {
        id: credit.id,
        userId: credit.user_id,
        userEmail: profile.email,
        userName: profile.displayName || profile.fullName || null,
        creditsTotal: credit.credits_total,
        creditsUsed: credit.credits_used,
        creditsAvailable: credit.credits_total === -1 ? -1 : credit.credits_total - credit.credits_used,
        packageType: credit.package_type,
        isUnlimited: credit.credits_total === -1,
        validUntil: credit.valid_until,
        paymentId: credit.payment_id,
        createdAt: credit.created_at,
        updatedAt: credit.updated_at,
      };
    });

    // Format recent activity
    const recentActivity = (recentActivityResult.data || []).map((log: {
      id: string;
      action: string;
      resource_id: string;
      admin_user_id: string | null;
      old_values: Record<string, unknown> | null;
      new_values: Record<string, unknown> | null;
      metadata: Record<string, unknown> | null;
      created_at: string;
    }) => ({
      id: log.id,
      action: log.action,
      userId: log.resource_id,
      adminUserId: log.admin_user_id,
      oldValues: log.old_values,
      newValues: log.new_values,
      metadata: log.metadata,
      createdAt: log.created_at,
    }));

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          ...stats,
          byPackageType,
        },
        guestStats,
        credits: formattedCredits,
        recentActivity,
        pagination: {
          page,
          limit,
          total: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / limit),
        },
      },
    });
  } catch (error) {
    console.error('Admin credits error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
