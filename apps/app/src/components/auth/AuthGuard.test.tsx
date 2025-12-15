import { render, screen, waitFor } from '@testing-library/react';
import { AuthGuard } from './AuthGuard';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock auth provider - will be overridden per test
let mockAuthState = {
  isAuthenticated: false,
  isLoading: false,
};

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => mockAuthState,
}));

const originalHref = window.location.href;

beforeAll(() => {
  window.history.pushState({}, '', '/protected-page');
});

afterAll(() => {
  window.history.pushState({}, '', originalHref);
});

  describe('AuthGuard', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      window.history.pushState({}, '', '/protected-page');
  });

  describe('Loading state', () => {
    it('shows loading spinner when auth is loading', () => {
      mockAuthState = {
        isAuthenticated: false,
        isLoading: true,
      };

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      // Check for loading spinner (Loader2 component)
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('shows custom fallback when loading', () => {
      mockAuthState = {
        isAuthenticated: false,
        isLoading: true,
      };

      render(
        <AuthGuard fallback={<div>Custom Loading...</div>}>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(screen.getByText('Custom Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Authenticated state', () => {
    it('renders children when authenticated', () => {
      mockAuthState = {
        isAuthenticated: true,
        isLoading: false,
      };

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('does not redirect when authenticated', () => {
      mockAuthState = {
        isAuthenticated: true,
        isLoading: false,
      };

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Unauthenticated state', () => {
    it('redirects to login when not authenticated', async () => {
      mockAuthState = {
        isAuthenticated: false,
        isLoading: false,
      };

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          '/login?redirect=%2Fprotected-page'
        );
      });
    });

    it('redirects to custom URL when provided', async () => {
      mockAuthState = {
        isAuthenticated: false,
        isLoading: false,
      };

      render(
        <AuthGuard redirectTo="/custom-login">
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          '/custom-login?redirect=%2Fprotected-page'
        );
      });
    });

    it('does not render children when not authenticated', () => {
      mockAuthState = {
        isAuthenticated: false,
        isLoading: false,
      };

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('encodes special characters in redirect URL', async () => {
      mockAuthState = {
        isAuthenticated: false,
        isLoading: false,
      };
      window.history.pushState({}, '', '/page/with spaces');

      render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          '/login?redirect=%2Fpage%2Fwith%20spaces'
        );
      });
    });
  });

  describe('Transition states', () => {
    it('handles transition from loading to authenticated', async () => {
      mockAuthState = {
        isAuthenticated: false,
        isLoading: true,
      };

      const { rerender } = render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();

      mockAuthState = {
        isAuthenticated: true,
        isLoading: false,
      };

      rerender(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('handles transition from loading to unauthenticated', async () => {
      mockAuthState = {
        isAuthenticated: false,
        isLoading: true,
      };

      const { rerender } = render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      mockAuthState = {
        isAuthenticated: false,
        isLoading: false,
      };

      rerender(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });
    });
  });
});
