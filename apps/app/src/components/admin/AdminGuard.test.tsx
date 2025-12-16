import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminGuard } from './AdminGuard';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock AuthProvider
const mockUseAuth = jest.fn();
jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock Supabase client for RPC call
const mockRpc = jest.fn();
jest.mock('@/lib/supabase/client', () => ({
  getSupabaseBrowserClient: () => ({
    rpc: mockRpc,
  }),
}));

describe('AdminGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear session storage before each test
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  });

  describe('Loading state', () => {
    it('shows loading spinner when auth is loading', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: true,
      });

      render(
        <AdminGuard>
          <div>Admin Content</div>
        </AdminGuard>
      );

      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
      expect(screen.getByText('Sprawdzanie uprawnień...')).toBeInTheDocument();
    });
  });

  describe('Admin access granted', () => {
    it('renders children when user is admin', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-123' },
        isLoading: false,
      });
      mockRpc.mockResolvedValue({
        data: true,
        error: null,
      });

      render(
        <AdminGuard>
          <div>Admin Content</div>
        </AdminGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Content')).toBeInTheDocument();
      });
    });

    it('calls is_admin RPC with correct user ID', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user-id' },
        isLoading: false,
      });
      mockRpc.mockResolvedValue({
        data: true,
        error: null,
      });

      render(
        <AdminGuard>
          <div>Admin Content</div>
        </AdminGuard>
      );

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('is_admin', {
          p_user_id: 'test-user-id',
        });
      });
    });
  });

  describe('Access denied', () => {
    it('shows access denied when user is not admin', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-123' },
        isLoading: false,
      });
      mockRpc.mockResolvedValue({
        data: false,
        error: null,
      });

      render(
        <AdminGuard>
          <div>Admin Content</div>
        </AdminGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Brak dostępu')).toBeInTheDocument();
      });

      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
      expect(
        screen.getByText(/Nie masz uprawnień do wyświetlenia tej strony/)
      ).toBeInTheDocument();
    });

    it('shows access denied when admin check returns error', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-123' },
        isLoading: false,
      });
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC error' },
      });

      render(
        <AdminGuard>
          <div>Admin Content</div>
        </AdminGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Brak dostępu')).toBeInTheDocument();
      });
    });

    it('redirects to home when clicking back button', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-123' },
        isLoading: false,
      });
      mockRpc.mockResolvedValue({
        data: false,
        error: null,
      });

      render(
        <AdminGuard>
          <div>Admin Content</div>
        </AdminGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Brak dostępu')).toBeInTheDocument();
      });

      const backButton = screen.getByText('Wróć do strony głównej');
      await userEvent.click(backButton);

      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  describe('Unauthenticated user', () => {
    it('redirects to login when no user found', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
      });

      render(
        <AdminGuard>
          <div>Admin Content</div>
        </AdminGuard>
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login?redirect=/admin');
      });
    });
  });

  describe('Error handling', () => {
    it('handles exception during admin check gracefully', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'user-123' },
        isLoading: false,
      });
      mockRpc.mockRejectedValue(new Error('Network error'));

      render(
        <AdminGuard>
          <div>Admin Content</div>
        </AdminGuard>
      );

      await waitFor(() => {
        // Should show error state with retry button
        expect(screen.getByText('Wystąpił błąd')).toBeInTheDocument();
      });
    });
  });

  describe('Caching', () => {
    it('uses cached admin status on subsequent renders', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: 'cached-user' },
        isLoading: false,
      });
      mockRpc.mockResolvedValue({
        data: true,
        error: null,
      });

      const { unmount } = render(
        <AdminGuard>
          <div>Admin Content</div>
        </AdminGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Content')).toBeInTheDocument();
      });

      // First render calls RPC
      expect(mockRpc).toHaveBeenCalledTimes(1);

      unmount();

      // Re-render with same user
      render(
        <AdminGuard>
          <div>Admin Content Again</div>
        </AdminGuard>
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Content Again')).toBeInTheDocument();
      });

      // Second render should use cache (no additional RPC call)
      expect(mockRpc).toHaveBeenCalledTimes(1);
    });
  });
});
