import { v4 as uuidv4 } from 'uuid';
import type { Furniture, Material } from '@/types';

export const DEFAULT_FURNITURE_ID = uuidv4();

// ============================================================================
// Texture CDN Configuration
// Using AmbientCG (CC0 license) for PBR textures
// ============================================================================

const AMBIENTCG_CDN = 'https://f003.backblazeb2.com/file/ambientCG-Web/media/surface-preview';

/** Helper to create AmbientCG texture URLs */
const ambientCGTexture = (textureId: string, repeatX = 2, repeatY = 2) => ({
  url: `${AMBIENTCG_CDN}/${textureId}/${textureId}_SQ_Color.jpg`,
  normalMapUrl: `${AMBIENTCG_CDN}/${textureId}/${textureId}_SQ_NormalDX.jpg`,
  repeatX,
  repeatY,
});

// ============================================================================
// Material IDs - Stable IDs for initial materials (used in migrations)
// ============================================================================

export const MATERIAL_IDS = {
  // Board materials (18mm)
  BIALY: 'material-bialy-default',
  DAB: 'material-dab-default',
  ANTRACYT: 'material-antracyt-default',
  ORZECH: 'material-orzech-default',
  BUK: 'material-buk-default',
  JESION: 'material-jesion-default',
  BIALY_MAT: 'material-bialy-mat-default',
  SZARY: 'material-szary-default',
  CZARNY: 'material-czarny-default',
  SOSNA: 'material-sosna-default',
  WIAZ: 'material-wiaz-default',
  KASZTAN: 'material-kasztan-default',

  // HDF materials (3mm)
  HDF_BIALY: 'material-hdf-bialy-default',
  HDF_CZARNY: 'material-hdf-czarny-default',

  // Countertop materials (38mm default)
  BLAT_DAB: 'material-blat-dab-default',
  BLAT_ORZECH: 'material-blat-orzech-default',
  BLAT_BIALY: 'material-blat-bialy-default',
  BLAT_ANTRACYT: 'material-blat-antracyt-default',
  BLAT_MARMUR: 'material-blat-marmur-default',
  BLAT_BETON: 'material-blat-beton-default',
  BLAT_GRANIT: 'material-blat-granit-default',
  BLAT_DREWNO_RUSTIC: 'material-blat-drewno-rustic-default',
} as const;

// ============================================================================
// Board Materials (18mm thickness)
// Standard furniture board materials for cabinet bodies
// ============================================================================

const BOARD_MATERIALS: Material[] = [
  {
    id: MATERIAL_IDS.BIALY,
    name: 'Biały',
    color: '#FFFFFF',
    thickness: 18,
    isDefault: true,
    category: 'board',
    pbr: { roughness: 0.4, metalness: 0 },
  },
  {
    id: MATERIAL_IDS.DAB,
    name: 'Dąb',
    color: '#D4A574',
    thickness: 18,
    isDefault: true,
    category: 'board',
    hasGrain: true,
    pbr: { roughness: 0.6, metalness: 0 },
    code: 'H3700',
    texture: ambientCGTexture('Wood026', 3, 3), // Oak wood texture
  },
  {
    id: MATERIAL_IDS.ANTRACYT,
    name: 'Antracyt',
    color: '#2D2D2D',
    thickness: 18,
    category: 'board',
    pbr: { roughness: 0.5, metalness: 0 },
  },
  {
    id: MATERIAL_IDS.ORZECH,
    name: 'Orzech',
    color: '#5D4037',
    thickness: 18,
    category: 'board',
    hasGrain: true,
    pbr: { roughness: 0.55, metalness: 0 },
    code: 'H3734',
    texture: ambientCGTexture('Wood066', 3, 3), // Walnut wood texture
  },
  {
    id: MATERIAL_IDS.BUK,
    name: 'Buk',
    color: '#E8C07D',
    thickness: 18,
    category: 'board',
    hasGrain: true,
    pbr: { roughness: 0.6, metalness: 0 },
    code: 'H1518',
    texture: ambientCGTexture('Wood051', 3, 3), // Beech wood texture
  },
  {
    id: MATERIAL_IDS.JESION,
    name: 'Jesion',
    color: '#F5E6D3',
    thickness: 18,
    category: 'board',
    hasGrain: true,
    pbr: { roughness: 0.55, metalness: 0 },
    code: 'H1250',
    texture: ambientCGTexture('Wood049', 3, 3), // Ash wood texture
  },
  {
    id: MATERIAL_IDS.BIALY_MAT,
    name: 'Biały mat',
    color: '#F8F8F8',
    thickness: 18,
    category: 'board',
    pbr: { roughness: 0.8, metalness: 0 },
    code: 'U999',
  },
  {
    id: MATERIAL_IDS.SZARY,
    name: 'Szary',
    color: '#808080',
    thickness: 18,
    category: 'board',
    pbr: { roughness: 0.5, metalness: 0 },
    code: 'U708',
  },
  {
    id: MATERIAL_IDS.CZARNY,
    name: 'Czarny',
    color: '#1A1A1A',
    thickness: 18,
    category: 'board',
    pbr: { roughness: 0.4, metalness: 0 },
    code: 'U999',
  },
  {
    id: MATERIAL_IDS.SOSNA,
    name: 'Sosna',
    color: '#E6C88C',
    thickness: 18,
    category: 'board',
    hasGrain: true,
    pbr: { roughness: 0.65, metalness: 0 },
    code: 'H1401',
    texture: ambientCGTexture('Wood048', 3, 3), // Pine wood texture
  },
  {
    id: MATERIAL_IDS.WIAZ,
    name: 'Wiąz',
    color: '#8B7355',
    thickness: 18,
    category: 'board',
    hasGrain: true,
    pbr: { roughness: 0.6, metalness: 0 },
    code: 'H3176',
    texture: ambientCGTexture('Wood058', 3, 3), // Elm wood texture
  },
  {
    id: MATERIAL_IDS.KASZTAN,
    name: 'Kasztan',
    color: '#7B3F00',
    thickness: 18,
    category: 'board',
    hasGrain: true,
    pbr: { roughness: 0.55, metalness: 0 },
    texture: ambientCGTexture('Wood050', 3, 3), // Chestnut wood texture
  },
];

