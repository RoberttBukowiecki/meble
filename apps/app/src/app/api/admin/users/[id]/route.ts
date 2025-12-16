/**
 * GET /api/admin/users/[id]
 *
 * Get user details.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// Force dynamic - this route uses cookies for auth
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
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

    // Fetch user profile
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }

    // Fetch additional data in parallel
    const [creditsResult, paymentsResult, exportsResult] = await Promise.all([
      // All credit packages for this user
      adminSupabase
        .from('export_credits')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),

      // Payments
      adminSupabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),

      // Export history
      adminSupabase
        .from('export_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    const creditItems = creditsResult.data || [];
    const payments = paymentsResult.data || [];
    const exports = exportsResult.data || [];

    // Calculate credits summary
    const creditsSummary = creditItems.reduce(
      (acc: { total: number; used: number }, c: { credits_total: number; credits_used: number }) => ({
        total: acc.total + (c.credits_total || 0),
        used: acc.used + (c.credits_used || 0),
      }),
      { total: 0, used: 0 }
    );

    // Calculate payments summary
    const completedPayments = payments.filter((p: { status: string }) => p.status === 'completed');
    const paymentsSummary = {
      totalPaid: completedPayments.reduce((sum: number, p: { amount: number }) => sum + (p.amount || 0), 0),
      completedCount: completedPayments.length,
    };

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: profile.id,
          email: profile.email,
          fullName: profile.full_name,
          displayName: profile.display_name,
          avatarUrl: profile.avatar_url,
          isActive: profile.is_active !== false,
          isAdmin: profile.is_admin || false,
          isBetaTester: profile.is_beta_tester || false,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at,
          lastLoginAt: profile.last_login_at,
          loginCount: profile.login_count || 0,
          bannedAt: profile.banned_at || null,
          banReason: profile.ban_reason || null,
        },
        credits: {
          summary: {
            total: creditsSummary.total,
            used: creditsSummary.used,
            available: creditsSummary.total - creditsSummary.used,
          },
          items: creditItems.map((c: Record<string, unknown>) => ({
            id: c.id,
            packageType: c.package_type || 'unknown',
            creditsTotal: c.credits_total || 0,
            creditsUsed: c.credits_used || 0,
            creditsAvailable: (c.credits_total as number || 0) - (c.credits_used as number || 0),
            validUntil: c.valid_until || null,
            createdAt: c.created_at,
          })),
        },
        payments: {
          summary: paymentsSummary,
          items: payments.map((p: Record<string, unknown>) => ({
            id: p.id,
            type: p.type || 'credits',
            amount: p.amount || 0,
            currency: p.currency || 'PLN',
            status: p.status || 'unknown',
            provider: p.provider || 'unknown',
            createdAt: p.created_at,
          })),
        },
        exports: {
          count: exports.length,
          items: exports.map((e: Record<string, unknown>) => ({
            id: e.id,
            projectHash: e.project_hash || 'unknown',
            partsCount: e.parts_count || 0,
            format: e.format || 'unknown',
            isFreeReexport: e.is_free_reexport || false,
            createdAt: e.created_at,
          })),
        },
      },
    });
  } catch (error) {
    console.error('Admin user detail error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
