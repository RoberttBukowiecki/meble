/**
 * POST /api/credits/use
 *
 * Use a credit for export (for authenticated users).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface UseCreditBody {
  projectHash: string;
}

export async function POST(request: NextRequest) {
  try {
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

    // Use credit via secure database function
    // Uses auth.uid() internally - no user ID parameter needed
    const { data, error } = await supabase.rpc('use_my_export_credit', {
      p_project_hash: body.projectHash,
    });

    if (error) {
      console.error('Failed to use credit:', error);
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
        sessionId: result.session_id,
        creditsRemaining: result.credits_remaining,
        message: result.message,
        isFreeReexport: result.is_free_reexport,
      },
    });
  } catch (error) {
    console.error('Use credit error:', error);
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
