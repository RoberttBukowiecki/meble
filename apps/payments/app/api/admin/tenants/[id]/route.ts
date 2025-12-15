/**
 * GET /api/admin/tenants/[id] - Get tenant details
 * PATCH /api/admin/tenants/[id] - Update tenant
 * DELETE /api/admin/tenants/[id] - Delete tenant
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const { data: tenant, error } = await supabase
      .from('tenants')
      .select(`
        *,
        subscription:tenant_subscriptions(*),
        users:tenant_users(*, user:auth.users(email)),
        materials:tenant_materials(count),
        usage:tenant_usage(*)
      `)
      .eq('id', id)
      .single();

    if (error || !tenant) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Tenant not found' } },
        { status: 404 }
      );
    }

    // Get recent invoices
    const { data: invoices } = await supabase
      .from('tenant_invoices')
      .select('*')
      .eq('tenant_id', id)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      data: {
        ...formatTenantDetail(tenant),
        invoices: invoices?.map(formatInvoice) || [],
      },
    });
  } catch (error) {
    console.error('Admin tenant detail error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch tenant' } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Get current tenant state for audit
    const { data: oldTenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();

    if (!oldTenant) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Tenant not found' } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const allowedFields = [
      'name', 'status', 'plan', 'contact_email', 'contact_phone',
      'company_name', 'company_nip', 'custom_domain', 'domain_verified',
      'max_materials', 'max_users', 'max_exports_per_month', 'branding', 'settings'
    ];

    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      const camelField = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (body[camelField] !== undefined) {
        updates[field] = body[camelField];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' } },
        { status: 400 }
      );
    }

    // Handle status changes
    if (updates.status) {
      if (updates.status === 'active' && oldTenant.status !== 'active') {
        updates.activated_at = new Date().toISOString();
      } else if (updates.status === 'suspended') {
        updates.suspended_at = new Date().toISOString();
      }
    }

    const { data: tenant, error } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Log audit event
    await supabase.rpc('log_audit_event' as never, {
      p_action: 'update',
      p_resource_type: 'tenant',
      p_resource_id: id,
      p_old_values: oldTenant,
      p_new_values: updates,
    } as never);

    return NextResponse.json({
      success: true,
      data: formatTenantDetail(tenant),
    });
  } catch (error) {
    console.error('Admin update tenant error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update tenant' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verify super admin access
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { data: adminRole } = await supabase.rpc('get_admin_role' as never, { p_user_id: user.id } as never);
    if (adminRole !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Super admin access required' } },
        { status: 403 }
      );
    }

    // Get tenant for audit
    const { data: tenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Tenant not found' } },
        { status: 404 }
      );
    }

    // Delete tenant (cascade will handle related records)
    const { error } = await supabase
      .from('tenants')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    // Log audit event
    await supabase.rpc('log_audit_event' as never, {
      p_action: 'delete',
      p_resource_type: 'tenant',
      p_resource_id: id,
      p_old_values: tenant,
    } as never);

    return NextResponse.json({
      success: true,
      message: 'Tenant deleted',
    });
  } catch (error) {
    console.error('Admin delete tenant error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete tenant' } },
      { status: 500 }
    );
  }
}

function formatTenantDetail(tenant: any) {
  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    plan: tenant.plan,
    status: tenant.status,
    contactEmail: tenant.contact_email,
    contactPhone: tenant.contact_phone,
    companyName: tenant.company_name,
    companyNip: tenant.company_nip,
    customDomain: tenant.custom_domain,
    domainVerified: tenant.domain_verified,
    domainVerificationToken: tenant.domain_verification_token,
    branding: tenant.branding,
    settings: tenant.settings,
    maxMaterials: tenant.max_materials,
    maxUsers: tenant.max_users,
    maxExportsPerMonth: tenant.max_exports_per_month,
    currentMonthExports: tenant.current_month_exports,
    subscription: tenant.subscription?.[0] ? {
      id: tenant.subscription[0].id,
      status: tenant.subscription[0].status,
      plan: tenant.subscription[0].plan,
      billingCycle: tenant.subscription[0].billing_cycle,
      price: tenant.subscription[0].price,
      trialEndsAt: tenant.subscription[0].trial_ends_at,
      currentPeriodStart: tenant.subscription[0].current_period_start,
      currentPeriodEnd: tenant.subscription[0].current_period_end,
      nextPaymentDue: tenant.subscription[0].next_payment_due,
    } : null,
    users: tenant.users?.map((u: any) => ({
      id: u.id,
      userId: u.user_id,
      email: u.user?.email,
      role: u.role,
      isActive: u.is_active,
      acceptedAt: u.accepted_at,
    })) || [],
    materialsCount: tenant.materials?.[0]?.count || 0,
    usage: tenant.usage?.map((u: any) => ({
      year: u.year,
      month: u.month,
      exports: u.exports_count,
      uniqueUsers: u.unique_users,
      projectsCreated: u.projects_created,
    })) || [],
    activatedAt: tenant.activated_at,
    suspendedAt: tenant.suspended_at,
    createdAt: tenant.created_at,
    updatedAt: tenant.updated_at,
  };
}

function formatInvoice(invoice: any) {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoice_number,
    status: invoice.status,
    subtotal: invoice.subtotal,
    taxRate: invoice.tax_rate,
    taxAmount: invoice.tax_amount,
    total: invoice.total,
    periodStart: invoice.period_start,
    periodEnd: invoice.period_end,
    dueDate: invoice.due_date,
    paidAt: invoice.paid_at,
    pdfUrl: invoice.pdf_url,
    createdAt: invoice.created_at,
  };
}
