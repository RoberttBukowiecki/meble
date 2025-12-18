/**
 * Authenticated User Export Flow Integration Tests
 *
 * Tests the complete export flow for logged-in users:
 * - User has credits → can export
 * - Credit consumed on first export
 * - Free re-export with Smart Export
 * - Purchase modal when no credits
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
  generatePartsHash: () => 'parts_auth_test_hash',
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

describe('Authenticated User Export Flow', () => {
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

    // Default: authenticated user with credits
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      isAuthenticated: true,
    });

    mockUseGuestCredits.mockReturnValue({
      balance: { availableCredits: 0, expiresAt: null },
      sessionId: null,
      email: null,
      isLoading: false,
      error: null,
      useCredit: jest.fn(),
      refetch: jest.fn(),
    });
  });

  describe('complete flow: add cabinet -> export -> credit consumed', () => {
    it('consumes credit when exporting new project', async () => {
      const useCredit = jest.fn().mockResolvedValue({
        creditUsed: true,
        sessionId: 'session-123',
        creditsRemaining: 4,
        isFreeReexport: false,
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
        useCredit,
        refetch: jest.fn(),
      });

      const user = userEvent.setup();
      render(<ExportDialog {...defaultProps} />);

      // Verify credits are shown
      expect(screen.getByText('5 kredytów')).toBeInTheDocument();

      // Click export
      const exportButton = screen.getByRole('button', { name: /Download CSV/i });
      await user.click(exportButton);

      // Verify credit use API was called
      await waitFor(() => {
        expect(useCredit).toHaveBeenCalledWith('parts_auth_test_hash');
      });

      // Verify CSV was downloaded
      await waitFor(() => {
        expect(mockDownloadCSV).toHaveBeenCalled();
      });

      // Verify success message shows remaining credits
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

    it('does not consume credit for Smart Export re-export', async () => {
      const useCredit = jest.fn().mockResolvedValue({
        creditUsed: false,
        sessionId: 'session-123',
        creditsRemaining: 5,
        isFreeReexport: true,
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
        useCredit,
        refetch: jest.fn(),
      });

      const user = userEvent.setup();
      render(<ExportDialog {...defaultProps} />);

      // Click export
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

    it('shows purchase modal when credits exhausted', async () => {
      mockUseCredits.mockReturnValue({
        balance: {
          totalCredits: 10,
          usedCredits: 10,
          availableCredits: 0,
          hasUnlimited: false,
        },
        isLoading: false,
        error: null,
        useCredit: jest.fn(),
        refetch: jest.fn(),
      });

      render(<ExportDialog {...defaultProps} />);

      // Should show "Kup kredyty" button instead of export
      expect(screen.getByRole('button', { name: /Kup kredyty/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Download CSV/i })).not.toBeInTheDocument();

      // Should show no credits warning
      expect(screen.getByText(/Brak kredytów/i)).toBeInTheDocument();
    });
  });

  describe('unlimited (Pro) user flow', () => {
    it('shows Pro badge for unlimited users', () => {
      mockUseCredits.mockReturnValue({
        balance: {
          totalCredits: 999,
          usedCredits: 50,
          availableCredits: 999,
          hasUnlimited: true,
          unlimitedExpiresAt: '2025-12-31',
        },
        isLoading: false,
        error: null,
        useCredit: jest.fn(),
        refetch: jest.fn(),
      });

      render(<ExportDialog {...defaultProps} />);

      expect(screen.getByText('Pro')).toBeInTheDocument();
    });

    it('exports without decrementing credits for unlimited users', async () => {
      const useCredit = jest.fn().mockResolvedValue({
        creditUsed: false, // Unlimited doesn't consume
        sessionId: 'session-123',
        creditsRemaining: 999,
        isFreeReexport: false,
      });

      mockUseCredits.mockReturnValue({
        balance: {
          totalCredits: 999,
          usedCredits: 50,
          availableCredits: 999,
          hasUnlimited: true,
        },
        isLoading: false,
        error: null,
        useCredit,
        refetch: jest.fn(),
      });

      const user = userEvent.setup();
      render(<ExportDialog {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /Download CSV/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockDownloadCSV).toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('handles credit use API failure', async () => {
      const useCredit = jest.fn().mockResolvedValue(null);

      mockUseCredits.mockReturnValue({
        balance: { availableCredits: 5, hasUnlimited: false },
        isLoading: false,
        error: 'Server error',
        useCredit,
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

    it('handles network error during export', async () => {
      const useCredit = jest.fn().mockRejectedValue(new Error('Network error'));

      mockUseCredits.mockReturnValue({
        balance: { availableCredits: 5, hasUnlimited: false },
        isLoading: false,
        error: null,
        useCredit,
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

    it('retains credits display after export failure', async () => {
      const useCredit = jest.fn().mockResolvedValue(null);

      mockUseCredits.mockReturnValue({
        balance: { availableCredits: 5, hasUnlimited: false },
        isLoading: false,
        error: null,
        useCredit,
        refetch: jest.fn(),
      });

      const user = userEvent.setup();
      render(<ExportDialog {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /Download CSV/i });
      await user.click(exportButton);

      // Credits should still show original count
      await waitFor(() => {
        expect(screen.getByText('5 kredytów')).toBeInTheDocument();
      });
    });
  });

  describe('credits display variants', () => {
    it('shows "kredyt" for 1 credit', () => {
      mockUseCredits.mockReturnValue({
        balance: { availableCredits: 1, hasUnlimited: false },
        isLoading: false,
        error: null,
        useCredit: jest.fn(),
        refetch: jest.fn(),
      });

      render(<ExportDialog {...defaultProps} />);

      expect(screen.getByText('1 kredyt')).toBeInTheDocument();
    });

    it('shows "kredyty" for 2-4 credits', () => {
      mockUseCredits.mockReturnValue({
        balance: { availableCredits: 3, hasUnlimited: false },
        isLoading: false,
        error: null,
        useCredit: jest.fn(),
        refetch: jest.fn(),
      });

      render(<ExportDialog {...defaultProps} />);

      expect(screen.getByText('3 kredyty')).toBeInTheDocument();
    });

    it('shows "kredytów" for 5+ credits', () => {
      mockUseCredits.mockReturnValue({
        balance: { availableCredits: 10, hasUnlimited: false },
        isLoading: false,
        error: null,
        useCredit: jest.fn(),
        refetch: jest.fn(),
      });

      render(<ExportDialog {...defaultProps} />);

      expect(screen.getByText('10 kredytów')).toBeInTheDocument();
    });
  });

  describe('loading states', () => {
    it('shows loading during export process', async () => {
      let resolveCredit: (value: any) => void;
      const useCredit = jest.fn().mockReturnValue(
        new Promise((resolve) => {
          resolveCredit = resolve;
        })
      );

      mockUseCredits.mockReturnValue({
        balance: { availableCredits: 5, hasUnlimited: false },
        isLoading: false,
        error: null,
        useCredit,
        refetch: jest.fn(),
      });

      const user = userEvent.setup();
      render(<ExportDialog {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /Download CSV/i });
      await user.click(exportButton);

      // Should show loading
      expect(screen.getByText(/Eksportowanie CSV/i)).toBeInTheDocument();

      // Cleanup
      resolveCredit!({ creditUsed: true, creditsRemaining: 4, isFreeReexport: false });
    });
  });
});
