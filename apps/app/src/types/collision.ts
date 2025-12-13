/**
 * Collision detection type definitions
 */

/**
 * Represents a collision between two parts or groups
 */
export interface Collision {
  partId1: string;
  partId2: string;
  groupId1?: string; // Cabinet ID or manual group ID
  groupId2?: string; // Cabinet ID or manual group ID
}
