/**
 * GET /api/admin/audit
 *
 * Audit logs - queries Supabase directly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// Force dynamic - this route uses cookies for auth
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc('is_admin', { p_user_id: user.id });

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        { status: 403 }
      );
    }

    // Use service role client for admin queries
    const adminSupabase = createServiceRoleClient();

    const { searchParams } = request.nextUrl;
    const action = searchParams.get('action');
    const resourceType = searchParams.get('resourceType');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = adminSupabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (action) {
      query = query.eq('action', action);
    }

    if (resourceType) {
      query = query.eq('resource_type', resourceType);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: logs, error, count } = await query;

    if (error) {
      console.error('Audit logs query error:', error);
      // Return empty data if table doesn't exist
      return NextResponse.json({
        success: true,
        data: {
          logs: [],
          pagination: { offset, limit, total: 0 },
        },
      });
    }

    // Format logs
    const formattedLogs = (logs || []).map((log: Record<string, unknown>) => ({
      id: log.id,
      action: log.action,
      resourceType: log.resource_type,
      resourceId: log.resource_id,
      userEmail: log.user_email || null,
      adminEmail: log.admin_email || null,
      ipAddress: log.ip_address,
      oldValues: log.old_values,
      newValues: log.new_values,
      metadata: log.metadata,
      createdAt: log.created_at,
    }));

    return NextResponse.json({
      success: true,
      data: {
        logs: formattedLogs,
        pagination: {
          offset,
          limit,
          total: count || 0,
        },
      },
    });
  } catch (error) {
    console.error('Admin audit error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
