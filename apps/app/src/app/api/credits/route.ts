/**
 * GET /api/credits
 *
 * Get credit balance for authenticated user.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

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

    // Get credit packages for user (RLS should allow SELECT for own records)
    const { data: packages, error: packagesError } = await supabase
      .from('export_credits')
      .select('*')
      .eq('user_id', user.id)
      .or('valid_until.is.null,valid_until.gt.now()')
      .order('created_at', { ascending: false });

    if (packagesError) {
      console.error('Failed to get credit packages:', packagesError);
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

    // Calculate totals
    let totalCredits = 0;
    let usedCredits = 0;
    let hasUnlimited = false;
    let unlimitedExpiresAt: string | null = null;

    for (const pkg of packages || []) {
      if (pkg.credits_total === -1) {
        // Unlimited package
        hasUnlimited = true;
        if (pkg.valid_until) {
          unlimitedExpiresAt = pkg.valid_until;
        }
      } else {
        totalCredits += pkg.credits_total;
        usedCredits += pkg.credits_used;
      }
    }

    const availableCredits = hasUnlimited ? -1 : totalCredits - usedCredits;

    return NextResponse.json({
      success: true,
      data: {
        totalCredits,
        usedCredits,
        availableCredits: hasUnlimited ? 999 : Math.max(0, availableCredits),
        hasUnlimited,
        unlimitedExpiresAt,
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
