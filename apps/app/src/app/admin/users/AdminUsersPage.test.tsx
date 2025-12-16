import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminUsersPage from './page';

// Mock next/link
jest.mock('next/link', () => {
  const MockLink = ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>;
  MockLink.displayName = 'MockLink';
  return MockLink;
});

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockUsersResponse = {
  success: true,
  data: {
    users: [
      {
        id: 'user-1',
        email: 'john@example.com',
        fullName: 'John Doe',
        displayName: 'Johnny',
        isActive: true,
        isAdmin: false,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
        credits: {
          total: 100,
          used: 25,
          available: 75,
        },
      },
      {
        id: 'user-2',
        email: 'jane@example.com',
        fullName: 'Jane Smith',
        displayName: null,
        isActive: false,
        isAdmin: false,
        createdAt: '2024-02-20T15:30:00Z',
        updatedAt: '2024-02-20T15:30:00Z',
        credits: {
          total: 50,
          used: 50,
          available: 0,
        },
      },
    ],
    pagination: {
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
    },
  },
};

describe('AdminUsersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve(mockUsersResponse),
    });
  });

  describe('Initial render', () => {
    it('shows loading state initially', () => {
      // Make fetch hang to test loading state
      mockFetch.mockImplementation(() => new Promise(() => {}));

      render(<AdminUsersPage />);

      expect(screen.getByText('Ładowanie...')).toBeInTheDocument();
    });

    it('renders page header', async () => {
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Użytkownicy')).toBeInTheDocument();
      });

      expect(
        screen.getByText('Zarządzanie użytkownikami i kredytami')
      ).toBeInTheDocument();
    });

    it('fetches users on mount', async () => {
      render(<AdminUsersPage />);

      await waitFor(() => {
        const calls = mockFetch.mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        expect(calls[0][0]).toContain('/admin/users?');
      });
    });
  });

  describe('Users table', () => {
    it('displays users in table', async () => {
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });

      expect(screen.getByText('Johnny')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('displays credit information correctly', async () => {
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });

      // User 1: 100 total, 25 used = 75 available
      expect(screen.getByText('75')).toBeInTheDocument();
      // User 2: 50 total, 50 used = 0 available
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('displays active/inactive status', async () => {
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Aktywny')).toBeInTheDocument();
      });

      expect(screen.getByText('Nieaktywny')).toBeInTheDocument();
    });

    it('shows empty state when no users', async () => {
      mockFetch.mockResolvedValue({
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              users: [],
              pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
            },
          }),
      });

      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(
          screen.getByText('Nie znaleziono użytkowników')
        ).toBeInTheDocument();
      });
    });

    it('renders detail links for each user', async () => {
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });

      const detailLinks = screen.getAllByText('Szczegóły');
      expect(detailLinks).toHaveLength(2);

      expect(detailLinks[0].closest('a')).toHaveAttribute(
        'href',
        '/admin/users/user-1'
      );
      expect(detailLinks[1].closest('a')).toHaveAttribute(
        'href',
        '/admin/users/user-2'
      );
    });
  });

  describe('Search functionality', () => {
    it('renders search input', async () => {
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Szukaj po email lub nazwie...')
        ).toBeInTheDocument();
      });
    });

    it('searches users on form submit', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(
        'Szukaj po email lub nazwie...'
      );
      await user.type(searchInput, 'test@example.com');

      const searchButton = screen.getByText('Szukaj');
      await user.click(searchButton);

      await waitFor(() => {
        const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
        expect(lastCall[0]).toContain('search=test%40example.com');
      });
    });

    it('resets to page 1 when searching', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(
        'Szukaj po email lub nazwie...'
      );
      await user.type(searchInput, 'query');

      const searchButton = screen.getByText('Szukaj');
      await user.click(searchButton);

      await waitFor(() => {
        const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
        expect(lastCall[0]).toContain('page=1');
      });
    });
  });

  describe('Refresh functionality', () => {
    it('refreshes users on button click', async () => {
      const user = userEvent.setup();
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      const refreshButton = screen.getByText('Odśwież');
      await user.click(refreshButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Pagination', () => {
    it('does not show pagination when only 1 page', async () => {
      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });

      expect(screen.queryByText(/Strona \d+ z \d+/)).not.toBeInTheDocument();
    });

    it('shows pagination when multiple pages', async () => {
      mockFetch.mockResolvedValue({
        json: () =>
          Promise.resolve({
            ...mockUsersResponse,
            data: {
              ...mockUsersResponse.data,
              pagination: { page: 1, limit: 20, total: 50, totalPages: 3 },
            },
          }),
      });

      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Strona 1 z 3')).toBeInTheDocument();
      });

      expect(
        screen.getByText(/Wyświetlono \d+ z \d+ użytkowników/)
      ).toBeInTheDocument();
    });

    it('navigates to next page', async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        json: () =>
          Promise.resolve({
            ...mockUsersResponse,
            data: {
              ...mockUsersResponse.data,
              pagination: { page: 1, limit: 20, total: 50, totalPages: 3 },
            },
          }),
      });

      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Strona 1 z 3')).toBeInTheDocument();
      });

      const initialCallCount = mockFetch.mock.calls.length;

      const pagination = screen
        .getByText('Strona 1 z 3')
        .closest('div')?.parentElement;
      const nextButton = within(pagination!).getAllByRole('button')[1];
      await user.click(nextButton);

      await waitFor(() => {
        expect(mockFetch.mock.calls.length).toBeGreaterThan(initialCallCount);
        const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
        expect(lastCall[0]).toContain('page=2');
      });
    });

    it('disables previous button on first page', async () => {
      mockFetch.mockResolvedValue({
        json: () =>
          Promise.resolve({
            ...mockUsersResponse,
            data: {
              ...mockUsersResponse.data,
              pagination: { page: 1, limit: 20, total: 50, totalPages: 3 },
            },
          }),
      });

      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Strona 1 z 3')).toBeInTheDocument();
      });

      const pagination = screen
        .getByText('Strona 1 z 3')
        .closest('div')?.parentElement;
      const prevButton = within(pagination!).getAllByRole('button')[0];

      expect(prevButton).toBeDisabled();
    });
  });

  describe('Error handling', () => {
    it('displays error message on fetch failure', async () => {
      mockFetch.mockResolvedValue({
        json: () =>
          Promise.resolve({
            success: false,
            error: { message: 'Failed to fetch users' },
          }),
      });

      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch users')).toBeInTheDocument();
      });
    });

    it('handles network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      render(<AdminUsersPage />);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });
});
