/**
 * GET /api/payments/[id]/status
 *
 * Get payment status by payment ID.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paymentId = params.id;

    if (!paymentId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Payment ID is required',
          },
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get payment by ID or external_order_id
    const { data: payment, error } = await supabase
      .from('payments')
      .select('*')
      .or(`id.eq.${paymentId},external_order_id.eq.${paymentId}`)
      .single();

    if (error || !payment) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Payment not found',
          },
        },
        { status: 404 }
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
    });
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
      { status: 500 }
    );
  }
}
