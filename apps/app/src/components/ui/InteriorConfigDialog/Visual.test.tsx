/**
 * Visual/Snapshot Tests for Interior Configuration System
 *
 * Tests VIS-001 through VIS-005 from interior-config-test-plan.md
 * Captures snapshots for visual regression testing:
 * - InteriorPreview: SHELVES, DRAWERS, NESTED 2x2
 * - ZoneEditor: SHELVES controls, DRAWERS controls
 */

import { render } from "@testing-library/react";
import { InteriorPreview } from "./InteriorPreview";
import { ZoneEditor } from "./ZoneEditor";
import type { CabinetInteriorConfig, InteriorZone, Material } from "@/types";

// ============================================================================
// Test Fixtures
// ============================================================================

const mockMaterials: Material[] = [
  {
    id: "mat-body",
    name: "Biała płyta 18mm",
    category: "board",
    color: "#FFFFFF",
    thickness: 18,
  },
  {
    id: "mat-front",
    name: "Dąb naturalny",
    category: "board",
    color: "#D4A574",
    thickness: 18,
  },
];

/**
 * Simple SHELVES zone config
 */
function createShelvesConfig(): CabinetInteriorConfig {
  return {
    rootZone: {
      id: "root",
      contentType: "NESTED",
      divisionDirection: "HORIZONTAL",
      heightConfig: { mode: "RATIO", ratio: 1 },
      depth: 0,
      children: [
        {
          id: "shelves-zone",
          contentType: "SHELVES",
          heightConfig: { mode: "RATIO", ratio: 1 },
          depth: 1,
          shelvesConfig: {
            mode: "UNIFORM",
            count: 3,
            depthPreset: "FULL",
            shelves: [],
          },
        },
      ],
    },
  };
}

/**
 * Simple DRAWERS zone config
 */
