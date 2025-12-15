/**
 * Guest Session Hook
 *
 * Manages guest session ID in localStorage for anonymous credit purchases.
 * Session ID is created once and persisted until user clears localStorage.
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'e_meble_guest_session';
const EMAIL_KEY = 'e_meble_guest_email';

interface GuestSession {
  sessionId: string;
  email: string | null;
  createdAt: string;
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const randomPart2 = Math.random().toString(36).substring(2, 15);
  return `guest_${timestamp}_${randomPart}${randomPart2}`;
}

/**
 * Hook for managing guest session
 */
export function useGuestSession() {
  const [session, setSession] = useState<GuestSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize session from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const storedEmail = localStorage.getItem(EMAIL_KEY);

      if (stored) {
        const parsed = JSON.parse(stored) as GuestSession;
        parsed.email = storedEmail;
        setSession(parsed);
      } else {
        // Create new session
        const newSession: GuestSession = {
          sessionId: generateSessionId(),
          email: null,
          createdAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
        setSession(newSession);
      }
    } catch (error) {
      console.error('Failed to load guest session:', error);
      // Create fallback session
      const fallbackSession: GuestSession = {
        sessionId: generateSessionId(),
        email: null,
        createdAt: new Date().toISOString(),
      };
      setSession(fallbackSession);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save email for recovery
  const setEmail = useCallback((email: string) => {
    if (!session) return;

    try {
      localStorage.setItem(EMAIL_KEY, email);
      setSession((prev) => (prev ? { ...prev, email } : null));
    } catch (error) {
      console.error('Failed to save guest email:', error);
    }
  }, [session]);

  // Clear session (used after migration to user account)
  const clearSession = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(EMAIL_KEY);
      // Generate new session after clearing
      const newSession: GuestSession = {
        sessionId: generateSessionId(),
        email: null,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
      setSession(newSession);
    } catch (error) {
      console.error('Failed to clear guest session:', error);
    }
  }, []);

  return {
    sessionId: session?.sessionId ?? null,
    email: session?.email ?? null,
    createdAt: session?.createdAt ?? null,
    isLoading,
    setEmail,
    clearSession,
  };
}

export type { GuestSession };
