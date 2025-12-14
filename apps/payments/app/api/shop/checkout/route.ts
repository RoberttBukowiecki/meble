/**
 * POST /api/shop/checkout
 *
 * Create order from cart and initiate payment.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface CheckoutBody {
  shippingAddress: {
    name: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
  shippingMethod: string;
  customerNotes?: string;
  email?: string;
  sessionId?: string;
  provider: 'payu' | 'przelewy24';
}

// Shipping costs (in grosz)
const SHIPPING_COSTS: Record<string, number> = {
  standard: 1500, // 15 zł
  express: 2900, // 29 zł
  pickup: 0, // Free pickup
};

export async function POST(request: NextRequest) {
  try {
    const body: CheckoutBody = await request.json();

    // Validation
    if (!body.shippingAddress) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Shipping address is required',
          },
        },
        { status: 400 }
      );
    }

    if (!body.shippingMethod || !SHIPPING_COSTS.hasOwnProperty(body.shippingMethod)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Valid shipping method is required',
          },
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check for authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const userId = user?.id;
    const guestSessionId = !user ? body.sessionId : null;
    const guestEmail = !user ? body.email : null;

    if (!userId && (!guestSessionId || !guestEmail)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Guest checkout requires sessionId and email',
          },
        },
        { status: 400 }
      );
    }

    // Get cart items
    let cartQuery = supabase
      .from('cart_items')
      .select(`
        *,
        product:shop_products(id, slug, name, name_pl, price, sku, stock_quantity, track_inventory, is_active),
        variant:shop_product_variants(id, name, price, sku, stock_quantity)
      `);

    if (userId) {
      cartQuery = cartQuery.eq('user_id', userId);
    } else {
      cartQuery = cartQuery.eq('guest_session_id', guestSessionId);
    }

    const { data: cartItems, error: cartError } = await cartQuery;

    if (cartError) {
      throw cartError;
    }

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'EMPTY_CART',
            message: 'Cart is empty',
          },
        },
        { status: 400 }
      );
    }

    // Validate stock and calculate totals
    const validItems = [];
    let subtotal = 0;

    for (const item of cartItems) {
      const product = item.product;

      if (!product || !product.is_active) {
        continue; // Skip inactive products
      }

      // Check stock
      if (product.track_inventory && product.stock_quantity < item.quantity) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'OUT_OF_STOCK',
              message: `${product.name_pl} - niewystarczająca ilość w magazynie`,
            },
          },
          { status: 400 }
        );
      }

      const itemTotal = item.unit_price * item.quantity;
      subtotal += itemTotal;

      validItems.push({
        cartItem: item,
        product,
        variant: item.variant,
        itemTotal,
      });
    }

    if (validItems.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'EMPTY_CART',
            message: 'No valid items in cart',
          },
        },
        { status: 400 }
      );
    }

    const shippingCost = SHIPPING_COSTS[body.shippingMethod];
    const total = subtotal + shippingCost;

    // Generate order number
    const { data: orderNumberData } = await supabase.rpc('generate_order_number');
    const orderNumber = orderNumberData || `SHOP-${Date.now()}`;

    // Create order
    const orderData: any = {
      order_number: orderNumber,
      status: 'pending',
      subtotal,
      shipping_cost: shippingCost,
      total,
      shipping_address: body.shippingAddress,
      shipping_method: body.shippingMethod,
      customer_notes: body.customerNotes,
    };

    if (userId) {
      orderData.user_id = userId;
    } else {
      orderData.guest_session_id = guestSessionId;
      orderData.guest_email = guestEmail;
    }

    const { data: order, error: orderError } = await supabase
      .from('shop_orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) {
      throw orderError;
    }

    // Create order items
    const orderItems = validItems.map((item) => ({
      order_id: order.id,
      product_id: item.product.id,
      variant_id: item.variant?.id || null,
      product_name: item.product.name_pl,
      product_sku: item.variant?.sku || item.product.sku,
      variant_name: item.variant?.name || null,
      unit_price: item.cartItem.unit_price,
      quantity: item.cartItem.quantity,
      total_price: item.itemTotal,
    }));

    const { error: itemsError } = await supabase
      .from('shop_order_items')
      .insert(orderItems);

    if (itemsError) {
      // Rollback order
      await supabase.from('shop_orders').delete().eq('id', order.id);
      throw itemsError;
    }

    // Create payment
    const customerEmail = user?.email || guestEmail;
    const externalOrderId = `shop_${order.id}_${Date.now()}`;

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        payment_type: 'shop',
        user_id: userId,
        guest_session_id: guestSessionId,
        provider: body.provider,
        external_order_id: externalOrderId,
        amount: total,
        status: 'pending',
        metadata: {
          order_id: order.id,
          order_number: orderNumber,
          items_count: validItems.length,
        },
      })
      .select()
      .single();

    if (paymentError) {
      throw paymentError;
    }

    // Update order with payment ID
    await supabase
      .from('shop_orders')
      .update({ payment_id: payment.id })
      .eq('id', order.id);

    // Clear cart
    if (userId) {
      await supabase.from('cart_items').delete().eq('user_id', userId);
    } else {
      await supabase.from('cart_items').delete().eq('guest_session_id', guestSessionId);
    }

    // TODO: Create actual payment with PayU/P24 and get redirect URL
    // For now, return placeholder
    const redirectUrl = `/payment/processing?orderId=${order.id}&paymentId=${payment.id}`;

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.order_number,
        paymentId: payment.id,
        total,
        redirectUrl,
      },
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to process checkout',
        },
      },
      { status: 500 }
    );
  }
}
