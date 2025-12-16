/**
 * POST /api/admin/users/:id/credits - Add or modify user credits
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface CreditRequest {
  action: 'add' | 'set';
  amount: number;
  reason?: string;
  packageType?: 'bonus' | 'single' | 'starter' | 'standard' | 'pro';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const supabase = await createClient();

    // Verify admin access
    const {
      data: { user: adminUser },
    } = await supabase.auth.getUser();
    if (!adminUser) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        },
        { status: 401 }
      );
    }

    const { data: adminRole } = await supabase.rpc('get_admin_role' as never, {
      p_user_id: adminUser.id,
    } as never);
    if (!adminRole || !['super_admin', 'admin'].includes(adminRole as string)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin access required' },
        },
        { status: 403 }
      );
    }

    const body: CreditRequest = await request.json();
    const { action, amount, reason, packageType = 'bonus' } = body;

    // Validate input
    if (!action || !['add', 'set'].includes(action)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid action. Must be "add" or "set"',
          },
        },
        { status: 400 }
      );
    }

    if (typeof amount !== 'number' || amount < 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Amount must be a positive number',
          },
        },
        { status: 400 }
      );
    }

    // Verify target user exists
    const { data: targetUser, error: userError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        },
        { status: 404 }
      );
    }

    let result;

    if (action === 'add') {
      // Add new credit package
      const { data: newCredit, error: insertError } = await supabase
        .from('export_credits')
        .insert({
          user_id: userId,
          credits_total: amount,
          credits_used: 0,
          package_type: packageType,
          metadata: {
            added_by: adminUser.id,
            reason: reason || 'Admin bonus',
            added_at: new Date().toISOString(),
          },
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      result = {
        creditId: newCredit.id,
        creditsAdded: amount,
        newBalance: amount,
      };

      // Log audit event
      await supabase.rpc('log_audit_event' as never, {
        p_action: 'create',
        p_resource_type: 'export_credit',
        p_resource_id: newCredit.id,
        p_new_values: {
          user_id: userId,
          user_email: targetUser.email,
          credits_added: amount,
          package_type: packageType,
          reason: reason || 'Admin bonus',
        },
      } as never);
    } else {
      // Set - find existing bonus credits and update, or create new
      const { data: existingBonus } = await supabase
        .from('export_credits')
        .select('id, credits_total, credits_used')
        .eq('user_id', userId)
        .eq('package_type', 'bonus')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingBonus) {
        // Update existing bonus credits
        const newTotal = amount;
        const { error: updateError } = await supabase
          .from('export_credits')
          .update({
            credits_total: newTotal,
            metadata: {
              last_modified_by: adminUser.id,
              reason: reason || 'Admin adjustment',
              modified_at: new Date().toISOString(),
            },
          })
          .eq('id', existingBonus.id);

        if (updateError) {
          throw updateError;
        }

        result = {
          creditId: existingBonus.id,
          previousTotal: existingBonus.credits_total,
          newTotal: newTotal,
          creditsUsed: existingBonus.credits_used,
        };

        // Log audit event
        await supabase.rpc('log_audit_event' as never, {
          p_action: 'update',
          p_resource_type: 'export_credit',
          p_resource_id: existingBonus.id,
          p_old_values: {
            credits_total: existingBonus.credits_total,
          },
          p_new_values: {
            user_id: userId,
            user_email: targetUser.email,
            credits_total: newTotal,
            reason: reason || 'Admin adjustment',
          },
        } as never);
      } else {
        // Create new bonus credit package
        const { data: newCredit, error: insertError } = await supabase
          .from('export_credits')
          .insert({
            user_id: userId,
            credits_total: amount,
            credits_used: 0,
            package_type: 'bonus',
            metadata: {
              added_by: adminUser.id,
              reason: reason || 'Admin set',
              added_at: new Date().toISOString(),
            },
          })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        result = {
          creditId: newCredit.id,
          previousTotal: 0,
          newTotal: amount,
          creditsUsed: 0,
        };

        // Log audit event
        await supabase.rpc('log_audit_event' as never, {
          p_action: 'create',
          p_resource_type: 'export_credit',
          p_resource_id: newCredit.id,
          p_new_values: {
            user_id: userId,
            user_email: targetUser.email,
            credits_set: amount,
            reason: reason || 'Admin set',
          },
        } as never);
      }
    }

    // Get updated credit balance
    const { data: allCredits } = await supabase
      .from('export_credits')
      .select('credits_total, credits_used')
      .eq('user_id', userId);

    const totalBalance = (allCredits || []).reduce(
      (sum, c) => sum + (c.credits_total - c.credits_used),
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        totalBalance,
        userId,
        userEmail: targetUser.email,
      },
    });
  } catch (error) {
    console.error('Admin credits management error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to manage credits' },
      },
      { status: 500 }
    );
  }
}
