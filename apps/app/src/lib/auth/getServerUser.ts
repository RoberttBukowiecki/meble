import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Profile } from '@/types/auth';

export async function getServerUser() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, profile: null };
  }

  // Fetch profile
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const profile: Profile | null = profileData
    ? {
        id: profileData.id,
        fullName: profileData.full_name,
        displayName: profileData.display_name,
        avatarUrl: profileData.avatar_url,
        email: profileData.email,
        preferredLocale: profileData.preferred_locale || 'pl',
        newsletterSubscribed: profileData.newsletter_subscribed,
        isActive: profileData.is_active,
        createdAt: profileData.created_at,
      }
    : null;

  return { user, profile };
}

export async function requireAuth() {
  const { user, profile } = await getServerUser();

  if (!user) {
    throw new Error('Authentication required');
  }

  return { user, profile };
}
