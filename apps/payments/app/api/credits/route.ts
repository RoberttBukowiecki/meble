/**
 * GET /api/credits
 *
 * Get credit balance for authenticated user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      );
    }

    // Get credit balance using database function
    const { data, error } = await supabase.rpc('get_user_credit_balance', {
      p_user_id: user.id,
    });

    if (error) {
      console.error('Failed to get credit balance:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'Failed to get credit balance',
          },
        },
        { status: 500 }
      );
    }

    const balance = data?.[0] || {
      total_credits: 0,
      used_credits: 0,
      available_credits: 0,
      has_unlimited: false,
      unlimited_expires_at: null,
    };

    // Get individual packages
    const { data: packages } = await supabase
      .from('export_credits')
      .select('*')
      .eq('user_id', user.id)
      .or('valid_until.is.null,valid_until.gt.now()')
      .order('created_at', { ascending: false });

    return NextResponse.json({
      success: true,
      data: {
        totalCredits: balance.total_credits,
        usedCredits: balance.used_credits,
        availableCredits: balance.available_credits,
        hasUnlimited: balance.has_unlimited,
        unlimitedExpiresAt: balance.unlimited_expires_at,
        packages:
          packages?.map((p) => ({
            id: p.id,
            type: p.package_type,
            total: p.credits_total,
            used: p.credits_used,
            remaining: p.credits_total === -1 ? -1 : p.credits_total - p.credits_used,
            validUntil: p.valid_until,
            purchasedAt: p.created_at,
          })) || [],
      },
    });
  } catch (error) {
    console.error('Credits error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error',
        },
      },
      { status: 500 }
    );
  }
}
