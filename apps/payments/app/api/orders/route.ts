/**
 * GET /api/orders - List user's orders
 * POST /api/orders - Create order from quote
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import type { Database } from '@/types_db';

// GET - List orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

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

    let query = supabase
      .from('producer_orders')
      .select(`
        *,
        producer:producers(id, name, slug, logo_url)
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status as Database['public']['Enums']['producer_order_status']);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: orders, error, count } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: {
        orders: orders?.map(formatOrder) || [],
        pagination: {
          offset,
          limit,
          total: count,
        },
      },
    });
  } catch (error) {
    console.error('Orders list error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to fetch orders',
        },
      },
      { status: 500 }
    );
  }
}

// POST - Create order from quote
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { quoteId, deliveryAddress, deliveryMethod, customerNotes, sessionId, email } = body;

    if (!quoteId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'quoteId is required',
          },
        },
        { status: 400 }
      );
    }

    if (!deliveryAddress) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'deliveryAddress is required',
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

    const userId = user?.id;
    const guestSessionId = !user ? sessionId : null;
    const guestEmail = !user ? email : null;

    if (!userId && (!guestSessionId || !guestEmail)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Guest orders require sessionId and email',
          },
        },
        { status: 400 }
      );
    }

    // Get quote
    const { data: quote, error: quoteError } = await supabase
      .from('producer_quotes')
      .select(`
        *,
        producer:producers(*)
      `)
      .eq('id', quoteId)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Quote not found',
          },
        },
        { status: 404 }
      );
    }

    // Verify ownership
    if (userId && quote.user_id !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Not authorized to use this quote',
          },
        },
        { status: 403 }
      );
    }

    if (guestSessionId && quote.guest_session_id !== guestSessionId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Not authorized to use this quote',
          },
        },
        { status: 403 }
      );
    }

    // Check if quote is expired
    if (new Date(quote.valid_until) < new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'QUOTE_EXPIRED',
            message: 'Quote has expired. Please request a new quote.',
          },
        },
        { status: 400 }
      );
    }

    // Check if quote already used
    if (quote.status !== 'pending') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'QUOTE_USED',
            message: 'Quote has already been used or rejected',
          },
        },
        { status: 400 }
      );
    }

    // Calculate commission
    const producer = quote.producer;
    const { data: commission } = await supabase.rpc('calculate_commission', {
      p_order_value: quote.total ?? 0,
      p_producer_rate: producer.commission_rate ?? undefined,
    });

    const commissionRate = commission?.[0]?.rate || 0.05;
    const commissionAmount = commission?.[0]?.amount || Math.round(quote.total * 0.05);

    // Generate order number
    const { data: orderNumber } = await supabase.rpc('generate_producer_order_number');

    // Create order
    const orderData: any = {
      producer_id: quote.producer_id,
      quote_id: quote.id,
      order_number: orderNumber || `ORD-${Date.now()}`,
      status: 'pending_payment',
      project_data: quote.project_data,
      project_hash: quote.project_hash,
      services: quote.services,
      subtotal: quote.subtotal,
      delivery_cost: quote.delivery_cost,
      total: quote.total,
      commission_rate: commissionRate,
      commission_amount: commissionAmount,
      delivery_address: deliveryAddress,
      delivery_method: deliveryMethod || 'standard',
      customer_notes: customerNotes,
    };

    if (userId) {
      orderData.user_id = userId;
    } else {
      orderData.guest_session_id = guestSessionId;
      orderData.guest_email = guestEmail;
    }

    const { data: order, error: orderError } = await supabase
      .from('producer_orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) {
      throw orderError;
    }

    // Update quote status
    await supabase
      .from('producer_quotes')
      .update({ status: 'accepted' })
      .eq('id', quoteId);

    // Create payment record
    const externalOrderId = `order_${order.id}_${Date.now()}`;
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        payment_type: 'order',
        user_id: userId,
        guest_session_id: guestSessionId,
        provider: 'przelewy24', // Default provider
        external_order_id: externalOrderId,
        amount: quote.total,
        status: 'pending',
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
          producer_id: quote.producer_id,
          producer_name: producer.name,
        },
      })
      .select()
      .single();

    if (paymentError) {
      throw paymentError;
    }

    // Update order with payment ID
    await supabase
      .from('producer_orders')
      .update({ payment_id: payment.id })
      .eq('id', order.id);

    // Create commission record
    await supabase
      .from('commissions')
      .insert({
        order_id: order.id,
        producer_id: quote.producer_id,
        order_value: quote.total,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        status: 'pending',
      });

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.order_number,
        paymentId: payment.id,
        total: quote.total,
        commission: {
          rate: commissionRate,
          amount: commissionAmount,
        },
        // TODO: Generate actual payment redirect URL
        redirectUrl: `/payment/processing?orderId=${order.id}&paymentId=${payment.id}`,
      },
    });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to create order',
        },
      },
      { status: 500 }
    );
  }
}

function formatOrder(order: any) {
  return {
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    producer: order.producer
      ? {
          id: order.producer.id,
          name: order.producer.name,
          slug: order.producer.slug,
          logoUrl: order.producer.logo_url,
        }
      : null,
    services: order.services || [],
    subtotal: order.subtotal,
    deliveryCost: order.delivery_cost,
    total: order.total,
    deliveryAddress: order.delivery_address,
    deliveryMethod: order.delivery_method,
    trackingNumber: order.tracking_number,
    estimatedDelivery: order.estimated_delivery,
    customerNotes: order.customer_notes,
    producerNotes: order.producer_notes,
    paidAt: order.paid_at,
    confirmedAt: order.confirmed_at,
    shippedAt: order.shipped_at,
    deliveredAt: order.delivered_at,
    createdAt: order.created_at,
  };
}
