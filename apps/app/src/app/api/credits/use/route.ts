/**
 * POST /api/credits/use
 *
 * Use a credit for export (for authenticated users).
 * Uses the existing database structure where export_sessions links via credit_id.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

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

    const supabase = await createServerSupabaseClient();
    // Service role client for privileged UPDATE/INSERT operations only (bypasses RLS)
    const adminClient = createServiceRoleClient();

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

    // Get user's credit packages (normal client - RLS protects data)
    const { data: userCredits } = await supabase
      .from('export_credits')
      .select('id')
      .eq('user_id', user.id);

    const creditIds = userCredits?.map((c) => c.id) || [];

    // Check for existing export session (free re-export) - via credit_id
    if (creditIds.length > 0) {
      const { data: existingSession } = await supabase
        .from('export_sessions')
        .select('id')
        .in('credit_id', creditIds)
        .eq('project_hash', body.projectHash)
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .single();

      if (existingSession) {
        // Free re-export - just continue (count increment is optional)
        // Note: export_sessions.exports_count could be incremented via DB trigger or RPC if needed

        return NextResponse.json({
          success: true,
          data: {
            creditUsed: false,
            sessionId: existingSession.id,
            creditsRemaining: -1,
            message: 'Free re-export',
            isFreeReexport: true,
          },
        });
      }
    }

    // Get available credit package (with remaining credits) - normal client with RLS
    const { data: creditPackage } = await supabase
      .from('export_credits')
      .select('*')
      .eq('user_id', user.id)
      .or('valid_until.is.null,valid_until.gt.now()')
      .order('created_at', { ascending: true })
      .limit(1);

    // Find first package with available credits
    let selectedPackage = null;
    let hasUnlimited = false;

    for (const pkg of creditPackage || []) {
      if (pkg.credits_total === -1) {
        hasUnlimited = true;
        selectedPackage = pkg;
        break;
      }
      if (pkg.credits_total - pkg.credits_used > 0) {
        selectedPackage = pkg;
        break;
      }
    }

    if (!selectedPackage) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INSUFFICIENT_CREDITS',
            message: 'No credits available',
          },
        },
        { status: 402 }
      );
    }

    // Use credit (if not unlimited) - ADMIN CLIENT required for UPDATE
    // Users should never be able to directly modify credits_used via RLS
    if (!hasUnlimited) {
      const { error: updateError } = await adminClient
        .from('export_credits')
        .update({
          credits_used: selectedPackage.credits_used + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedPackage.id);

      if (updateError) {
        console.error('Failed to update credits:', updateError);
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
    }

    // Create export session (linked via credit_id) - ADMIN CLIENT required for INSERT
    // Users should not be able to create sessions directly via RLS
    const { data: newSession, error: sessionError } = await adminClient
      .from('export_sessions')
      .insert({
        credit_id: selectedPackage.id,
        project_hash: body.projectHash,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single();

    if (sessionError) {
      console.error('Failed to create export session:', sessionError);
      // Continue anyway - session is optional for re-export feature
    }

    // Get remaining credits - normal client with RLS
    const { data: packages } = await supabase
      .from('export_credits')
      .select('credits_total, credits_used')
      .eq('user_id', user.id)
      .or('valid_until.is.null,valid_until.gt.now()');

    let creditsRemaining = 0;
    for (const pkg of packages || []) {
      if (pkg.credits_total === -1) {
        creditsRemaining = 999;
        break;
      }
      creditsRemaining += pkg.credits_total - pkg.credits_used;
    }

    return NextResponse.json({
      success: true,
      data: {
        creditUsed: !hasUnlimited,
        sessionId: newSession?.id || null,
        creditsRemaining: Math.max(0, creditsRemaining),
        message: hasUnlimited ? 'Unlimited export' : 'Credit used',
        isFreeReexport: false,
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
