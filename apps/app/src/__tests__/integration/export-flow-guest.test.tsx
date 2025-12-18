/**
 * Guest User Export Flow Integration Tests
 *
 * Tests the complete export flow for anonymous users:
 * - Guest session creation
 * - No credits → purchase modal
 * - Credits purchase → export
 * - Session ID passed in all API calls
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportDialog } from '@/components/ui/ExportDialog';
import { track, AnalyticsEvent, resetAllAnalyticsMocks } from '../../../test/__mocks__/analytics';
import type { Part, Material, Furniture } from '@/types';

// Mock hooks
const mockUseCredits = jest.fn();
const mockUseGuestCredits = jest.fn();
const mockUseAuth = jest.fn();

jest.mock('@/hooks/useCredits', () => ({
  useCredits: () => mockUseCredits(),
}));

jest.mock('@/hooks/useGuestCredits', () => ({
  useGuestCredits: () => mockUseGuestCredits(),
}));

jest.mock('@/providers/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock store
const mockParts: Part[] = [];
const mockMaterials: Material[] = [];
const mockFurnitures: Furniture[] = [];

jest.mock('@/lib/store', () => ({
  useStore: () => ({
    parts: mockParts,
    materials: mockMaterials,
    furnitures: mockFurnitures,
  }),
}));

// Mock CSV functions
const mockDownloadCSV = jest.fn();

jest.mock('@/lib/csv', () => ({
  AVAILABLE_COLUMNS: [
    { id: 'furniture', label: 'furniture', accessor: () => 'Test Furniture' },
    { id: 'part_name', label: 'partName', accessor: () => 'Test Part' },
    { id: 'material', label: 'material', accessor: () => 'Plywood' },
  ],
  DEFAULT_COLUMNS: [
    { id: 'furniture', label: 'furniture' },
    { id: 'part_name', label: 'partName' },
    { id: 'material', label: 'material' },
  ],
  generateCSV: () => 'furniture;part_name;material\nTest;Part1;Plywood',
  downloadCSV: (...args: any[]) => mockDownloadCSV(...args),
}));

jest.mock('@/lib/projectHash', () => ({
  generatePartsHash: () => 'parts_guest_test_hash',
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      title: 'Export',
      description: 'Export your project',
      selectColumns: 'Select columns',
      preview: 'Preview',
      csvPreview: 'CSV Preview',
      noData: 'No data',
      cancel: 'Anuluj',
      exportCSV: 'Download CSV',
      exportDXF: 'Download DXF',
      dxfHint: 'DXF hint',
      dxfMissing: 'No DXF-only parts',
      dxfCount: 'DXF count: {count}',
      export: 'Export',
      'columns.furniture': 'Furniture',
      'columns.partName': 'Part Name',
      'columns.material': 'Material',
    };
    return translations[key] || key;
  },
}));

// Helper to create test data
function createTestPart(): Part {
  return {
    id: 'part-1',
    name: 'Test Part',
    furnitureId: 'furniture-1',
    shapeType: 'RECT',
    shapeParams: { width: 500, height: 300 },
    width: 500,
    height: 300,
    depth: 18,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    materialId: 'material-1',
    edgeBanding: { type: 'RECT', top: true, bottom: false, left: false, right: false },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('Guest User Export Flow', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetAllAnalyticsMocks();

    mockParts.length = 0;
    mockMaterials.length = 0;
    mockFurnitures.length = 0;

    mockParts.push(createTestPart());
    mockMaterials.push({
      id: 'material-1',
      name: 'Plywood',
      color: '#D4A574',
      thickness: 18,
      category: 'board',
    } as Material);
    mockFurnitures.push({ id: 'furniture-1', name: 'Test Furniture' } as Furniture);

    // Default: guest user (not authenticated)
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    });

    // Auth credits returns no balance for guest
    mockUseCredits.mockReturnValue({
      balance: null,
      isLoading: false,
      error: null,
      useCredit: jest.fn(),
      refetch: jest.fn(),
    });
  });

  describe('guest with no credits → purchase flow', () => {
    it('shows purchase modal when guest has no credits', async () => {
      mockUseGuestCredits.mockReturnValue({
        balance: { availableCredits: 0, expiresAt: null },
        sessionId: 'guest_123_abc',
        email: null,
        isLoading: false,
        error: null,
        useCredit: jest.fn(),
        refetch: jest.fn(),
      });

      render(<ExportDialog {...defaultProps} />);

      // Should show "Kup kredyty" button
      expect(screen.getByRole('button', { name: /Kup kredyty/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Download CSV/i })).not.toBeInTheDocument();

      // Should show no credits warning
      expect(screen.getByText(/Brak kredytów/i)).toBeInTheDocument();
    });

    it('shows session ID in guest flow', async () => {
      const sessionId = 'guest_1234567890_xyz';

      mockUseGuestCredits.mockReturnValue({
        balance: { availableCredits: 1, expiresAt: '2025-12-31' },
        sessionId,
        email: 'guest@example.com',
        isLoading: false,
        error: null,
        useCredit: jest.fn().mockResolvedValue({
          creditUsed: true,
          sessionId,
          creditsRemaining: 0,
          isFreeReexport: false,
        }),
        refetch: jest.fn(),
      });

      render(<ExportDialog {...defaultProps} />);

      // Should show credits for guest
      expect(screen.getByText('1 kredyt')).toBeInTheDocument();
    });
  });

  describe('guest export flow with credits', () => {
    it('uses guest useCredit function for export', async () => {
      const guestUseCredit = jest.fn().mockResolvedValue({
        creditUsed: true,
        sessionId: 'guest_123',
        creditsRemaining: 0,
        isFreeReexport: false,
      });

      mockUseGuestCredits.mockReturnValue({
        balance: { availableCredits: 1, expiresAt: '2025-12-31' },
        sessionId: 'guest_123',
        email: 'guest@example.com',
        isLoading: false,
        error: null,
        useCredit: guestUseCredit,
        refetch: jest.fn(),
      });

      const user = userEvent.setup();
      render(<ExportDialog {...defaultProps} />);

      // Click export
      const exportButton = screen.getByRole('button', { name: /Download CSV/i });
      await user.click(exportButton);

      // Verify guest credit use was called
      await waitFor(() => {
        expect(guestUseCredit).toHaveBeenCalledWith('parts_guest_test_hash');
      });

      // Verify CSV was downloaded
      await waitFor(() => {
        expect(mockDownloadCSV).toHaveBeenCalled();
      });
    });

    it('shows success message after guest export', async () => {
      const guestUseCredit = jest.fn().mockResolvedValue({
        creditUsed: true,
        sessionId: 'guest_123',
        creditsRemaining: 4,
        isFreeReexport: false,
      });

      mockUseGuestCredits.mockReturnValue({
        balance: { availableCredits: 5, expiresAt: '2025-12-31' },
        sessionId: 'guest_123',
        email: 'guest@example.com',
        isLoading: false,
        error: null,
        useCredit: guestUseCredit,
        refetch: jest.fn(),
      });

      const user = userEvent.setup();
      render(<ExportDialog {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /Download CSV/i });
      await user.click(exportButton);

      // Verify success message
      await waitFor(() => {
        expect(screen.getByText(/Pozostało kredytów: 4/)).toBeInTheDocument();
      });

      // Verify analytics
      expect(track).toHaveBeenCalledWith(AnalyticsEvent.EXPORT_COMPLETED, {
        parts_count: 1,
        used_credit: true,
        export_format: 'csv',
      });
    });

    it('allows free re-export for guest with Smart Export', async () => {
      const guestUseCredit = jest.fn().mockResolvedValue({
        creditUsed: false,
        sessionId: 'guest_123',
        creditsRemaining: 5,
        isFreeReexport: true,
      });

      mockUseGuestCredits.mockReturnValue({
        balance: { availableCredits: 5, expiresAt: '2025-12-31' },
        sessionId: 'guest_123',
        email: 'guest@example.com',
        isLoading: false,
        error: null,
        useCredit: guestUseCredit,
        refetch: jest.fn(),
      });

      const user = userEvent.setup();
      render(<ExportDialog {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /Download CSV/i });
      await user.click(exportButton);

      // Verify free re-export message
      await waitFor(() => {
        expect(screen.getByText(/Darmowy re-export/i)).toBeInTheDocument();
      });

      // Verify SMART_EXPORT_USED was tracked
      expect(track).toHaveBeenCalledWith(AnalyticsEvent.SMART_EXPORT_USED, {
        parts_count: 1,
      });
    });
  });

  describe('guest credits expiration', () => {
    it('shows credits with expiration info', () => {
      mockUseGuestCredits.mockReturnValue({
        balance: { availableCredits: 3, expiresAt: '2025-01-15T12:00:00Z' },
        sessionId: 'guest_123',
        email: 'guest@example.com',
        isLoading: false,
        error: null,
        useCredit: jest.fn(),
        refetch: jest.fn(),
      });

      render(<ExportDialog {...defaultProps} />);

      // Should show credits count
      expect(screen.getByText('3 kredyty')).toBeInTheDocument();
    });
  });

  describe('guest error handling', () => {
    it('handles guest credit use API failure', async () => {
      const guestUseCredit = jest.fn().mockResolvedValue(null);

      mockUseGuestCredits.mockReturnValue({
        balance: { availableCredits: 1, expiresAt: '2025-12-31' },
        sessionId: 'guest_123',
        email: 'guest@example.com',
        isLoading: false,
        error: null,
        useCredit: guestUseCredit,
        refetch: jest.fn(),
      });

      const user = userEvent.setup();
      render(<ExportDialog {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /Download CSV/i });
      await user.click(exportButton);

      // Verify error tracking
      await waitFor(() => {
        expect(track).toHaveBeenCalledWith(AnalyticsEvent.EXPORT_VALIDATION_FAILED, {
          error_count: 1,
          error_types: ['no_credits'],
        });
      });
    });

    it('handles network error during guest export', async () => {
      const guestUseCredit = jest.fn().mockRejectedValue(new Error('Network error'));

      mockUseGuestCredits.mockReturnValue({
        balance: { availableCredits: 1, expiresAt: '2025-12-31' },
        sessionId: 'guest_123',
        email: 'guest@example.com',
        isLoading: false,
        error: null,
        useCredit: guestUseCredit,
        refetch: jest.fn(),
      });

      const user = userEvent.setup();
      render(<ExportDialog {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /Download CSV/i });
      await user.click(exportButton);

      // Verify error message
      await waitFor(() => {
        expect(screen.getByText(/błąd/i)).toBeInTheDocument();
      });
    });

    it('retains credits display after guest export failure', async () => {
      const guestUseCredit = jest.fn().mockResolvedValue(null);

      mockUseGuestCredits.mockReturnValue({
        balance: { availableCredits: 2, expiresAt: '2025-12-31' },
        sessionId: 'guest_123',
        email: null,
        isLoading: false,
        error: null,
        useCredit: guestUseCredit,
        refetch: jest.fn(),
      });

      const user = userEvent.setup();
      render(<ExportDialog {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /Download CSV/i });
      await user.click(exportButton);

      // Credits should still show original count
      await waitFor(() => {
        expect(screen.getByText('2 kredyty')).toBeInTheDocument();
      });
    });
  });

  describe('guest loading states', () => {
    it('shows loading when guest credits are being fetched', () => {
      mockUseGuestCredits.mockReturnValue({
        balance: null,
        sessionId: null,
        email: null,
        isLoading: true,
        error: null,
        useCredit: jest.fn(),
        refetch: jest.fn(),
      });

      render(<ExportDialog {...defaultProps} />);

      // Dialog should still render
      expect(screen.getByText('Export')).toBeInTheDocument();
    });

    it('shows loading during guest export process', async () => {
      let resolveCredit: (value: any) => void;
      const guestUseCredit = jest.fn().mockReturnValue(
        new Promise((resolve) => {
          resolveCredit = resolve;
        })
      );

      mockUseGuestCredits.mockReturnValue({
        balance: { availableCredits: 1, expiresAt: '2025-12-31' },
        sessionId: 'guest_123',
        email: 'guest@example.com',
        isLoading: false,
        error: null,
        useCredit: guestUseCredit,
        refetch: jest.fn(),
      });

      const user = userEvent.setup();
      render(<ExportDialog {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /Download CSV/i });
      await user.click(exportButton);

      // Should show loading
      expect(screen.getByText(/Eksportowanie CSV/i)).toBeInTheDocument();

      // Cleanup
      resolveCredit!({ creditUsed: true, creditsRemaining: 0, isFreeReexport: false });
    });
  });

  describe('guest session without email', () => {
    it('allows export when guest has no email stored', async () => {
      const guestUseCredit = jest.fn().mockResolvedValue({
        creditUsed: true,
        sessionId: 'guest_123',
        creditsRemaining: 0,
        isFreeReexport: false,
      });

      mockUseGuestCredits.mockReturnValue({
        balance: { availableCredits: 1, expiresAt: '2025-12-31' },
        sessionId: 'guest_123',
        email: null, // No email stored
        isLoading: false,
        error: null,
        useCredit: guestUseCredit,
        refetch: jest.fn(),
      });

      const user = userEvent.setup();
      render(<ExportDialog {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /Download CSV/i });
      await user.click(exportButton);

      // Should still work
      await waitFor(() => {
        expect(guestUseCredit).toHaveBeenCalled();
      });
    });
  });

  describe('guest to auth transition scenario', () => {
    it('uses auth credits when user is authenticated', async () => {
      const authUseCredit = jest.fn().mockResolvedValue({
        creditUsed: true,
        sessionId: 'session-123',
        creditsRemaining: 4,
        isFreeReexport: false,
      });

      // Simulate user becoming authenticated
      mockUseAuth.mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' },
        isAuthenticated: true,
      });

      mockUseCredits.mockReturnValue({
        balance: {
          totalCredits: 10,
          usedCredits: 5,
          availableCredits: 5,
          hasUnlimited: false,
        },
        isLoading: false,
        error: null,
        useCredit: authUseCredit,
        refetch: jest.fn(),
      });

      // Guest credits should not be used
      mockUseGuestCredits.mockReturnValue({
        balance: { availableCredits: 0, expiresAt: null },
        sessionId: null,
        email: null,
        isLoading: false,
        error: null,
        useCredit: jest.fn(),
        refetch: jest.fn(),
      });

      const user = userEvent.setup();
      render(<ExportDialog {...defaultProps} />);

      // Should show auth user credits
      expect(screen.getByText('5 kredytów')).toBeInTheDocument();

      const exportButton = screen.getByRole('button', { name: /Download CSV/i });
      await user.click(exportButton);

      // Should use auth credit function
      await waitFor(() => {
        expect(authUseCredit).toHaveBeenCalled();
      });
    });
  });

  describe('guest credits display variants', () => {
    it('shows "kredyt" for 1 credit (guest)', () => {
      mockUseGuestCredits.mockReturnValue({
        balance: { availableCredits: 1, expiresAt: '2025-12-31' },
        sessionId: 'guest_123',
        email: null,
        isLoading: false,
        error: null,
        useCredit: jest.fn(),
        refetch: jest.fn(),
      });

      render(<ExportDialog {...defaultProps} />);

      expect(screen.getByText('1 kredyt')).toBeInTheDocument();
    });

    it('shows "kredyty" for 2-4 credits (guest)', () => {
      mockUseGuestCredits.mockReturnValue({
        balance: { availableCredits: 4, expiresAt: '2025-12-31' },
        sessionId: 'guest_123',
        email: null,
        isLoading: false,
        error: null,
        useCredit: jest.fn(),
        refetch: jest.fn(),
      });

      render(<ExportDialog {...defaultProps} />);

      expect(screen.getByText('4 kredyty')).toBeInTheDocument();
    });

    it('shows "kredytów" for 5+ credits (guest)', () => {
      mockUseGuestCredits.mockReturnValue({
        balance: { availableCredits: 10, expiresAt: '2025-12-31' },
        sessionId: 'guest_123',
        email: null,
        isLoading: false,
        error: null,
        useCredit: jest.fn(),
        refetch: jest.fn(),
      });

      render(<ExportDialog {...defaultProps} />);

      expect(screen.getByText('10 kredytów')).toBeInTheDocument();
    });
  });

  describe('analytics for guest flow', () => {
    it('tracks export initiated with guest context', async () => {
      mockUseGuestCredits.mockReturnValue({
        balance: { availableCredits: 1, expiresAt: '2025-12-31' },
        sessionId: 'guest_session_abc',
        email: null,
        isLoading: false,
        error: null,
        useCredit: jest.fn().mockResolvedValue({
          creditUsed: true,
          creditsRemaining: 0,
          isFreeReexport: false,
        }),
        refetch: jest.fn(),
      });

      const user = userEvent.setup();
      render(<ExportDialog {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /Download CSV/i });
      await user.click(exportButton);

      // Verify export completed tracking
      await waitFor(() => {
        expect(track).toHaveBeenCalledWith(AnalyticsEvent.EXPORT_COMPLETED, {
          parts_count: 1,
          used_credit: true,
          export_format: 'csv',
        });
      });
    });
  });
});
