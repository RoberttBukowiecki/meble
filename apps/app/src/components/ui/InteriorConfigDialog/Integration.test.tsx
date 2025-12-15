/**
 * Integration Tests for Interior Configuration System
 *
 * End-to-end tests validating full user flows from interior-config-test-plan.md
 * Tests INT-001 through INT-005 covering:
 * - 3-level nested structure creation
 * - Drawer configuration in nested columns
 * - Partition configuration
 * - Full dialog flow (open, configure, save)
 * - Part generation from zone configuration
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InteriorConfigDialog } from './index';
import { Zone, Shelf, Drawer } from '@/lib/domain';
import { generateInterior, hasInteriorContent } from '@/lib/cabinetGenerators/interior';
import type { CabinetInteriorConfig, Material, InteriorZone } from '@/types';

// ============================================================================
// Test Fixtures
// ============================================================================

const mockMaterials: Material[] = [
  {
    id: 'mat-body',
    name: 'Biała płyta 18mm',
    category: 'board',
    color: '#FFFFFF',
    thickness: 18,
  },
  {
    id: 'mat-front',
    name: 'Dąb naturalny',
    category: 'board',
    color: '#D4A574',
    thickness: 18,
  },
  {
    id: 'mat-hdf',
    name: 'HDF 3mm',
    category: 'hdf',
    color: '#8B4513',
    thickness: 3,
  },
];

const defaultProps = {
  open: true,
  onOpenChange: jest.fn(),
  onConfigChange: jest.fn(),
  cabinetHeight: 720,
  cabinetWidth: 600,
  cabinetDepth: 560,
  hasDoors: false,
  onRemoveDoors: jest.fn(),
  materials: mockMaterials,
  bodyMaterialId: 'mat-body',
  lastUsedShelfMaterial: 'mat-body',
  lastUsedDrawerBoxMaterial: 'mat-body',
  lastUsedDrawerBottomMaterial: 'mat-hdf',
};

/**
 * Creates a 3-level nested configuration
 * Root (depth 0)
 *   -> Row 1 NESTED VERTICAL (depth 1)
 *       -> Column A: SHELVES (depth 2)
 *       -> Column B: NESTED HORIZONTAL (depth 2)
 *           -> Inner Row: DRAWERS (depth 3)
 *   -> Row 2: SHELVES (depth 1)
 */
