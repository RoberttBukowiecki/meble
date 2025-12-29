/**
 * InteriorPreview Component Tests
 *
 * Tests for InteriorPreview.tsx based on interior-config-test-plan.md
 * Covers zone rendering, selection, and visual representation.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InteriorPreview } from "./InteriorPreview";
import type { InteriorZone } from "@/types";

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a simple EMPTY zone for testing
 */
function createEmptyZone(id: string = "empty-1", depth: number = 1): InteriorZone {
  return {
    id,
    contentType: "EMPTY",
    heightConfig: { mode: "RATIO", ratio: 1 },
    depth,
  };
}

/**
 * Create a SHELVES zone for testing
 */
function createShelvesZone(
  id: string = "shelves-1",
  shelfCount: number = 3,
  ratio: number = 1
): InteriorZone {
  return {
    id,
    contentType: "SHELVES",
    heightConfig: { mode: "RATIO", ratio },
    depth: 1,
    shelvesConfig: {
      mode: "UNIFORM",
      count: shelfCount,
      depthPreset: "FULL",
      shelves: [],
    },
  };
}

/**
 * Create a DRAWERS zone for testing
 */
function createDrawersZone(
  id: string = "drawers-1",
  zoneCount: number = 2,
  hasExternalFronts: boolean = true,
  ratio: number = 1
): InteriorZone {
  return {
    id,
    contentType: "DRAWERS",
    heightConfig: { mode: "RATIO", ratio },
    depth: 1,
    drawerConfig: {
      slideType: "SIDE_MOUNT",
      zones: Array.from({ length: zoneCount }, (_, i) => ({
        id: `dz-${i}`,
        heightRatio: 1,
        front: hasExternalFronts ? {} : null,
        boxes: [{ heightRatio: 1 }],
      })),
    },
  };
}

/**
 * Create a NESTED zone for testing
 */
function createNestedZone(
  id: string = "nested-1",
  direction: "HORIZONTAL" | "VERTICAL" = "VERTICAL",
  children: InteriorZone[] = []
): InteriorZone {
  return {
    id,
    contentType: "NESTED",
    divisionDirection: direction,
    heightConfig: { mode: "RATIO", ratio: 1 },
    depth: 1,
    children:
      children.length > 0
        ? children
        : [createEmptyZone("nested-child-1", 2), createEmptyZone("nested-child-2", 2)],
  };
}

const defaultProps = {
  zones: [createShelvesZone()],
  selectedZoneId: null,
  onSelectZone: jest.fn(),
  onMoveZone: jest.fn(),
  cabinetHeight: 720,
  cabinetWidth: 600,
  cabinetDepth: 560,
};

// ============================================================================
// B.1 InteriorPreview Component Tests
// ============================================================================

