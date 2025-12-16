/**
 * POST /api/admin/users/[id]/credits
 *
 * Add or set credits for a user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// Force dynamic - this route uses cookies for auth
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const body = await request.json();
    const { action, amount, reason } = body;

    if (!action || !['add', 'set'].includes(action)) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid action. Use "add" or "set"' } },
        { status: 400 }
      );
    }

    if (typeof amount !== 'number' || amount < 0) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid amount' } },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc('is_admin', { p_user_id: user.id });

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    // Use service role client for admin operations
    const adminSupabase = createServiceRoleClient();

    // Get current credits
    const { data: currentCredits } = await adminSupabase
      .from('export_credits')
      .select('credits_total, credits_used')
      .eq('user_id', userId)
      .single();

    let newTotal: number;
    const oldTotal = currentCredits?.credits_total || 0;

    if (action === 'add') {
      newTotal = oldTotal + amount;
    } else {
      newTotal = amount;
    }

    // Upsert credits
    const { error: upsertError } = await adminSupabase
      .from('export_credits')
      .upsert(
        {
          user_id: userId,
          credits_total: newTotal,
          credits_used: currentCredits?.credits_used || 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (upsertError) {
      console.error('Credits upsert error:', upsertError);
      return NextResponse.json(
        { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update credits' } },
        { status: 500 }
      );
    }

    // Log the action to audit_logs
    await adminSupabase.from('audit_logs').insert({
      action: 'credits_modified',
      resource_type: 'export_credits',
      resource_id: userId,
      admin_user_id: user.id,
      old_values: { credits_total: oldTotal },
      new_values: { credits_total: newTotal },
      metadata: {
        operation: action,
        amount,
        reason: reason || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        credits: {
          total: newTotal,
          used: currentCredits?.credits_used || 0,
          available: newTotal - (currentCredits?.credits_used || 0),
        },
      },
    });
  } catch (error) {
    console.error('Admin credits error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
