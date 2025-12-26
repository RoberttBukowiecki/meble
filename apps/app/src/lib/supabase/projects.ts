/**
 * Supabase client functions for multi-project system
 */

import { getSupabaseBrowserClient } from "./client";
import type {
  Project,
  ProjectListItem,
  ProjectData,
  SaveResult,
  ProjectSizeEstimate,
} from "@/types";
import {
  PROJECT_SIZE_SOFT_LIMIT,
  PROJECT_SIZE_HARD_LIMIT,
  PROJECT_SCHEMA_VERSION,
  EMPTY_PROJECT_DATA,
} from "@/types";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert database row to Project type (snake_case to camelCase)
 */
function toProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    description: row.description as string | null,
    thumbnailUrl: row.thumbnail_url as string | null,
    schemaVersion: row.schema_version as number,
    revision: row.revision as number,
    dataSizeBytes: row.data_size_bytes as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    lastOpenedAt: row.last_opened_at as string,
    isArchived: row.is_archived as boolean,
  };
}

/**
 * Convert database row to ProjectListItem
 */
function toProjectListItem(row: Record<string, unknown>): ProjectListItem {
  const projectData = row.project_data as ProjectData | null;
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | null,
    thumbnailUrl: row.thumbnail_url as string | null,
    updatedAt: row.updated_at as string,
    lastOpenedAt: row.last_opened_at as string,
    dataSizeBytes: row.data_size_bytes as number,
    partsCount: projectData?.parts?.length ?? 0,
    cabinetsCount: projectData?.cabinets?.length ?? 0,
  };
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// =============================================================================
// Project CRUD Operations
// =============================================================================

/**
 * List user's projects
 */
export async function listProjects(options?: {
  includeArchived?: boolean;
  orderBy?: "updated_at" | "created_at" | "name" | "last_opened_at";
  orderDirection?: "asc" | "desc";
}): Promise<{ data: ProjectListItem[] | null; error: Error | null }> {
  const supabase = getSupabaseBrowserClient();
  const {
    includeArchived = false,
    orderBy = "last_opened_at",
    orderDirection = "desc",
  } = options ?? {};

  let query = supabase
    .from("projects")
    .select(
      "id, name, description, thumbnail_url, updated_at, last_opened_at, data_size_bytes, project_data"
    )
    .order(orderBy, { ascending: orderDirection === "asc" });

  if (!includeArchived) {
    query = query.eq("is_archived", false);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return {
    data: data?.map(toProjectListItem) ?? [],
    error: null,
  };
}

/**
 * Get single project with full data
 */
export async function getProject(
  projectId: string
): Promise<{ data: (Project & { projectData: ProjectData }) | null; error: Error | null }> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  if (!data) {
    return { data: null, error: new Error("Project not found") };
  }

  // Update last_opened_at
  await supabase
    .from("projects")
    .update({ last_opened_at: new Date().toISOString() })
    .eq("id", projectId);

  return {
    data: {
      ...toProject(data),
      projectData: (data.project_data as ProjectData) ?? EMPTY_PROJECT_DATA,
    },
    error: null,
  };
}

/**
 * Create new project
 */
export async function createProject(data: {
  name: string;
  description?: string;
  projectData?: ProjectData;
}): Promise<{ data: Project | null; error: Error | null }> {
  const supabase = getSupabaseBrowserClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { data: null, error: new Error("Not authenticated") };
  }

  const projectData = data.projectData ?? EMPTY_PROJECT_DATA;

  // Check size limit before creating
  const sizeEstimate = estimateProjectSize(projectData);
  if (sizeEstimate.isOverHardLimit) {
    return {
      data: null,
      error: new Error(`Project size (${sizeEstimate.formatted}) exceeds limit of 10MB`),
    };
  }

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      user_id: userData.user.id,
      name: data.name,
      description: data.description ?? null,
      project_data: projectData,
      schema_version: PROJECT_SCHEMA_VERSION,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: toProject(project), error: null };
}

/**
 * Save project data with optimistic locking
 */
