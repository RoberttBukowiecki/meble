/**
 * POST /api/guest/credits/use
 *
 * Use a credit for export (for guest users).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role to access guest credits
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
        { status: 400 }
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
        { status: 400 }
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
        { status: 500 }
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
        { status: 402 }
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
    });
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
      { status: 500 }
    );
  }
}
