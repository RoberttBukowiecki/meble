/**
 * GET /api/orders/[id]
 *
 * Get order details.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Order ID is required',
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

    // Get order with producer details
    const { data: order, error } = await supabase
      .from('producer_orders')
      .select(`
        *,
        producer:producers(id, name, slug, logo_url, email, phone),
        quote:producer_quotes(id, quote_number, estimated_days)
      `)
      .eq('id', id)
      .single();

    if (error || !order) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Order not found',
          },
        },
        { status: 404 }
      );
    }

    // Verify ownership
    if (user) {
      if (order.user_id !== user.id) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Not authorized to view this order',
            },
          },
          { status: 403 }
        );
      }
    } else if (sessionId) {
      if (order.guest_session_id !== sessionId) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Not authorized to view this order',
            },
          },
          { status: 403 }
        );
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication or sessionId required',
          },
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: formatOrderDetails(order),
    });
  } catch (error) {
    console.error('Order detail error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to fetch order',
        },
      },
      { status: 500 }
    );
  }
}

function formatOrderDetails(order: any) {
  return {
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    statusHistory: order.status_history || [],
    producer: order.producer
      ? {
          id: order.producer.id,
          name: order.producer.name,
          slug: order.producer.slug,
          logoUrl: order.producer.logo_url,
          email: order.producer.email,
          phone: order.producer.phone,
        }
      : null,
    quote: order.quote
      ? {
          id: order.quote.id,
          quoteNumber: order.quote.quote_number,
          estimatedDays: order.quote.estimated_days,
        }
      : null,
    projectData: order.project_data,
    services: order.services || [],
    subtotal: order.subtotal,
    deliveryCost: order.delivery_cost,
    discountAmount: order.discount_amount,
    total: order.total,
    deliveryAddress: order.delivery_address,
    deliveryMethod: order.delivery_method,
    trackingNumber: order.tracking_number,
    estimatedDelivery: order.estimated_delivery,
    customerNotes: order.customer_notes,
    producerNotes: order.producer_notes,
    producerOrderId: order.producer_order_id,
    paidAt: order.paid_at,
    confirmedAt: order.confirmed_at,
    shippedAt: order.shipped_at,
    deliveredAt: order.delivered_at,
    cancelledAt: order.cancelled_at,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  };
}
