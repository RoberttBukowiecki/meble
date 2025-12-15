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

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.headers.get('x-session-id');

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Session ID is required (x-session-id header)',
          },
        },
        { status: 400 }
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
        { status: 500 }
      );
    }

    const balance = data?.[0];

    if (!balance) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'No credits found for this session',
          },
        },
        { status: 404 }
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
    });
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
      { status: 500 }
    );
  }
}
