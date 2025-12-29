/**
 * Tests for projectSlice
 *
 * Tests cover:
 * - Metadata actions (setCurrentProject, setProjectName, resetProjectState)
 * - Sync state (markAsDirty, markAsSaved, setSyncStatus)
 * - CRUD operations (loadProject, saveProject, saveProjectAs, createNewProject)
 * - Conflict resolution (resolveConflict, clearConflict)
 * - Serialization (getProjectData, setProjectData)
 */

import type { Project, ProjectData, SyncState } from "@/types";
import { DEFAULT_SYNC_STATE, EMPTY_PROJECT_DATA } from "@/types";

// Mock dependencies
const mockGetProject = jest.fn();
const mockCreateProject = jest.fn();
const mockSaveProjectData = jest.fn();
const mockUpdateProjectMetadata = jest.fn();
const mockGenerateAndUploadThumbnail = jest.fn();
const mockWithRetry = jest.fn();
const mockGetSupabaseBrowserClient = jest.fn();

jest.mock("@/lib/supabase/projects", () => ({
  getProject: (...args: unknown[]) => mockGetProject(...args),
  createProject: (...args: unknown[]) => mockCreateProject(...args),
  saveProjectData: (...args: unknown[]) => mockSaveProjectData(...args),
  updateProjectMetadata: (...args: unknown[]) => mockUpdateProjectMetadata(...args),
  estimateProjectSize: jest.fn(() => ({
    bytes: 100,
    formatted: "100 B",
    isOverSoftLimit: false,
    isOverHardLimit: false,
  })),
}));

jest.mock("@/lib/thumbnail", () => ({
  generateAndUploadThumbnail: (...args: unknown[]) => mockGenerateAndUploadThumbnail(...args),
}));

jest.mock("@/lib/retry", () => ({
  withRetry: (...args: unknown[]) => mockWithRetry(...args),
  isNetworkError: jest.fn(() => false),
}));

jest.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => mockGetSupabaseBrowserClient(),
}));

// Mock environment utilities
jest.mock("@/lib/env", () => ({
  isDev: jest.fn(() => false), // Suppress logs in tests
  devLog: jest.fn(),
  devWarn: jest.fn(),
  devError: jest.fn(),
}));

// Mock BroadcastChannel
const mockBroadcastChannel = {
  postMessage: jest.fn(),
  close: jest.fn(),
};
(global as any).BroadcastChannel = jest.fn(() => mockBroadcastChannel);

// Import after mocks
import { createProjectSlice, type ProjectSlice } from "./projectSlice";
import type { StoreState } from "../types";

// Helper to create a test store with projectSlice
function createTestStore(initialStateOverrides: Partial<StoreState> = {}) {
  // Create a mutable state object
  const stateRef: { current: Partial<StoreState> } = {
    current: {},
  };

  // Set function that mutates the state ref
  const set = (partial: Partial<StoreState> | ((s: StoreState) => Partial<StoreState>)) => {
    if (typeof partial === "function") {
      stateRef.current = { ...stateRef.current, ...partial(stateRef.current as StoreState) };
    } else {
      stateRef.current = { ...stateRef.current, ...partial };
    }
  };

  // Get function that returns current state
  const get = () => stateRef.current as StoreState;

  // Create the slice first (this creates the functions)
  const slice = createProjectSlice(set as any, get as any, {} as any);

  // Now initialize state with defaults + slice functions + overrides
  stateRef.current = {
    // Project slice initial state from the slice
    currentProjectId: null,
    currentProjectName: "Nowy projekt",
    currentProjectDescription: null,
    currentProjectRevision: 0,
    syncState: { ...DEFAULT_SYNC_STATE },
    isProjectLoading: false,
    // Other slices state needed for serialization
    parts: [],
    materials: [],
    furnitures: [],
    cabinets: [],
    rooms: [],
    walls: [],
    openings: [],
    lights: [],
    countertopGroups: [],
    perspectiveCameraPosition: [300, 200, 300] as [number, number, number],
    perspectiveCameraTarget: [0, 0, 0] as [number, number, number],
    selectedPartId: null,
    selectedCabinetId: null,
    selectedPartIds: new Set<string>(),
    threeRenderer: null,
    threeScene: null,
    // Mock functions from other slices
    clearHistory: jest.fn(),
    // Include slice functions
    ...slice,
    // Apply overrides LAST so they take precedence
    ...initialStateOverrides,
  };

  return {
    getState: () => stateRef.current as StoreState & ProjectSlice,
    setState: set,
  };
}

