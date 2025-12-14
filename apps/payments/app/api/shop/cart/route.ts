/**
 * GET /api/shop/cart - Get cart items
 * POST /api/shop/cart - Add item to cart
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET - Get cart items
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const guestSessionId = searchParams.get('sessionId');

    const supabase = await createClient();

    // Check for authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let query = supabase
      .from('cart_items')
      .select(`
        *,
        product:shop_products(id, slug, name, name_pl, price, images, stock_quantity, track_inventory, is_active),
        variant:shop_product_variants(id, name, price, stock_quantity, attributes)
      `);

    if (user) {
      query = query.eq('user_id', user.id);
    } else if (guestSessionId) {
      query = query.eq('guest_session_id', guestSessionId);
    } else {
      return NextResponse.json({
        success: true,
        data: {
          items: [],
          itemCount: 0,
          subtotal: 0,
        },
      });
    }

    const { data: items, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch cart:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'Failed to fetch cart',
          },
        },
        { status: 500 }
      );
    }

    // Filter out items with inactive products and calculate totals
    const validItems = (items || []).filter(
      (item: any) => item.product?.is_active !== false
    );

    const itemCount = validItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
    const subtotal = validItems.reduce(
      (sum: number, item: any) => sum + item.unit_price * item.quantity,
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        items: validItems.map(formatCartItem),
        itemCount,
        subtotal,
      },
    });
  } catch (error) {
    console.error('Cart error:', error);
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

// POST - Add item to cart
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, variantId, quantity = 1, sessionId } = body;

    if (!productId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'productId is required',
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
    const guestSessionId = !user ? sessionId : null;

    if (!userId && !guestSessionId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Either login or provide sessionId for guest cart',
          },
        },
        { status: 400 }
      );
    }

    // Get product to verify it exists and get price
    const { data: product, error: productError } = await supabase
      .from('shop_products')
      .select('id, price, stock_quantity, track_inventory, is_active')
      .eq('id', productId)
      .single();

    if (productError || !product || !product.is_active) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Product not found or not available',
          },
        },
        { status: 404 }
      );
    }

    // Check stock if tracking inventory
    if (product.track_inventory && product.stock_quantity < quantity) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'OUT_OF_STOCK',
            message: 'Insufficient stock',
          },
        },
        { status: 400 }
      );
    }

    // Get variant price if specified
    let unitPrice = product.price;
    if (variantId) {
      const { data: variant } = await supabase
        .from('shop_product_variants')
        .select('price')
        .eq('id', variantId)
        .single();

      if (variant?.price) {
        unitPrice = variant.price;
      }
    }

    // Check if item already in cart
    let existingQuery = supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('product_id', productId);

    if (variantId) {
      existingQuery = existingQuery.eq('variant_id', variantId);
    } else {
      existingQuery = existingQuery.is('variant_id', null);
    }

    if (userId) {
      existingQuery = existingQuery.eq('user_id', userId);
    } else {
      existingQuery = existingQuery.eq('guest_session_id', guestSessionId);
    }

    const { data: existing } = await existingQuery.single();

    let cartItem;

    if (existing) {
      // Update quantity
      const { data, error } = await supabase
        .from('cart_items')
        .update({
          quantity: existing.quantity + quantity,
          unit_price: unitPrice, // Update price in case it changed
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      cartItem = data;
    } else {
      // Insert new item
      const insertData: any = {
        product_id: productId,
        variant_id: variantId || null,
        quantity,
        unit_price: unitPrice,
      };

      if (userId) {
        insertData.user_id = userId;
      } else {
        insertData.guest_session_id = guestSessionId;
      }

      const { data, error } = await supabase
        .from('cart_items')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      cartItem = data;
    }

    return NextResponse.json({
      success: true,
      data: {
        id: cartItem.id,
        productId: cartItem.product_id,
        variantId: cartItem.variant_id,
        quantity: cartItem.quantity,
        unitPrice: cartItem.unit_price,
      },
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to add item to cart',
        },
      },
      { status: 500 }
    );
  }
}

function formatCartItem(item: any) {
  const product = item.product;
  const variant = item.variant;

  return {
    id: item.id,
    productId: item.product_id,
    variantId: item.variant_id,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    totalPrice: item.unit_price * item.quantity,
    product: product
      ? {
          id: product.id,
          slug: product.slug,
          name: product.name,
          namePl: product.name_pl,
          price: product.price,
          image: product.images?.[0],
          inStock: product.stock_quantity > 0 || !product.track_inventory,
        }
      : null,
    variant: variant
      ? {
          id: variant.id,
          name: variant.name,
          price: variant.price,
          attributes: variant.attributes,
        }
      : null,
  };
}
