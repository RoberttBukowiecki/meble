/**
 * GET /api/credits
 *
 * Get credit balance for authenticated user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// CORS headers for cross-origin requests from main app
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
};

// Handle preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

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
        { status: 401, headers: corsHeaders }
      );
    }

    // Get credit balance using secure database function
    // Uses auth.uid() internally - no user ID parameter needed
    const { data, error } = await supabase.rpc('get_my_credit_balance');

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
        { status: 500, headers: corsHeaders }
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
    }, { headers: corsHeaders });
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
      { status: 500, headers: corsHeaders }
    );
  }
}
