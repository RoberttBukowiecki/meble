/**
 * PATCH /api/shop/cart/[id] - Update cart item quantity
 * DELETE /api/shop/cart/[id] - Remove item from cart
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// PATCH - Update cart item quantity
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { quantity, sessionId } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Cart item ID is required',
          },
        },
        { status: 400 }
      );
    }

    if (typeof quantity !== 'number' || quantity < 1) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Quantity must be a positive number',
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

    // Verify ownership
    const { data: cartItem, error: fetchError } = await supabase
      .from('cart_items')
      .select('*, product:shop_products(stock_quantity, track_inventory)')
      .eq('id', id)
      .single();

    if (fetchError || !cartItem) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Cart item not found',
          },
        },
        { status: 404 }
      );
    }

    // Check ownership
    if (user) {
      if (cartItem.user_id !== user.id) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Not authorized to modify this cart item',
            },
          },
          { status: 403 }
        );
      }
    } else if (sessionId) {
      if (cartItem.guest_session_id !== sessionId) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Not authorized to modify this cart item',
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

    // Check stock
    const product = cartItem.product;
    const stockQty = product?.stock_quantity ?? 0;
    if (product?.track_inventory && stockQty < quantity) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'OUT_OF_STOCK',
            message: `Only ${stockQty} available`,
          },
        },
        { status: 400 }
      );
    }

    // Update quantity
    const { data: updated, error: updateError } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        quantity: updated.quantity,
        unitPrice: updated.unit_price,
        totalPrice: updated.unit_price * updated.quantity,
      },
    });
  } catch (error) {
    console.error('Update cart item error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to update cart item',
        },
      },
      { status: 500 }
    );
  }
}

// DELETE - Remove item from cart
export async function DELETE(
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
            message: 'Cart item ID is required',
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

    // Verify ownership first
    const { data: cartItem, error: fetchError } = await supabase
      .from('cart_items')
      .select('user_id, guest_session_id')
      .eq('id', id)
      .single();

    if (fetchError || !cartItem) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Cart item not found',
          },
        },
        { status: 404 }
      );
    }

    // Check ownership
    if (user) {
      if (cartItem.user_id !== user.id) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Not authorized to delete this cart item',
            },
          },
          { status: 403 }
        );
      }
    } else if (sessionId) {
      if (cartItem.guest_session_id !== sessionId) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Not authorized to delete this cart item',
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

    // Delete item
    const { error: deleteError } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      data: {
        deleted: true,
      },
    });
  } catch (error) {
    console.error('Delete cart item error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to delete cart item',
        },
      },
      { status: 500 }
    );
  }
}
