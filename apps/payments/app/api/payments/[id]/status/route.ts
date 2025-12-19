/**
 * GET /api/payments/[id]/status
 *
 * Get payment status by payment ID or external order ID.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/server';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paymentId } = await params;

    if (!paymentId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Payment ID is required',
          },
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Use service client to bypass RLS
    const supabase = createServiceClient();

    console.log('Looking for payment with ID:', paymentId);

    // Check if paymentId looks like a UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paymentId);

    // Query by UUID id or external_order_id based on format
    let query = supabase.from('payments').select('*');

    if (isUUID) {
      query = query.or(`id.eq.${paymentId},external_order_id.eq.${paymentId}`);
    } else {
      // Not a UUID, only search by external_order_id
      query = query.eq('external_order_id', paymentId);
    }

    const { data: payment, error } = await query.single();

    console.log('Query result:', { payment: payment?.id, error });

    if (error || !payment) {
      console.log('Payment not found, error:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Payment not found',
          },
        },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment.id,
        externalOrderId: payment.external_order_id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        provider: payment.provider,
        completedAt: payment.completed_at,
        metadata: payment.metadata,
      },
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Payment status error:', error);
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
