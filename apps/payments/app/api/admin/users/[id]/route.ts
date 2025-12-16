/**
 * GET /api/admin/users/:id - Get user details with credits, exports, payments
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
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

    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        },
        { status: 404 }
      );
    }

    // Fetch all data in parallel
    const [creditsResult, paymentsResult, exportsResult] = await Promise.all([
      // Credits
      supabase
        .from('export_credits')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),

      // Payments
      supabase
        .from('payments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),

      // Export history
      supabase
        .from('export_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    // Calculate credit totals
    const credits = creditsResult.data || [];
    const creditsSummary = credits.reduce(
      (acc, c) => ({
        total: acc.total + c.credits_total,
        used: acc.used + c.credits_used,
        available: acc.available + (c.credits_total - c.credits_used),
      }),
      { total: 0, used: 0, available: 0 }
    );

    // Format credits
    const formattedCredits = credits.map((c) => ({
      id: c.id,
      packageType: c.package_type,
      creditsTotal: c.credits_total,
      creditsUsed: c.credits_used,
      creditsAvailable: c.credits_total - c.credits_used,
      validUntil: c.valid_until,
      paymentId: c.payment_id,
      metadata: c.metadata,
      createdAt: c.created_at,
    }));

    // Format payments
    const payments = (paymentsResult.data || []).map((p) => ({
      id: p.id,
      type: p.payment_type,
      provider: p.provider,
      externalOrderId: p.external_order_id,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      createdAt: p.created_at,
      completedAt: p.completed_at,
    }));

    // Format exports
    const exports = (exportsResult.data || []).map((e) => ({
      id: e.id,
      projectHash: e.project_hash,
      partsCount: e.parts_count,
      format: e.format,
      isFreeReexport: e.is_free_reexport,
      createdAt: e.created_at,
    }));

    // Calculate payment summary
    const paymentsSummary = payments.reduce(
      (acc, p) => {
        if (p.status === 'completed') {
          acc.totalPaid += p.amount;
          acc.completedCount += 1;
        }
        return acc;
      },
      { totalPaid: 0, completedCount: 0 }
    );

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: profile.id,
          email: profile.email,
          fullName: profile.full_name,
          displayName: profile.display_name,
          avatarUrl: profile.avatar_url,
          phone: profile.phone,
          billingAddress: profile.billing_address,
          preferredLocale: profile.preferred_locale,
          isActive: profile.is_active,
          isBetaTester: profile.is_beta_tester,
          bannedAt: profile.banned_at,
          banReason: profile.ban_reason,
          firstLoginAt: profile.first_login_at,
          lastLoginAt: profile.last_login_at,
          loginCount: profile.login_count,
          registrationSource: profile.registration_source,
          tenantId: profile.tenant_id,
          metadata: profile.metadata,
          createdAt: profile.created_at,
          updatedAt: profile.updated_at,
        },
        credits: {
          summary: creditsSummary,
          items: formattedCredits,
        },
        payments: {
          summary: paymentsSummary,
          items: payments,
        },
        exports: {
          count: exports.length,
          items: exports,
        },
      },
    });
  } catch (error) {
    console.error('Admin user detail error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to fetch user details' },
      },
      { status: 500 }
    );
  }
}
