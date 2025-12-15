# Authentication System Implementation Plan

## Overview

This plan describes the implementation of a production-grade authentication system using Supabase Auth. The system integrates with the existing monetization infrastructure and prepares for future features like cloud project storage.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐      ┌─────────────────────┐      ┌─────────────────────┐ │
│  │   Browser   │      │    Next.js App      │      │      Supabase       │ │
│  │             │      │                     │      │                     │ │
│  │ ┌─────────┐ │      │ ┌─────────────────┐ │      │ ┌─────────────────┐ │ │
│  │ │  React  │ │◄────►│ │   Middleware    │ │◄────►│ │    Auth         │ │ │
│  │ │   App   │ │      │ │ (session check) │ │      │ │   (GoTrue)      │ │ │
│  │ └────┬────┘ │      │ └─────────────────┘ │      │ └─────────────────┘ │ │
│  │      │      │      │          │          │      │          │          │ │
│  │      │      │      │          ▼          │      │          ▼          │ │
│  │      │      │      │ ┌─────────────────┐ │      │ ┌─────────────────┐ │ │
│  │      └──────┼─────►│ │   API Routes    │ │◄────►│ │    Database     │ │ │
│  │             │      │ │  /api/auth/*    │ │      │ │  (PostgreSQL)   │ │ │
│  │             │      │ └─────────────────┘ │      │ └─────────────────┘ │ │
│  └─────────────┘      └─────────────────────┘      └─────────────────────┘ │
│                                                                              │
│                          ┌──────────────────────┐                           │
│                          │    OAuth Providers   │                           │
│                          │  • Google            │                           │
│                          │  • GitHub (optional) │                           │
│                          └──────────────────────┘                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Integration with Existing Monetization System

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    AUTH ↔ MONETIZATION INTEGRATION                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────────┐                          ┌───────────────────────┐  │
│  │   Guest User      │                          │  Authenticated User   │  │
│  │                   │        Register/Login    │                       │  │
│  │ • session_id      │ ───────────────────────► │ • user_id (UUID)      │  │
│  │ • guest_credits   │                          │ • export_credits      │  │
│  │ • localStorage    │                          │ • profiles table      │  │
│  └───────────────────┘                          │ • cloud storage       │  │
│           │                                     └───────────────────────┘  │
│           │                                              ▲                  │
│           │            Auto-migrate credits              │                  │
│           └──────────────────────────────────────────────┘                  │
│                                                                              │
│  Benefits of registration:                                                  │
│  ✓ Credits never expire                                                    │
│  ✓ Project cloud storage (future)                                          │
│  ✓ Access from any device                                                  │
│  ✓ Order history                                                           │
│  ✓ Priority support (Pro)                                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Supabase Configuration & Database Schema

### 1.1 Environment Variables

**File:** `apps/app/.env.local` (add to `.env.example`)

```bash
# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Server-side only, never expose

# OAuth Providers
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# Auth Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
AUTH_REDIRECT_URL=http://localhost:3000/auth/callback
```

### 1.2 Database Schema - User Profiles

**File:** `supabase/migrations/020_create_profiles.sql`

```sql
-- User profiles extending auth.users
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Display info
  display_name TEXT,
  avatar_url TEXT,

  -- Contact (from OAuth or manual)
  email TEXT UNIQUE NOT NULL,
  phone TEXT,

  -- Preferences
  preferred_locale TEXT DEFAULT 'pl',
  newsletter_subscribed BOOLEAN DEFAULT false,
  marketing_consent BOOLEAN DEFAULT false,

  -- Feature flags
  is_beta_tester BOOLEAN DEFAULT false,

  -- Account status
  is_active BOOLEAN DEFAULT true,
  banned_at TIMESTAMPTZ,
  ban_reason TEXT,

  -- Analytics
  first_login_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  login_count INT DEFAULT 0,

  -- Registration source
  registration_source TEXT DEFAULT 'direct', -- 'direct', 'google', 'github', 'tenant'
  tenant_id TEXT REFERENCES tenants(id),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_tenant ON profiles(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_profiles_active ON profiles(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Service role can manage all profiles
CREATE POLICY "Service role full access" ON profiles
  FOR ALL USING (auth.role() = 'service_role');

-- Trigger for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 1.3 Auto-create Profile on Signup

**File:** `supabase/migrations/021_create_profile_trigger.sql`

```sql
-- Automatically create profile when user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name, avatar_url, registration_source, first_login_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    CASE
      WHEN NEW.raw_app_meta_data->>'provider' = 'google' THEN 'google'
      WHEN NEW.raw_app_meta_data->>'provider' = 'github' THEN 'github'
      ELSE 'direct'
    END,
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Update login stats
CREATE OR REPLACE FUNCTION update_login_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET
    last_login_at = NOW(),
    login_count = login_count + 1
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: This trigger fires on auth.sessions, but Supabase doesn't expose it
-- We'll call update_login_stats from the callback route instead
```

### 1.4 Session Storage Table (for SSR)

**File:** `supabase/migrations/022_create_sessions.sql`

```sql
-- Optional: Server-side session cache for performance
CREATE TABLE auth_sessions_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Session data
  access_token_hash TEXT NOT NULL,
  refresh_token_hash TEXT NOT NULL,

  -- Expiry
  expires_at TIMESTAMPTZ NOT NULL,

  -- Client info (for security audit)
  ip_address INET,
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_sessions_user ON auth_sessions_cache(user_id);
CREATE INDEX idx_sessions_expires ON auth_sessions_cache(expires_at);

-- Auto-cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM auth_sessions_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (Supabase pg_cron)
-- SELECT cron.schedule('cleanup-sessions', '0 * * * *', 'SELECT cleanup_expired_sessions()');
```

---

## Phase 2: Supabase Client Setup

### 2.1 Browser Client (Client Components)

**File:** `apps/app/src/lib/supabase/client.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Singleton for browser
let browserClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createClient();
  }
  return browserClient;
}
```

### 2.2 Server Client (Server Components & Route Handlers)

**File:** `apps/app/src/lib/supabase/server.ts`

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component - ignore
          }
        },
      },
    }
  );
}

// Service role client for admin operations
export function createServiceRoleClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
```

### 2.3 Middleware Client

**File:** `apps/app/src/lib/supabase/middleware.ts`

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/supabase';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do not run code between createServerClient and supabase.auth.getUser()
  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user, supabase };
}
```

---

## Phase 3: Authentication Middleware

### 3.1 Main Middleware

**File:** `apps/app/middleware.ts`

```typescript
import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/settings',
  '/projects',
  '/orders',
];

// Routes only for non-authenticated users
const AUTH_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
];

// API routes that require authentication
const PROTECTED_API_ROUTES = [
  '/api/credits',
  '/api/projects',
  '/api/orders',
  '/api/profile',
];

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  // Check if route is protected
  const isProtectedRoute = PROTECTED_ROUTES.some(route =>
    pathname.startsWith(route)
  );

  const isAuthRoute = AUTH_ROUTES.some(route =>
    pathname.startsWith(route)
  );

  const isProtectedApiRoute = PROTECTED_API_ROUTES.some(route =>
    pathname.startsWith(route)
  );

  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users from auth routes
  if (isAuthRoute && user) {
    const redirect = request.nextUrl.searchParams.get('redirect') || '/';
    return NextResponse.redirect(new URL(redirect, request.url));
  }

  // Return 401 for protected API routes
  if (isProtectedApiRoute && !user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    );
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

---

## Phase 4: Authentication Context & Hooks

### 4.1 Auth Context Provider

**File:** `apps/app/src/providers/AuthProvider.tsx`

```typescript
'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface Profile {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  email: string;
  preferredLocale: string;
  isActive: boolean;
}

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<{ error: AuthError | null }>;
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

  const supabase = getSupabaseBrowserClient();

  // Fetch user profile
  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data && !error) {
      setProfile({
        id: data.id,
        displayName: data.display_name,
        avatarUrl: data.avatar_url,
        email: data.email,
        preferredLocale: data.preferred_locale || 'pl',
        isActive: data.is_active,
      });
    }
  }, [supabase]);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);
          setSession(session);
          await fetchProfile(session.user.id);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }

        // Handle specific events
        if (event === 'SIGNED_IN') {
          // Migrate guest credits if available
          await migrateGuestCredits();
        }

        if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  // Migrate guest credits after sign in
  const migrateGuestCredits = async () => {
    const guestSessionId = localStorage.getItem('meblarz_guest_session');
    if (!guestSessionId) return;

    try {
      const response = await fetch('/api/auth/migrate-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': JSON.parse(guestSessionId).id,
        },
      });

      if (response.ok) {
        // Clear guest session after successful migration
        localStorage.removeItem('meblarz_guest_session');
      }
    } catch (error) {
      console.error('Failed to migrate guest credits:', error);
    }
  };

  // Sign in with email/password
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  // Sign up with email/password
  const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
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
    const { data: { session } } = await supabase.auth.refreshSession();
    if (session) {
      setSession(session);
      setUser(session.user);
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### 4.2 Server-side Auth Helper

**File:** `apps/app/src/lib/auth/getServerUser.ts`

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function getServerUser() {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, profile: null };
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return { user, profile };
}

export async function requireAuth() {
  const { user, profile } = await getServerUser();

  if (!user) {
    throw new Error('Authentication required');
  }

  return { user, profile };
}
```

---

## Phase 5: Authentication Pages & Components

### 5.1 Login Page

**File:** `apps/app/src/app/[locale]/login/page.tsx`

```typescript
import { LoginForm } from '@/components/auth/LoginForm';
import { getServerUser } from '@/lib/auth/getServerUser';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Logowanie - Meblarz',
  description: 'Zaloguj się do swojego konta Meblarz',
};

interface LoginPageProps {
  searchParams: { redirect?: string; error?: string };
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { user } = await getServerUser();

  if (user) {
    redirect(searchParams.redirect || '/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Zaloguj się
          </h1>
          <p className="mt-2 text-muted-foreground">
            Nie masz jeszcze konta?{' '}
            <a href="/register" className="text-primary hover:underline">
              Zarejestruj się
            </a>
          </p>
        </div>

        <LoginForm
          redirectTo={searchParams.redirect}
          errorMessage={searchParams.error}
        />
      </div>
    </div>
  );
}
```

### 5.2 Login Form Component

**File:** `apps/app/src/components/auth/LoginForm.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@meble/ui/button';
import { Input } from '@meble/ui/input';
import { Label } from '@meble/ui/label';
import { Alert, AlertDescription } from '@meble/ui/alert';
import { Loader2, Mail, Lock, Chrome } from 'lucide-react';

interface LoginFormProps {
  redirectTo?: string;
  errorMessage?: string;
}

export function LoginForm({ redirectTo, errorMessage }: LoginFormProps) {
  const router = useRouter();
  const { signIn, signInWithGoogle, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(errorMessage || null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Nieprawidłowy email lub hasło');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Potwierdź swój email przed zalogowaniem');
        } else {
          setError('Wystąpił błąd podczas logowania');
        }
        return;
      }

      router.push(redirectTo || '/');
      router.refresh();
    } catch (err) {
      setError('Wystąpił nieoczekiwany błąd');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    const { error } = await signInWithGoogle();

    if (error) {
      setError('Wystąpił błąd podczas logowania przez Google');
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="twoj@email.pl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              required
              autoComplete="email"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Hasło</Label>
            <a
              href="/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              Zapomniałeś hasła?
            </a>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10"
              required
              autoComplete="current-password"
              minLength={8}
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || authLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Logowanie...
            </>
          ) : (
            'Zaloguj się'
          )}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Lub kontynuuj przez
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignIn}
        disabled={isLoading || authLoading}
      >
        <Chrome className="mr-2 h-4 w-4" />
        Google
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Logując się, akceptujesz{' '}
        <a href="/regulamin" className="underline hover:text-foreground">
          Regulamin
        </a>{' '}
        i{' '}
        <a href="/polityka-prywatnosci" className="underline hover:text-foreground">
          Politykę prywatności
        </a>
      </p>
    </div>
  );
}
```

### 5.3 Register Page

**File:** `apps/app/src/app/[locale]/register/page.tsx`

```typescript
import { RegisterForm } from '@/components/auth/RegisterForm';
import { getServerUser } from '@/lib/auth/getServerUser';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Rejestracja - Meblarz',
  description: 'Załóż konto w Meblarz i projektuj meble',
};

interface RegisterPageProps {
  searchParams: { redirect?: string };
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { user } = await getServerUser();

  if (user) {
    redirect(searchParams.redirect || '/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Utwórz konto
          </h1>
          <p className="mt-2 text-muted-foreground">
            Masz już konto?{' '}
            <a href="/login" className="text-primary hover:underline">
              Zaloguj się
            </a>
          </p>
        </div>

        <RegisterForm redirectTo={searchParams.redirect} />
      </div>
    </div>
  );
}
```

### 5.4 Register Form Component

**File:** `apps/app/src/components/auth/RegisterForm.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@meble/ui/button';
import { Input } from '@meble/ui/input';
import { Label } from '@meble/ui/label';
import { Checkbox } from '@meble/ui/checkbox';
import { Alert, AlertDescription } from '@meble/ui/alert';
import { Loader2, Mail, Lock, User, Chrome, CheckCircle } from 'lucide-react';

interface RegisterFormProps {
  redirectTo?: string;
}

export function RegisterForm({ redirectTo }: RegisterFormProps) {
  const router = useRouter();
  const { signUp, signInWithGoogle, isLoading: authLoading } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [newsletter, setNewsletter] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (password !== confirmPassword) {
      setError('Hasła nie są identyczne');
      return;
    }

    if (password.length < 8) {
      setError('Hasło musi mieć minimum 8 znaków');
      return;
    }

    if (!acceptTerms) {
      setError('Musisz zaakceptować regulamin');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signUp(email, password, {
        full_name: name,
        newsletter_subscribed: newsletter,
      });

      if (error) {
        if (error.message.includes('already registered')) {
          setError('Ten email jest już zarejestrowany');
        } else if (error.message.includes('Password')) {
          setError('Hasło jest za słabe. Użyj minimum 8 znaków');
        } else {
          setError('Wystąpił błąd podczas rejestracji');
        }
        return;
      }

      setIsSuccess(true);
    } catch (err) {
      setError('Wystąpił nieoczekiwany błąd');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    const { error } = await signInWithGoogle();

    if (error) {
      setError('Wystąpił błąd podczas rejestracji przez Google');
    }
  };

  // Success message
  if (isSuccess) {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <h2 className="text-xl font-semibold">Sprawdź swoją skrzynkę!</h2>
        <p className="text-muted-foreground">
          Wysłaliśmy link potwierdzający na adres <strong>{email}</strong>.
          Kliknij w link aby aktywować konto.
        </p>
        <Button
          variant="outline"
          onClick={() => router.push('/login')}
          className="mt-4"
        >
          Przejdź do logowania
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Imię (opcjonalnie)</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="name"
              type="text"
              placeholder="Jan Kowalski"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="pl-10"
              autoComplete="name"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="twoj@email.pl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              required
              autoComplete="email"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Hasło *</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="Minimum 8 znaków"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10"
              required
              autoComplete="new-password"
              minLength={8}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Potwierdź hasło *</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Powtórz hasło"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10"
              required
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={acceptTerms}
              onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
              required
            />
            <Label htmlFor="terms" className="text-sm leading-tight cursor-pointer">
              Akceptuję{' '}
              <a href="/regulamin" className="text-primary hover:underline" target="_blank">
                Regulamin
              </a>{' '}
              i{' '}
              <a href="/polityka-prywatnosci" className="text-primary hover:underline" target="_blank">
                Politykę prywatności
              </a> *
            </Label>
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="newsletter"
              checked={newsletter}
              onCheckedChange={(checked) => setNewsletter(checked as boolean)}
            />
            <Label htmlFor="newsletter" className="text-sm leading-tight cursor-pointer">
              Chcę otrzymywać informacje o nowościach i promocjach
            </Label>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || authLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Rejestracja...
            </>
          ) : (
            'Zarejestruj się'
          )}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Lub kontynuuj przez
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignIn}
        disabled={isLoading || authLoading}
      >
        <Chrome className="mr-2 h-4 w-4" />
        Google
      </Button>

      <div className="bg-muted/50 p-4 rounded-lg">
        <p className="text-sm font-medium mb-2">Korzyści z konta:</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>✓ Kredyty eksportu nigdy nie wygasają</li>
          <li>✓ Historia projektów i eksportów</li>
          <li>✓ +2 darmowe kredyty na start</li>
          <li>✓ Dostęp z każdego urządzenia</li>
        </ul>
      </div>
    </div>
  );
}
```

### 5.5 Auth Callback Handler

**File:** `apps/app/src/app/[locale]/auth/callback/route.ts`

```typescript
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
        new URL(`/login?error=${encodeURIComponent('Błąd autoryzacji')}`, requestUrl.origin)
      );
    }

    // Update login stats
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({
          last_login_at: new Date().toISOString(),
          login_count: supabase.rpc('increment_login_count', { user_id: user.id }),
        })
        .eq('id', user.id);
    }
  }

  // Redirect to requested page or home
  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
```

### 5.6 Forgot Password Page

**File:** `apps/app/src/app/[locale]/forgot-password/page.tsx`

```typescript
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export const metadata = {
  title: 'Resetuj hasło - Meblarz',
  description: 'Zresetuj hasło do konta Meblarz',
};

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Resetuj hasło
          </h1>
          <p className="mt-2 text-muted-foreground">
            Podaj email, a wyślemy Ci link do zresetowania hasła
          </p>
        </div>

        <ForgotPasswordForm />

        <p className="text-center">
          <a href="/login" className="text-sm text-primary hover:underline">
            Wróć do logowania
          </a>
        </p>
      </div>
    </div>
  );
}
```

### 5.7 Reset Password Page

**File:** `apps/app/src/app/[locale]/reset-password/page.tsx`

```typescript
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export const metadata = {
  title: 'Nowe hasło - Meblarz',
  description: 'Ustaw nowe hasło do konta Meblarz',
};

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Ustaw nowe hasło
          </h1>
          <p className="mt-2 text-muted-foreground">
            Wprowadź nowe hasło do swojego konta
          </p>
        </div>

        <ResetPasswordForm />
      </div>
    </div>
  );
}
```

---

## Phase 6: User Menu & Profile Components

### 6.1 User Menu (Header Component)

**File:** `apps/app/src/components/auth/UserMenu.tsx`

```typescript
'use client';

import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { Button } from '@meble/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@meble/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@meble/ui/avatar';
import {
  User,
  Settings,
  CreditCard,
  History,
  LogOut,
  ChevronDown,
} from 'lucide-react';

export function UserMenu() {
  const router = useRouter();
  const { user, profile, isAuthenticated, isLoading, signOut } = useAuth();

  if (isLoading) {
    return (
      <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={() => router.push('/login')}>
          Zaloguj się
        </Button>
        <Button onClick={() => router.push('/register')}>
          Zarejestruj
        </Button>
      </div>
    );
  }

  const initials = profile?.displayName
    ? profile.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 px-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatarUrl || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden md:block max-w-32 truncate">
            {profile?.displayName || user?.email}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium truncate">
            {profile?.displayName || 'Użytkownik'}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {user?.email}
          </p>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => router.push('/settings/profile')}>
          <User className="mr-2 h-4 w-4" />
          Profil
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => router.push('/settings/credits')}>
          <CreditCard className="mr-2 h-4 w-4" />
          Kredyty
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => router.push('/settings/history')}>
          <History className="mr-2 h-4 w-4" />
          Historia eksportów
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => router.push('/settings')}>
          <Settings className="mr-2 h-4 w-4" />
          Ustawienia
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Wyloguj
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### 6.2 Auth Guard Component

**File:** `apps/app/src/components/auth/AuthGuard.tsx`

```typescript
'use client';

import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function AuthGuard({ children, fallback, redirectTo = '/login' }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const currentPath = window.location.pathname;
      router.push(`${redirectTo}?redirect=${encodeURIComponent(currentPath)}`);
    }
  }, [isLoading, isAuthenticated, router, redirectTo]);

  if (isLoading) {
    return fallback || (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
```

---

## Phase 7: API Routes

### 7.1 Profile API

**File:** `apps/app/src/app/api/profile/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
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
      { success: false, error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      id: profile.id,
      email: profile.email,
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

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { displayName, preferredLocale, newsletterSubscribed } = body;

  const updateData: Record<string, any> = {};

  if (displayName !== undefined) updateData.display_name = displayName;
  if (preferredLocale !== undefined) updateData.preferred_locale = preferredLocale;
  if (newsletterSubscribed !== undefined) updateData.newsletter_subscribed = newsletterSubscribed;

  const { data: profile, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: 'UPDATE_FAILED', message: 'Failed to update profile' } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      id: profile.id,
      email: profile.email,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      preferredLocale: profile.preferred_locale,
      newsletterSubscribed: profile.newsletter_subscribed,
    },
  });
}
```

### 7.2 Migrate Guest Credits API

**File:** `apps/app/src/app/api/auth/migrate-credits/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const serviceClient = createServiceRoleClient();

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
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
    const remainingCredits = guestCredit.credits_total - guestCredit.credits_used;

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
```

---

## Phase 8: TypeScript Types

### 8.1 Database Types Generation

**File:** `apps/app/src/types/supabase.ts`

```typescript
// Generate with: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          avatar_url: string | null
          email: string
          phone: string | null
          preferred_locale: string
          newsletter_subscribed: boolean
          marketing_consent: boolean
          is_beta_tester: boolean
          is_active: boolean
          banned_at: string | null
          ban_reason: string | null
          first_login_at: string | null
          last_login_at: string | null
          login_count: number
          registration_source: string
          tenant_id: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          avatar_url?: string | null
          email: string
          phone?: string | null
          preferred_locale?: string
          newsletter_subscribed?: boolean
          marketing_consent?: boolean
          is_beta_tester?: boolean
          is_active?: boolean
          banned_at?: string | null
          ban_reason?: string | null
          first_login_at?: string | null
          last_login_at?: string | null
          login_count?: number
          registration_source?: string
          tenant_id?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          avatar_url?: string | null
          email?: string
          phone?: string | null
          preferred_locale?: string
          newsletter_subscribed?: boolean
          marketing_consent?: boolean
          is_beta_tester?: boolean
          is_active?: boolean
          banned_at?: string | null
          ban_reason?: string | null
          first_login_at?: string | null
          last_login_at?: string | null
          login_count?: number
          registration_source?: string
          tenant_id?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      // ... other tables from monetization schema
    }
  }
}
```

### 8.2 Auth Types

**File:** `apps/app/src/types/auth.ts`

```typescript
export interface Profile {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  email: string;
  preferredLocale: string;
  newsletterSubscribed: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: {
    id: string;
    email: string;
    emailConfirmedAt: string | null;
  } | null;
  profile: Profile | null;
}

export type AuthProvider = 'email' | 'google' | 'github';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  name?: string;
  acceptTerms: boolean;
  newsletter?: boolean;
}
```

---

## Phase 9: Layout Integration

### 9.1 Root Layout with AuthProvider

**File:** `apps/app/src/app/[locale]/layout.tsx` (update)

```typescript
import { AuthProvider } from '@/providers/AuthProvider';
import { TenantProvider } from '@/providers/TenantProvider';
// ... other imports

export default async function RootLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // ... existing code

  return (
    <html lang={locale}>
      <body>
        <AuthProvider>
          <TenantProvider tenant={tenant}>
            {children}
          </TenantProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
```

---

## Phase 10: Security Checklist

### 10.1 Production Security Requirements

```
□ Environment Variables
  □ SUPABASE_SERVICE_ROLE_KEY only on server (never in NEXT_PUBLIC_*)
  □ All secrets in environment, not in code
  □ Different keys for staging/production

□ Supabase Configuration
  □ RLS enabled on all tables
  □ Policies tested for all CRUD operations
  □ Service role used only where necessary

□ Authentication
  □ Email confirmation required
  □ Password minimum 8 characters
  □ Rate limiting on auth endpoints
  □ Session expiry configured
  □ Refresh token rotation enabled

□ OAuth Configuration
  □ Google OAuth credentials configured
  □ Redirect URLs whitelisted
  □ State parameter validation

□ CSRF Protection
  □ Supabase handles this automatically with cookies

□ XSS Prevention
  □ All user input sanitized
  □ CSP headers configured

□ API Security
  □ Protected routes return 401 for unauthenticated
  □ User can only access own data (RLS)
  □ Input validation on all endpoints
```

### 10.2 Supabase Dashboard Configuration

```
Authentication Settings:
┌─────────────────────────────────────────────────────────────┐
│ Email Auth                                                  │
│ ─────────────────────────────────────────────────────────── │
│ ✓ Enable email confirmations                               │
│ ✓ Enable email change confirmations                        │
│ ✓ Enable double confirm email changes                      │
│ Minimum password length: 8                                  │
│ Password requirements: Letters + Numbers recommended        │
│                                                             │
│ Session                                                     │
│ ─────────────────────────────────────────────────────────── │
│ JWT expiry: 3600 (1 hour)                                  │
│ Refresh token rotation: Enabled                            │
│ Refresh token reuse interval: 10 seconds                   │
│                                                             │
│ OAuth Providers                                             │
│ ─────────────────────────────────────────────────────────── │
│ ✓ Google                                                    │
│   - Client ID: xxx.apps.googleusercontent.com              │
│   - Client Secret: [hidden]                                 │
│   - Authorized redirect URI:                               │
│     https://yourproject.supabase.co/auth/v1/callback       │
│                                                             │
│ URL Configuration                                           │
│ ─────────────────────────────────────────────────────────── │
│ Site URL: https://meblarz.pl                               │
│ Redirect URLs:                                              │
│   - https://meblarz.pl/auth/callback                       │
│   - https://meblarz.pl/reset-password                      │
│   - http://localhost:3000/auth/callback (dev only)         │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Tasks Checklist

### Phase 1: Database & Configuration
```
□ 1.1 Create profiles migration file
□ 1.2 Create profile trigger migration
□ 1.3 Create session cache migration (optional)
□ 1.4 Update .env.example with new variables
□ 1.5 Run migrations on Supabase
□ 1.6 Configure OAuth in Supabase dashboard
```

### Phase 2: Supabase Clients
```
□ 2.1 Create browser client (src/lib/supabase/client.ts)
□ 2.2 Create server client (src/lib/supabase/server.ts)
□ 2.3 Create middleware client (src/lib/supabase/middleware.ts)
□ 2.4 Install @supabase/ssr package
```

### Phase 3: Middleware
```
□ 3.1 Create/update middleware.ts
□ 3.2 Define protected routes list
□ 3.3 Test session refresh
□ 3.4 Test route protection
```

### Phase 4: Auth Context
```
□ 4.1 Create AuthProvider component
□ 4.2 Implement useAuth hook
□ 4.3 Add guest credits migration logic
□ 4.4 Create getServerUser helper
```

### Phase 5: Auth Pages
```
□ 5.1 Create login page and form
□ 5.2 Create register page and form
□ 5.3 Create forgot-password page
□ 5.4 Create reset-password page
□ 5.5 Create auth/callback route handler
□ 5.6 Add email confirmation page
```

### Phase 6: UI Components
```
□ 6.1 Create UserMenu component
□ 6.2 Create AuthGuard component
□ 6.3 Update header with UserMenu
□ 6.4 Create CreditsDisplay integration
```

### Phase 7: API Routes
```
□ 7.1 Create profile GET/PATCH API
□ 7.2 Create migrate-credits API
□ 7.3 Update existing credits API with auth check
```

### Phase 8: Types
```
□ 8.1 Generate Supabase types
□ 8.2 Create auth types file
□ 8.3 Update existing types
```

### Phase 9: Integration
```
□ 9.1 Add AuthProvider to layout
□ 9.2 Update ExportDialog with auth status
□ 9.3 Update useCredits hook integration
□ 9.4 Test guest → user credit migration
```

### Phase 10: Testing & Security
```
□ 10.1 Test login/register flows
□ 10.2 Test OAuth flow
□ 10.3 Test password reset
□ 10.4 Test protected routes
□ 10.5 Test credit migration
□ 10.6 Security audit (RLS, secrets, etc.)
□ 10.7 Production deployment checklist
```

---

## Dependencies to Install

```bash
pnpm add @supabase/ssr @supabase/supabase-js
```

---

## Future Considerations (Architecture Ready)

The authentication system is designed to support:

1. **Cloud Project Storage**
   - `projects` table linked to `profiles.id`
   - Auto-save with versioning
   - Share via URL (optional)

2. **Team/Organization Support**
   - `organizations` table
   - `organization_members` junction table
   - Role-based access control

3. **Admin Panel**
   - Admin role in profiles
   - Separate admin dashboard
   - User management capabilities

4. **Multi-tenant Authentication**
   - Tenant-specific auth settings
   - Custom branding on auth pages
   - SSO integration ready

---

*Document created: 14 December 2025*
*Version: 1.0*
