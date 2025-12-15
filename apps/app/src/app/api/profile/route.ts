import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerSupabaseClient();

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

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' },
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      preferredLocale: profile.preferred_locale,
      newsletterSubscribed: profile.newsletter_subscribed,
      createdAt: profile.created_at,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

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

  const body = await request.json();
  const { fullName, displayName, preferredLocale, newsletterSubscribed } = body;

  const updateData: Record<string, unknown> = {};

  if (fullName !== undefined) updateData.full_name = fullName;
  if (displayName !== undefined) updateData.display_name = displayName;
  if (preferredLocale !== undefined)
    updateData.preferred_locale = preferredLocale;
  if (newsletterSubscribed !== undefined)
    updateData.newsletter_subscribed = newsletterSubscribed;

  const { data: profile, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'UPDATE_FAILED', message: 'Failed to update profile' },
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      preferredLocale: profile.preferred_locale,
      newsletterSubscribed: profile.newsletter_subscribed,
    },
  });
}
