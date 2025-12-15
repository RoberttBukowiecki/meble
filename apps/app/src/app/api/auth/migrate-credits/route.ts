import { NextRequest, NextResponse } from 'next/server';
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const serviceClient = createServiceRoleClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
      },
      { status: 401 }
    );
  }

  // Get guest session ID from header
  const sessionId = request.headers.get('X-Session-ID');

  if (!sessionId) {
    return NextResponse.json({
      success: true,
      data: { migratedCredits: 0, message: 'No guest session to migrate' },
    });
  }

  // Find guest credits
  const { data: guestCredits, error: findError } = await serviceClient
    .from('guest_credits')
    .select('*')
    .eq('session_id', sessionId)
    .is('migrated_to_user_id', null)
    .gt('expires_at', new Date().toISOString());

  if (findError || !guestCredits?.length) {
    return NextResponse.json({
      success: true,
      data: { migratedCredits: 0, message: 'No credits to migrate' },
    });
  }

  let totalMigrated = 0;

  for (const guestCredit of guestCredits) {
    const remainingCredits =
      guestCredit.credits_total - guestCredit.credits_used;

    if (remainingCredits > 0) {
      // Create user credits
      await serviceClient.from('export_credits').insert({
        user_id: user.id,
        credits_total: remainingCredits,
        credits_used: 0,
        package_type: 'migrated_guest',
        metadata: {
          migrated_from_session: sessionId,
          original_guest_id: guestCredit.id,
          migrated_at: new Date().toISOString(),
        },
      });

      totalMigrated += remainingCredits;
    }

    // Mark as migrated
    await serviceClient
      .from('guest_credits')
      .update({
        migrated_to_user_id: user.id,
        migrated_at: new Date().toISOString(),
      })
      .eq('id', guestCredit.id);
  }

  return NextResponse.json({
    success: true,
    data: {
      migratedCredits: totalMigrated,
      message: `Successfully migrated ${totalMigrated} credits`,
    },
  });
}