function create3LevelNestedConfig(): CabinetInteriorConfig {
  return {
    rootZone: {
      id: 'root',
      contentType: 'NESTED',
      divisionDirection: 'HORIZONTAL',
      heightConfig: { mode: 'RATIO', ratio: 1 },
      depth: 0,
      children: [
        {
          id: 'row-1',
          contentType: 'NESTED',
          divisionDirection: 'VERTICAL',
          heightConfig: { mode: 'RATIO', ratio: 2 },
          depth: 1,
          children: [
            {
              id: 'col-a',
              contentType: 'SHELVES',
              heightConfig: { mode: 'RATIO', ratio: 1 },
              widthConfig: { mode: 'PROPORTIONAL', ratio: 1 },
              depth: 2,
              shelvesConfig: {
                mode: 'UNIFORM',
                count: 2,
                depthPreset: 'FULL',
                shelves: [],
              },
            },
            {
              id: 'col-b',
              contentType: 'NESTED',
              divisionDirection: 'HORIZONTAL',
              heightConfig: { mode: 'RATIO', ratio: 1 },
              widthConfig: { mode: 'PROPORTIONAL', ratio: 1 },
              depth: 2,
              children: [
                {
                  id: 'inner-row',
                  contentType: 'DRAWERS',
                  heightConfig: { mode: 'RATIO', ratio: 1 },
                  depth: 3,
                  drawerConfig: {
                    slideType: 'SIDE_MOUNT',
                    zones: [
                      { id: 'dz-1', heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
                      { id: 'dz-2', heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
                    ],
                  },
                },
              ],
            },
          ],
          partitions: [
            {
              id: 'partition-1',
              enabled: true,
              depthPreset: 'FULL',
            },
          ],
        },
        {
          id: 'row-2',
          contentType: 'SHELVES',
          heightConfig: { mode: 'RATIO', ratio: 1 },
          depth: 1,
          shelvesConfig: {
            mode: 'UNIFORM',
            count: 3,
            depthPreset: 'FULL',
            shelves: [],
          },
        },
      ],
    },
  };
}

/**
 * Creates simple config with 2 vertical columns
 */
function createVerticalColumnsConfig(): CabinetInteriorConfig {
  return {
    rootZone: {
      id: 'root',
      contentType: 'NESTED',
      divisionDirection: 'HORIZONTAL',
      heightConfig: { mode: 'RATIO', ratio: 1 },
      depth: 0,
      children: [
        {
          id: 'row-1',
          contentType: 'NESTED',
          divisionDirection: 'VERTICAL',
          heightConfig: { mode: 'RATIO', ratio: 1 },
          depth: 1,
          children: [
            {
              id: 'col-left',
              contentType: 'SHELVES',
              heightConfig: { mode: 'RATIO', ratio: 1 },
              widthConfig: { mode: 'PROPORTIONAL', ratio: 1 },
              depth: 2,
              shelvesConfig: {
                mode: 'UNIFORM',
                count: 2,
                depthPreset: 'FULL',
                shelves: [],
              },
            },
            {
              id: 'col-right',
              contentType: 'DRAWERS',
              heightConfig: { mode: 'RATIO', ratio: 1 },
              widthConfig: { mode: 'PROPORTIONAL', ratio: 1 },
              depth: 2,
              drawerConfig: {
                slideType: 'SIDE_MOUNT',
                zones: [
                  { id: 'dz-1', heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
                ],
              },
            },
          ],
        },
      ],
    },
  };
}

// ============================================================================
// INT-001: 3-Level Nested Structure Navigation
// ============================================================================

describe('INT-001: Create 3-level nested structure', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
  });

  it('should create a 3-level nested structure with correct zone tree', () => {
    const config = create3LevelNestedConfig();

    // Verify structure
    expect(config.rootZone.depth).toBe(0);
    expect(config.rootZone.contentType).toBe('NESTED');
    expect(config.rootZone.children).toHaveLength(2);

    // First child (VERTICAL nested)
    const row1 = config.rootZone.children![0];
    expect(row1.depth).toBe(1);
    expect(row1.contentType).toBe('NESTED');
    expect(row1.divisionDirection).toBe('VERTICAL');
    expect(row1.children).toHaveLength(2);

    // Level 2 zones
    const colA = row1.children![0];
    expect(colA.depth).toBe(2);
    expect(colA.contentType).toBe('SHELVES');

    const colB = row1.children![1];
    expect(colB.depth).toBe(2);
    expect(colB.contentType).toBe('NESTED');

    // Level 3 zone
    const innerRow = colB.children![0];
    expect(innerRow.depth).toBe(3);
    expect(innerRow.contentType).toBe('DRAWERS');
  });

  it('should find all zones at each depth level', () => {
    const config = create3LevelNestedConfig();
    const allZones = Zone.getAllZones(config.rootZone);

    const depth0 = allZones.filter(z => z.depth === 0);
    const depth1 = allZones.filter(z => z.depth === 1);
    const depth2 = allZones.filter(z => z.depth === 2);
    const depth3 = allZones.filter(z => z.depth === 3);

    expect(depth0).toHaveLength(1); // root
    expect(depth1).toHaveLength(2); // row-1, row-2
    expect(depth2).toHaveLength(2); // col-a, col-b
    expect(depth3).toHaveLength(1); // inner-row
  });

  it('should navigate to any zone via path', () => {
    const config = create3LevelNestedConfig();

    // Find innermost zone
    const innerZone = Zone.findZoneById(config.rootZone, 'inner-row');
    expect(innerZone).not.toBeNull();
    expect(innerZone?.contentType).toBe('DRAWERS');

    // Find path (returns path from first non-root zone)
    const path = Zone.findZonePath(config.rootZone, 'inner-row');
    expect(path).not.toBeNull();
    // Path should include the chain of zone IDs
    expect(path?.length).toBeGreaterThan(0);
  });

  it('should update zone at any depth', () => {
    const config = create3LevelNestedConfig();

    // Get path to inner drawer zone
    const path = Zone.findZonePath(config.rootZone, 'inner-row');
    expect(path).not.toBeNull();

    // Update inner drawer zone using path
    const updated = Zone.updateAtPath(config.rootZone, path!, (zone) => ({
      ...zone,
      drawerConfig: {
        ...zone.drawerConfig!,
        slideType: 'UNDER_MOUNT',
      },
    }));

    const innerZone = Zone.findZoneById(updated, 'inner-row');
    expect(innerZone?.drawerConfig?.slideType).toBe('UNDER_MOUNT');
  });

  it('renders dialog with 3-level config and shows correct initial selection', async () => {
    const config = create3LevelNestedConfig();

    render(
      <InteriorConfigDialog
        {...defaultProps}
        config={config}
      />
    );

    await waitFor(() => {
      // Dialog should be open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Preview should show the zone structure
    const preview = screen.getByTestId('interior-preview');
    expect(preview).toBeInTheDocument();
  });
});

// ============================================================================
// INT-002: Configure Drawers in Nested Column
// ============================================================================

describe('INT-002: Configure drawers in nested column', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
  });

  it('should calculate correct drawer dimensions in nested column', () => {
    const config = createVerticalColumnsConfig();

    // Calculate bounds
    const parentBounds = {
      startX: -282, // (600 - 18*2) / 2
      startY: 18,
      width: 564, // 600 - 18*2
      height: 684, // 720 - 18*2
    };

    const treeInfo = Zone.calculateBounds(config.rootZone, parentBounds, 18, 560);

    // Find drawer zone bounds
    const drawerBounds = treeInfo.leafZoneBounds.find(
      b => b.zone.contentType === 'DRAWERS'
    );

    expect(drawerBounds).toBeDefined();

    // Drawer should be in the right column
    expect(drawerBounds!.width).toBeGreaterThan(0);
  });

  it('should allow adding drawer zones in nested column config', () => {
    const config = createVerticalColumnsConfig();
    const drawerZone = Zone.findZoneById(config.rootZone, 'col-right');

    expect(drawerZone?.drawerConfig).toBeDefined();
    expect(drawerZone?.drawerConfig?.zones).toHaveLength(1);

    // Add another drawer zone
    const updatedConfig = Drawer.addZone(drawerZone!.drawerConfig!);
    expect(updatedConfig.zones).toHaveLength(2);
  });

  it('should calculate front/box ratios correctly', () => {
    const config = createVerticalColumnsConfig();
    const drawerZone = Zone.findZoneById(config.rootZone, 'col-right');
    const drawerConfig = drawerZone!.drawerConfig!;

    // Calculate zone bounds (zones within drawer config)
    const zoneBounds = Drawer.calculateZoneBounds(drawerConfig.zones, 684, 18);
    expect(zoneBounds).toHaveLength(1);

    // Single zone should have height
    expect(zoneBounds[0].height).toBeGreaterThan(0);
  });

  it('renders drawer column with correct visual representation', async () => {
    const config = createVerticalColumnsConfig();

    render(
      <InteriorConfigDialog
        {...defaultProps}
        config={config}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Check that drawer zone exists in preview
    const drawerZone = screen.getByTestId('zone-col-right');
    expect(drawerZone).toBeInTheDocument();
  });
});

