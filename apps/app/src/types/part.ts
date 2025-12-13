/**
 * Part type definitions
 */

import type { ShapeType, ShapeParams } from './shape';
import type { EdgeBanding } from './edge';
import type { CabinetPartMetadata } from './cabinet';

/**
 * Individual furniture part with all properties
 */
export interface Part {
  // Identity
  id: string;
  name: string;
  furnitureId: string; // Reference to parent furniture
  group?: string;      // Optional grouping (e.g., "doors", "shelves")

  // Geometry
  shapeType: ShapeType;
  shapeParams: ShapeParams;

  // 3D Dimensions (calculated from shape + material)
  width: number;  // Bounding box X dimension (mm)
  height: number; // Bounding box Y dimension (mm)
  depth: number;  // Z dimension = material thickness (mm)

  // 3D Transform
  position: [number, number, number]; // [x, y, z] in mm
  rotation: [number, number, number]; // [rx, ry, rz] in radians

  // Material
  materialId: string;
  edgeBanding: EdgeBanding;

  // Metadata
  notes?: string;
  createdAt: Date;
  updatedAt: Date;

  /**
   * Cabinet membership metadata (optional)
   * If set, this part belongs to a cabinet and may be regenerated
   * when cabinet parameters change
   */
  cabinetMetadata?: CabinetPartMetadata;
}
