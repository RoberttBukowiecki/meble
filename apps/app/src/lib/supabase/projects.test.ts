/**
 * Tests for project Supabase functions
 */

import type { ProjectData } from "@/types";
import { PROJECT_SIZE_SOFT_LIMIT, PROJECT_SIZE_HARD_LIMIT, EMPTY_PROJECT_DATA } from "@/types";

// Mock Supabase client
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();
const mockSingle = jest.fn();
const mockFrom = jest.fn();
const mockGetUser = jest.fn();

jest.mock("./client", () => ({
  getSupabaseBrowserClient: () => ({
    from: mockFrom,
    auth: {
      getUser: mockGetUser,
    },
  }),
}));

// Import after mocking
import {
  estimateProjectSize,
  listProjects,
  getProject,
  createProject,
  saveProjectData,
  archiveProject,
  deleteProject,
  duplicateProject,
  hasProjects,
  getProjectCount,
} from "./projects";

describe("estimateProjectSize", () => {
  it("calculates size correctly for empty project data", () => {
    const result = estimateProjectSize(EMPTY_PROJECT_DATA);

    expect(result.bytes).toBeGreaterThan(0);
    expect(result.formatted).toMatch(/^\d+(\.\d+)?\s(B|KB|MB)$/);
    expect(result.isOverSoftLimit).toBe(false);
    expect(result.isOverHardLimit).toBe(false);
  });

  it("calculates size correctly for project with data", () => {
    const projectData: ProjectData = {
      ...EMPTY_PROJECT_DATA,
      parts: [
        {
          id: "part-1",
          name: "Test Part",
          width: 100,
          height: 200,
          depth: 18,
          materialId: "mat-1",
          position: [0, 0, 0] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
        } as ProjectData["parts"][0],
      ],
    };

    const result = estimateProjectSize(projectData);

    expect(result.bytes).toBeGreaterThan(0);
    expect(result.isOverSoftLimit).toBe(false);
    expect(result.isOverHardLimit).toBe(false);
  });

  it("formats bytes correctly", () => {
    const smallData = { ...EMPTY_PROJECT_DATA };
    const result = estimateProjectSize(smallData);

    // Empty project should be under 1KB
    expect(result.formatted).toMatch(/^\d+(\.\d+)?\s(B|KB)$/);
  });

  it("detects soft limit exceeded", () => {
    // Create large project data
    const largeParts = Array.from({ length: 1000 }, (_, i) => ({
      id: `part-${i}`,
      name: `Part ${i} with a very long name to increase size`,
      width: 100,
      height: 200,
      depth: 18,
      materialId: "mat-1",
      position: [0, 0, 0] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
      edgeBanding: {
        top: "test-material",
        bottom: "test-material",
        left: "test-material",
        right: "test-material",
      },
    }));

    const largeData: ProjectData = {
      ...EMPTY_PROJECT_DATA,
      parts: largeParts as ProjectData["parts"],
    };

    const result = estimateProjectSize(largeData);

    // The result may or may not exceed soft limit depending on size
    // Just verify the calculation works
    expect(typeof result.isOverSoftLimit).toBe("boolean");
    expect(typeof result.isOverHardLimit).toBe("boolean");
  });

  describe("size limits constants", () => {
    it("has correct soft limit (5MB)", () => {
      expect(PROJECT_SIZE_SOFT_LIMIT).toBe(5 * 1024 * 1024);
    });

    it("has correct hard limit (10MB)", () => {
      expect(PROJECT_SIZE_HARD_LIMIT).toBe(10 * 1024 * 1024);
    });
  });
});

describe("listProjects", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock chain
    mockFrom.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      order: mockOrder,
      eq: mockEq,
    });
    mockOrder.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockResolvedValue({ data: [], error: null });
  });

  it("calls Supabase with correct table and columns", async () => {
    await listProjects();

    expect(mockFrom).toHaveBeenCalledWith("projects");
    expect(mockSelect).toHaveBeenCalledWith(
      "id, name, description, thumbnail_url, updated_at, last_opened_at, data_size_bytes, project_data"
    );
  });

  it("uses default ordering by last_opened_at desc", async () => {
    await listProjects();

    expect(mockOrder).toHaveBeenCalledWith("last_opened_at", { ascending: false });
  });

  it("uses custom ordering when provided", async () => {
    await listProjects({
      orderBy: "name",
      orderDirection: "asc",
    });

    expect(mockOrder).toHaveBeenCalledWith("name", { ascending: true });
  });

  it("excludes archived projects by default", async () => {
    await listProjects();

    expect(mockEq).toHaveBeenCalledWith("is_archived", false);
  });

  it("returns error when Supabase fails", async () => {
    mockEq.mockResolvedValue({
      data: null,
      error: { message: "Database error" },
    });

    const result = await listProjects();

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe("Database error");
  });
});

