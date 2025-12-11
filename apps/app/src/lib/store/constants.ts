import { v4 as uuidv4 } from 'uuid';
import type { Furniture, Material } from '@/types';

export const DEFAULT_FURNITURE_ID = uuidv4();

export const INITIAL_MATERIALS: Material[] = [
  {
    id: uuidv4(),
    name: 'Biały',
    color: '#FFFFFF',
    thickness: 12,
    isDefault: true,
  },
  {
    id: uuidv4(),
    name: 'Dąb',
    color: '#D4A574',
    thickness: 12,
    isDefault: true,
  },
  {
    id: uuidv4(),
    name: 'Antracyt',
    color: '#2D2D2D',
    thickness: 12,
  },
];

export const default_material = INITIAL_MATERIALS[0]?.id ?? '';
export const default_front_material =
  INITIAL_MATERIALS[1]?.id ?? default_material;

export const INITIAL_FURNITURES: Furniture[] = [
  {
    id: DEFAULT_FURNITURE_ID,
    name: 'Domyślny mebel',
  },
];
