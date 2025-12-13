import { v4 as uuidv4 } from 'uuid';
import type { Furniture, Material } from '@/types';

export const DEFAULT_FURNITURE_ID = uuidv4();

// Stable IDs for initial materials (used in migrations)
export const MATERIAL_IDS = {
  BIALY: 'material-bialy-default',
  DAB: 'material-dab-default',
  ANTRACYT: 'material-antracyt-default',
  HDF_BIALY: 'material-hdf-bialy-default',
} as const;

export const INITIAL_MATERIALS: Material[] = [
  {
    id: MATERIAL_IDS.BIALY,
    name: 'Biały',
    color: '#FFFFFF',
    thickness: 18,
    isDefault: true,
    category: 'board',
  },
  {
    id: MATERIAL_IDS.DAB,
    name: 'Dąb',
    color: '#D4A574',
    thickness: 18,
    isDefault: true,
    category: 'board',
  },
  {
    id: MATERIAL_IDS.ANTRACYT,
    name: 'Antracyt',
    color: '#2D2D2D',
    thickness: 18,
    category: 'board',
  },
  {
    id: MATERIAL_IDS.HDF_BIALY,
    name: 'HDF Biały',
    color: '#FFFFFF',
    thickness: 3,
    category: 'hdf',
  },
];

export const default_material = INITIAL_MATERIALS[0]?.id ?? '';
export const default_front_material =
  INITIAL_MATERIALS[1]?.id ?? default_material;
export const default_back_material = MATERIAL_IDS.HDF_BIALY;

// Default materials for interior components
export const DEFAULT_INTERIOR_MATERIALS = {
  /** Default material for shelves - uses same as body (white) */
  shelf: MATERIAL_IDS.BIALY,
  /** Default material for drawer box (sides, back, front panel) - uses same as body (white) */
  drawerBox: MATERIAL_IDS.BIALY,
  /** Default material for drawer bottom - uses HDF (thinner) */
  drawerBottom: MATERIAL_IDS.HDF_BIALY,
} as const;

export const INITIAL_FURNITURES: Furniture[] = [
  {
    id: DEFAULT_FURNITURE_ID,
    name: 'Domyślny mebel',
  },
];