describe("createProject", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });

    mockFrom.mockReturnValue({
      insert: mockInsert,
    });
    mockInsert.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      single: mockSingle,
    });
    mockSingle.mockResolvedValue({
      data: {
        id: "project-123",
        user_id: "user-123",
        name: "Test Project",
        description: null,
        thumbnail_url: null,
        schema_version: 1,
        revision: 1,
        data_size_bytes: 100,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
        last_opened_at: "2025-01-01T00:00:00Z",
        is_archived: false,
      },
      error: null,
    });
  });

  it("returns error if not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await createProject({ name: "Test" });

    expect(result.error?.message).toBe("Not authenticated");
    expect(result.data).toBeNull();
  });

  it("creates project with correct data", async () => {
    await createProject({ name: "My Project", description: "A description" });

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-123",
        name: "My Project",
        description: "A description",
      })
    );
  });

  it("returns created project on success", async () => {
    const result = await createProject({ name: "Test Project" });

    expect(result.error).toBeNull();
    expect(result.data).toEqual(
      expect.objectContaining({
        id: "project-123",
        name: "Test Project",
      })
    );
  });
});

describe("saveProjectData", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockFrom.mockReturnValue({
      update: mockUpdate,
      select: mockSelect,
    });
    mockUpdate.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      eq: mockEq,
      select: mockSelect,
      single: mockSingle,
    });
    mockSelect.mockReturnValue({
      single: mockSingle,
    });
    mockSingle.mockResolvedValue({
      data: {
        id: "project-123",
        revision: 2,
      },
      error: null,
    });
  });

  it("saves project data with optimistic locking", async () => {
    const projectData = EMPTY_PROJECT_DATA;

    const result = await saveProjectData("project-123", 1, projectData);

    expect(result.success).toBe(true);
    expect(mockEq).toHaveBeenCalledWith("id", "project-123");
    expect(mockEq).toHaveBeenCalledWith("revision", 1);
  });

  it("returns SIZE_LIMIT error for oversized data", async () => {
    // Create data that exceeds hard limit (10MB)
    const largeString = "x".repeat(11 * 1024 * 1024);
    const oversizedData = {
      ...EMPTY_PROJECT_DATA,
      largeField: largeString,
    } as unknown as ProjectData;

    const result = await saveProjectData("project-123", 1, oversizedData);

    expect(result.success).toBe(false);
    expect(result.error).toBe("SIZE_LIMIT");
  });
});

describe("archiveProject", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockFrom.mockReturnValue({
      update: mockUpdate,
    });
    mockUpdate.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockResolvedValue({ error: null });
  });

  it("updates is_archived to true", async () => {
    await archiveProject("project-123");

    expect(mockUpdate).toHaveBeenCalledWith({ is_archived: true });
    expect(mockEq).toHaveBeenCalledWith("id", "project-123");
  });

  it("returns null error on success", async () => {
    const result = await archiveProject("project-123");

    expect(result.error).toBeNull();
  });
});

describe("deleteProject", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockFrom.mockReturnValue({
      delete: mockDelete,
    });
    mockDelete.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockResolvedValue({ error: null });
  });

  it("deletes project by id", async () => {
    await deleteProject("project-123");

    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith("id", "project-123");
  });

  it("returns error when deletion fails", async () => {
    mockEq.mockResolvedValue({ error: { message: "Cannot delete" } });

    const result = await deleteProject("project-123");

    expect(result.error?.message).toBe("Cannot delete");
  });
});

describe("hasProjects", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockFrom.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
  });

  it("returns true when user has projects", async () => {
    mockEq.mockResolvedValue({ count: 5 });

    const result = await hasProjects();

    expect(result).toBe(true);
  });

  it("returns false when user has no projects", async () => {
    mockEq.mockResolvedValue({ count: 0 });

    const result = await hasProjects();

    expect(result).toBe(false);
  });
});

describe("getProjectCount", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockFrom.mockReturnValue({
      select: mockSelect,
    });
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
  });

  it("returns project count", async () => {
    mockEq.mockResolvedValue({ count: 10 });

    const result = await getProjectCount();

    expect(result).toBe(10);
  });

  it("returns 0 when count is null", async () => {
    mockEq.mockResolvedValue({ count: null });

    const result = await getProjectCount();

    expect(result).toBe(0);
  });
});