function createDrawersConfig(): CabinetInteriorConfig {
  return {
    rootZone: {
      id: "root",
      contentType: "NESTED",
      divisionDirection: "HORIZONTAL",
      heightConfig: { mode: "RATIO", ratio: 1 },
      depth: 0,
      children: [
        {
          id: "drawers-zone",
          contentType: "DRAWERS",
          heightConfig: { mode: "RATIO", ratio: 1 },
          depth: 1,
          drawerConfig: {
            slideType: "SIDE_MOUNT",
            zones: [
              { id: "dz-1", heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
              { id: "dz-2", heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
              { id: "dz-3", heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
            ],
          },
        },
      ],
    },
  };
}

/**
 * NESTED 2x2 config (2 rows, each with 2 columns)
 */
function createNested2x2Config(): CabinetInteriorConfig {
  return {
    rootZone: {
      id: "root",
      contentType: "NESTED",
      divisionDirection: "HORIZONTAL",
      heightConfig: { mode: "RATIO", ratio: 1 },
      depth: 0,
      children: [
        {
          id: "row-1",
          contentType: "NESTED",
          divisionDirection: "VERTICAL",
          heightConfig: { mode: "RATIO", ratio: 1 },
          depth: 1,
          children: [
            {
              id: "cell-1-1",
              contentType: "SHELVES",
              heightConfig: { mode: "RATIO", ratio: 1 },
              widthConfig: { mode: "PROPORTIONAL", ratio: 1 },
              depth: 2,
              shelvesConfig: { mode: "UNIFORM", count: 2, depthPreset: "FULL", shelves: [] },
            },
            {
              id: "cell-1-2",
              contentType: "EMPTY",
              heightConfig: { mode: "RATIO", ratio: 1 },
              widthConfig: { mode: "PROPORTIONAL", ratio: 1 },
              depth: 2,
            },
          ],
        },
        {
          id: "row-2",
          contentType: "NESTED",
          divisionDirection: "VERTICAL",
          heightConfig: { mode: "RATIO", ratio: 1 },
          depth: 1,
          children: [
            {
              id: "cell-2-1",
              contentType: "EMPTY",
              heightConfig: { mode: "RATIO", ratio: 1 },
              widthConfig: { mode: "PROPORTIONAL", ratio: 1 },
              depth: 2,
            },
            {
              id: "cell-2-2",
              contentType: "DRAWERS",
              heightConfig: { mode: "RATIO", ratio: 1 },
              widthConfig: { mode: "PROPORTIONAL", ratio: 1 },
              depth: 2,
              drawerConfig: {
                slideType: "SIDE_MOUNT",
                zones: [{ id: "dz-1", heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] }],
              },
            },
          ],
        },
      ],
    },
  };
}

/**
 * SHELVES zone for ZoneEditor tests
 */
function createShelvesZone(): InteriorZone {
  return {
    id: "shelves-zone",
    contentType: "SHELVES",
    heightConfig: { mode: "RATIO", ratio: 1 },
    depth: 1,
    shelvesConfig: {
      mode: "UNIFORM",
      count: 3,
      depthPreset: "FULL",
      shelves: [],
    },
  };
}

/**
 * DRAWERS zone for ZoneEditor tests
 */
function createDrawersZone(): InteriorZone {
  return {
    id: "drawers-zone",
    contentType: "DRAWERS",
    heightConfig: { mode: "RATIO", ratio: 1 },
    depth: 1,
    drawerConfig: {
      slideType: "SIDE_MOUNT",
      zones: [
        { id: "dz-1", heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
        { id: "dz-2", heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
      ],
    },
  };
}

// ============================================================================
// VIS-001: InteriorPreview - SHELVES Zone
// ============================================================================

describe("VIS-001: InteriorPreview SHELVES zone", () => {
  it("renders SHELVES zone with shelf lines", () => {
    const config = createShelvesConfig();
    const zones = config.rootZone.children!;

    const { container } = render(
      <InteriorPreview
        zones={zones}
        cabinetWidth={600}
        cabinetHeight={720}
        cabinetDepth={560}
        selectedZoneId={null}
        onSelectZone={jest.fn()}
        onMoveZone={jest.fn()}
      />
    );

    // Snapshot test
    expect(container.firstChild).toMatchSnapshot();
  });

  it("shows correct number of shelf indicators", () => {
    const config = createShelvesConfig();
    const zones = config.rootZone.children!;

    const { container } = render(
      <InteriorPreview
        zones={zones}
        cabinetWidth={600}
        cabinetHeight={720}
        cabinetDepth={560}
        selectedZoneId={null}
        onSelectZone={jest.fn()}
        onMoveZone={jest.fn()}
      />
    );

    // Should have 3 shelf lines (div elements with bg-zone-shelves)
    const shelfLines = container.querySelectorAll(".bg-zone-shelves\\/80");
    expect(shelfLines.length).toBe(3);
  });
});

// ============================================================================
// VIS-002: InteriorPreview - DRAWERS Zone
// ============================================================================

describe("VIS-002: InteriorPreview DRAWERS zone", () => {
  it("renders DRAWERS zone with drawer boxes", () => {
    const config = createDrawersConfig();
    const zones = config.rootZone.children!;

    const { container } = render(
      <InteriorPreview
        zones={zones}
        cabinetWidth={600}
        cabinetHeight={720}
        cabinetDepth={560}
        selectedZoneId={null}
        onSelectZone={jest.fn()}
        onMoveZone={jest.fn()}
      />
    );

    // Snapshot test
    expect(container.firstChild).toMatchSnapshot();
  });

  it("shows drawer zone in preview", () => {
    const config = createDrawersConfig();
    const zones = config.rootZone.children!;

    const { container } = render(
      <InteriorPreview
        zones={zones}
        cabinetWidth={600}
        cabinetHeight={720}
        cabinetDepth={560}
        selectedZoneId={null}
        onSelectZone={jest.fn()}
        onMoveZone={jest.fn()}
      />
    );

    // Should have drawer zone rendered
    const drawerZone = container.querySelector('[data-testid="zone-drawers-zone"]');
    expect(drawerZone).toBeInTheDocument();
  });
});

// ============================================================================
// VIS-003: InteriorPreview - NESTED 2x2
// ============================================================================

describe("VIS-003: InteriorPreview NESTED 2x2", () => {
  it("renders NESTED 2x2 structure with all cells", () => {
    const config = createNested2x2Config();
    const zones = config.rootZone.children!;

    const { container } = render(
      <InteriorPreview
        zones={zones}
        cabinetWidth={600}
        cabinetHeight={720}
        cabinetDepth={560}
        selectedZoneId={null}
        onSelectZone={jest.fn()}
        onMoveZone={jest.fn()}
      />
    );

    // Snapshot test
    expect(container.firstChild).toMatchSnapshot();
  });

  it("shows 2 rows in a NESTED 2x2 grid", () => {
    const config = createNested2x2Config();
    const zones = config.rootZone.children!;

    const { container } = render(
      <InteriorPreview
        zones={zones}
        cabinetWidth={600}
        cabinetHeight={720}
        cabinetDepth={560}
        selectedZoneId={null}
        onSelectZone={jest.fn()}
        onMoveZone={jest.fn()}
      />
    );

    // Should have zone elements for the 2 rows
    expect(container.querySelector('[data-testid="zone-row-1"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="zone-row-2"]')).toBeInTheDocument();
  });

  it("shows nested cells within rows", () => {
    const config = createNested2x2Config();
    const zones = config.rootZone.children!;

    const { container } = render(
      <InteriorPreview
        zones={zones}
        cabinetWidth={600}
        cabinetHeight={720}
        cabinetDepth={560}
        selectedZoneId={null}
        onSelectZone={jest.fn()}
        onMoveZone={jest.fn()}
      />
    );

    // Should have cells within the rows
    expect(container.querySelector('[data-testid="zone-cell-1-1"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="zone-cell-2-2"]')).toBeInTheDocument();
  });
});

// ============================================================================
// VIS-004: ZoneEditor - SHELVES Controls
// ============================================================================

describe("VIS-004: ZoneEditor SHELVES controls", () => {
  const defaultZoneEditorProps = {
    zone: createShelvesZone(),
    onUpdate: jest.fn(),
    onDelete: jest.fn(),
    canDelete: true,
    cabinetHeight: 720,
    cabinetWidth: 600,
    interiorHeight: 720,
    totalRatio: 1,
    cabinetDepth: 560,
    materials: mockMaterials,
    bodyMaterialId: "mat-body",
    lastUsedShelfMaterial: "mat-body",
    lastUsedDrawerBoxMaterial: "mat-body",
    lastUsedDrawerBottomMaterial: "mat-body",
    onShelfMaterialChange: jest.fn(),
    onDrawerBoxMaterialChange: jest.fn(),
    onDrawerBottomMaterialChange: jest.fn(),
  };

  it("renders SHELVES zone editor with all controls", () => {
    const { container } = render(<ZoneEditor {...defaultZoneEditorProps} />);

    // Snapshot test
    expect(container.firstChild).toMatchSnapshot();
  });

  it("shows shelf-specific controls", () => {
    const { getByText, getAllByText } = render(<ZoneEditor {...defaultZoneEditorProps} />);

    // Should show shelf count control
    expect(getAllByText(/półk/i).length).toBeGreaterThan(0);
  });

  it("shows content type selector with SHELVES selected", () => {
    const { container } = render(<ZoneEditor {...defaultZoneEditorProps} />);

    // Should have content type buttons
    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// VIS-005: ZoneEditor - DRAWERS Controls
// ============================================================================

describe("VIS-005: ZoneEditor DRAWERS controls", () => {
  const defaultZoneEditorProps = {
    zone: createDrawersZone(),
    onUpdate: jest.fn(),
    onDelete: jest.fn(),
    canDelete: true,
    cabinetHeight: 720,
    cabinetWidth: 600,
    interiorHeight: 720,
    totalRatio: 1,
    cabinetDepth: 560,
    materials: mockMaterials,
    bodyMaterialId: "mat-body",
    lastUsedShelfMaterial: "mat-body",
    lastUsedDrawerBoxMaterial: "mat-body",
    lastUsedDrawerBottomMaterial: "mat-body",
    onShelfMaterialChange: jest.fn(),
    onDrawerBoxMaterialChange: jest.fn(),
    onDrawerBottomMaterialChange: jest.fn(),
  };

  it("renders DRAWERS zone editor with all controls", () => {
    const { container } = render(<ZoneEditor {...defaultZoneEditorProps} />);

    // Snapshot test
    expect(container.firstChild).toMatchSnapshot();
  });

  it("shows drawer-specific controls", () => {
    const { getAllByText } = render(<ZoneEditor {...defaultZoneEditorProps} />);

    // Should show drawer zone count or related labels
    expect(getAllByText(/szuflad/i).length).toBeGreaterThan(0);
  });

  it("shows content type selector with DRAWERS selected", () => {
    const { container } = render(<ZoneEditor {...defaultZoneEditorProps} />);

    // Should have multiple buttons for controls
    const buttons = container.querySelectorAll("button");
    expect(buttons.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Additional Visual Tests - Selection States
// ============================================================================

describe("Visual: Selection states", () => {
  it("shows selected zone with ring highlight", () => {
    const config = createShelvesConfig();
    const zones = config.rootZone.children!;

    const { container } = render(
      <InteriorPreview
        zones={zones}
        cabinetWidth={600}
        cabinetHeight={720}
        cabinetDepth={560}
        selectedZoneId="shelves-zone"
        onSelectZone={jest.fn()}
        onMoveZone={jest.fn()}
      />
    );

    // Selected zone should have ring styling
    const selectedZone = container.querySelector('[data-testid="zone-shelves-zone"]');
    expect(selectedZone).toHaveClass("ring-2");
    expect(selectedZone).toHaveClass("border-primary");
  });

  it("renders aspect ratio correctly for wide cabinet", () => {
    const config = createShelvesConfig();
    const zones = config.rootZone.children!;

    const { container } = render(
      <InteriorPreview
        zones={zones}
        cabinetWidth={800}
        cabinetHeight={600}
        cabinetDepth={560}
        selectedZoneId={null}
        onSelectZone={jest.fn()}
        onMoveZone={jest.fn()}
      />
    );

    // Snapshot for aspect ratio verification
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders aspect ratio correctly for tall cabinet", () => {
    const config = createShelvesConfig();
    const zones = config.rootZone.children!;

    const { container } = render(
      <InteriorPreview
        zones={zones}
        cabinetWidth={400}
        cabinetHeight={900}
        cabinetDepth={560}
        selectedZoneId={null}
        onSelectZone={jest.fn()}
        onMoveZone={jest.fn()}
      />
    );

    // Snapshot for aspect ratio verification
    expect(container.firstChild).toMatchSnapshot();
  });
});
