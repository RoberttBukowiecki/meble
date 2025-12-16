/**
 * POST /api/guest/credits/use
 *
 * Use a credit for export (for guest users).
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
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-session-id',
  'Access-Control-Allow-Credentials': 'true',
};

// Handle preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

interface UseCreditBody {
  projectHash: string;
}

export async function POST(request: NextRequest) {
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
        { status: 400, headers: corsHeaders }
      );
    }

    const body: UseCreditBody = await request.json();

    if (!body.projectHash) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'projectHash is required',
          },
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Use credit via database function
    const { data, error } = await supabase.rpc('use_guest_credit', {
      p_session_id: sessionId,
      p_project_hash: body.projectHash,
    });

    if (error) {
      console.error('Failed to use guest credit:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'Failed to use credit',
          },
        },
        { status: 500, headers: corsHeaders }
      );
    }

    const result = data?.[0];

    if (!result?.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INSUFFICIENT_CREDITS',
            message: result?.message || 'No credits available',
          },
        },
        { status: 402, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        creditUsed: !result.is_free_reexport,
        sessionId: result.export_session_id,
        creditsRemaining: result.credits_remaining,
        message: result.message,
        isFreeReexport: result.is_free_reexport,
      },
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Use guest credit error:', error);
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
