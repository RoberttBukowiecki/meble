import type { CameraMode, OrthographicView } from "@/types";
import type { StoreSlice } from "../types";
import { SCENE_CONFIG } from "@/lib/config";

/**
 * View slice state interface
 *
 * Manages camera mode (perspective/orthographic) and orthographic view settings.
 * This slice controls how the 3D scene is viewed and which axes are editable.
 */
export interface ViewSlice {
  // View state (persisted)
  /** Current camera projection mode */
  cameraMode: CameraMode;
  /** Current orthographic view direction (only used when cameraMode is 'orthographic') */
  orthographicView: OrthographicView;
  /** Zoom level for orthographic camera (higher = more zoomed out) */
  orthographicZoom: number;
  /** Target point for orthographic camera (center of view) */
  orthographicTarget: [number, number, number];

  // Perspective camera state (saved when switching to orthographic)
  /** Last perspective camera position */
  perspectiveCameraPosition: [number, number, number];
  /** Last perspective camera target */
  perspectiveCameraTarget: [number, number, number];

  // Actions
  /** Set camera mode (perspective or orthographic) */
  setCameraMode: (mode: CameraMode) => void;
  /** Set orthographic view direction */
  setOrthographicView: (view: OrthographicView) => void;
  /** Set orthographic zoom level */
  setOrthographicZoom: (zoom: number) => void;
  /** Set orthographic target point */
  setOrthographicTarget: (target: [number, number, number]) => void;
  /** Toggle between perspective and orthographic modes */
  toggleCameraMode: () => void;
  /** Switch to a specific orthographic view (sets mode to orthographic) */
  switchToOrthographicView: (view: OrthographicView) => void;
  /** Switch to perspective view (restores last camera position) */
  switchToPerspective: () => void;
  /** Save current perspective camera state (called before switching to orthographic) */
  savePerspectiveCameraState: (
    position: [number, number, number],
    target: [number, number, number]
  ) => void;
}

/**
 * Default orthographic zoom level
 */
const DEFAULT_ORTHO_ZOOM = 1;

/**
 * Default orthographic target (origin)
 */
const DEFAULT_ORTHO_TARGET: [number, number, number] = [0, 0, 0];

/**
 * Creates the view slice for the Zustand store
 * Handles camera mode and orthographic view settings
 */
export const createViewSlice: StoreSlice<ViewSlice> = (set) => ({
  // Initial state
  cameraMode: "perspective",
  orthographicView: "TOP",
  orthographicZoom: DEFAULT_ORTHO_ZOOM,
  orthographicTarget: DEFAULT_ORTHO_TARGET,

  // Perspective camera state (initialized to default position)
  perspectiveCameraPosition: SCENE_CONFIG.CAMERA_INITIAL_POSITION,
  perspectiveCameraTarget: [0, 0, 0] as [number, number, number],

  // Set camera mode
  setCameraMode: (mode: CameraMode) => {
    set({ cameraMode: mode });
  },

  // Set orthographic view
  setOrthographicView: (view: OrthographicView) => {
    set({ orthographicView: view });
  },

  // Set orthographic zoom
  setOrthographicZoom: (zoom: number) => {
    set({ orthographicZoom: Math.max(0.1, Math.min(10, zoom)) });
  },

  // Set orthographic target
  setOrthographicTarget: (target: [number, number, number]) => {
    set({ orthographicTarget: target });
  },

  // Toggle between perspective and orthographic
  toggleCameraMode: () => {
    set((state) => ({
      cameraMode: state.cameraMode === "perspective" ? "orthographic" : "perspective",
    }));
  },

  // Switch to a specific orthographic view
  switchToOrthographicView: (view: OrthographicView) => {
    set({
      cameraMode: "orthographic",
      orthographicView: view,
    });
  },

  // Switch to perspective view (camera will be restored via ref in Scene)
  switchToPerspective: () => {
    set({ cameraMode: "perspective" });
  },

  // Save perspective camera state (called from Scene component)
  savePerspectiveCameraState: (
    position: [number, number, number],
    target: [number, number, number]
  ) => {
    set({
      perspectiveCameraPosition: position,
      perspectiveCameraTarget: target,
    });
  },
});
