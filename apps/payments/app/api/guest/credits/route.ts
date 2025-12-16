/**
 * GET /api/guest/credits
 *
 * Get credit balance for guest user (by session ID).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use secret key to access guest credits
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

// CORS headers for cross-origin requests from main app
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-session-id',
  'Access-Control-Allow-Credentials': 'true',
};

// Handle preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    // Accept session ID from header or query parameter
    const sessionId = request.headers.get('x-session-id') ||
      request.nextUrl.searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Session ID is required (x-session-id header or sessionId query param)',
          },
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get guest credit balance
    const { data, error } = await supabase.rpc('get_guest_credit_balance', {
      p_session_id: sessionId,
    });

    if (error) {
      console.error('Failed to get guest credit balance:', error);
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

    const balance = data?.[0];

    if (!balance) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NO_CREDITS',
            message: 'No credits found for this session',
          },
        },
        { status: 404, headers: corsHeaders }
      );
    }

    // Get additional info
    const { data: guestCredit } = await supabase
      .from('guest_credits')
      .select('email, created_at')
      .eq('session_id', sessionId)
      .is('migrated_to_user_id', null)
      .single();

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        availableCredits: balance.available_credits,
        expiresAt: balance.expires_at,
        email: guestCredit?.email,
        createdAt: guestCredit?.created_at,
      },
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Guest credits error:', error);
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
