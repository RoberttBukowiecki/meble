/**
 * useIsAdmin Hook
 *
 * Simple hook to check if the current user has admin privileges.
 * Uses the same caching strategy as AdminGuard.
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

// Cache config (same as AdminGuard)
const ADMIN_CACHE_KEY = 'meble_admin_status';
const ADMIN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

export function useIsAdmin() {
  const { user, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    // Check cache first
    const cached = getAdminCache(user.id);
    if (cached !== null) {
      setIsAdmin(cached);
      setIsLoading(false);
      return;
    }

    // Fetch from Supabase RPC
    const checkAdmin = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase.rpc('is_admin', {
          p_user_id: user.id,
        });

        if (error) {
          console.error('Admin check error:', error);
          setIsAdmin(false);
        } else {
          const adminStatus = Boolean(data);
          setAdminCache(user.id, adminStatus);
          setIsAdmin(adminStatus);
        }
      } catch (err) {
        console.error('Admin check failed:', err);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdmin();
  }, [user, authLoading]);

  return { isAdmin, isLoading };
}
