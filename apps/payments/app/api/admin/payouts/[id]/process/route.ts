/**
 * POST /api/admin/payouts/[id]/process - Process a payout
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verify admin access (finance or higher)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { data: adminRole } = await supabase.rpc('get_admin_role' as never, { p_user_id: user.id } as never);
    if (!adminRole || !['super_admin', 'admin', 'finance'].includes(adminRole)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Finance access required' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, transferReference, transferDate, notes } = body;

    if (!action || !['approve', 'reject', 'complete'].includes(action)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid action' } },
        { status: 400 }
      );
    }

    // Get payout
    const { data: payout, error: fetchError } = await supabase
      .from('payout_requests' as never)
      .select('*')
      .eq('id', id)
      .single() as { data: { id: string; status: string } | null; error: Error | null };

    if (fetchError || !payout) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Payout not found' } },
        { status: 404 }
      );
    }

    // Get admin user ID
    const { data: adminUser } = await supabase
      .from('admin_users' as never)
      .select('id')
      .eq('user_id', user.id)
      .single();

    let updates: Record<string, any> = {
      processed_by: (adminUser as { id: string } | null)?.id,
      processed_at: new Date().toISOString(),
    };

    if (notes) {
      updates.notes = notes;
    }

    switch (action) {
      case 'approve':
        if (payout.status !== 'pending') {
          return NextResponse.json(
            { success: false, error: { code: 'INVALID_STATUS', message: 'Payout must be pending to approve' } },
            { status: 400 }
          );
        }
        updates.status = 'processing';
        break;

      case 'complete':
        if (payout.status !== 'processing') {
          return NextResponse.json(
            { success: false, error: { code: 'INVALID_STATUS', message: 'Payout must be processing to complete' } },
            { status: 400 }
          );
        }
        if (!transferReference) {
          return NextResponse.json(
            { success: false, error: { code: 'VALIDATION_ERROR', message: 'Transfer reference required' } },
            { status: 400 }
          );
        }
        updates.status = 'completed';
        updates.transfer_reference = transferReference;
        updates.transfer_date = transferDate || new Date().toISOString().split('T')[0];
        break;

      case 'reject':
        if (!['pending', 'processing'].includes(payout.status)) {
          return NextResponse.json(
            { success: false, error: { code: 'INVALID_STATUS', message: 'Cannot reject this payout' } },
            { status: 400 }
          );
        }
        updates.status = 'cancelled';
        break;
    }

    const { data: updated, error: updateError } = await supabase
      .from('payout_requests' as never)
      .update(updates as never)
      .eq('id', id)
      .select()
      .single() as { data: Record<string, unknown> | null; error: Error | null };

    if (updateError || !updated) {
      throw updateError || new Error('Failed to update payout');
    }

    // Log audit event
    await supabase.rpc('log_audit_event' as never, {
      p_action: 'update',
      p_resource_type: 'payout',
      p_resource_id: id,
      p_old_values: { status: payout.status },
      p_new_values: updates,
      p_metadata: { action },
    } as never);

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        status: updated.status,
        processedAt: updated.processed_at,
        transferReference: updated.transfer_reference,
        transferDate: updated.transfer_date,
      },
    });
  } catch (error) {
    console.error('Process payout error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to process payout' } },
      { status: 500 }
    );
  }
}
