/**
 * GET /api/admin/tenants - List tenants
 * POST /api/admin/tenants - Create tenant
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify admin access
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { data: isAdmin } = await supabase.rpc('is_admin' as never, { p_user_id: user.id } as never);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const plan = searchParams.get('plan');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = supabase
      .from('tenants')
      .select(`
        *,
        subscription:tenant_subscriptions(id, status, plan, current_period_end),
        owner:auth.users!owner_user_id(email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (plan) {
      query = query.eq('plan', plan);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%,contact_email.ilike.%${search}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: tenants, error, count } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: {
        tenants: tenants?.map(formatTenant) || [],
        pagination: {
          offset,
          limit,
          total: count,
        },
      },
    });
  } catch (error) {
    console.error('Admin tenants list error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch tenants' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify admin access
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { data: adminRole } = await supabase.rpc('get_admin_role' as never, { p_user_id: user.id } as never);
    if (!adminRole || !['super_admin', 'admin'].includes(adminRole)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      slug,
      name,
      ownerUserId,
      contactEmail,
      plan = 'starter',
      companyName,
      companyNip,
    } = body;

    // Validation
    if (!slug || !name || !ownerUserId || !contactEmail) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } },
        { status: 400 }
      );
    }

    // Check slug availability
    const { data: existingSlug } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingSlug) {
      return NextResponse.json(
        { success: false, error: { code: 'SLUG_TAKEN', message: 'Slug is already in use' } },
        { status: 400 }
      );
    }

    // Create tenant
    const { data: tenant, error } = await supabase
      .from('tenants')
      .insert({
        slug,
        name,
        owner_user_id: ownerUserId,
        contact_email: contactEmail,
        plan,
        status: 'pending',
        company_name: companyName,
        company_nip: companyNip,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Add owner as tenant user
    await supabase.from('tenant_users').insert({
      tenant_id: tenant.id,
      user_id: ownerUserId,
      role: 'owner',
      accepted_at: new Date().toISOString(),
    });

    // Create trial subscription
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + 14);

    await supabase.from('tenant_subscriptions').insert({
      tenant_id: tenant.id,
      plan,
      status: 'trial',
      billing_cycle: 'monthly',
      price: getPlanPrice(plan, 'monthly'),
      trial_ends_at: trialEnds.toISOString(),
    });

    // Log audit event
    await supabase.rpc('log_audit_event' as never, {
      p_action: 'create',
      p_resource_type: 'tenant',
      p_resource_id: tenant.id,
      p_new_values: { slug, name, plan },
    } as never);

    return NextResponse.json({
      success: true,
      data: formatTenant(tenant),
    });
  } catch (error) {
    console.error('Admin create tenant error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create tenant' } },
      { status: 500 }
    );
  }
}

function formatTenant(tenant: any) {
  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    plan: tenant.plan,
    status: tenant.status,
    contactEmail: tenant.contact_email,
    companyName: tenant.company_name,
    companyNip: tenant.company_nip,
    customDomain: tenant.custom_domain,
    domainVerified: tenant.domain_verified,
    maxMaterials: tenant.max_materials,
    maxUsers: tenant.max_users,
    maxExportsPerMonth: tenant.max_exports_per_month,
    currentMonthExports: tenant.current_month_exports,
    ownerEmail: tenant.owner?.email,
    subscription: tenant.subscription?.[0] ? {
      id: tenant.subscription[0].id,
      status: tenant.subscription[0].status,
      plan: tenant.subscription[0].plan,
      currentPeriodEnd: tenant.subscription[0].current_period_end,
    } : null,
    activatedAt: tenant.activated_at,
    createdAt: tenant.created_at,
    updatedAt: tenant.updated_at,
  };
}

function getPlanPrice(plan: string, cycle: string): number {
  const prices: Record<string, Record<string, number>> = {
    starter: { monthly: 9900, yearly: 99000 },
    professional: { monthly: 29900, yearly: 299000 },
    enterprise: { monthly: 79900, yearly: 799000 },
  };
  return prices[plan]?.[cycle] || 9900;
}
