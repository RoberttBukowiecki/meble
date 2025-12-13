/**
 * Furniture type definitions
 */

/**
 * Furniture item (project/collection of parts)
 */
export interface Furniture {
  id: string;
  name: string;
  projectId?: string; // Optional parent project ID
}
