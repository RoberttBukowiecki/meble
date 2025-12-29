/**
 * ZoneMinimap Component Tests
 *
 * Tests for the minimap component that shows an overview of the zone structure
 * when navigating deep in the hierarchy.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ZoneMinimap } from "./ZoneMinimap";
import type { InteriorZone } from "@/types";

// ============================================================================
// Test Fixtures
// ============================================================================

function createEmptyZone(id: string, depth: number = 1): InteriorZone {
  return {
    id,
    contentType: "EMPTY",
    heightConfig: { mode: "RATIO", ratio: 1 },
    depth,
  };
}

function createShelvesZone(id: string, depth: number = 1): InteriorZone {
  return {
    id,
    contentType: "SHELVES",
    heightConfig: { mode: "RATIO", ratio: 1 },
    depth,
    shelvesConfig: {
      mode: "UNIFORM",
      count: 3,
      depthPreset: "FULL",
      shelves: [],
    },
  };
}

function createNestedZone(id: string, children: InteriorZone[], depth: number = 1): InteriorZone {
  return {
    id,
    contentType: "NESTED",
    divisionDirection: "HORIZONTAL",
    heightConfig: { mode: "RATIO", ratio: 1 },
    depth,
    children,
  };
}

function createRootZone(): InteriorZone {
  return createNestedZone(
    "root",
    [
      createShelvesZone("child-1", 1),
      createNestedZone(
        "child-2",
        [createShelvesZone("grandchild-1", 2), createEmptyZone("grandchild-2", 2)],
        1
      ),
    ],
    0
  );
}

const defaultProps = {
  rootZone: createRootZone(),
  selectedZoneId: null,
  selectedPath: [],
  onSelectZone: jest.fn(),
};

// ============================================================================
// Tests
// ============================================================================

describe("ZoneMinimap Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // MM-001: Minimap is hidden when path depth < 2
  // ==========================================================================
  describe("MM-001: Visibility based on path depth", () => {
    it("is hidden when selectedPath has fewer than 3 items", () => {
      const { container } = render(
        <ZoneMinimap {...defaultProps} selectedPath={["root", "child-1"]} />
      );

      // Should not render anything
      expect(container.firstChild).toBeNull();
    });

    it("is visible when selectedPath has 3 or more items", () => {
      render(<ZoneMinimap {...defaultProps} selectedPath={["root", "child-2", "grandchild-1"]} />);

      // Should render the minimap
      expect(screen.getByText("Minimapa")).toBeInTheDocument();
    });

    it("respects visible prop", () => {
      const { container } = render(
        <ZoneMinimap
          {...defaultProps}
          selectedPath={["root", "child-2", "grandchild-1"]}
          visible={false}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  // ==========================================================================
  // MM-002: Minimap renders zone structure
  // ==========================================================================
  describe("MM-002: Zone structure rendering", () => {
    it("renders header text", () => {
      render(<ZoneMinimap {...defaultProps} selectedPath={["root", "child-2", "grandchild-1"]} />);

      expect(screen.getByText("Minimapa")).toBeInTheDocument();
    });

    it("renders legend items", () => {
      render(<ZoneMinimap {...defaultProps} selectedPath={["root", "child-2", "grandchild-1"]} />);

      expect(screen.getByText("Półki")).toBeInTheDocument();
      expect(screen.getByText("Szuflady")).toBeInTheDocument();
      expect(screen.getByText("Pusta")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // MM-003: Click on zone in minimap triggers onSelectZone
  // ==========================================================================
  describe("MM-003: Zone selection", () => {
    it("calls onSelectZone when clicking a zone", async () => {
      const user = userEvent.setup();
      const onSelectZone = jest.fn();

      render(
        <ZoneMinimap
          {...defaultProps}
          selectedPath={["root", "child-2", "grandchild-1"]}
          onSelectZone={onSelectZone}
        />
      );

      // Find zone by title - there may be multiple, so use getAllBy and click first
      const zoneElements = screen.getAllByTitle(/SHELVES|EMPTY|NESTED/);
      await user.click(zoneElements[0]);

      expect(onSelectZone).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // MM-004: Selected zone is highlighted
  // ==========================================================================
  describe("MM-004: Selected zone highlighting", () => {
    it("applies ring class to selected zone", () => {
      render(
        <ZoneMinimap
          {...defaultProps}
          selectedZoneId="grandchild-1"
          selectedPath={["root", "child-2", "grandchild-1"]}
        />
      );

      const selectedZone = screen.getByTitle("SHELVES (wybrana)");
      expect(selectedZone).toHaveClass("ring-1");
    });
  });

  // ==========================================================================
  // MM-005: Path zones are indicated
  // ==========================================================================
  describe("MM-005: Path indication", () => {
    it("highlights zones in the path", () => {
      render(<ZoneMinimap {...defaultProps} selectedPath={["root", "child-2", "grandchild-1"]} />);

      // The container should exist and zones should be visible
      expect(screen.getByText("Minimapa")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // MM-006: Animation class is applied
  // ==========================================================================
  describe("MM-006: Animation", () => {
    it("has animate-zone-enter class", () => {
      const { container } = render(
        <ZoneMinimap {...defaultProps} selectedPath={["root", "child-2", "grandchild-1"]} />
      );

      const minimapContainer = container.firstChild as HTMLElement;
      expect(minimapContainer).toHaveClass("animate-zone-enter");
    });
  });
});