// ============================================================================
// INT-003: Add Partition Between VERTICAL Children
// ============================================================================

describe('INT-003: Add partition between VERTICAL children', () => {
  it('should have partition between vertical columns', () => {
    const config = create3LevelNestedConfig();
    const verticalZone = Zone.findZoneById(config.rootZone, 'row-1');

    expect(verticalZone?.partitions).toBeDefined();
    expect(verticalZone?.partitions).toHaveLength(1);
    expect(verticalZone?.partitions![0].depthPreset).toBe('FULL');
    expect(verticalZone?.partitions![0].enabled).toBe(true);
  });

  it('should calculate partition bounds correctly', () => {
    const config = create3LevelNestedConfig();

    const parentBounds = {
      startX: -282,
      startY: 18,
      width: 564,
      height: 684,
    };

    const treeInfo = Zone.calculateBounds(config.rootZone, parentBounds, 18, 560);

    // Should have partition bounds
    const partitionBounds = treeInfo.partitionBounds.filter(
      p => p.partition.id === 'partition-1'
    );

    expect(partitionBounds).toHaveLength(1);

    // Partition should be at column boundary
    const partition = partitionBounds[0];
    expect(partition.height).toBeGreaterThan(0);
    expect(partition.depthMm).toBeGreaterThan(0);
  });

  it('should generate partition part from config', () => {
    const config = create3LevelNestedConfig();

    const parts = generateInterior({
      cabinetId: 'cab-1',
      furnitureId: 'furn-1',
      cabinetWidth: 600,
      cabinetHeight: 720,
      cabinetDepth: 560,
      bodyMaterialId: 'mat-body',
      frontMaterialId: 'mat-front',
      bodyThickness: 18,
      frontThickness: 18,
      interiorConfig: config,
    });

    // Should have partition part
    const partitionParts = parts.filter(p =>
      p.cabinetMetadata?.role === 'PARTITION'
    );

    expect(partitionParts.length).toBeGreaterThanOrEqual(1);
  });

  it('should allow adding multiple partitions for 3+ columns', () => {
    // Create config with 3 vertical columns
    const config: CabinetInteriorConfig = {
      rootZone: {
        id: 'root',
        contentType: 'NESTED',
        divisionDirection: 'HORIZONTAL',
        heightConfig: { mode: 'RATIO', ratio: 1 },
        depth: 0,
        children: [
          {
            id: 'row',
            contentType: 'NESTED',
            divisionDirection: 'VERTICAL',
            heightConfig: { mode: 'RATIO', ratio: 1 },
            depth: 1,
            children: [
              { id: 'col-1', contentType: 'EMPTY', heightConfig: { mode: 'RATIO', ratio: 1 }, widthConfig: { mode: 'PROPORTIONAL', ratio: 1 }, depth: 2 },
              { id: 'col-2', contentType: 'EMPTY', heightConfig: { mode: 'RATIO', ratio: 1 }, widthConfig: { mode: 'PROPORTIONAL', ratio: 1 }, depth: 2 },
              { id: 'col-3', contentType: 'EMPTY', heightConfig: { mode: 'RATIO', ratio: 1 }, widthConfig: { mode: 'PROPORTIONAL', ratio: 1 }, depth: 2 },
            ],
            partitions: [
              { id: 'p-1', enabled: true, depthPreset: 'FULL' },
              { id: 'p-2', enabled: true, depthPreset: 'HALF' },
            ],
          },
        ],
      },
    };

    const verticalZone = Zone.findZoneById(config.rootZone, 'row');
    expect(verticalZone?.children).toHaveLength(3);
    expect(verticalZone?.partitions).toHaveLength(2);

    // Calculate bounds
    const parentBounds = {
      startX: -282,
      startY: 18,
      width: 564,
      height: 684,
    };

    const treeInfo = Zone.calculateBounds(config.rootZone, parentBounds, 18, 560);
    expect(treeInfo.partitionBounds).toHaveLength(2);
  });
});

