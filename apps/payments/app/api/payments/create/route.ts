/**
 * POST /api/payments/create
 *
 * Create a new payment for credit purchase.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  getPaymentService,
  getCreditPackage,
  isValidPackageId,
  type PaymentProviderType,
} from '@meble/payment-providers';

interface CreatePaymentBody {
  type: 'credit_purchase' | 'order' | 'shop';
  provider: PaymentProviderType;
  packageId?: string;
  orderId?: string;
  email?: string;
  returnUrl: string;
}

// CORS headers for cross-origin requests from main app
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-session-id',
  'Access-Control-Allow-Credentials': 'true',
};

// Handle preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body: CreatePaymentBody = await request.json();

    // Validate required fields
    if (!body.type || !body.provider || !body.returnUrl) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: type, provider, returnUrl',
          },
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get customer IP
    const customerIp =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    // Get supabase client
    const supabase = await createClient();

    // Try to get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Get guest session ID from header
    const guestSessionId = request.headers.get('x-session-id');

    // Handle credit purchase
    if (body.type === 'credit_purchase') {
      if (!body.packageId) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'packageId is required for credit_purchase',
            },
          },
          { status: 400, headers: corsHeaders }
        );
      }

      if (!isValidPackageId(body.packageId)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_PACKAGE',
              message: 'Invalid package ID',
            },
          },
          { status: 400, headers: corsHeaders }
        );
      }

      const pkg = getCreditPackage(body.packageId)!;

      // For guests, email is required
      if (!user && !body.email) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Email is required for guest purchases',
            },
          },
          { status: 400, headers: corsHeaders }
        );
      }

      // For guests, session ID is required
      if (!user && !guestSessionId) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Session ID is required for guest purchases',
            },
          },
          { status: 400, headers: corsHeaders }
        );
      }

      const email = body.email || user?.email || '';

      // Create payment via service
      const paymentService = getPaymentService();
      const result = await paymentService.createCreditPurchase(
        {
          packageId: body.packageId,
          provider: body.provider,
          userId: user?.id,
          guestSessionId: user ? undefined : guestSessionId || undefined,
          email,
          customerIp,
          returnUrl: body.returnUrl,
        },
        {
          name: pkg.name,
          price: pkg.price,
          credits: pkg.credits,
        }
      );

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'PAYMENT_FAILED',
              message: result.error,
            },
          },
          { status: 400, headers: corsHeaders }
        );
      }

      // Save payment to database
      const { data: payment, error: dbError } = await supabase
        .from('payments')
        .insert({
          payment_type: 'credit_purchase',
          provider: body.provider,
          external_order_id: result.externalOrderId,
          user_id: user?.id || null,
          guest_session_id: user ? null : guestSessionId,
          amount: pkg.price,
          currency: 'PLN',
          status: 'pending',
          redirect_url: result.redirectUrl,
          metadata: {
            packageId: body.packageId,
            email,
            credits: pkg.credits,
          },
        })
        .select()
        .single();

      if (dbError) {
        console.error('Failed to save payment:', dbError);
        // Still return success - payment was created
      }

      return NextResponse.json({
        success: true,
        data: {
          paymentId: payment?.id,
          externalOrderId: result.externalOrderId,
          redirectUrl: result.redirectUrl,
          provider: body.provider,
          amount: pkg.price,
          currency: 'PLN',
        },
      }, { headers: corsHeaders });
    }

    // Other payment types not yet implemented
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: `Payment type '${body.type}' is not yet implemented`,
        },
      },
      { status: 501, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Payment creation error:', error);
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
