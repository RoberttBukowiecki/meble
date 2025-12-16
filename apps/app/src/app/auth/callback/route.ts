/**
 * Auth callback handler for Supabase OAuth and magic links.
 * Exchanges the auth code for a session and sets cookies.
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';
  const origin = requestUrl.origin;

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Auth callback error:', error);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent('Błąd autoryzacji')}`, origin)
      );
    }

    // Update login stats (fire and forget - don't block redirect)
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        try {
          await supabase
            .from('profiles')
            .update({
              last_login_at: new Date().toISOString(),
            })
            .eq('id', user.id);

          // Increment login count
          await supabase.rpc('increment_login_count');
        } catch (e) {
          console.error('Failed to update login stats:', e);
        }
      }
    });

    // Redirect to the requested page
    return NextResponse.redirect(new URL(next, origin));
  }

  // No code provided - redirect to home
  return NextResponse.redirect(new URL('/', origin));
}
