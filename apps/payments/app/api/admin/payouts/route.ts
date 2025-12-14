/**
 * GET /api/admin/payouts - List payout requests
 * POST /api/admin/payouts/[id]/process - Process payout
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify admin access (finance or higher)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { data: adminRole } = await supabase.rpc('get_admin_role', { p_user_id: user.id });
    if (!adminRole || !['super_admin', 'admin', 'finance'].includes(adminRole)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Finance access required' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const producerId = searchParams.get('producerId');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = supabase
      .from('payout_requests')
      .select(`
        *,
        producer:producers(id, name, slug)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (producerId) {
      query = query.eq('producer_id', producerId);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: payouts, error, count } = await query;

    if (error) {
      throw error;
    }

    // Get summary stats
    const { data: pendingStats } = await supabase
      .from('payout_requests')
      .select('amount')
      .eq('status', 'pending');

    const pendingTotal = pendingStats?.reduce((sum, p) => sum + p.amount, 0) || 0;

    return NextResponse.json({
      success: true,
      data: {
        payouts: payouts?.map(formatPayout) || [],
        summary: {
          pendingCount: pendingStats?.length || 0,
          pendingTotal,
        },
        pagination: {
          offset,
          limit,
          total: count,
        },
      },
    });
  } catch (error) {
    console.error('Admin payouts list error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch payouts' } },
      { status: 500 }
    );
  }
}

function formatPayout(payout: any) {
  return {
    id: payout.id,
    producerId: payout.producer_id,
    producerName: payout.producer?.name,
    producerSlug: payout.producer?.slug,
    amount: payout.amount,
    status: payout.status,
    transferReference: payout.transfer_reference,
    transferDate: payout.transfer_date,
    processedAt: payout.processed_at,
    notes: payout.notes,
    createdAt: payout.created_at,
  };
}
