'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { track, AnalyticsEvent } from '@meble/analytics';
import type { Profile } from '@/types/auth';

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
    metadata?: Record<string, unknown>
  ) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initialized = useRef(false);

  const supabase = getSupabaseBrowserClient();

  // Fetch user profile - memoized without supabase in deps (it's a singleton)
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await getSupabaseBrowserClient()
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data && !error) {
        setProfile({
          id: data.id,
          fullName: data.full_name,
          displayName: data.display_name,
          avatarUrl: data.avatar_url,
          email: data.email,
          preferredLocale: data.preferred_locale || 'pl',
          newsletterSubscribed: data.newsletter_subscribed,
          isActive: data.is_active,
          createdAt: data.created_at,
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  }, []);

  // Migrate guest credits after sign in
  const migrateGuestCredits = useCallback(async () => {
    // Key must match useGuestSession.ts STORAGE_KEY
    const guestSessionData = localStorage.getItem('e_meble_guest_session');
    if (!guestSessionData) return;

    try {
      const parsed = JSON.parse(guestSessionData);
      const sessionId = parsed.sessionId;

      if (!sessionId) return;

      const response = await fetch('/api/auth/migrate-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId,
        },
      });

      if (response.ok) {
        // Clear guest session after successful migration
        localStorage.removeItem('e_meble_guest_session');
        localStorage.removeItem('e_meble_guest_email');
      }
    } catch (error) {
      console.error('Failed to migrate guest credits:', error);
    }
  }, []);

  // Initialize auth state - runs only once
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initAuth = async () => {
      let isUserAuthenticated = false;

      try {
        const { data: { user: validatedUser }, error: userError } =
          await supabase.auth.getUser();

        if (userError || !validatedUser) {
          // No valid session
          setUser(null);
          setSession(null);
          setProfile(null);
        } else {
          // Valid user found
          isUserAuthenticated = true;
          const { data: { session: currentSession } } =
            await supabase.auth.getSession();

          setUser(validatedUser);
          setSession(currentSession);

          // Fetch profile in background, don't block loading
          fetchProfile(validatedUser.id);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setUser(null);
        setSession(null);
        setProfile(null);
      } finally {
        // Always finish loading
        setIsLoading(false);
      }

      // Track app session start (after auth check is complete)
      const referrer = typeof document !== 'undefined' ? document.referrer : '';
      let entryPoint: 'direct' | 'landing' | 'article' | 'external' = 'direct';

      if (referrer.includes('e-meble.pl') || referrer.includes('localhost:3001')) {
        entryPoint = referrer.includes('/blog/') ? 'article' : 'landing';
      } else if (referrer && !referrer.includes(window.location.origin)) {
        entryPoint = 'external';
      }

      track(AnalyticsEvent.APP_SESSION_STARTED, {
        entry_point: entryPoint,
        is_authenticated: isUserAuthenticated,
        user_type: isUserAuthenticated ? 'authenticated' : 'guest',
      });
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          fetchProfile(newSession.user.id);
        } else {
          setProfile(null);
        }

        if (event === 'SIGNED_IN') {
          migrateGuestCredits();

          // Track login - determine method from provider
          const provider = newSession?.user?.app_metadata?.provider;
          track(AnalyticsEvent.AUTH_LOGIN_COMPLETED, {
            method: provider === 'google' ? 'google' : provider === 'github' ? 'github' : 'email',
          });
        }

        if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile, migrateGuestCredits]);

  // Sign in with email/password
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  // Sign up with email/password
  const signUp = async (
    email: string,
    password: string,
    metadata?: Record<string, unknown>
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  };

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    return { error };
  };

  // Reset password
  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  // Update password
  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { error };
  };

  // Refresh session
  const refreshSession = async () => {
    const { data: { session: newSession } } = await supabase.auth.refreshSession();
    if (newSession) {
      setSession(newSession);
      setUser(newSession.user);
    }
  };

  const value: AuthContextValue = {
    user,
    profile,
    session,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    resetPassword,
    updatePassword,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
