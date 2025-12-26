/**
 * Hook for orthographic view axis constraints
 *
 * Returns which axes should be shown/enabled for transform controls
 * based on the current camera mode and orthographic view direction.
 */

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import {
  getEditableAxes,
  getRotationAxis,
  getPerpendicularAxis,
  type OrthographicView,
} from "@/types";

export interface OrthographicConstraints {
  /** Whether we're in orthographic mode */
  isOrthographic: boolean;
  /** Current orthographic view (null if perspective) */
  orthographicView: OrthographicView | null;
  /** Axes that can be translated in current view */
  editableAxes: ("x" | "y" | "z")[];
  /** The axis around which rotation is allowed */
  rotationAxis: "x" | "y" | "z" | null;
  /** The axis perpendicular to the screen (locked) */
  perpendicularAxis: "x" | "y" | "z" | null;
  /** Show X axis control */
  showX: boolean;
  /** Show Y axis control */
  showY: boolean;
  /** Show Z axis control */
  showZ: boolean;
  /** Axis visibility for rotation mode (only one axis) */
  rotateShowX: boolean;
  rotateShowY: boolean;
  rotateShowZ: boolean;
}

/**
 * Hook to get axis constraints for orthographic views
 *
 * In orthographic view, transforms are constrained to the visible 2D plane:
 * - TOP/BOTTOM: X and Z axes (Y is perpendicular to screen)
 * - FRONT/BACK: X and Y axes (Z is perpendicular to screen)
 * - LEFT/RIGHT: Y and Z axes (X is perpendicular to screen)
 *
 * For rotation, only the axis perpendicular to the screen is allowed.
 */
export function useOrthographicConstraints(): OrthographicConstraints {
  const { cameraMode, orthographicView } = useStore(
    useShallow((state) => ({
      cameraMode: state.cameraMode,
      orthographicView: state.orthographicView,
    }))
  );

  return useMemo(() => {
    const isOrthographic = cameraMode === "orthographic";

    if (!isOrthographic) {
      // Perspective mode - all axes enabled
      return {
        isOrthographic: false,
        orthographicView: null,
        editableAxes: ["x", "y", "z"],
        rotationAxis: null, // All axes allowed
        perpendicularAxis: null,
        showX: true,
        showY: true,
        showZ: true,
        rotateShowX: true,
        rotateShowY: true,
        rotateShowZ: true,
      };
    }

    // Orthographic mode - constrain to 2D plane
    const editableAxes = getEditableAxes(orthographicView);
    const rotationAxis = getRotationAxis(orthographicView);
    const perpendicularAxis = getPerpendicularAxis(orthographicView);

    return {
      isOrthographic: true,
      orthographicView,
      editableAxes,
      rotationAxis,
      perpendicularAxis,
      // Translation: show only editable axes
      showX: editableAxes.includes("x"),
      showY: editableAxes.includes("y"),
      showZ: editableAxes.includes("z"),
      // Rotation: show only the perpendicular axis (rotation around it)
      rotateShowX: rotationAxis === "x",
      rotateShowY: rotationAxis === "y",
      rotateShowZ: rotationAxis === "z",
    };
  }, [cameraMode, orthographicView]);
}

/**
 * Get axis constraints for a specific mode (translate or rotate)
 */
export function useTransformAxisConstraints(mode: "translate" | "rotate"): {
  showX: boolean;
  showY: boolean;
  showZ: boolean;
} {
  const constraints = useOrthographicConstraints();

  return useMemo(() => {
    if (mode === "rotate") {
      return {
        showX: constraints.rotateShowX,
        showY: constraints.rotateShowY,
        showZ: constraints.rotateShowZ,
      };
    }

    return {
      showX: constraints.showX,
      showY: constraints.showY,
      showZ: constraints.showZ,
    };
  }, [mode, constraints]);
}

/**
 * Get hidden resize handles for orthographic view
 * Hides handles on the axis perpendicular to the screen
 */
export function useHiddenResizeHandles(): string[] {
  const { isOrthographic, orthographicView } = useOrthographicConstraints();

  return useMemo(() => {
    if (!isOrthographic || !orthographicView) {
      return [];
    }

    // Hide handles on the perpendicular axis
    switch (orthographicView) {
      case "TOP":
      case "BOTTOM":
        return ["height+", "height-"]; // Y axis handles
      case "FRONT":
      case "BACK":
        return ["depth+", "depth-"]; // Z axis handles
      case "LEFT":
      case "RIGHT":
        return ["width+", "width-"]; // X axis handles
      default:
        return [];
    }
  }, [isOrthographic, orthographicView]);
}
