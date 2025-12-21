/**
 * POST /api/payments/create
 *
 * Create a new payment for credit purchase.
 * Supports both authenticated users (via Bearer token) and guests (via session ID).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
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
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-session-id',
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

    let userId: string | undefined;
    let userEmail: string | undefined;

    // Check for Bearer token in Authorization header (cross-origin authenticated request)
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);

      // Verify token with Supabase
      const supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
      );

      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (!error && user) {
        userId = user.id;
        userEmail = user.email;
      }
    } else {
      // Try to get user from cookies (same-origin request)
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        userId = user.id;
        userEmail = user.email;
      }
    }

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
      if (!userId && !body.email) {
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
      if (!userId && !guestSessionId) {
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

      const email = body.email || userEmail || '';

      // Create payment via service
      const paymentService = getPaymentService();
      const result = await paymentService.createCreditPurchase(
        {
          packageId: body.packageId,
          provider: body.provider,
          userId: userId,
          guestSessionId: userId ? undefined : guestSessionId || undefined,
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

      // Save payment to database using service client (bypasses RLS)
      const supabase = createServiceClient();

      console.log('Saving payment with external_order_id:', result.externalOrderId);

      const { data: payment, error: dbError } = await supabase
        .from('payments')
        .insert({
          payment_type: 'credit_purchase',
          provider: body.provider,
          external_order_id: result.externalOrderId!,
          user_id: userId || null,
          guest_session_id: userId ? null : guestSessionId,
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
        // Still return success - payment was created in PayU
      } else {
        console.log('Payment saved successfully:', payment?.id, payment?.external_order_id);
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
