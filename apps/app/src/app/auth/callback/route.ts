import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';

  if (code) {
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Auth callback error:', error);
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent('Blad autoryzacji')}`,
          requestUrl.origin
        )
      );
    }

    // Update login stats
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({
          last_login_at: new Date().toISOString(),
          login_count: (await supabase.rpc('increment_login_count')).data || 1,
        })
        .eq('id', user.id);
    }
  }

  // Redirect to requested page or home
  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
