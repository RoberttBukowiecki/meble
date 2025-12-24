/**
 * Auth callback handler for Supabase OAuth and magic links.
 * Exchanges the auth code for a session and sets cookies.
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Validates that the redirect URL is safe (internal path only).
 * Prevents open redirect attacks by ensuring the URL starts with /
 * and doesn't contain protocol or external hosts.
 */
function getSafeRedirectUrl(next: string | null): string {
  if (!next) return '/';

  // Must start with / (relative path)
  if (!next.startsWith('/')) return '/';

  // Prevent protocol-relative URLs (//example.com)
  if (next.startsWith('//')) return '/';

  // Prevent backslash-based attacks (/\evil.com)
  if (next.includes('\\')) return '/';

  // Prevent javascript: or other protocols
  if (next.includes(':')) return '/';

  // Prevent null bytes and other control characters
  if (/[\x00-\x1f\x7f]/.test(next)) return '/';

  // Prevent encoded characters that could bypass checks
  if (next.includes('%')) {
    try {
      // Recursively decode to catch double/triple encoding
      let decoded = next;
      let prevDecoded = '';
      let iterations = 0;
      const maxIterations = 5;

      while (decoded !== prevDecoded && iterations < maxIterations) {
        prevDecoded = decoded;
        decoded = decodeURIComponent(decoded);
        iterations++;
      }

      // Check decoded value for dangerous patterns
      if (
        decoded.includes('//') ||
        decoded.includes(':') ||
        decoded.includes('\\') ||
        /[\x00-\x1f\x7f]/.test(decoded)
      ) {
        return '/';
      }
    } catch {
      // Invalid encoding - reject
      return '/';
    }
  }

  return next;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = getSafeRedirectUrl(requestUrl.searchParams.get('next'));
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