describe("projectSlice", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBroadcastChannel.postMessage.mockClear();
    mockBroadcastChannel.close.mockClear();
  });

  // =========================================================================
  // Metadata Actions
  // =========================================================================

  describe("setCurrentProject", () => {
    it("sets project metadata when given a project", () => {
      const store = createTestStore();
      const project: Project = {
        id: "project-123",
        userId: "user-1",
        name: "Test Project",
        description: "A test project",
        schemaVersion: 1,
        revision: 5,
        projectData: EMPTY_PROJECT_DATA,
        thumbnailUrl: null,
        dataSizeBytes: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastOpenedAt: new Date(),
        isArchived: false,
      };

      store.getState().setCurrentProject(project);

      const state = store.getState();
      expect(state.currentProjectId).toBe("project-123");
      expect(state.currentProjectName).toBe("Test Project");
      expect(state.currentProjectDescription).toBe("A test project");
      expect(state.currentProjectRevision).toBe(5);
      expect(state.syncState.status).toBe("synced");
      expect(state.syncState.lastSyncedAt).toBeInstanceOf(Date);
    });

    it("resets project metadata when given null", () => {
      const store = createTestStore({
        currentProjectId: "project-123",
        currentProjectName: "Test Project",
        currentProjectRevision: 5,
      });

      store.getState().setCurrentProject(null);

      const state = store.getState();
      expect(state.currentProjectId).toBeNull();
      expect(state.currentProjectName).toBe("Nowy projekt");
      expect(state.currentProjectDescription).toBeNull();
      expect(state.currentProjectRevision).toBe(0);
    });
  });

  describe("setProjectName", () => {
    it("updates project name locally", () => {
      const store = createTestStore();

      store.getState().setProjectName("New Name");

      expect(store.getState().currentProjectName).toBe("New Name");
    });
  });

  describe("resetProjectState", () => {
    it("resets all project state to initial values", () => {
      const store = createTestStore({
        currentProjectId: "project-123",
        currentProjectName: "Test Project",
        currentProjectRevision: 5,
        syncState: {
          status: "conflict",
          lastSyncedAt: new Date(),
          lastLocalSaveAt: new Date(),
          pendingChanges: true,
        },
        isProjectLoading: true,
      });

      store.getState().resetProjectState();

      const state = store.getState();
      expect(state.currentProjectId).toBeNull();
      expect(state.currentProjectName).toBe("Nowy projekt");
      expect(state.currentProjectRevision).toBe(0);
      expect(state.syncState).toEqual(DEFAULT_SYNC_STATE);
      expect(state.isProjectLoading).toBe(false);
    });
  });

  // =========================================================================
  // Sync State Actions
  // =========================================================================

  describe("markAsDirty", () => {
    it("sets sync status to local_only when project exists", () => {
      const store = createTestStore({
        currentProjectId: "project-123",
        syncState: { ...DEFAULT_SYNC_STATE, status: "synced" },
      });

      store.getState().markAsDirty();

      const state = store.getState();
      expect(state.syncState.status).toBe("local_only");
      expect(state.syncState.pendingChanges).toBe(true);
      expect(state.syncState.lastLocalSaveAt).toBeInstanceOf(Date);
    });

    it("does nothing when no project is loaded", () => {
      const store = createTestStore({
        currentProjectId: null,
        syncState: { ...DEFAULT_SYNC_STATE, status: "synced" },
      });

      store.getState().markAsDirty();

      expect(store.getState().syncState.status).toBe("synced");
    });

    it("does not change status when syncing", () => {
      const store = createTestStore({
        currentProjectId: "project-123",
        syncState: { ...DEFAULT_SYNC_STATE, status: "syncing" },
      });

      store.getState().markAsDirty();

      expect(store.getState().syncState.status).toBe("syncing");
    });

    it("does not change status when in conflict", () => {
      const store = createTestStore({
        currentProjectId: "project-123",
        syncState: { ...DEFAULT_SYNC_STATE, status: "conflict" },
      });

      store.getState().markAsDirty();

      expect(store.getState().syncState.status).toBe("conflict");
    });
  });

  describe("markAsSaved", () => {
    it("updates revision and sets status to synced", () => {
      const store = createTestStore({
        currentProjectId: "project-123",
        currentProjectRevision: 1,
        syncState: { ...DEFAULT_SYNC_STATE, status: "syncing", pendingChanges: true },
      });

      store.getState().markAsSaved(2);

      const state = store.getState();
      expect(state.currentProjectRevision).toBe(2);
      expect(state.syncState.status).toBe("synced");
      expect(state.syncState.pendingChanges).toBe(false);
      expect(state.syncState.lastSyncedAt).toBeInstanceOf(Date);
      expect(state.syncState.errorMessage).toBeUndefined();
    });

    it("broadcasts save to other tabs via BroadcastChannel", () => {
      const store = createTestStore({
        currentProjectId: "project-123",
        currentProjectRevision: 1,
      });

      store.getState().markAsSaved(2);

      expect(BroadcastChannel).toHaveBeenCalledWith("e-meble-project-sync");
      expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "PROJECT_SAVED",
          projectId: "project-123",
          revision: 2,
        })
      );
      expect(mockBroadcastChannel.close).toHaveBeenCalled();
    });
  });

  describe("setSyncStatus", () => {
    it("updates sync status directly", () => {
      const store = createTestStore({
        syncState: { ...DEFAULT_SYNC_STATE, status: "synced" },
      });

      store.getState().setSyncStatus("offline");

      expect(store.getState().syncState.status).toBe("offline");
    });
  });

  // =========================================================================
  // CRUD Operations
  // =========================================================================

  describe("loadProject", () => {
    it("loads project data successfully", async () => {
      const mockProject: Project = {
        id: "project-123",
        userId: "user-1",
        name: "Loaded Project",
        description: null,
        schemaVersion: 1,
        revision: 3,
        projectData: {
          ...EMPTY_PROJECT_DATA,
          parts: [
            {
              id: "part-1",
              name: "Test Part",
              width: 100,
              height: 50,
              depth: 18,
              materialId: "mat-1",
              position: [0, 0, 0],
              rotation: [0, 0, 0],
            } as any,
          ],
        },
        thumbnailUrl: null,
        dataSizeBytes: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastOpenedAt: new Date(),
        isArchived: false,
      };

      mockGetProject.mockResolvedValue({ data: mockProject, error: null });

      const store = createTestStore();

      const result = await store.getState().loadProject("project-123");

      expect(result).toBe(true);
      expect(store.getState().currentProjectId).toBe("project-123");
      expect(store.getState().currentProjectName).toBe("Loaded Project");
      expect(store.getState().currentProjectRevision).toBe(3);
      expect(store.getState().isProjectLoading).toBe(false);
      expect(store.getState().parts).toHaveLength(1);
    });

    it("sets isProjectLoading during load", async () => {
      mockGetProject.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ data: null, error: "Not found" }), 10);
          })
      );

      const store = createTestStore();

      const loadPromise = store.getState().loadProject("project-123");

      // Check loading state immediately
      expect(store.getState().isProjectLoading).toBe(true);

      await loadPromise;

      expect(store.getState().isProjectLoading).toBe(false);
    });

    it("returns false and resets loading on error", async () => {
      mockGetProject.mockResolvedValue({ data: null, error: { message: "Not found" } });

      const store = createTestStore();

      const result = await store.getState().loadProject("project-123");

      expect(result).toBe(false);
      expect(store.getState().isProjectLoading).toBe(false);
    });

    it("handles exceptions gracefully", async () => {
      mockGetProject.mockRejectedValue(new Error("Network error"));

      const store = createTestStore();

      const result = await store.getState().loadProject("project-123");

      expect(result).toBe(false);
      expect(store.getState().isProjectLoading).toBe(false);
    });
  });

  describe("saveProject", () => {
    beforeEach(() => {
      mockGetSupabaseBrowserClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }),
        },
      });
    });

    it("returns NOT_FOUND error when no project is loaded", async () => {
      const store = createTestStore({ currentProjectId: null });

      const result = await store.getState().saveProject();

      expect(result.success).toBe(false);
      expect(result.error).toBe("NOT_FOUND");
    });

    it("saves project successfully via withRetry", async () => {
      const savedProject: Project = {
        id: "project-123",
        userId: "user-1",
        name: "Test Project",
        description: null,
        schemaVersion: 1,
        revision: 2,
        projectData: EMPTY_PROJECT_DATA,
        thumbnailUrl: null,
        dataSizeBytes: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastOpenedAt: new Date(),
        isArchived: false,
      };

      mockWithRetry.mockResolvedValue({
        success: true,
        data: { success: true, project: savedProject },
        attempts: 1,
      });

      const store = createTestStore({
        currentProjectId: "project-123",
        currentProjectRevision: 1,
      });

      const result = await store.getState().saveProject();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.project.revision).toBe(2);
      }
      expect(store.getState().syncState.status).toBe("synced");
      expect(store.getState().currentProjectRevision).toBe(2);
    });

    it("sets syncing status during save", async () => {
      mockWithRetry.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  success: true,
                  data: { success: true, project: { revision: 2 } },
                  attempts: 1,
                }),
              10
            );
          })
      );

      const store = createTestStore({
        currentProjectId: "project-123",
        currentProjectRevision: 1,
      });

      const savePromise = store.getState().saveProject();

      // Check syncing state immediately
      expect(store.getState().syncState.status).toBe("syncing");

      await savePromise;
    });

    it("handles conflict response", async () => {
      const conflictData: ProjectData = {
        ...EMPTY_PROJECT_DATA,
        parts: [{ id: "server-part", name: "Server Part" } as any],
      };

      mockWithRetry.mockResolvedValue({
        success: true,
        data: {
          success: false,
          error: "CONFLICT",
          serverRevision: 3,
          serverData: conflictData,
        },
        attempts: 1,
      });

      const store = createTestStore({
        currentProjectId: "project-123",
        currentProjectRevision: 1,
      });

      const result = await store.getState().saveProject();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("CONFLICT");
      }
      expect(store.getState().syncState.status).toBe("conflict");
      expect(store.getState().syncState.conflictData).toEqual(conflictData);
    });

    it("handles network error after retries", async () => {
      mockWithRetry.mockResolvedValue({
        success: false,
        attempts: 3,
      });

      const store = createTestStore({
        currentProjectId: "project-123",
        currentProjectRevision: 1,
      });

      const result = await store.getState().saveProject();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("NETWORK");
      }
      expect(store.getState().syncState.status).toBe("error");
    });

    it("handles unexpected exceptions", async () => {
      mockWithRetry.mockRejectedValue(new Error("Unexpected error"));

      const store = createTestStore({
        currentProjectId: "project-123",
        currentProjectRevision: 1,
      });

      const result = await store.getState().saveProject();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("NETWORK");
        expect(result.message).toBe("Unexpected error");
      }
      expect(store.getState().syncState.status).toBe("error");
    });
  });

  describe("saveProjectAs", () => {
    it("creates new project with current data", async () => {
      const newProject: Project = {
        id: "new-project-456",
        userId: "user-1",
        name: "New Project Name",
        description: null,
        schemaVersion: 1,
        revision: 1,
        projectData: EMPTY_PROJECT_DATA,
        thumbnailUrl: null,
        dataSizeBytes: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastOpenedAt: new Date(),
        isArchived: false,
      };

      mockCreateProject.mockResolvedValue({ data: newProject, error: null });

      const store = createTestStore({
        parts: [{ id: "part-1", name: "Test Part" } as any],
      });

      const result = await store.getState().saveProjectAs("New Project Name");

      expect(result).toBe("new-project-456");
      expect(mockCreateProject).toHaveBeenCalledWith({
        name: "New Project Name",
        projectData: expect.objectContaining({
          parts: [{ id: "part-1", name: "Test Part" }],
        }),
      });
      expect(store.getState().currentProjectId).toBe("new-project-456");
    });

    it("returns null on error", async () => {
      mockCreateProject.mockResolvedValue({ data: null, error: { message: "Failed" } });

      const store = createTestStore();

      const result = await store.getState().saveProjectAs("Test");

      expect(result).toBeNull();
    });
  });

  describe("createNewProject", () => {
    it("creates empty project with default name", async () => {
      const newProject: Project = {
        id: "new-project-789",
        userId: "user-1",
        name: "Nowy projekt",
        description: null,
        schemaVersion: 1,
        revision: 1,
        projectData: EMPTY_PROJECT_DATA,
        thumbnailUrl: null,
        dataSizeBytes: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastOpenedAt: new Date(),
        isArchived: false,
      };

      mockCreateProject.mockResolvedValue({ data: newProject, error: null });

      const store = createTestStore({
        parts: [{ id: "old-part", name: "Old Part" } as any],
      });

      const result = await store.getState().createNewProject();

      expect(result).toBe("new-project-789");
      expect(mockCreateProject).toHaveBeenCalledWith({
        name: "Nowy projekt",
        projectData: EMPTY_PROJECT_DATA,
      });
      expect(store.getState().parts).toEqual([]);
    });

    it("creates project with custom name", async () => {
      const newProject: Project = {
        id: "new-project",
        userId: "user-1",
        name: "Custom Name",
        description: null,
        schemaVersion: 1,
        revision: 1,
        projectData: EMPTY_PROJECT_DATA,
        thumbnailUrl: null,
        dataSizeBytes: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastOpenedAt: new Date(),
        isArchived: false,
      };

      mockCreateProject.mockResolvedValue({ data: newProject, error: null });

      const store = createTestStore();

      await store.getState().createNewProject("Custom Name");

      expect(mockCreateProject).toHaveBeenCalledWith({
        name: "Custom Name",
        projectData: EMPTY_PROJECT_DATA,
      });
    });
  });

  describe("updateProjectName", () => {
    it("updates project name via API", async () => {
      mockUpdateProjectMetadata.mockResolvedValue({ error: null });

      const store = createTestStore({
        currentProjectId: "project-123",
        currentProjectName: "Old Name",
      });

      const result = await store.getState().updateProjectName("New Name");

      expect(result).toBe(true);
      expect(mockUpdateProjectMetadata).toHaveBeenCalledWith("project-123", { name: "New Name" });
      expect(store.getState().currentProjectName).toBe("New Name");
    });

    it("returns false when no project is loaded", async () => {
      const store = createTestStore({ currentProjectId: null });

      const result = await store.getState().updateProjectName("New Name");

      expect(result).toBe(false);
      expect(mockUpdateProjectMetadata).not.toHaveBeenCalled();
    });

    it("returns false on API error", async () => {
      mockUpdateProjectMetadata.mockResolvedValue({ error: { message: "Failed" } });

      const store = createTestStore({
        currentProjectId: "project-123",
        currentProjectName: "Old Name",
      });

      const result = await store.getState().updateProjectName("New Name");

      expect(result).toBe(false);
      expect(store.getState().currentProjectName).toBe("Old Name");
    });
  });

  // =========================================================================
  // Conflict Resolution
  // =========================================================================

  describe("clearConflict", () => {
    it("clears conflict state and sets status to synced", () => {
      const store = createTestStore({
        syncState: {
          status: "conflict",
          lastSyncedAt: new Date(),
          lastLocalSaveAt: new Date(),
          pendingChanges: true,
          conflictData: EMPTY_PROJECT_DATA,
        },
      });

      store.getState().clearConflict();

      const state = store.getState();
      expect(state.syncState.status).toBe("synced");
      expect(state.syncState.conflictData).toBeUndefined();
    });
  });

  // =========================================================================
  // Serialization
  // =========================================================================

  describe("getProjectData", () => {
    it("serializes all project data correctly", () => {
      const store = createTestStore({
        parts: [{ id: "part-1", name: "Test Part" } as any],
        materials: [{ id: "mat-1", name: "Test Material" } as any],
        cabinets: [{ id: "cab-1", name: "Test Cabinet" } as any],
        rooms: [{ id: "room-1", name: "Test Room" } as any],
        walls: [{ id: "wall-1", height: 240 } as any],
        openings: [{ id: "opening-1", type: "door" } as any],
        lights: [{ id: "light-1", type: "point" } as any],
        countertopGroups: [{ id: "ct-1", name: "Countertop" } as any],
        perspectiveCameraPosition: [100, 200, 300] as [number, number, number],
        perspectiveCameraTarget: [10, 20, 30] as [number, number, number],
      });

      const data = store.getState().getProjectData();

      expect(data.parts).toEqual([{ id: "part-1", name: "Test Part" }]);
      expect(data.materials).toEqual([{ id: "mat-1", name: "Test Material" }]);
      expect(data.cabinets).toEqual([{ id: "cab-1", name: "Test Cabinet" }]);
      expect(data.rooms).toEqual([{ id: "room-1", name: "Test Room" }]);
      expect(data.walls).toEqual([{ id: "wall-1", height: 240 }]);
      expect(data.openings).toEqual([{ id: "opening-1", type: "door" }]);
      expect(data.lights).toEqual([{ id: "light-1", type: "point" }]);
      expect(data.countertopGroups).toEqual([{ id: "ct-1", name: "Countertop" }]);
      expect(data.cameraPosition).toEqual([100, 200, 300]);
      expect(data.cameraTarget).toEqual([10, 20, 30]);
    });

    it("handles missing lights gracefully", () => {
      const store = createTestStore({
        lights: undefined as any,
      });

      const data = store.getState().getProjectData();

      expect(data.lights).toEqual([]);
    });
  });

  describe("setProjectData", () => {
    it("loads all project data into store", () => {
      const projectData: ProjectData = {
        parts: [{ id: "part-1", name: "Loaded Part" } as any],
        materials: [{ id: "mat-1", name: "Loaded Material" } as any],
        furnitures: [{ id: "furn-1", name: "Loaded Furniture" } as any],
        cabinets: [{ id: "cab-1", name: "Loaded Cabinet" } as any],
        rooms: [{ id: "room-1", name: "Loaded Room" } as any],
        walls: [{ id: "wall-1", height: 300 } as any],
        openings: [{ id: "opening-1", type: "window" } as any],
        lights: [{ id: "light-1", type: "spot" } as any],
        countertopGroups: [{ id: "ct-1", name: "Loaded Countertop" } as any],
        cameraPosition: [500, 400, 300] as [number, number, number],
        cameraTarget: [50, 40, 30] as [number, number, number],
      };

      const store = createTestStore({
        selectedPartId: "old-part",
        selectedCabinetId: "old-cabinet",
        selectedPartIds: new Set(["old-part"]),
      });

      store.getState().setProjectData(projectData);

      const state = store.getState();
      expect(state.parts).toEqual(projectData.parts);
      expect(state.furnitures).toEqual(projectData.furnitures);
      expect(state.cabinets).toEqual(projectData.cabinets);
      expect(state.rooms).toEqual(projectData.rooms);
      expect(state.walls).toEqual(projectData.walls);
      expect(state.openings).toEqual(projectData.openings);
      expect(state.lights).toEqual(projectData.lights);
      expect(state.countertopGroups).toEqual(projectData.countertopGroups);
      expect(state.perspectiveCameraPosition).toEqual([500, 400, 300]);
      expect(state.perspectiveCameraTarget).toEqual([50, 40, 30]);
      // Selection should be cleared
      expect(state.selectedPartId).toBeNull();
      expect(state.selectedCabinetId).toBeNull();
      expect(state.selectedPartIds).toEqual(new Set());
    });

    it("uses default camera position when not provided", () => {
      const projectData: ProjectData = {
        ...EMPTY_PROJECT_DATA,
        cameraPosition: undefined,
        cameraTarget: undefined,
      };

      const store = createTestStore();

      store.getState().setProjectData(projectData);

      // Should use SCENE_CONFIG defaults
      expect(store.getState().perspectiveCameraTarget).toEqual([0, 0, 0]);
    });

    it("handles missing arrays gracefully", () => {
      const projectData = {} as ProjectData;

      const store = createTestStore({
        parts: [{ id: "old-part" } as any],
      });

      store.getState().setProjectData(projectData);

      expect(store.getState().parts).toEqual([]);
      expect(store.getState().cabinets).toEqual([]);
      expect(store.getState().rooms).toEqual([]);
    });

    it("clears history when loading new project", () => {
      const store = createTestStore();
      const mockClearHistory = store.getState().clearHistory as jest.Mock;

      store.getState().setProjectData(EMPTY_PROJECT_DATA);

      expect(mockClearHistory).toHaveBeenCalled();
    });
  });
});
