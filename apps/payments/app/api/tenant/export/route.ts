/**
 * POST /api/tenant/export - Track tenant export usage
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Tenant context required',
          },
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get tenant details and check limits
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, plan, max_exports_per_month, current_month_exports, settings')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Tenant not found',
          },
        },
        { status: 404 }
      );
    }

    // Check export limit (enterprise has unlimited)
    const currentExports = tenant.current_month_exports ?? 0;
    const maxExports = tenant.max_exports_per_month ?? 0;
    if (tenant.plan !== 'enterprise') {
      if (currentExports >= maxExports) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'LIMIT_EXCEEDED',
              message: 'Monthly export limit reached',
              details: {
                limit: maxExports,
                used: currentExports,
              },
            },
          },
          { status: 429 }
        );
      }
    }

    // Increment export count using the database function
    await supabase.rpc('increment_tenant_exports', {
      p_tenant_id: tenantId,
    });

    // Get updated counts
    const { data: updated } = await supabase
      .from('tenants')
      .select('current_month_exports, max_exports_per_month')
      .eq('id', tenantId)
      .single();

    return NextResponse.json({
      success: true,
      data: {
        used: updated?.current_month_exports ?? currentExports + 1,
        limit: maxExports,
        remaining:
          tenant.plan === 'enterprise'
            ? null
            : Math.max(0, maxExports - (updated?.current_month_exports ?? 0)),
        unlimited: tenant.plan === 'enterprise',
      },
    });
  } catch (error) {
    console.error('Tenant export tracking error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to track export',
        },
      },
      { status: 500 }
    );
  }
}

// GET - Check export usage
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Tenant context required',
          },
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('plan, max_exports_per_month, current_month_exports')
      .eq('id', tenantId)
      .single();

    if (error || !tenant) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Tenant not found',
          },
        },
        { status: 404 }
      );
    }

    const used = tenant.current_month_exports ?? 0;
    const limit = tenant.max_exports_per_month ?? 0;
    return NextResponse.json({
      success: true,
      data: {
        used,
        limit,
        remaining:
          tenant.plan === 'enterprise'
            ? null
            : Math.max(0, limit - used),
        unlimited: tenant.plan === 'enterprise',
      },
    });
  } catch (error) {
    console.error('Tenant export usage error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to fetch export usage',
        },
      },
      { status: 500 }
    );
  }
}
