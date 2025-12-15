export interface Profile {
  id: string;
  fullName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
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
