/**
 * Export Dialog Tests
 *
 * Comprehensive tests for the export dialog component covering:
 * - Authenticated and guest user flows
 * - Credits display and consumption
 * - Smart Export (free re-export)
 * - Column selection
 * - Preview functionality
 * - Analytics tracking
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportDialog } from './ExportDialog';
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
const mockGenerateCSV = jest.fn(() => 'furniture;part_name;material\nTest;Part1;Plywood');
const mockDownloadCSV = jest.fn();

jest.mock('@/lib/csv', () => ({
  AVAILABLE_COLUMNS: [
    { id: 'furniture', label: 'furniture', accessor: () => 'Test Furniture' },
    { id: 'part_name', label: 'partName', accessor: () => 'Test Part' },
    { id: 'material', label: 'material', accessor: () => 'Plywood' },
    { id: 'thickness_mm', label: 'thickness', accessor: () => '18' },
    { id: 'length_x_mm', label: 'length', accessor: () => '500' },
    { id: 'width_y_mm', label: 'width', accessor: () => '300' },
    { id: 'notes', label: 'notes', accessor: () => '' },
  ],
  DEFAULT_COLUMNS: [
    { id: 'furniture', label: 'furniture' },
    { id: 'part_name', label: 'partName' },
    { id: 'material', label: 'material' },
    { id: 'thickness_mm', label: 'thickness' },
    { id: 'length_x_mm', label: 'length' },
    { id: 'width_y_mm', label: 'width' },
  ],
  generateCSV: (...args: any[]) => mockGenerateCSV(...args),
  downloadCSV: (...args: any[]) => mockDownloadCSV(...args),
}));

// Mock projectHash
jest.mock('@/lib/projectHash', () => ({
  generatePartsHash: () => 'parts_abc123xyz',
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      title: 'Export',
      description: 'Export your project parts',
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
      showingFirst: 'Showing 5 of {total} parts',
      'columns.furniture': 'Furniture',
      'columns.partName': 'Part Name',
      'columns.material': 'Material',
      'columns.thickness': 'Thickness (mm)',
      'columns.length': 'Length (mm)',
      'columns.width': 'Width (mm)',
      'columns.notes': 'Notes',
    };
    return translations[key] || key;
  },
}));

// Helper to create test part
function createTestPart(overrides: Partial<Part> = {}): Part {
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
    ...overrides,
  };
}

function createTestMaterial(overrides: Partial<Material> = {}): Material {
  return {
    id: 'material-1',
    name: 'Plywood 18mm',
    color: '#D4A574',
    thickness: 18,
    category: 'board',
    ...overrides,
  } as Material;
}

function createTestFurniture(overrides: Partial<Furniture> = {}): Furniture {
  return {
    id: 'furniture-1',
    name: 'Test Furniture',
    ...overrides,
  } as Furniture;
}

describe('ExportDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetAllAnalyticsMocks();

    // Reset mock arrays
    mockParts.length = 0;
    mockMaterials.length = 0;
    mockFurnitures.length = 0;

    // Add default test data
    mockParts.push(createTestPart());
    mockMaterials.push(createTestMaterial());
    mockFurnitures.push(createTestFurniture());

    // Default: authenticated user with credits
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      isAuthenticated: true,
    });

    mockUseCredits.mockReturnValue({
      balance: {
        totalCredits: 10,
        usedCredits: 2,
        availableCredits: 8,
        hasUnlimited: false,
        unlimitedExpiresAt: null,
        packages: [],
      },
      isLoading: false,
      error: null,
      useCredit: jest.fn().mockResolvedValue({
        creditUsed: true,
        sessionId: 'session-123',
        creditsRemaining: 7,
        message: 'Credit used',
        isFreeReexport: false,
      }),
      refetch: jest.fn(),
    });

    mockUseGuestCredits.mockReturnValue({
      balance: { availableCredits: 0, expiresAt: null },
      sessionId: 'guest_abc123',
      email: null,
      isLoading: false,
      error: null,
      useCredit: jest.fn(),
      refetch: jest.fn(),
    });
  });

  describe('authenticated user flow', () => {
    it('renders with user credits balance', () => {
      render(<ExportDialog {...defaultProps} />);

      // Should show credits badge
      expect(screen.getByText('8 kredytów')).toBeInTheDocument();
    });

    it('shows Pro badge for unlimited users', () => {
      mockUseCredits.mockReturnValue({
        balance: {
          totalCredits: 999,
          usedCredits: 0,
          availableCredits: 999,
          hasUnlimited: true,
          unlimitedExpiresAt: '2025-12-31',
          packages: [],
        },
        isLoading: false,
        error: null,
        useCredit: jest.fn(),
        refetch: jest.fn(),
      });

      render(<ExportDialog {...defaultProps} />);

      expect(screen.getByText('Pro')).toBeInTheDocument();
    });

    it('shows credits count for limited users', () => {
      render(<ExportDialog {...defaultProps} />);

      expect(screen.getByText('8 kredytów')).toBeInTheDocument();
    });

    it('shows singular "kredyt" for 1 credit', () => {
      mockUseCredits.mockReturnValue({
        balance: {
          totalCredits: 1,
          usedCredits: 0,
          availableCredits: 1,
          hasUnlimited: false,
          unlimitedExpiresAt: null,
          packages: [],
        },
        isLoading: false,
        error: null,
        useCredit: jest.fn(),
        refetch: jest.fn(),
      });

      render(<ExportDialog {...defaultProps} />);

      expect(screen.getByText('1 kredyt')).toBeInTheDocument();
    });

    it('enables export button when user has credits', () => {
      render(<ExportDialog {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /Download CSV/i });
      expect(exportButton).not.toBeDisabled();
    });

    it('disables export button when no parts', () => {
      mockParts.length = 0;

      render(<ExportDialog {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /Download CSV/i });
      expect(exportButton).toBeDisabled();
    });

    it('calls useCredit on export button click', async () => {
      const useCredit = jest.fn().mockResolvedValue({
        creditUsed: true,
        sessionId: 'session-123',
        creditsRemaining: 7,
        isFreeReexport: false,
      });

      mockUseCredits.mockReturnValue({
        balance: { availableCredits: 8, hasUnlimited: false },
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
        expect(useCredit).toHaveBeenCalledWith('parts_abc123xyz');
      });
    });

    it('downloads CSV after successful credit use', async () => {
      const useCredit = jest.fn().mockResolvedValue({
        creditUsed: true,
        creditsRemaining: 7,
        isFreeReexport: false,
      });

      mockUseCredits.mockReturnValue({
        balance: { availableCredits: 8, hasUnlimited: false },
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

    it('shows success message after export', async () => {
      const useCredit = jest.fn().mockResolvedValue({
        creditUsed: true,
        creditsRemaining: 7,
        isFreeReexport: false,
      });

      mockUseCredits.mockReturnValue({
        balance: { availableCredits: 8, hasUnlimited: false },
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
        expect(screen.getByText(/Eksport CSV ukończony/i)).toBeInTheDocument();
      });
    });

    it('shows error message on credit use failure', async () => {
      const useCredit = jest.fn().mockResolvedValue(null);

      mockUseCredits.mockReturnValue({
        balance: { availableCredits: 8, hasUnlimited: false },
        isLoading: false,
        error: 'No credits available',
        useCredit,
        refetch: jest.fn(),
      });

      const user = userEvent.setup();
      render(<ExportDialog {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /Download CSV/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText(/No credits available|Nie udało się/i)).toBeInTheDocument();
      });
    });
  });

  describe('guest user flow', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
      });

      mockUseGuestCredits.mockReturnValue({
        balance: { availableCredits: 3, expiresAt: '2025-02-01' },
        sessionId: 'guest_abc123',
        email: null,
        isLoading: false,
        error: null,
        useCredit: jest.fn().mockResolvedValue({
          creditUsed: true,
          creditsRemaining: 2,
          isFreeReexport: false,
        }),
        refetch: jest.fn(),
      });
    });

    it('renders with guest credits balance', () => {
      render(<ExportDialog {...defaultProps} />);

      expect(screen.getByText('3 kredyty')).toBeInTheDocument();
    });

    it('uses guestCredits.useCredit for export', async () => {
      const useCredit = jest.fn().mockResolvedValue({
        creditUsed: true,
        creditsRemaining: 2,
        isFreeReexport: false,
      });

      mockUseGuestCredits.mockReturnValue({
        balance: { availableCredits: 3, expiresAt: null },
        sessionId: 'guest_abc123',
        email: null,
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
        expect(useCredit).toHaveBeenCalledWith('parts_abc123xyz');
      });
    });

    it('shows purchase modal when no credits', async () => {
      mockUseGuestCredits.mockReturnValue({
        balance: { availableCredits: 0, expiresAt: null },
        sessionId: 'guest_abc123',
        email: null,
        isLoading: false,
        error: null,
        useCredit: jest.fn(),
        refetch: jest.fn(),
      });

      render(<ExportDialog {...defaultProps} />);

      // Should show "Kup kredyty" button instead of export
      expect(screen.getByRole('button', { name: /Kup kredyty/i })).toBeInTheDocument();
    });
  });

  describe('no credits flow', () => {
    beforeEach(() => {
      mockUseCredits.mockReturnValue({
        balance: { availableCredits: 0, hasUnlimited: false },
        isLoading: false,
        error: null,
        useCredit: jest.fn(),
        refetch: jest.fn(),
      });
    });

    it('shows no credits warning when balance is zero', () => {
      render(<ExportDialog {...defaultProps} />);

      expect(screen.getByText(/Brak kredytów/i)).toBeInTheDocument();
    });

    it('shows "Kup kredyty" button instead of export', () => {
      render(<ExportDialog {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Kup kredyty/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Download CSV/i })).not.toBeInTheDocument();
    });
  });

  describe('Smart Export display', () => {
    it('shows Smart Export info when user has credits', () => {
      render(<ExportDialog {...defaultProps} />);

      expect(screen.getByText(/Smart Export/i)).toBeInTheDocument();
      expect(screen.getByText(/24h/i)).toBeInTheDocument();
    });

    it('displays free re-export message on isFreeReexport', async () => {
      const useCredit = jest.fn().mockResolvedValue({
        creditUsed: false,
        creditsRemaining: 8,
        isFreeReexport: true,
      });

      mockUseCredits.mockReturnValue({
        balance: { availableCredits: 8, hasUnlimited: false },
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
        expect(screen.getByText(/Darmowy re-export/i)).toBeInTheDocument();
      });
    });

    it('displays credits remaining after paid export', async () => {
      const useCredit = jest.fn().mockResolvedValue({
        creditUsed: true,
        creditsRemaining: 7,
        isFreeReexport: false,
      });

      mockUseCredits.mockReturnValue({
        balance: { availableCredits: 8, hasUnlimited: false },
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
        expect(screen.getByText(/7/)).toBeInTheDocument();
      });
    });
  });

  describe('column selection', () => {
    it('renders all available columns', () => {
      render(<ExportDialog {...defaultProps} />);

      // Check labels exist (use getAllByText since text appears in both checkbox labels and table headers)
      expect(screen.getAllByText('Furniture').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Part Name').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Material').length).toBeGreaterThan(0);
    });

    it('has default columns pre-selected', () => {
      render(<ExportDialog {...defaultProps} />);

      const furnitureCheckbox = screen.getByLabelText('Furniture');
      expect(furnitureCheckbox).toBeChecked();
    });

    it('toggles column selection on checkbox click', async () => {
      const user = userEvent.setup();
      render(<ExportDialog {...defaultProps} />);

      const notesCheckbox = screen.getByLabelText('Notes');
      expect(notesCheckbox).not.toBeChecked();

      await user.click(notesCheckbox);

      expect(notesCheckbox).toBeChecked();
    });
  });

  describe('preview table', () => {
    it('shows parts in preview', () => {
      render(<ExportDialog {...defaultProps} />);

      // The preview should show part data
      expect(screen.getByText('Preview')).toBeInTheDocument();
    });

    it('shows no data message when empty', () => {
      mockParts.length = 0;

      render(<ExportDialog {...defaultProps} />);

      expect(screen.getByText('No data')).toBeInTheDocument();
    });

    it('shows CSV preview in textarea', () => {
      render(<ExportDialog {...defaultProps} />);

      const csvPreview = screen.getByRole('textbox');
      expect(csvPreview).toBeInTheDocument();
      expect(csvPreview).toHaveAttribute('readonly');
    });
  });

  describe('DXF export state', () => {
    it('disables DXF export when there are no non-rect parts', () => {
      render(<ExportDialog {...defaultProps} />);

      const dxfButton = screen.getByRole('button', { name: /Download DXF/i });
      expect(dxfButton).toBeDisabled();
    });

    it('enables DXF export when non-rect parts exist', () => {
      mockParts.length = 0;
      mockParts.push(createTestPart({ id: 'rect-1' }));
      mockParts.push(
        createTestPart({
          id: 'lshape-1',
          shapeType: 'L_SHAPE',
          shapeParams: { type: 'L_SHAPE', x: 300, y: 300, cutX: 80, cutY: 80 } as any,
        })
      );

      render(<ExportDialog {...defaultProps} />);

      const dxfButton = screen.getByRole('button', { name: /Download DXF/i });
      expect(dxfButton).not.toBeDisabled();
    });
  });

  describe('analytics tracking', () => {
    it('tracks EXPORT_INITIATED on dialog open', () => {
      render(<ExportDialog {...defaultProps} />);

      expect(track).toHaveBeenCalledWith(AnalyticsEvent.EXPORT_INITIATED, {
        parts_count: 1,
        cabinet_count: 1,
      });
    });

    it('tracks EXPORT_COMPLETED on success', async () => {
      const useCredit = jest.fn().mockResolvedValue({
        creditUsed: true,
        creditsRemaining: 7,
        isFreeReexport: false,
      });

      mockUseCredits.mockReturnValue({
        balance: { availableCredits: 8, hasUnlimited: false },
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
        expect(track).toHaveBeenCalledWith(AnalyticsEvent.EXPORT_COMPLETED, {
          parts_count: 1,
          used_credit: true,
          export_format: 'csv',
        });
      });
    });

    it('tracks SMART_EXPORT_USED for free re-export', async () => {
      const useCredit = jest.fn().mockResolvedValue({
        creditUsed: false,
        creditsRemaining: 8,
        isFreeReexport: true,
      });

      mockUseCredits.mockReturnValue({
        balance: { availableCredits: 8, hasUnlimited: false },
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
        expect(track).toHaveBeenCalledWith(AnalyticsEvent.SMART_EXPORT_USED, {
          parts_count: 1,
        });
      });
    });

    it('tracks EXPORT_VALIDATION_FAILED on error', async () => {
      const useCredit = jest.fn().mockResolvedValue(null);

      mockUseCredits.mockReturnValue({
        balance: { availableCredits: 8, hasUnlimited: false },
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
        expect(track).toHaveBeenCalledWith(AnalyticsEvent.EXPORT_VALIDATION_FAILED, {
          error_count: 1,
          error_types: ['no_credits'],
        });
      });
    });
  });

  describe('dialog behavior', () => {
    it('calls onOpenChange when cancel is clicked', async () => {
      const onOpenChange = jest.fn();
      const user = userEvent.setup();

      render(<ExportDialog {...defaultProps} onOpenChange={onOpenChange} />);

      const cancelButton = screen.getByRole('button', { name: 'Anuluj' });
      await user.click(cancelButton);

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('renders dialog title', () => {
      render(<ExportDialog {...defaultProps} />);

      expect(screen.getByText('Export')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows loading spinner during export', async () => {
      // Create a promise that doesn't resolve immediately
      let resolveCredit: (value: any) => void;
      const useCredit = jest.fn().mockReturnValue(
        new Promise((resolve) => {
          resolveCredit = resolve;
        })
      );

      mockUseCredits.mockReturnValue({
        balance: { availableCredits: 8, hasUnlimited: false },
        isLoading: false,
        error: null,
        useCredit,
        refetch: jest.fn(),
      });

      const user = userEvent.setup();
      render(<ExportDialog {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /Download CSV/i });
      await user.click(exportButton);

      // Should show loading state
      expect(screen.getByText(/Eksportowanie CSV/i)).toBeInTheDocument();

      // Cleanup
      resolveCredit!({ creditUsed: true, creditsRemaining: 7, isFreeReexport: false });
    });

    it('disables export button during processing', async () => {
      let resolveCredit: (value: any) => void;
      const useCredit = jest.fn().mockReturnValue(
        new Promise((resolve) => {
          resolveCredit = resolve;
        })
      );

      mockUseCredits.mockReturnValue({
        balance: { availableCredits: 8, hasUnlimited: false },
        isLoading: false,
        error: null,
        useCredit,
        refetch: jest.fn(),
      });

      const user = userEvent.setup();
      render(<ExportDialog {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /Download CSV/i });
      await user.click(exportButton);

      // Button should be disabled during processing
      const processingButton = screen.getByRole('button', { name: /Eksportowanie CSV/i });
      expect(processingButton).toBeDisabled();

      // Cleanup
      resolveCredit!({ creditUsed: true, creditsRemaining: 7, isFreeReexport: false });
    });
  });

  describe('credits badge click', () => {
    it('clicking credits badge opens purchase modal', async () => {
      const user = userEvent.setup();
      render(<ExportDialog {...defaultProps} />);

      const creditsBadge = screen.getByText('8 kredytów');
      await user.click(creditsBadge);

      // Badge click opens purchase modal (to buy more credits)
      expect(screen.getByText('Kup kredyty eksportu')).toBeInTheDocument();
    });
  });

  describe('multiple parts', () => {
    it('handles multiple parts correctly', () => {
      // Add more parts
      mockParts.push(
        createTestPart({ id: 'part-2', name: 'Part 2' }),
        createTestPart({ id: 'part-3', name: 'Part 3' })
      );

      render(<ExportDialog {...defaultProps} />);

      // Should show parts in preview
      expect(screen.getByText('Preview')).toBeInTheDocument();
    });
  });
});
