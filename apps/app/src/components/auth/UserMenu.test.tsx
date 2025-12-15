import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserMenu } from './UserMenu';

// Mock next/navigation
const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock auth provider - will be overridden per test
const mockSignOut = jest.fn();
let mockAuthState = {
  user: null as { id: string; email: string } | null,
  profile: null as { displayName: string | null; fullName: string | null; avatarUrl: string | null } | null,
  isAuthenticated: false,
  isLoading: false,
  signOut: mockSignOut,
};

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => mockAuthState,
}));

describe('UserMenu', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
    mockSignOut.mockResolvedValue(undefined);
  });

  describe('Loading state', () => {
    it('shows loading skeleton when auth is loading', () => {
      mockAuthState = {
        user: null,
        profile: null,
        isAuthenticated: false,
        isLoading: true,
        signOut: mockSignOut,
      };

      render(<UserMenu />);

      const skeleton = document.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('Unauthenticated state', () => {
    beforeEach(() => {
      mockAuthState = {
        user: null,
        profile: null,
        isAuthenticated: false,
        isLoading: false,
        signOut: mockSignOut,
      };
    });

    it('shows login and register buttons when not authenticated', () => {
      render(<UserMenu />);

      expect(screen.getByRole('button', { name: /zaloguj/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /zarejestruj/i })).toBeInTheDocument();
    });

    it('navigates to login page on login button click', async () => {
      render(<UserMenu />);

      await user.click(screen.getByRole('button', { name: /zaloguj/i }));

      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('navigates to register page on register button click', async () => {
      render(<UserMenu />);

      await user.click(screen.getByRole('button', { name: /zarejestruj/i }));

      expect(mockPush).toHaveBeenCalledWith('/register');
    });
  });

  describe('Authenticated state', () => {
    beforeEach(() => {
      mockAuthState = {
        user: { id: 'test-id', email: 'test@example.com' },
        profile: {
          displayName: 'TestUser',
          fullName: 'Test User',
          avatarUrl: 'https://example.com/avatar.jpg',
        },
        isAuthenticated: true,
        isLoading: false,
        signOut: mockSignOut,
      };
    });

    it('shows user avatar and name', () => {
      render(<UserMenu />);

      expect(screen.getByText('TestUser')).toBeInTheDocument();
    });

    it('shows initials when no avatar', () => {
      mockAuthState.profile!.avatarUrl = null;
      render(<UserMenu />);

      // T for TestUser (single word = single initial)
      expect(screen.getByText('T')).toBeInTheDocument();
    });

    it('shows email initials when no display name', () => {
      mockAuthState.profile = null;
      render(<UserMenu />);

      // TE for test@example.com
      expect(screen.getByText('TE')).toBeInTheDocument();
    });

    it('opens dropdown menu on click', async () => {
      render(<UserMenu />);

      const trigger = screen.getByRole('button', { name: /testuser/i });
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });
    });

    it('shows menu items in dropdown', async () => {
      render(<UserMenu />);

      const trigger = screen.getByRole('button', { name: /testuser/i });
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: /profil/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /kredyty/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /historia eksportow/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /ustawienia/i })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: /wyloguj/i })).toBeInTheDocument();
      });
    });

    it('navigates to profile on profile click', async () => {
      render(<UserMenu />);

      const trigger = screen.getByRole('button', { name: /testuser/i });
      await user.click(trigger);

      await waitFor(async () => {
        const profileItem = screen.getByRole('menuitem', { name: /profil/i });
        await user.click(profileItem);
      });

      expect(mockPush).toHaveBeenCalledWith('/settings/profile');
    });

    it('navigates to credits on credits click', async () => {
      render(<UserMenu />);

      const trigger = screen.getByRole('button', { name: /testuser/i });
      await user.click(trigger);

      await waitFor(async () => {
        const creditsItem = screen.getByRole('menuitem', { name: /kredyty/i });
        await user.click(creditsItem);
      });

      expect(mockPush).toHaveBeenCalledWith('/settings/credits');
    });

    it('navigates to history on history click', async () => {
      render(<UserMenu />);

      const trigger = screen.getByRole('button', { name: /testuser/i });
      await user.click(trigger);

      await waitFor(async () => {
        const historyItem = screen.getByRole('menuitem', { name: /historia eksportow/i });
        await user.click(historyItem);
      });

      expect(mockPush).toHaveBeenCalledWith('/settings/history');
    });

    it('navigates to settings on settings click', async () => {
      render(<UserMenu />);

      const trigger = screen.getByRole('button', { name: /testuser/i });
      await user.click(trigger);

      await waitFor(async () => {
        const settingsItem = screen.getByRole('menuitem', { name: /ustawienia/i });
        await user.click(settingsItem);
      });

      expect(mockPush).toHaveBeenCalledWith('/settings');
    });

    it('signs out and redirects on logout click', async () => {
      render(<UserMenu />);

      const trigger = screen.getByRole('button', { name: /testuser/i });
      await user.click(trigger);

      await waitFor(async () => {
        const logoutItem = screen.getByRole('menuitem', { name: /wyloguj/i });
        await user.click(logoutItem);
      });

      expect(mockSignOut).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('uses fullName when displayName is null', () => {
      mockAuthState = {
        user: { id: 'test-id', email: 'test@example.com' },
        profile: {
          displayName: null,
          fullName: 'John Doe',
          avatarUrl: null,
        },
        isAuthenticated: true,
        isLoading: false,
        signOut: mockSignOut,
      };

      render(<UserMenu />);

      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('handles long display names with truncation', () => {
      mockAuthState = {
        user: { id: 'test-id', email: 'test@example.com' },
        profile: {
          displayName: 'Very Long Display Name That Should Be Truncated',
          fullName: null,
          avatarUrl: null,
        },
        isAuthenticated: true,
        isLoading: false,
        signOut: mockSignOut,
      };

      render(<UserMenu />);

      const displayName = screen.getByText(/very long/i);
      expect(displayName).toHaveClass('truncate');
    });
  });
});