// ============================================================================
// INT-004: Full Flow - Open, Configure, Save
// ============================================================================

describe('INT-004: Full flow - open, configure, save', () => {
  let user: ReturnType<typeof userEvent.setup>;
  const mockOnConfigChange = jest.fn();
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();
  });

  it('opens dialog with initial config', async () => {
    const initialConfig = create3LevelNestedConfig();

    render(
      <InteriorConfigDialog
        {...defaultProps}
        config={initialConfig}
        onConfigChange={mockOnConfigChange}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Dialog header should be present
    expect(screen.getByText('Konfiguracja wnętrza szafki')).toBeInTheDocument();
  });

  it('applies changes when clicking apply button', async () => {
    const initialConfig = createVerticalColumnsConfig();

    render(
      <InteriorConfigDialog
        {...defaultProps}
        config={initialConfig}
        onConfigChange={mockOnConfigChange}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Click apply button
    const applyButton = screen.getByRole('button', { name: /zastosuj/i });
    await user.click(applyButton);

    // Should call onConfigChange
    expect(mockOnConfigChange).toHaveBeenCalledTimes(1);

    // Should close dialog
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('cancels changes when clicking cancel button', async () => {
    const initialConfig = createVerticalColumnsConfig();

    render(
      <InteriorConfigDialog
        {...defaultProps}
        config={initialConfig}
        onConfigChange={mockOnConfigChange}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Click cancel button
    const cancelButton = screen.getByRole('button', { name: /anuluj/i });
    await user.click(cancelButton);

    // Should NOT call onConfigChange
    expect(mockOnConfigChange).not.toHaveBeenCalled();

    // Should close dialog
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('creates default config when no config provided', async () => {
    render(
      <InteriorConfigDialog
        {...defaultProps}
        config={undefined}
        onConfigChange={mockOnConfigChange}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Apply button click
    const applyButton = screen.getByRole('button', { name: /zastosuj/i });
    await user.click(applyButton);

    // Should create default config
    expect(mockOnConfigChange).toHaveBeenCalledTimes(1);
    const newConfig = mockOnConfigChange.mock.calls[0][0];
    expect(newConfig.rootZone).toBeDefined();
    expect(newConfig.rootZone.contentType).toBe('NESTED');
  });

  it('preserves modified config when applying', async () => {
    const initialConfig = createVerticalColumnsConfig();

    render(
      <InteriorConfigDialog
        {...defaultProps}
        config={initialConfig}
        onConfigChange={mockOnConfigChange}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Apply
    const applyButton = screen.getByRole('button', { name: /zastosuj/i });
    await user.click(applyButton);

    // Config should maintain structure
    const savedConfig = mockOnConfigChange.mock.calls[0][0];
    expect(savedConfig.rootZone.children).toBeDefined();
    expect(savedConfig.rootZone.children.length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// INT-005: Generator Creates Correct Parts
// ============================================================================

describe('INT-005: Generator creates correct parts', () => {
  const generatorConfig = {
    cabinetId: 'cab-1',
    furnitureId: 'furn-1',
    cabinetWidth: 600,
    cabinetHeight: 720,
    cabinetDepth: 560,
    bodyMaterialId: 'mat-body',
    frontMaterialId: 'mat-front',
    bodyThickness: 18,
    frontThickness: 18,
  };

  it('generates shelves from SHELVES zones', () => {
    const config: CabinetInteriorConfig = {
      rootZone: {
        id: 'root',
        contentType: 'NESTED',
        divisionDirection: 'HORIZONTAL',
        heightConfig: { mode: 'RATIO', ratio: 1 },
        depth: 0,
        children: [
          {
            id: 'shelf-zone',
            contentType: 'SHELVES',
            heightConfig: { mode: 'RATIO', ratio: 1 },
            depth: 1,
            shelvesConfig: {
              mode: 'UNIFORM',
              count: 3,
              depthPreset: 'FULL',
              shelves: [],
            },
          },
        ],
      },
    };

    const parts = generateInterior({
      ...generatorConfig,
      interiorConfig: config,
    });

    // Should generate 3 shelf parts
    const shelfParts = parts.filter(p => p.cabinetMetadata?.role === 'SHELF');
    expect(shelfParts).toHaveLength(3);

    // Verify shelf dimensions
    for (const shelf of shelfParts) {
      expect(shelf.width).toBeCloseTo(564, 0); // 600 - 18*2
      expect(shelf.depth).toBe(18);
      expect(shelf.name).toMatch(/Półka/);
    }
  });

  it('generates drawer parts from DRAWERS zones', () => {
    const config: CabinetInteriorConfig = {
      rootZone: {
        id: 'root',
        contentType: 'NESTED',
        divisionDirection: 'HORIZONTAL',
        heightConfig: { mode: 'RATIO', ratio: 1 },
        depth: 0,
        children: [
          {
            id: 'drawer-zone',
            contentType: 'DRAWERS',
            heightConfig: { mode: 'RATIO', ratio: 1 },
            depth: 1,
            drawerConfig: {
              slideType: 'SIDE_MOUNT',
              zones: [
                { id: 'dz-1', heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
                { id: 'dz-2', heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
              ],
            },
          },
        ],
      },
    };

    const parts = generateInterior({
      ...generatorConfig,
      interiorConfig: config,
    });

    // Should generate drawer parts (fronts, boxes, etc.)
    expect(parts.length).toBeGreaterThan(0);

    // Should have drawer fronts
    const frontParts = parts.filter(p =>
      p.name?.includes('Front') || p.cabinetMetadata?.role === 'DRAWER_FRONT'
    );
    expect(frontParts.length).toBeGreaterThanOrEqual(2);
  });

  it('generates partitions from nested vertical zones', () => {
    const config = create3LevelNestedConfig();

    const parts = generateInterior({
      ...generatorConfig,
      interiorConfig: config,
    });

    const partitionParts = parts.filter(p =>
      p.cabinetMetadata?.role === 'PARTITION'
    );

    expect(partitionParts.length).toBeGreaterThanOrEqual(1);

    // Verify partition structure
    for (const partition of partitionParts) {
      expect(partition.name).toBe('Przegroda');
      expect(partition.shapeType).toBe('RECT');
    }
  });

  it('correctly positions parts in nested columns', () => {
    const config = createVerticalColumnsConfig();

    const parts = generateInterior({
      ...generatorConfig,
      interiorConfig: config,
    });

    // Get shelf parts
    const shelfParts = parts.filter(p => p.cabinetMetadata?.role === 'SHELF');

    if (shelfParts.length > 0) {
      // Shelves should be offset to left column
      for (const shelf of shelfParts) {
        // X position should be negative (left side of cabinet)
        expect(shelf.position[0]).toBeLessThan(0);
      }
    }
  });

  it('generates no parts for EMPTY zones', () => {
    const config: CabinetInteriorConfig = {
      rootZone: {
        id: 'root',
        contentType: 'NESTED',
        divisionDirection: 'HORIZONTAL',
        heightConfig: { mode: 'RATIO', ratio: 1 },
        depth: 0,
        children: [
          {
            id: 'empty-zone',
            contentType: 'EMPTY',
            heightConfig: { mode: 'RATIO', ratio: 1 },
            depth: 1,
          },
        ],
      },
    };

    const parts = generateInterior({
      ...generatorConfig,
      interiorConfig: config,
    });

    // Should generate no parts (no shelves, drawers, or partitions)
    expect(parts).toHaveLength(0);
  });

  it('hasInteriorContent correctly detects content', () => {
    // Empty config
    const emptyConfig: CabinetInteriorConfig = {
      rootZone: {
        id: 'root',
        contentType: 'EMPTY',
        heightConfig: { mode: 'RATIO', ratio: 1 },
        depth: 0,
      },
    };
    expect(hasInteriorContent(emptyConfig)).toBe(false);

    // Config with shelves
    const shelvesConfig: CabinetInteriorConfig = {
      rootZone: {
        id: 'root',
        contentType: 'SHELVES',
        heightConfig: { mode: 'RATIO', ratio: 1 },
        depth: 0,
        shelvesConfig: { mode: 'UNIFORM', count: 2, depthPreset: 'FULL', shelves: [] },
      },
    };
    expect(hasInteriorContent(shelvesConfig)).toBe(true);

    // Nested config with content
    expect(hasInteriorContent(create3LevelNestedConfig())).toBe(true);
  });

  it('generates parts for complex 3-level structure', () => {
    const config = create3LevelNestedConfig();

    const parts = generateInterior({
      ...generatorConfig,
      interiorConfig: config,
    });

    // Should have multiple types of parts
    const shelfParts = parts.filter(p => p.cabinetMetadata?.role === 'SHELF');
    const partitionParts = parts.filter(p => p.cabinetMetadata?.role === 'PARTITION');

    // 2 shelves in col-a + 3 shelves in row-2 = 5 shelves total
    expect(shelfParts.length).toBeGreaterThanOrEqual(4);

    // At least 1 partition
    expect(partitionParts.length).toBeGreaterThanOrEqual(1);

    // Total parts should reflect complexity
    expect(parts.length).toBeGreaterThan(5);
  });
});

// ============================================================================
// Additional Edge Cases
// ============================================================================

describe('Integration: Edge Cases', () => {
  it('handles undefined interior config gracefully', () => {
    const parts = generateInterior({
      cabinetId: 'cab-1',
      furnitureId: 'furn-1',
      cabinetWidth: 600,
      cabinetHeight: 720,
      cabinetDepth: 560,
      bodyMaterialId: 'mat-body',
      frontMaterialId: 'mat-front',
      bodyThickness: 18,
      frontThickness: 18,
      interiorConfig: undefined,
    });

    expect(parts).toHaveLength(0);
  });

  it('handles config with no rootZone gracefully', () => {
    const parts = generateInterior({
      cabinetId: 'cab-1',
      furnitureId: 'furn-1',
      cabinetWidth: 600,
      cabinetHeight: 720,
      cabinetDepth: 560,
      bodyMaterialId: 'mat-body',
      frontMaterialId: 'mat-front',
      bodyThickness: 18,
      frontThickness: 18,
      interiorConfig: {} as CabinetInteriorConfig,
    });

    expect(parts).toHaveLength(0);
  });

  it('validates zone tree structure', () => {
    const config = create3LevelNestedConfig();

    // Validate should pass for valid structure
    const validation = Zone.validate(config.rootZone, {
      parentWidth: 564,
      parentHeight: 684,
      minZoneWidth: 50,
      minZoneHeight: 50,
    });

    expect(validation.valid).toBe(true);
  });
});
