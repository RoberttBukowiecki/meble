/**
 * CountertopPanel Constants
 *
 * Labels, options, and configuration for countertop panel UI
 */

import type {
  EdgeBandingOption,
  CornerTreatment,
  CutoutPresetType,
} from '@/types';

// ============================================================================
// Layout Type Labels
// ============================================================================

export const LAYOUT_TYPE_LABELS: Record<string, string> = {
  STRAIGHT: 'Prosty',
  L_SHAPE: 'L-kształt',
  U_SHAPE: 'U-kształt',
  ISLAND: 'Wyspa',
  PENINSULA: 'Półwysep',
};

export const LAYOUT_TYPE_COLORS: Record<string, string> = {
  STRAIGHT: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  L_SHAPE: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  U_SHAPE: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  ISLAND: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  PENINSULA: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
};

// ============================================================================
// Edge Banding Options
// ============================================================================

export const EDGE_BANDING_OPTIONS: { value: EdgeBandingOption; label: string }[] = [
  { value: 'NONE', label: 'Brak' },
  { value: 'STANDARD', label: 'Standard' },
  { value: 'ABS_2MM', label: 'ABS 2mm' },
  { value: 'ABS_1MM', label: 'ABS 1mm' },
  { value: 'PVC', label: 'PVC' },
  { value: 'CONTRAST', label: 'Kontrast' },
];

// ============================================================================
// Corner Treatment Options (without icons - icons added in component)
// ============================================================================

export const CORNER_TREATMENT_VALUES: { value: CornerTreatment; label: string }[] = [
  { value: 'STRAIGHT', label: 'Prosty' },
  { value: 'CHAMFER', label: 'Fazowany' },
  { value: 'RADIUS', label: 'Zaokrąglony' },
  { value: 'CLIP', label: 'Ścięty' },
];

// ============================================================================
// Cutout Preset Options
// ============================================================================

export const CUTOUT_PRESET_OPTIONS: { value: CutoutPresetType; label: string }[] = [
  { value: 'SINK_STANDARD', label: 'Zlewozmywak standardowy (780×480)' },
  { value: 'SINK_SMALL', label: 'Zlewozmywak mały (580×430)' },
  { value: 'SINK_ROUND', label: 'Zlewozmywak okrągły' },
  { value: 'COOKTOP_60', label: 'Płyta 60cm' },
  { value: 'COOKTOP_80', label: 'Płyta 80cm' },
  { value: 'FAUCET_HOLE', label: 'Otwór na baterię (35mm)' },
  { value: 'SOAP_DISPENSER', label: 'Dozownik mydła (28mm)' },
];

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_CNC_POSITION = { x: 100, y: 100 };
export const DEFAULT_CORNER_POSITIONS = [1, 2, 3, 4, 5, 6] as const;
