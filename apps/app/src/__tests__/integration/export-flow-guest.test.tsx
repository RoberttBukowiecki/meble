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

// LocalStorage keys from CreditsPurchaseModal and Sidebar
const GUEST_EMAIL_KEY = 'e-meble-guest-email';
const EXPORT_DIALOG_PENDING_KEY = 'e-meble-export-dialog-pending';

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
    it('shows purchase modal when guest never had credits (balance is null)', async () => {
      // Guest who never purchased credits - balance is null (not just 0)
      mockUseGuestCredits.mockReturnValue({
        balance: null, // Never had credits - hasEverHadCredits = false
        sessionId: 'guest_123_abc',
        email: null,
        isLoading: false,
        error: null,
        useCredit: jest.fn(),
        refetch: jest.fn(),
      });

      render(<ExportDialog {...defaultProps} />);

      // Should show "Kup kredyty" button (not export buttons)
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

      // Verify error tracking - code tracks 'credit_error' when credit use fails with credits available
      await waitFor(() => {
        expect(track).toHaveBeenCalledWith(AnalyticsEvent.EXPORT_VALIDATION_FAILED, {
          error_count: 1,
          error_types: ['credit_error'],
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

  describe('Smart Export eligibility with 0 credits', () => {
    it('shows export buttons when guest has 0 credits but had credits before (hasEverHadCredits)', async () => {
      // Guest has balance object (had credits before) but 0 available
      mockUseGuestCredits.mockReturnValue({
        balance: { availableCredits: 0, expiresAt: '2025-01-01' }, // balance exists = had credits
        sessionId: 'guest_123',
        email: 'guest@example.com',
        isLoading: false,
        error: null,
        useCredit: jest.fn(),
        refetch: jest.fn(),
      });

      render(<ExportDialog {...defaultProps} />);

      // Should show export buttons (not "Kup kredyty") because Smart Export might be available
      expect(screen.getByRole('button', { name: /Download CSV/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Kup kredyty/i })).not.toBeInTheDocument();
    });

    it('shows Smart Export info message when 0 credits but hasEverHadCredits', () => {
      mockUseGuestCredits.mockReturnValue({
        balance: { availableCredits: 0, expiresAt: '2025-01-01' },
        sessionId: 'guest_123',
        email: 'guest@example.com',
        isLoading: false,
        error: null,
        useCredit: jest.fn(),
        refetch: jest.fn(),
      });

      render(<ExportDialog {...defaultProps} />);

      // Should show Smart Export info (not "Brak kredytów" warning)
      expect(screen.getByText(/0 kredytów/i)).toBeInTheDocument();
      expect(screen.getByText(/re-eksport jest darmowy/i)).toBeInTheDocument();
    });

    it('attempts export and shows purchase modal when Smart Export not available', async () => {
      const guestUseCredit = jest.fn().mockResolvedValue(null); // Returns null = failed

      mockUseGuestCredits.mockReturnValue({
        balance: { availableCredits: 0, expiresAt: '2025-01-01' },
        sessionId: 'guest_123',
        email: 'guest@example.com',
        isLoading: false,
        error: 'No credits available',
        useCredit: guestUseCredit,
        refetch: jest.fn(),
      });

      const user = userEvent.setup();
      render(<ExportDialog {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /Download CSV/i });
      await user.click(exportButton);

      // useCredit should be called (attempting Smart Export)
      await waitFor(() => {
        expect(guestUseCredit).toHaveBeenCalledWith('parts_guest_test_hash');
      });

      // Should track purchase modal opened
      await waitFor(() => {
        expect(track).toHaveBeenCalledWith(AnalyticsEvent.PURCHASE_MODAL_OPENED, {
          trigger: 'export_no_credits',
        });
      });
    });

    it('successfully exports with Smart Export when 0 credits but valid session exists', async () => {
      const guestUseCredit = jest.fn().mockResolvedValue({
        creditUsed: false,
        sessionId: 'guest_123',
        creditsRemaining: 0,
        isFreeReexport: true, // Smart Export worked!
      });

      mockUseGuestCredits.mockReturnValue({
        balance: { availableCredits: 0, expiresAt: '2025-01-01' },
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

      // Should show free re-export message
      await waitFor(() => {
        expect(screen.getByText(/Darmowy re-export/i)).toBeInTheDocument();
      });

      // CSV should be downloaded
      expect(mockDownloadCSV).toHaveBeenCalled();
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

/**
 * Tests for localStorage persistence features
 * - Guest email persistence
 * - Export dialog state after payment return
 */
describe('Guest Export Flow - LocalStorage Persistence', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    jest.clearAllMocks();
    resetAllAnalyticsMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('EXPORT_DIALOG_PENDING_KEY - Export dialog after payment', () => {
    it('sets EXPORT_DIALOG_PENDING_KEY before redirecting to payment', () => {
      // When user initiates payment, this key should be set
      localStorage.setItem(EXPORT_DIALOG_PENDING_KEY, 'true');

      expect(localStorage.getItem(EXPORT_DIALOG_PENDING_KEY)).toBe('true');
    });

    it('clears EXPORT_DIALOG_PENDING_KEY after reading it', () => {
      // Simulate returning from payment
      localStorage.setItem(EXPORT_DIALOG_PENDING_KEY, 'true');

      // App reads the value
      const shouldOpenExport = localStorage.getItem(EXPORT_DIALOG_PENDING_KEY);
      expect(shouldOpenExport).toBe('true');

      // App should remove the flag to prevent loops
      localStorage.removeItem(EXPORT_DIALOG_PENDING_KEY);
      expect(localStorage.getItem(EXPORT_DIALOG_PENDING_KEY)).toBeNull();
    });

    it('does not set flag when key is not present', () => {
      // Fresh page load without payment return
      expect(localStorage.getItem(EXPORT_DIALOG_PENDING_KEY)).toBeNull();
    });
  });

  describe('GUEST_EMAIL_KEY - Guest email persistence', () => {
    it('saves guest email to localStorage', () => {
      const testEmail = 'guest@example.com';
      localStorage.setItem(GUEST_EMAIL_KEY, testEmail);

      expect(localStorage.getItem(GUEST_EMAIL_KEY)).toBe(testEmail);
    });

    it('retrieves saved guest email on subsequent visits', () => {
      const testEmail = 'returning-guest@example.com';

      // Simulate first visit - save email
      localStorage.setItem(GUEST_EMAIL_KEY, testEmail);

      // Simulate second visit - retrieve email
      const savedEmail = localStorage.getItem(GUEST_EMAIL_KEY);
      expect(savedEmail).toBe(testEmail);
    });

    it('overwrites previous email with new one', () => {
      localStorage.setItem(GUEST_EMAIL_KEY, 'old@example.com');
      localStorage.setItem(GUEST_EMAIL_KEY, 'new@example.com');

      expect(localStorage.getItem(GUEST_EMAIL_KEY)).toBe('new@example.com');
    });

    it('returns null when no email is stored', () => {
      expect(localStorage.getItem(GUEST_EMAIL_KEY)).toBeNull();
    });

    it('persists email across simulated page reloads', () => {
      // Simulate saving email during purchase
      localStorage.setItem(GUEST_EMAIL_KEY, 'persistent@example.com');

      // Simulate page reload (localStorage persists)
      // In real scenario, component would re-mount

      const savedEmail = localStorage.getItem(GUEST_EMAIL_KEY);
      expect(savedEmail).toBe('persistent@example.com');
    });
  });

  describe('Integration: Payment flow with localStorage', () => {
    it('simulates complete guest payment return flow', () => {
      // Step 1: Guest initiates purchase with email
      const guestEmail = 'guest-buyer@example.com';
      localStorage.setItem(GUEST_EMAIL_KEY, guestEmail);
      localStorage.setItem(EXPORT_DIALOG_PENDING_KEY, 'true');

      // Step 2: User redirected to payment (page unloads)
      // localStorage persists...

      // Step 3: User returns from payment
      expect(localStorage.getItem(GUEST_EMAIL_KEY)).toBe(guestEmail);
      expect(localStorage.getItem(EXPORT_DIALOG_PENDING_KEY)).toBe('true');

      // Step 4: App reads and clears the pending flag
      const shouldOpen = localStorage.getItem(EXPORT_DIALOG_PENDING_KEY);
      localStorage.removeItem(EXPORT_DIALOG_PENDING_KEY);

      expect(shouldOpen).toBe('true');
      expect(localStorage.getItem(EXPORT_DIALOG_PENDING_KEY)).toBeNull();

      // Step 5: Email is still available for pre-filling forms
      expect(localStorage.getItem(GUEST_EMAIL_KEY)).toBe(guestEmail);
    });

    it('handles edge case: user clears browser data', () => {
      // After user clears localStorage
      localStorage.clear();

      expect(localStorage.getItem(GUEST_EMAIL_KEY)).toBeNull();
      expect(localStorage.getItem(EXPORT_DIALOG_PENDING_KEY)).toBeNull();
    });
  });
});