describe("InteriorPreview Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // IP-001: Render with empty zones array
  // ==========================================================================
  describe("IP-001: Render with empty zones array", () => {
    it("renders container even with no zones", () => {
      render(<InteriorPreview {...defaultProps} zones={[]} />);

      const container = screen.getByTestId("interior-preview");
      expect(container).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // IP-002: Render with single SHELVES zone
  // ==========================================================================
  describe("IP-002: Render with single SHELVES zone", () => {
    it("displays zone with shelf count indicator", () => {
      const zone = createShelvesZone("shelves-test", 3);
      render(<InteriorPreview {...defaultProps} zones={[zone]} />);

      // Zone should be rendered
      const zoneElement = screen.getByTestId(`zone-${zone.id}`);
      expect(zoneElement).toBeInTheDocument();

      // Should show "Półki" label
      expect(screen.getByText("Półki")).toBeInTheDocument();

      // Should show shelf count
      expect(screen.getByText("3×")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // IP-003: Render with multiple zones (SHELVES + DRAWERS + EMPTY)
  // ==========================================================================
  describe("IP-003: Render with multiple zones", () => {
    it("shows all zones", () => {
      const zones = [
        createShelvesZone("zone-1"),
        createDrawersZone("zone-2"),
        createEmptyZone("zone-3"),
      ];

      render(<InteriorPreview {...defaultProps} zones={zones} />);

      // All zones should be rendered
      expect(screen.getByTestId("zone-zone-1")).toBeInTheDocument();
      expect(screen.getByTestId("zone-zone-2")).toBeInTheDocument();
      expect(screen.getByTestId("zone-zone-3")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // IP-004: Click on zone triggers onSelectZone
  // ==========================================================================
  describe("IP-004: Click on zone triggers onSelectZone", () => {
    it("calls onSelectZone with correct zone ID", async () => {
      const user = userEvent.setup();
      const onSelectZone = jest.fn();
      const zone = createShelvesZone("clickable-zone");

      render(<InteriorPreview {...defaultProps} zones={[zone]} onSelectZone={onSelectZone} />);

      const zoneElement = screen.getByTestId(`zone-${zone.id}`);
      await user.click(zoneElement);

      expect(onSelectZone).toHaveBeenCalledWith(zone.id);
    });
  });

  // ==========================================================================
  // IP-005: Selected zone has visual distinction
  // ==========================================================================
  describe("IP-005: Selected zone has visual distinction", () => {
    it("highlights selected zone with ring", () => {
      const zone = createShelvesZone("selected-zone");

      render(<InteriorPreview {...defaultProps} zones={[zone]} selectedZoneId={zone.id} />);

      const zoneElement = screen.getByTestId(`zone-${zone.id}`);
      expect(zoneElement).toHaveClass("ring-2");
    });

    it("does not highlight non-selected zone", () => {
      const zones = [createShelvesZone("zone-1"), createDrawersZone("zone-2")];

      render(<InteriorPreview {...defaultProps} zones={zones} selectedZoneId="zone-1" />);

      const zone2Element = screen.getByTestId("zone-zone-2");
      expect(zone2Element).not.toHaveClass("ring-2");
    });
  });

  // ==========================================================================
  // IP-006: Move zone up/down buttons work
  // ==========================================================================
  describe("IP-006: Move zone up/down buttons work", () => {
    it("calls onMoveZone when clicking move up button", async () => {
      const user = userEvent.setup();
      const onMoveZone = jest.fn();
      const zones = [createShelvesZone("zone-1"), createDrawersZone("zone-2")];

      render(
        <InteriorPreview
          {...defaultProps}
          zones={zones}
          selectedZoneId="zone-1"
          onMoveZone={onMoveZone}
        />
      );

      // Find and click move up button (zone-1 can move up)
      const moveUpButton = screen.getByTitle("Przesuń wyżej");
      await user.click(moveUpButton);

      expect(onMoveZone).toHaveBeenCalledWith("zone-1", "up");
    });

    it("calls onMoveZone when clicking move down button", async () => {
      const user = userEvent.setup();
      const onMoveZone = jest.fn();
      const zones = [createShelvesZone("zone-1"), createDrawersZone("zone-2")];

      render(
        <InteriorPreview
          {...defaultProps}
          zones={zones}
          selectedZoneId="zone-2"
          onMoveZone={onMoveZone}
        />
      );

      // Find and click move down button (zone-2 can move down)
      const moveDownButton = screen.getByTitle("Przesuń niżej");
      await user.click(moveDownButton);

      expect(onMoveZone).toHaveBeenCalledWith("zone-2", "down");
    });
  });

  // ==========================================================================
  // IP-007: NESTED zone renders children preview
  // ==========================================================================
  describe("IP-007: NESTED zone renders children preview", () => {
    it("shows nested structure with child zones", () => {
      const nestedZone = createNestedZone("nested-test", "VERTICAL");

      render(<InteriorPreview {...defaultProps} zones={[nestedZone]} />);

      // Parent zone should be rendered
      const zoneElement = screen.getByTestId(`zone-${nestedZone.id}`);
      expect(zoneElement).toBeInTheDocument();

      // Child zones should also be rendered
      expect(screen.getByTestId("zone-nested-child-1")).toBeInTheDocument();
      expect(screen.getByTestId("zone-nested-child-2")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // IP-008: Zone heights reflect ratio proportions
  // ==========================================================================
  describe("IP-008: Zone heights reflect ratio proportions", () => {
    it("uses flex for proportional sizing", () => {
      const zones: InteriorZone[] = [
        createShelvesZone("zone-1", 2, 1),
        createDrawersZone("zone-2", 2, true, 2),
      ];

      render(<InteriorPreview {...defaultProps} zones={zones} />);

      const zone1 = screen.getByTestId("zone-zone-1");
      const zone2 = screen.getByTestId("zone-zone-2");

      // Check flex style
      expect(zone1).toHaveStyle({ flex: "1" });
      expect(zone2).toHaveStyle({ flex: "2" });
    });
  });

  // ==========================================================================
  // IP-009: Drawer zone shows front count
  // ==========================================================================
  describe("IP-009: Drawer zone shows front count", () => {
    it("displays front and box count", () => {
      const zone = createDrawersZone("drawer-test", 3, true);

      render(<InteriorPreview {...defaultProps} zones={[zone]} />);

      // Should show "Szuflady" label
      expect(screen.getByText("Szuflady")).toBeInTheDocument();

      // Should show front/box count (3F/3B = 3 fronts, 3 boxes)
      expect(screen.getByText("3F/3B")).toBeInTheDocument();
    });

    it("shows different counts for mixed external/internal fronts", () => {
      const zone: InteriorZone = {
        id: "mixed-drawer",
        contentType: "DRAWERS",
        heightConfig: { mode: "RATIO", ratio: 1 },
        depth: 1,
        drawerConfig: {
          slideType: "SIDE_MOUNT",
          zones: [
            { id: "dz1", heightRatio: 1, front: {}, boxes: [{ heightRatio: 1 }] },
            { id: "dz2", heightRatio: 1, front: null, boxes: [{ heightRatio: 1 }] }, // Internal
          ],
        },
      };

      render(<InteriorPreview {...defaultProps} zones={[zone]} />);

      // Should show 1 front (external), 2 boxes
      expect(screen.getByText("1F/2B")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // IP-010: Cabinet dimensions are displayed
  // ==========================================================================
  describe("IP-010: Cabinet dimensions are displayed", () => {
    it("shows width and height in header", () => {
      render(<InteriorPreview {...defaultProps} />);

      // Should show cabinet dimensions
      expect(screen.getByText("600mm")).toBeInTheDocument();
      expect(screen.getByText("720mm")).toBeInTheDocument();
    });

    it("shows interior dimensions in footer", () => {
      render(<InteriorPreview {...defaultProps} />);

      // Interior = cabinet - 2 * body thickness (18mm)
      // 600 - 36 = 564, 720 - 36 = 684
      expect(screen.getByText(/564×684mm/)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // Additional Tests
  // ==========================================================================
  describe("Zone content type labels", () => {
    it('shows "Półki" for SHELVES zone', () => {
      render(<InteriorPreview {...defaultProps} zones={[createShelvesZone()]} />);
      expect(screen.getByText("Półki")).toBeInTheDocument();
    });

    it('shows "Szuflady" for DRAWERS zone', () => {
      render(<InteriorPreview {...defaultProps} zones={[createDrawersZone()]} />);
      expect(screen.getByText("Szuflady")).toBeInTheDocument();
    });

    it('shows "Pusta" for EMPTY zone', () => {
      render(<InteriorPreview {...defaultProps} zones={[createEmptyZone()]} />);
      expect(screen.getByText("Pusta")).toBeInTheDocument();
    });
  });

  describe("Multiple zone selection", () => {
    it("only highlights the selected zone", () => {
      const zones = [
        createShelvesZone("zone-1"),
        createDrawersZone("zone-2"),
        createEmptyZone("zone-3"),
      ];

      render(<InteriorPreview {...defaultProps} zones={zones} selectedZoneId="zone-2" />);

      expect(screen.getByTestId("zone-zone-1")).not.toHaveClass("ring-2");
      expect(screen.getByTestId("zone-zone-2")).toHaveClass("ring-2");
      expect(screen.getByTestId("zone-zone-3")).not.toHaveClass("ring-2");
    });
  });

  describe("Nested zone visualization", () => {
    it("renders HORIZONTAL nested zone children in column", () => {
      const nestedZone = createNestedZone("nested-h", "HORIZONTAL", [
        createShelvesZone("child-1", 2, 1),
        createDrawersZone("child-2", 2, true, 1),
      ]);

      render(<InteriorPreview {...defaultProps} zones={[nestedZone]} />);

      expect(screen.getByTestId("zone-child-1")).toBeInTheDocument();
      expect(screen.getByTestId("zone-child-2")).toBeInTheDocument();
    });

    it("renders VERTICAL nested zone children in row", () => {
      const nestedZone = createNestedZone("nested-v", "VERTICAL", [
        createShelvesZone("child-1", 2, 1),
        createDrawersZone("child-2", 2, true, 1),
      ]);

      render(<InteriorPreview {...defaultProps} zones={[nestedZone]} />);

      expect(screen.getByTestId("zone-child-1")).toBeInTheDocument();
      expect(screen.getByTestId("zone-child-2")).toBeInTheDocument();
    });
  });

  describe("Zone mm dimensions", () => {
    it("shows height in mm for each zone", () => {
      const zones = [createShelvesZone("zone-1", 2, 1)];

      render(<InteriorPreview {...defaultProps} zones={zones} />);

      // With interior height = 720 - 36 = 684mm and single zone with ratio 1
      // The zone should be 684mm
      expect(screen.getByText("684mm")).toBeInTheDocument();
    });

    it("shows proportional heights for multiple zones", () => {
      const zones = [createShelvesZone("zone-1", 2, 1), createDrawersZone("zone-2", 2, true, 1)];

      render(<InteriorPreview {...defaultProps} zones={zones} />);

      // Interior height = 684mm, two zones with ratio 1 each = 342mm each
      const heightLabels = screen.getAllByText("342mm");
      expect(heightLabels.length).toBe(2);
    });
  });

  // ==========================================================================
  // IP-011: Double-click on NESTED zone triggers onEnterZone
  // ==========================================================================
  describe("IP-011: Double-click on NESTED zone triggers onEnterZone", () => {
    it("calls onEnterZone when double-clicking a NESTED zone", async () => {
      const user = userEvent.setup();
      const onEnterZone = jest.fn();
      const nestedZone = createNestedZone("nested-test", "VERTICAL");

      render(<InteriorPreview {...defaultProps} zones={[nestedZone]} onEnterZone={onEnterZone} />);

      const zoneElement = screen.getByTestId(`zone-${nestedZone.id}`);
      await user.dblClick(zoneElement);

      expect(onEnterZone).toHaveBeenCalledWith(nestedZone.id);
    });

    it("does not call onEnterZone for non-NESTED zones", async () => {
      const user = userEvent.setup();
      const onEnterZone = jest.fn();
      const shelvesZone = createShelvesZone("shelves-test");

      render(<InteriorPreview {...defaultProps} zones={[shelvesZone]} onEnterZone={onEnterZone} />);

      const zoneElement = screen.getByTestId(`zone-${shelvesZone.id}`);
      await user.dblClick(zoneElement);

      expect(onEnterZone).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // IP-012: Add zone dividers are rendered when onAddZone is provided
  // ==========================================================================
  describe("IP-012: Add zone functionality", () => {
    it("renders add zone dividers when onAddZone is provided", () => {
      const onAddZone = jest.fn();
      const zones = [createShelvesZone("zone-1"), createDrawersZone("zone-2")];

      render(<InteriorPreview {...defaultProps} zones={zones} onAddZone={onAddZone} />);

      // Should have add buttons (they're hidden by default, shown on hover)
      const addButtons = screen.getAllByTitle("Dodaj sekcję");
      expect(addButtons.length).toBeGreaterThan(0);
    });

    it("calls onAddZone when clicking add button", async () => {
      const user = userEvent.setup();
      const onAddZone = jest.fn();
      const zones = [createShelvesZone("zone-1")];

      render(<InteriorPreview {...defaultProps} zones={zones} onAddZone={onAddZone} />);

      // Find and click the add button
      const addButton = screen.getAllByTitle("Dodaj sekcję")[0];
      await user.click(addButton);

      expect(onAddZone).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // IP-013: Animation classes are applied
  // ==========================================================================
  describe("IP-013: Animation classes", () => {
    it("applies animate-zone-enter class to zones", () => {
      const zone = createShelvesZone("animated-zone");

      render(<InteriorPreview {...defaultProps} zones={[zone]} />);

      const zoneElement = screen.getByTestId(`zone-${zone.id}`);
      expect(zoneElement).toHaveClass("animate-zone-enter");
    });

    it("applies animate-zone-select class to selected zone", () => {
      const zone = createShelvesZone("selected-animated");

      render(<InteriorPreview {...defaultProps} zones={[zone]} selectedZoneId={zone.id} />);

      const zoneElement = screen.getByTestId(`zone-${zone.id}`);
      expect(zoneElement).toHaveClass("animate-zone-select");
    });
  });
});
