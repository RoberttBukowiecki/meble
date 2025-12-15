/**
 * POST /api/webhooks/payu
 *
 * PayU webhook handler for payment notifications.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { PayUClient, type PayUNotification } from '@meble/payment-providers';

// Use secret key for webhook handling
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

// Create PayU client
function getPayUClient(): PayUClient {
  return new PayUClient({
    posId: process.env.PAYU_POS_ID!,
    secondKey: process.env.PAYU_SECOND_KEY!,
    oauthClientId: process.env.PAYU_OAUTH_CLIENT_ID!,
    oauthClientSecret: process.env.PAYU_OAUTH_CLIENT_SECRET!,
    sandbox: process.env.PAYU_SANDBOX === 'true',
    notifyUrl: process.env.PAYU_NOTIFY_URL!,
    continueUrl: process.env.PAYU_CONTINUE_URL!,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signatureHeader = request.headers.get('OpenPayU-Signature') || '';

    const payuClient = getPayUClient();

    // 1. Verify signature
    if (!payuClient.verifyWebhook(body, signatureHeader)) {
      console.error('PayU webhook: Invalid signature');
      return new NextResponse('Invalid signature', { status: 401 });
    }

    // 2. Parse notification
    const notification: PayUNotification = payuClient.parseNotification(body);
    const { order } = notification;

    console.log(
      `PayU webhook: Order ${order.extOrderId} status: ${order.status}`
    );

    // 3. Map status
    const status = mapPayUStatus(order.status);

    // 4. Update payment in database
    const { data: payment, error: selectError } = await supabase
      .from('payments')
      .select('*')
      .eq('external_order_id', order.extOrderId)
      .single();

    if (selectError || !payment) {
      console.error('PayU webhook: Payment not found', order.extOrderId);
      return new NextResponse('Payment not found', { status: 404 });
    }

    // Update payment status
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status,
        provider_order_id: order.orderId,
        provider_response: notification,
        updated_at: new Date().toISOString(),
        ...(status === 'completed' && {
          completed_at: new Date().toISOString(),
        }),
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('PayU webhook: DB update failed', updateError);
      return new NextResponse('Database error', { status: 500 });
    }

    // 5. If COMPLETED - grant credits
    if (order.status === 'COMPLETED') {
      await handlePaymentCompleted(payment);
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('PayU webhook error:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function mapPayUStatus(payuStatus: string): string {
  const statusMap: Record<string, string> = {
    NEW: 'pending',
    PENDING: 'processing',
    WAITING_FOR_CONFIRMATION: 'processing',
    COMPLETED: 'completed',
    CANCELED: 'cancelled',
    REJECTED: 'failed',
  };
  return statusMap[payuStatus] || 'pending';
}

async function handlePaymentCompleted(payment: any) {
  const { payment_type, metadata, user_id, guest_session_id } = payment;

  if (payment_type === 'credit_purchase') {
    const packageId = metadata?.packageId;
    const credits = metadata?.credits ?? 0;

    if (credits === 0) {
      console.error('PayU webhook: Invalid credits in metadata', payment.id);
      return;
    }

    // Calculate expiration for Pro package
    let validUntil = null;
    if (credits === -1) {
      // Pro package - 30 days
      validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    if (user_id) {
      // Logged-in user
      const { error } = await supabase.from('export_credits').insert({
        user_id,
        credits_total: credits,
        credits_used: 0,
        package_type: packageId,
        valid_until: validUntil,
        payment_id: payment.id,
        metadata: {
          email: metadata?.email,
        },
      });

      if (error) {
        console.error('PayU webhook: Failed to grant credits', error);
      } else {
        console.log(`Credits granted: ${credits} for user ${user_id}`);
      }
    } else if (guest_session_id) {
      // Guest user
      const expiresAt = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString();

      // Check if guest_credits exists
      const { data: existing } = await supabase
        .from('guest_credits')
        .select('*')
        .eq('session_id', guest_session_id)
        .is('migrated_to_user_id', null)
        .single();

      if (existing) {
        // Add to existing credits
        const { error } = await supabase
          .from('guest_credits')
          .update({
            credits_total: existing.credits_total + credits,
            expires_at: expiresAt,
            last_payment_id: payment.id,
            email: metadata?.email || existing.email,
          })
          .eq('id', existing.id);

        if (error) {
          console.error('PayU webhook: Failed to update guest credits', error);
        }
      } else {
        // Create new guest credits
        const { error } = await supabase.from('guest_credits').insert({
          session_id: guest_session_id,
          email: metadata?.email,
          credits_total: credits,
          credits_used: 0,
          expires_at: expiresAt,
          last_payment_id: payment.id,
        });

        if (error) {
          console.error('PayU webhook: Failed to create guest credits', error);
        }
      }

      console.log(`Guest credits granted: ${credits} for session ${guest_session_id}`);
    }
  }
}
