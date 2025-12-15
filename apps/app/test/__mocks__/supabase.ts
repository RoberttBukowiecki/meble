// Mock Supabase client for testing
import { User, Session, AuthError } from '@supabase/supabase-js';

export const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: { full_name: 'Test User' },
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
};

export const mockSession: Session = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: mockUser,
};

export const mockProfile = {
  id: 'test-user-id',
  email: 'test@example.com',
  full_name: 'Test User',
  display_name: 'TestUser',
  avatar_url: 'https://example.com/avatar.jpg',
  preferred_locale: 'pl',
  newsletter_subscribed: false,
  marketing_consent: false,
  is_beta_tester: false,
  is_active: true,
  banned_at: null,
  ban_reason: null,
  first_login_at: '2024-01-01T00:00:00.000Z',
  last_login_at: '2024-01-01T00:00:00.000Z',
  login_count: 1,
  registration_source: 'direct',
  tenant_id: null,
  metadata: {},
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
};

export const createMockSupabaseClient = (overrides: {
  user?: User | null;
  session?: Session | null;
  profile?: typeof mockProfile | null;
  authError?: AuthError | null;
} = {}) => {
  const { user = null, session = null, profile = null, authError = null } = overrides;

  return {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session },
        error: null,
      }),
      getUser: jest.fn().mockResolvedValue({
        data: { user },
        error: authError,
      }),
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { user, session },
        error: authError,
      }),
      signUp: jest.fn().mockResolvedValue({
        data: { user, session },
        error: authError,
      }),
      signOut: jest.fn().mockResolvedValue({
        error: null,
      }),
      signInWithOAuth: jest.fn().mockResolvedValue({
        data: { url: 'https://example.com/oauth' },
        error: authError,
      }),
      resetPasswordForEmail: jest.fn().mockResolvedValue({
        error: authError,
      }),
      updateUser: jest.fn().mockResolvedValue({
        data: { user },
        error: authError,
      }),
      refreshSession: jest.fn().mockResolvedValue({
        data: { session },
        error: null,
      }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: {
          subscription: {
            unsubscribe: jest.fn(),
          },
        },
      }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: profile,
        error: null,
      }),
    }),
    rpc: jest.fn().mockResolvedValue({
      data: 1,
      error: null,
    }),
  };
};

// Mock the client module
export const mockGetSupabaseBrowserClient = jest.fn();
export const mockCreateServerSupabaseClient = jest.fn();
export const mockCreateServiceRoleClient = jest.fn();
