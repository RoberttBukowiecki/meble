import { WallSegment } from '@/types';

export type RoomTemplateId = 'RECTANGLE' | 'L_SHAPE';

export interface RoomTemplateParam {
  id: string;
  label: string;
  type: 'number';
  defaultValue: number;
  min?: number;
}

export interface RoomTemplateDefinition {
  id: RoomTemplateId;
  label: string;
  params: RoomTemplateParam[];
  generate: (roomId: string, params: Record<string, number>) => WallSegment[];
}

export const ROOM_TEMPLATES: RoomTemplateDefinition[] = [
  {
    id: 'RECTANGLE',
    label: 'Prostokąt',
    params: [
      { id: 'width', label: 'Szerokość (mm)', type: 'number', defaultValue: 4000, min: 1000 },
      { id: 'depth', label: 'Głębokość (mm)', type: 'number', defaultValue: 3000, min: 1000 },
    ],
    generate: (roomId, params) => {
      const w = params.width;
      const d = params.depth;
      const walls: WallSegment[] = [];
      // Helper to generate IDs
      const id = (i: number) => `${roomId}_wall_${i}_${crypto.randomUUID().slice(0, 8)}`;

      // Wall 1: (0,0) to (w,0)
      walls.push({
        id: id(1), roomId, start: [0, 0], end: [w, 0], 
        thicknessMm: 0, heightMm: 0, join: 'MITER', openingIds: []
      });
      // Wall 2: (w,0) to (w,d)
      walls.push({
        id: id(2), roomId, start: [w, 0], end: [w, d], 
        thicknessMm: 0, heightMm: 0, join: 'MITER', openingIds: []
      });
      // Wall 3: (w,d) to (0,d)
      walls.push({
        id: id(3), roomId, start: [w, d], end: [0, d], 
        thicknessMm: 0, heightMm: 0, join: 'MITER', openingIds: []
      });
      // Wall 4: (0,d) to (0,0)
      walls.push({
        id: id(4), roomId, start: [0, d], end: [0, 0], 
        thicknessMm: 0, heightMm: 0, join: 'MITER', openingIds: []
      });

      return walls;
    }
  },
  {
    id: 'L_SHAPE',
    label: 'Kształt L',
    params: [
      { id: 'width', label: 'Szerokość całkowita (mm)', type: 'number', defaultValue: 4000, min: 1000 },
      { id: 'depth', label: 'Głębokość całkowita (mm)', type: 'number', defaultValue: 4000, min: 1000 },
      { id: 'legWidth', label: 'Szerokość wnęki (mm)', type: 'number', defaultValue: 2000, min: 500 },
      { id: 'legDepth', label: 'Głębokość wnęki (mm)', type: 'number', defaultValue: 2000, min: 500 },
    ],
    generate: (roomId, params) => {
        // L-shape logic
        // (0,0) -> (W,0) -> (W, D_leg) -> (W_leg, D_leg) -> (W_leg, D) -> (0,D) -> (0,0)
        // Check params validity (leg < total)
        const W = params.width;
        const D = params.depth;
        const w_leg = params.legWidth; // Actually this might be leg THICKNESS or inner width.
        // Let's assume legWidth is the width of the vertical part?
        // Let's stick to simple "Cutout" model.
        // If we have Rectangle W x D, and we cut out (W-w_leg) x (D-d_leg) from top right?
        
        // Let's interpret params as:
        // width: Total X
        // depth: Total Z
        // legWidth: Width of the vertical leg (left side)
        // legDepth: Depth of the horizontal leg (top side)
        
        // Let's try standard L shape:
        // Top-Left corner at (0,0).
        // 1. (0,0) -> (W, 0)
        // 2. (W, 0) -> (W, legDepth)  <-- Short leg depth
        // 3. (W, legDepth) -> (legWidth, legDepth) <-- Inner corner
        // 4. (legWidth, legDepth) -> (legWidth, D) <-- Inner vertical
        // 5. (legWidth, D) -> (0, D)
        // 6. (0, D) -> (0, 0)
        
        const legDepth = params.legDepth;
        const legWidth = params.legWidth;
        
        // Ensure constraints
        // legWidth < W, legDepth < D
        
        const walls: WallSegment[] = [];
        const id = (i: number) => `${roomId}_wall_${i}_${crypto.randomUUID().slice(0, 8)}`;
        
        walls.push({ id: id(1), roomId, start: [0, 0], end: [W, 0], thicknessMm: 0, heightMm: 0, join: 'MITER', openingIds: [] });
        walls.push({ id: id(2), roomId, start: [W, 0], end: [W, legDepth], thicknessMm: 0, heightMm: 0, join: 'MITER', openingIds: [] });
        walls.push({ id: id(3), roomId, start: [W, legDepth], end: [legWidth, legDepth], thicknessMm: 0, heightMm: 0, join: 'MITER', openingIds: [] });
        walls.push({ id: id(4), roomId, start: [legWidth, legDepth], end: [legWidth, D], thicknessMm: 0, heightMm: 0, join: 'MITER', openingIds: [] });
        walls.push({ id: id(5), roomId, start: [legWidth, D], end: [0, D], thicknessMm: 0, heightMm: 0, join: 'MITER', openingIds: [] });
        walls.push({ id: id(6), roomId, start: [0, D], end: [0, 0], thicknessMm: 0, heightMm: 0, join: 'MITER', openingIds: [] });
        
        return walls;
    }
  }
];
