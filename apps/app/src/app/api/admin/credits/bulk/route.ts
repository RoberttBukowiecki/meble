/**
 * POST /api/admin/credits/bulk
 *
 * Bulk credit operations - add credits to multiple users at once.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// Force dynamic - this route uses cookies for auth
export const dynamic = 'force-dynamic';

interface BulkCreditItem {
  userId: string;
  amount: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, items, reason, packageType = 'bonus' } = body as {
      action: 'add' | 'set';
      items: BulkCreditItem[];
      reason?: string;
      packageType?: string;
    };

    // Validation
    if (!action || !['add', 'set'].includes(action)) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid action. Use "add" or "set"' } },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Items array is required' } },
        { status: 400 }
      );
    }

    if (items.length > 100) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Maximum 100 items per request' } },
        { status: 400 }
      );
    }

    // Validate each item
    for (const item of items) {
      if (!item.userId || typeof item.amount !== 'number' || item.amount < 0) {
        return NextResponse.json(
          { success: false, error: { code: 'BAD_REQUEST', message: 'Each item must have userId and non-negative amount' } },
          { status: 400 }
        );
      }
    }

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

    // Use service role client for admin operations
    const adminSupabase = createServiceRoleClient();

    // Get current credits for all users
    const userIds = items.map((item) => item.userId);
    const { data: currentCredits } = await adminSupabase
      .from('export_credits')
      .select('user_id, credits_total, credits_used, package_type')
      .in('user_id', userIds);

    const creditsMap = new Map(
      (currentCredits || []).map((c: { user_id: string; credits_total: number; credits_used: number; package_type: string }) => [
        c.user_id,
        { total: c.credits_total, used: c.credits_used, packageType: c.package_type },
      ])
    );

    // Prepare upsert data and audit logs
    const upsertData: Array<{
      user_id: string;
      credits_total: number;
      credits_used: number;
      package_type: string;
      updated_at: string;
    }> = [];

    const auditLogs: Array<{
      action: string;
      resource_type: string;
      resource_id: string;
      admin_user_id: string;
      old_values: Record<string, unknown>;
      new_values: Record<string, unknown>;
      metadata: Record<string, unknown>;
    }> = [];

    const results: Array<{
      userId: string;
      success: boolean;
      oldTotal: number;
      newTotal: number;
      error?: string;
    }> = [];

    for (const item of items) {
      const current = creditsMap.get(item.userId);
      const oldTotal = current?.total || 0;
      const newTotal = action === 'add' ? oldTotal + item.amount : item.amount;

      upsertData.push({
        user_id: item.userId,
        credits_total: newTotal,
        credits_used: current?.used || 0,
        package_type: current?.packageType || packageType,
        updated_at: new Date().toISOString(),
      });

      auditLogs.push({
        action: 'credits_bulk_modified',
        resource_type: 'export_credits',
        resource_id: item.userId,
        admin_user_id: user.id,
        old_values: { credits_total: oldTotal },
        new_values: { credits_total: newTotal },
        metadata: {
          operation: action,
          amount: item.amount,
          reason: reason || null,
          bulk_operation: true,
        },
      });

      results.push({
        userId: item.userId,
        success: true,
        oldTotal,
        newTotal,
      });
    }

    // Execute upsert
    const { error: upsertError } = await adminSupabase
      .from('export_credits')
      .upsert(upsertData, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('Bulk credits upsert error:', upsertError);
      return NextResponse.json(
        { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update credits' } },
        { status: 500 }
      );
    }

    // Insert audit logs (don't fail if this fails)
    const { error: auditError } = await adminSupabase.from('audit_logs').insert(auditLogs);
    if (auditError) {
      console.error('Failed to insert audit logs:', auditError);
    }

    // Calculate summary
    const summary = {
      processed: results.length,
      totalCreditsAdded: action === 'add'
        ? items.reduce((sum, item) => sum + item.amount, 0)
        : results.reduce((sum, r) => sum + (r.newTotal - r.oldTotal), 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        summary,
        results,
      },
    });
  } catch (error) {
    console.error('Admin bulk credits error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
