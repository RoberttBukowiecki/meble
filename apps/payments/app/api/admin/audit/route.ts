/**
 * GET /api/admin/audit - Audit logs
 *
 * Supports two auth modes:
 * 1. Direct browser request with Supabase session cookies
 * 2. Internal server-to-server request with X-Admin-User-Id header
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Check for internal server-to-server request
    const adminUserId = request.headers.get('X-Admin-User-Id');

    let supabase;

    if (adminUserId) {
      // Internal request - use service client
      supabase = createServiceClient();

      // Verify admin status
      const { data: isAdmin } = await supabase.rpc('is_admin' as never, { p_user_id: adminUserId } as never);
      if (!isAdmin) {
        return NextResponse.json(
          { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
          { status: 403 }
        );
      }
    } else {
      // Direct browser request - use cookie-based auth
      supabase = await createClient();

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
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const resourceType = searchParams.get('resourceType');
    const resourceId = searchParams.get('resourceId');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        user:auth.users!user_id(email),
        admin:admin_users(user:auth.users(email))
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (action) {
      query = query.eq('action', action);
    }

    if (resourceType) {
      query = query.eq('resource_type', resourceType);
    }

    if (resourceId) {
      query = query.eq('resource_id', resourceId);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: logs, error, count } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: {
        logs: logs?.map(formatLog) || [],
        pagination: {
          offset,
          limit,
          total: count,
        },
      },
    });
  } catch (error) {
    console.error('Admin audit logs error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch audit logs' } },
      { status: 500 }
    );
  }
}

function formatLog(log: any) {
  return {
    id: log.id,
    action: log.action,
    resourceType: log.resource_type,
    resourceId: log.resource_id,
    userEmail: log.user?.email,
    adminEmail: log.admin?.user?.email,
    ipAddress: log.ip_address,
    userAgent: log.user_agent,
    oldValues: log.old_values,
    newValues: log.new_values,
    metadata: log.metadata,
    createdAt: log.created_at,
  };
}
