/**
 * GET /api/tenant/subscription - Get subscription status
 * POST /api/tenant/subscription - Create/upgrade subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Subscription pricing (in grosz)
const PRICING = {
  starter: { monthly: 9900, yearly: 99000 },
  professional: { monthly: 29900, yearly: 299000 },
  enterprise: { monthly: 79900, yearly: 799000 },
};

const PLAN_LIMITS = {
  starter: { materials: 50, users: 5, exports: 100 },
  professional: { materials: 200, users: 20, exports: 500 },
  enterprise: { materials: -1, users: -1, exports: -1 }, // unlimited
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Get user's tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select(`
        id, slug, name, plan, status,
        subscription:tenant_subscriptions(*)
      `)
      .eq('owner_user_id', user.id)
      .single();

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'No tenant found for user' } },
        { status: 404 }
      );
    }

    const subscription = tenant.subscription?.[0];

    return NextResponse.json({
      success: true,
      data: {
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          name: tenant.name,
          plan: tenant.plan,
          status: tenant.status,
        },
        subscription: subscription ? {
          id: subscription.id,
          status: subscription.status,
          plan: subscription.plan,
          billingCycle: subscription.billing_cycle,
          price: subscription.price,
          trialEndsAt: subscription.trial_ends_at,
          currentPeriodStart: subscription.current_period_start,
          currentPeriodEnd: subscription.current_period_end,
          nextPaymentDue: subscription.next_payment_due,
          failedPayments: subscription.failed_payments,
        } : null,
        pricing: PRICING,
        limits: PLAN_LIMITS,
      },
    });
  } catch (error) {
    console.error('Subscription fetch error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch subscription' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { plan, billingCycle = 'monthly' } = body;

    if (!plan || !['starter', 'professional', 'enterprise'].includes(plan)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid plan' } },
        { status: 400 }
      );
    }

    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid billing cycle' } },
        { status: 400 }
      );
    }

    // Get user's tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, plan, subscription:tenant_subscriptions(*)')
      .eq('owner_user_id', user.id)
      .single();

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'No tenant found for user' } },
        { status: 404 }
      );
    }

    const price = PRICING[plan as keyof typeof PRICING][billingCycle as 'monthly' | 'yearly'];
    const subscription = tenant.subscription?.[0];

    // Create payment record
    const externalOrderId = `sub_${tenant.id}_${Date.now()}`;
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        payment_type: 'subscription',
        user_id: user.id,
        provider: 'przelewy24',
        external_order_id: externalOrderId,
        amount: price,
        status: 'pending',
        metadata: {
          tenant_id: tenant.id,
          plan,
          billing_cycle: billingCycle,
          subscription_id: subscription?.id,
        },
      })
      .select()
      .single();

    if (paymentError) {
      throw paymentError;
    }

    // Calculate period dates
    const periodStart = new Date();
    const periodEnd = new Date();
    if (billingCycle === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Update or create subscription (will be activated on payment success)
    if (subscription) {
      await supabase
        .from('tenant_subscriptions')
        .update({
          plan,
          billing_cycle: billingCycle,
          price,
          // Don't change status yet - wait for payment
        })
        .eq('id', subscription.id);
    } else {
      await supabase
        .from('tenant_subscriptions')
        .insert({
          tenant_id: tenant.id,
          plan,
          status: 'trial', // Will change to active on payment
          billing_cycle: billingCycle,
          price,
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          next_payment_due: periodStart.toISOString(),
        });
    }

    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment.id,
        amount: price,
        plan,
        billingCycle,
        redirectUrl: `/payment/processing?paymentId=${payment.id}&type=subscription`,
      },
    });
  } catch (error) {
    console.error('Subscription create error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create subscription' } },
      { status: 500 }
    );
  }
}