// ============================================================================
// HDF Materials (3mm thickness)
// For cabinet backs and drawer bottoms
// ============================================================================

const HDF_MATERIALS: Material[] = [
  {
    id: MATERIAL_IDS.HDF_BIALY,
    name: 'HDF Biały',
    color: '#FFFFFF',
    thickness: 3,
    category: 'hdf',
    pbr: { roughness: 0.3, metalness: 0 },
  },
  {
    id: MATERIAL_IDS.HDF_CZARNY,
    name: 'HDF Czarny',
    color: '#1A1A1A',
    thickness: 3,
    category: 'hdf',
    pbr: { roughness: 0.3, metalness: 0 },
  },
];

// ============================================================================
// Countertop Materials (38mm default thickness)
// Special materials for kitchen countertops with realistic finishes
// ============================================================================

const COUNTERTOP_MATERIALS: Material[] = [
  {
    id: MATERIAL_IDS.BLAT_DAB,
    name: 'Blat dębowy',
    color: '#C9A66B',
    thickness: 38,
    category: 'countertop',
    hasGrain: true,
    pbr: { roughness: 0.45, metalness: 0 },
    code: 'R20038',
    texture: ambientCGTexture('Wood094', 2, 2), // Premium oak countertop
  },
  {
    id: MATERIAL_IDS.BLAT_ORZECH,
    name: 'Blat orzechowy',
    color: '#5D4037',
    thickness: 38,
    category: 'countertop',
    hasGrain: true,
    pbr: { roughness: 0.45, metalness: 0 },
    code: 'R30135',
    texture: ambientCGTexture('Wood092', 2, 2), // Walnut countertop
  },
  {
    id: MATERIAL_IDS.BLAT_BIALY,
    name: 'Blat biały',
    color: '#FAFAFA',
    thickness: 38,
    category: 'countertop',
    pbr: { roughness: 0.3, metalness: 0 },
    code: 'F8820',
    // No texture - solid white
  },
  {
    id: MATERIAL_IDS.BLAT_ANTRACYT,
    name: 'Blat antracyt',
    color: '#3C3C3C',
    thickness: 38,
    category: 'countertop',
    pbr: { roughness: 0.35, metalness: 0 },
    code: 'F8904',
    // No texture - solid anthracite
  },
  {
    id: MATERIAL_IDS.BLAT_MARMUR,
    name: 'Blat marmur Carrara',
    color: '#F0F0F0',
    thickness: 38,
    category: 'countertop',
    pbr: { roughness: 0.2, metalness: 0.05 },
    code: 'F6204',
    texture: ambientCGTexture('Marble006', 2, 2), // Carrara marble
  },
  {
    id: MATERIAL_IDS.BLAT_BETON,
    name: 'Blat beton',
    color: '#9E9E9E',
    thickness: 38,
    category: 'countertop',
    pbr: { roughness: 0.7, metalness: 0 },
    code: 'F8833',
    texture: ambientCGTexture('Concrete034', 2, 2), // Concrete texture
  },
  {
    id: MATERIAL_IDS.BLAT_GRANIT,
    name: 'Blat granit czarny',
    color: '#2E2E2E',
    thickness: 38,
    category: 'countertop',
    pbr: { roughness: 0.15, metalness: 0.1 },
    code: 'F8824',
    texture: ambientCGTexture('Marble012', 2, 2), // Dark stone/granite texture
  },
  {
    id: MATERIAL_IDS.BLAT_DREWNO_RUSTIC,
    name: 'Blat drewno rustykalne',
    color: '#A0826D',
    thickness: 38,
    category: 'countertop',
    hasGrain: true,
    pbr: { roughness: 0.7, metalness: 0 },
    code: 'R50004',
    texture: ambientCGTexture('Wood089', 2, 2), // Rustic wood
  },
];

// ============================================================================
// Combined Initial Materials
// ============================================================================

export const INITIAL_MATERIALS: Material[] = [
  ...BOARD_MATERIALS,
  ...HDF_MATERIALS,
  ...COUNTERTOP_MATERIALS,
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
