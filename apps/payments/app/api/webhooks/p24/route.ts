/**
 * POST /api/webhooks/p24
 *
 * Przelewy24 webhook handler for payment notifications.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Przelewy24Client, type P24Notification } from '@meble/payment-providers';

// Use secret key for webhook handling
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

// Create P24 client
function getP24Client(): Przelewy24Client {
  return new Przelewy24Client({
    merchantId: parseInt(process.env.P24_MERCHANT_ID!, 10),
    posId: parseInt(process.env.P24_POS_ID!, 10),
    crc: process.env.P24_CRC!,
    apiKey: process.env.P24_API_KEY!,
    sandbox: process.env.P24_SANDBOX === 'true',
    urlReturn: process.env.P24_URL_RETURN!,
    urlStatus: process.env.P24_URL_STATUS!,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const p24Client = getP24Client();

    // 1. Parse notification
    const notification: P24Notification = p24Client.parseNotification(body);

    console.log(
      `P24 webhook: Session ${notification.sessionId} order ${notification.orderId}`
    );

    // 2. Verify signature
    if (!p24Client.verifyNotification(notification)) {
      console.error('P24 webhook: Invalid signature');
      return NextResponse.json({ error: 1 }, { status: 401 });
    }

    // 3. Get payment from database
    const { data: payment, error: selectError } = await supabase
      .from('payments')
      .select('*')
      .eq('external_order_id', notification.sessionId)
      .single();

    if (selectError || !payment) {
      console.error('P24 webhook: Payment not found', notification.sessionId);
      return NextResponse.json({ error: 1 }, { status: 404 });
    }

    // 4. Verify transaction with P24
    const isVerified = await p24Client.verifyTransaction({
      sessionId: notification.sessionId,
      orderId: notification.orderId,
      amount: notification.amount,
      currency: 'PLN',
    });

    if (!isVerified) {
      console.error('P24 webhook: Transaction verification failed');

      await supabase
        .from('payments')
        .update({
          status: 'failed',
          provider_response: notification,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      return NextResponse.json({ error: 1 });
    }

    // 5. Update payment status
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'completed',
        provider_order_id: notification.orderId.toString(),
        provider_response: notification,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('P24 webhook: DB update failed', updateError);
      return NextResponse.json({ error: 1 });
    }

    // 6. Grant credits
    await handlePaymentCompleted(payment);

    return NextResponse.json({ error: 0 });
  } catch (error) {
    console.error('P24 webhook error:', error);
    return NextResponse.json({ error: 1 }, { status: 500 });
  }
}

// ============================================================================
// HELPERS
// ============================================================================

async function handlePaymentCompleted(payment: any) {
  const { payment_type, metadata, user_id, guest_session_id } = payment;

  if (payment_type === 'subscription') {
    await handleSubscriptionPayment(payment);
    return;
  }

  if (payment_type === 'order') {
    await handleOrderPayment(payment);
    return;
  }

  if (payment_type === 'credit_purchase') {
    const packageId = metadata?.packageId;
    const credits = metadata?.credits ?? 0;

    if (credits === 0) {
      console.error('P24 webhook: Invalid credits in metadata', payment.id);
      return;
    }

    // Calculate expiration for Pro package
    let validUntil = null;
    if (credits === -1) {
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
        console.error('P24 webhook: Failed to grant credits', error);
      } else {
        console.log(`Credits granted: ${credits} for user ${user_id}`);
      }
    } else if (guest_session_id) {
      // Guest user
      const expiresAt = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString();

      const { data: existing } = await supabase
        .from('guest_credits')
        .select('*')
        .eq('session_id', guest_session_id)
        .is('migrated_to_user_id', null)
        .single();

      if (existing) {
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
          console.error('P24 webhook: Failed to update guest credits', error);
        }
      } else {
        const { error } = await supabase.from('guest_credits').insert({
          session_id: guest_session_id,
          email: metadata?.email,
          credits_total: credits,
          credits_used: 0,
          expires_at: expiresAt,
          last_payment_id: payment.id,
        });

        if (error) {
          console.error('P24 webhook: Failed to create guest credits', error);
        }
      }

      console.log(`Guest credits granted: ${credits} for session ${guest_session_id}`);
    }
  }
}

async function handleSubscriptionPayment(payment: any) {
  const { metadata, user_id } = payment;
  const tenantId = metadata?.tenant_id;
  const plan = metadata?.plan;
  const billingCycle = metadata?.billing_cycle;
  const subscriptionId = metadata?.subscription_id;

  if (!tenantId || !plan) {
    console.error('P24 webhook: Missing subscription metadata', payment.id);
    return;
  }

  try {
    // Calculate period dates
    const periodStart = new Date();
    const periodEnd = new Date();
    const nextPaymentDue = new Date();

    if (billingCycle === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      nextPaymentDue.setFullYear(nextPaymentDue.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      nextPaymentDue.setMonth(nextPaymentDue.getMonth() + 1);
    }

    // Update subscription
    if (subscriptionId) {
      await supabase
        .from('tenant_subscriptions')
        .update({
          status: 'active',
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          next_payment_due: nextPaymentDue.toISOString(),
          last_payment_id: payment.id,
          last_payment_at: new Date().toISOString(),
          failed_payments: 0,
        })
        .eq('id', subscriptionId);
    }

    // Update tenant plan and status
    const planLimits: Record<string, { materials: number; users: number; exports: number }> = {
      starter: { materials: 50, users: 5, exports: 100 },
      professional: { materials: 200, users: 20, exports: 500 },
      enterprise: { materials: -1, users: -1, exports: -1 },
    };

    const limits = planLimits[plan] || planLimits.starter;

    await supabase
      .from('tenants')
      .update({
        plan,
        status: 'active',
        activated_at: new Date().toISOString(),
        max_materials: limits.materials === -1 ? 999999 : limits.materials,
        max_users: limits.users === -1 ? 999999 : limits.users,
        max_exports_per_month: limits.exports === -1 ? 999999 : limits.exports,
      })
      .eq('id', tenantId);

    // Generate invoice
    const { data: invoiceNumber } = await supabase.rpc('generate_invoice_number');
    const taxRate = 23;
    const subtotal = payment.amount;
    const taxAmount = Math.round(subtotal * (taxRate / (100 + taxRate)));
    const netAmount = subtotal - taxAmount;

    // Get tenant and seller data
    const { data: tenant } = await supabase
      .from('tenants')
      .select('company_name, company_nip, contact_email, billing_email')
      .eq('id', tenantId)
      .single();

    await supabase.from('tenant_invoices').insert({
      tenant_id: tenantId,
      subscription_id: subscriptionId,
      invoice_number: invoiceNumber || `FV/${Date.now()}`,
      subtotal: netAmount,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total: subtotal,
      status: 'paid',
      payment_id: payment.id,
      paid_at: new Date().toISOString(),
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
      due_date: periodStart.toISOString().split('T')[0],
      seller_data: {
        name: 'Robert Bukowiecki',
        nip: '8943228809',
        address: 'ul. Chachaja 9/30, 52-402 Wrocław',
      },
      buyer_data: {
        name: tenant?.company_name || 'N/A',
        nip: tenant?.company_nip,
        email: tenant?.billing_email || tenant?.contact_email,
      },
      line_items: [
        {
          description: `Subskrypcja ${plan} (${billingCycle === 'yearly' ? 'roczna' : 'miesięczna'})`,
          quantity: 1,
          unit_price: netAmount,
          tax_rate: taxRate,
          total: subtotal,
        },
      ],
    });

    console.log(`Subscription activated: ${plan} for tenant ${tenantId}`);
  } catch (error) {
    console.error('P24 webhook: Subscription activation failed', error);
  }
}

async function handleOrderPayment(payment: any) {
  const { metadata } = payment;
  const orderId = metadata?.order_id;

  if (!orderId) {
    console.error('P24 webhook: Missing order_id in metadata', payment.id);
    return;
  }

  try {
    // Update order status
    await supabase
      .from('producer_orders')
      .update({
        status: 'confirmed',
        paid_at: new Date().toISOString(),
        status_history: supabase.sql`
          COALESCE(status_history, '[]'::jsonb) ||
          jsonb_build_array(jsonb_build_object(
            'status', 'confirmed',
            'timestamp', ${new Date().toISOString()},
            'note', 'Płatność otrzymana'
          ))
        `,
      })
      .eq('id', orderId);

    // Update commission status
    await supabase
      .from('commissions')
      .update({ status: 'pending_payout' })
      .eq('order_id', orderId);

    console.log(`Order confirmed: ${orderId}`);
  } catch (error) {
    console.error('P24 webhook: Order confirmation failed', error);
  }
}
