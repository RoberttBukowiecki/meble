/**
 * Room builder type definitions
 */

export type WallJoinType = 'MITER' | 'BUTT';

export type OpeningType = 'WINDOW' | 'DOOR';

export type WindowVariant = 'STANDARD' | 'FLOOR_TO_CEILING';

export type DoorSwing = 'LEFT' | 'RIGHT';

export interface Opening {
  id: string;
  wallId: string;
  type: OpeningType;
  variant?: WindowVariant; // For windows
  widthMm: number;
  heightMm: number;
  sillHeightMm: number; // 0 for floor-to-ceiling windows and doors
  offsetFromStartMm: number; // Distance from wall start vertex
  swing?: DoorSwing; // For doors
  depthMm?: number; // Frame thickness (optional)
  insetMm?: number; // How deep into wall (optional)
  label?: string; // For UI
}

export interface WallSegment {
  id: string;
  roomId: string;
  start: [number, number]; // [x, z] in 2D
  end: [number, number];   // [x, z] in 2D
  thicknessMm: number;     // Override or inherited from room
  heightMm: number;        // Override or inherited from room
  join: WallJoinType;
  openingIds: string[];
}

export interface Room {
  id: string;
  name: string;
  heightMm: number;
  wallThicknessMm: number;
  floorThicknessMm: number;
  defaultCeiling: boolean;
  wallMaterialId: string | null;
  floorMaterialId: string | null;
  ceilingMaterialId: string | null;
  // Lighting
  lightingPreset?: string;
  // Origin in global space (usually 0,0,0 but allowing multiple rooms later)
  origin: [number, number];
}

export type LightType = 'POINT' | 'LED_STRIP';

export interface LightSource {
  id: string;
  roomId: string;
  type: LightType;
  position: [number, number]; // x, z in 2D
  rotation?: number; // for strips
  length?: number; // for strips
  color?: string;
  intensity?: number;
}

export interface RoomTemplate {
  id: string;
  label: string;
  generate: (params: Record<string, number>) => WallSegment[];
}
