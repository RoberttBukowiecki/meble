/**
 * Admin Guard Component
 *
 * Production-grade component that:
 * - Checks if the current user has admin access
 * - Caches admin status to reduce API calls
 * - Has timeout protection to prevent infinite loading
 * - Handles all error states gracefully
 */

'use client';

import { useEffect, useState, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { Loader2, ShieldAlert } from 'lucide-react';

interface AdminGuardProps {
  children: ReactNode;
}

// Cache config
const ADMIN_CACHE_KEY = 'meble_admin_status';
const ADMIN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Timeout to prevent infinite loading
const AUTH_TIMEOUT_MS = 10000; // 10 seconds

interface AdminCache {
  isAdmin: boolean;
  userId: string;
  timestamp: number;
}

function getAdminCache(userId: string): boolean | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = sessionStorage.getItem(ADMIN_CACHE_KEY);
    if (!cached) return null;
    const data = JSON.parse(cached) as AdminCache;
    if (data.userId !== userId) return null;
    if (Date.now() - data.timestamp > ADMIN_CACHE_TTL) {
      sessionStorage.removeItem(ADMIN_CACHE_KEY);
      return null;
    }
    return data.isAdmin;
  } catch {
    return null;
  }
}

function setAdminCache(userId: string, isAdmin: boolean): void {
  if (typeof window === 'undefined') return;
  const data: AdminCache = { isAdmin, userId, timestamp: Date.now() };
  sessionStorage.setItem(ADMIN_CACHE_KEY, JSON.stringify(data));
}

function clearAdminCache(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(ADMIN_CACHE_KEY);
}

type Status = 'loading' | 'checking' | 'admin' | 'not-admin' | 'no-user' | 'error';

export function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const checkStarted = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Main effect to handle auth state and admin check
  useEffect(() => {
    // Set timeout to prevent infinite loading
    if (status === 'loading' && !timeoutRef.current) {
      timeoutRef.current = setTimeout(() => {
        if (status === 'loading') {
          console.error('AdminGuard: Auth timeout - forcing error state');
          setStatus('error');
          setError('Przekroczono czas oczekiwania na autoryzację. Odśwież stronę.');
        }
      }, AUTH_TIMEOUT_MS);
    }

    // Still waiting for auth provider
    if (authLoading) {
      return;
    }

    // Clear timeout since auth loaded
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // No user - set state and let redirect effect handle it
    if (!user) {
      setStatus('no-user');
      return;
    }

    // Already checking or checked
    if (checkStarted.current) {
      return;
    }

    // Start admin check
    checkStarted.current = true;
    setStatus('checking');

    const checkAdmin = async () => {
      try {
        // Check cache first
        const cachedStatus = getAdminCache(user.id);
        if (cachedStatus !== null) {
          setStatus(cachedStatus ? 'admin' : 'not-admin');
          return;
        }

        // Call RPC to check admin status
        const supabase = getSupabaseBrowserClient();
        const { data: isAdmin, error: rpcError } = await supabase.rpc(
          'is_admin',
          { p_user_id: user.id }
        );

        if (rpcError) {
          console.error('Admin check RPC error:', rpcError);
          // Don't cache errors - let user retry
          setStatus('not-admin');
          return;
        }

        const adminStatus = Boolean(isAdmin);
        setAdminCache(user.id, adminStatus);
        setStatus(adminStatus ? 'admin' : 'not-admin');
      } catch (err) {
        console.error('Admin check failed:', err);
        setStatus('error');
        setError('Nie udało się sprawdzić uprawnień. Spróbuj ponownie.');
      }
    };

    checkAdmin();
  }, [authLoading, user, status]);

  // Redirect effect for no-user state
  useEffect(() => {
    if (status === 'no-user') {
      router.push('/login?redirect=/admin');
    }
  }, [status, router]);

  // Loading state
  if (status === 'loading' || status === 'checking' || status === 'no-user') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">
            {status === 'no-user' ? 'Przekierowywanie...' : 'Sprawdzanie uprawnień...'}
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4 text-center max-w-md px-4">
          <ShieldAlert className="h-16 w-16 text-destructive" />
          <h1 className="text-2xl font-bold">Wystąpił błąd</h1>
          <p className="text-muted-foreground">{error}</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                clearAdminCache();
                checkStarted.current = false;
                setStatus('loading');
                setError(null);
              }}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Spróbuj ponownie
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 border border-input rounded-md hover:bg-accent transition-colors"
            >
              Strona główna
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Not admin state
  if (status === 'not-admin') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4 text-center max-w-md px-4">
          <ShieldAlert className="h-16 w-16 text-destructive" />
          <h1 className="text-2xl font-bold">Brak dostępu</h1>
          <p className="text-muted-foreground">
            Nie masz uprawnień do wyświetlenia tej strony. Skontaktuj się z
            administratorem jeśli uważasz, że to błąd.
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Wróć do strony głównej
          </button>
        </div>
      </div>
    );
  }

  // Admin - render children
  return <>{children}</>;
}