export async function saveProjectData(
  projectId: string,
  expectedRevision: number,
  projectData: ProjectData
): Promise<SaveResult> {
  const supabase = getSupabaseBrowserClient();

  // Check size limit before saving
  const sizeEstimate = estimateProjectSize(projectData);
  if (sizeEstimate.isOverHardLimit) {
    return {
      success: false,
      error: "SIZE_LIMIT",
      message: `Project size (${sizeEstimate.formatted}) exceeds limit of 10MB`,
    };
  }

  // Attempt update with revision check (optimistic locking)
  const { data, error } = await supabase
    .from("projects")
    .update({ project_data: projectData })
    .eq("id", projectId)
    .eq("revision", expectedRevision)
    .select()
    .single();

  if (error) {
    // Check if it's a "no rows updated" error (revision mismatch = conflict)
    if (error.code === "PGRST116" || error.message.includes("0 rows")) {
      // Fetch current server state to return for conflict resolution
      const { data: serverProject } = await supabase
        .from("projects")
        .select("revision, project_data")
        .eq("id", projectId)
        .single();

      if (serverProject) {
        return {
          success: false,
          error: "CONFLICT",
          serverRevision: serverProject.revision as number,
          serverData: serverProject.project_data as ProjectData,
        };
      }

      return { success: false, error: "NOT_FOUND" };
    }

    return { success: false, error: "UNKNOWN", message: error.message };
  }

  return { success: true, project: toProject(data) };
}

/**
 * Update project metadata (name, description)
 */
export async function updateProjectMetadata(
  projectId: string,
  data: { name?: string; description?: string }
): Promise<{ data: Project | null; error: Error | null }> {
  const supabase = getSupabaseBrowserClient();

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;

  const { data: project, error } = await supabase
    .from("projects")
    .update(updateData)
    .eq("id", projectId)
    .select()
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: toProject(project), error: null };
}

/**
 * Archive project (soft delete)
 */
export async function archiveProject(projectId: string): Promise<{ error: Error | null }> {
  const supabase = getSupabaseBrowserClient();

  const { error } = await supabase
    .from("projects")
    .update({ is_archived: true })
    .eq("id", projectId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}

/**
 * Restore archived project
 */
export async function restoreProject(projectId: string): Promise<{ error: Error | null }> {
  const supabase = getSupabaseBrowserClient();

  const { error } = await supabase
    .from("projects")
    .update({ is_archived: false })
    .eq("id", projectId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}

/**
 * Permanently delete project
 */
export async function deleteProject(projectId: string): Promise<{ error: Error | null }> {
  const supabase = getSupabaseBrowserClient();

  const { error } = await supabase.from("projects").delete().eq("id", projectId);

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}

/**
 * Duplicate project
 */
export async function duplicateProject(
  projectId: string,
  newName: string
): Promise<{ data: Project | null; error: Error | null }> {
  const supabase = getSupabaseBrowserClient();

  // Get original project
  const { data: original, error: fetchError } = await supabase
    .from("projects")
    .select("project_data, description")
    .eq("id", projectId)
    .single();

  if (fetchError || !original) {
    return { data: null, error: new Error(fetchError?.message ?? "Project not found") };
  }

  // Create copy
  return createProject({
    name: newName,
    description: original.description as string | undefined,
    projectData: original.project_data as ProjectData,
  });
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Estimate project size before save (client-side validation)
 */
export function estimateProjectSize(projectData: ProjectData): ProjectSizeEstimate {
  const jsonString = JSON.stringify(projectData);
  const bytes = new TextEncoder().encode(jsonString).length;

  return {
    bytes,
    formatted: formatBytes(bytes),
    isOverSoftLimit: bytes > PROJECT_SIZE_SOFT_LIMIT,
    isOverHardLimit: bytes > PROJECT_SIZE_HARD_LIMIT,
  };
}

/**
 * Check if user has any projects
 */
export async function hasProjects(): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();

  const { count } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("is_archived", false);

  return (count ?? 0) > 0;
}

/**
 * Get project count for user
 */
export async function getProjectCount(): Promise<number> {
  const supabase = getSupabaseBrowserClient();

  const { count } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("is_archived", false);

  return count ?? 0;
}
