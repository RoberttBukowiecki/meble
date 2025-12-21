'use client';

/**
 * CountertopConfigDialog - Configuration dialog for cabinet countertop settings
 *
 * Features:
 * - Enable/disable countertop for cabinet
 * - Configure overhang overrides
 * - Set cutout presets (sink, cooktop)
 * - Thickness override
 * - Exclude from group option
 * - "Apply to all" functionality for batch updates
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  NumberInput,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Separator,
  Alert,
  AlertDescription,
} from '@meble/ui';
import { Layers, AlertTriangle, Check } from 'lucide-react';
import type { CabinetCountertopConfig, CutoutPresetType } from '@/types';
import { COUNTERTOP_DEFAULTS, COUNTERTOP_LIMITS } from '@/lib/config';

// ============================================================================
// Cutout Preset Options
// ============================================================================

const CUTOUT_PRESET_OPTIONS: { value: CutoutPresetType | 'NONE'; label: string; description?: string }[] = [
  { value: 'NONE', label: 'Brak', description: 'Bez wycięcia' },
  { value: 'SINK_STANDARD', label: 'Zlewozmywak standardowy', description: '780 × 480 mm' },
  { value: 'SINK_SMALL', label: 'Zlewozmywak mały', description: '580 × 430 mm' },
  { value: 'SINK_ROUND', label: 'Zlewozmywak okrągły', description: 'Ø 450 mm' },
  { value: 'COOKTOP_60', label: 'Płyta grzewcza 60cm', description: '560 × 490 mm' },
  { value: 'COOKTOP_80', label: 'Płyta grzewcza 80cm', description: '750 × 490 mm' },
];

const THICKNESS_OPTIONS = [
  { value: 28, label: '28 mm' },
  { value: 38, label: '38 mm (standard)' },
  { value: 40, label: '40 mm' },
];

// ============================================================================
// Props
// ============================================================================

interface CountertopConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config?: CabinetCountertopConfig;
  onConfigChange: (config: CabinetCountertopConfig) => void;
  /** Whether this is an existing cabinet (shows "apply to all" option) */
  isExistingCabinet?: boolean;
  /** Callback when user wants to apply config to all kitchen cabinets */
  onApplyToAll?: (config: CabinetCountertopConfig) => void;
  /** Number of other kitchen cabinets that would be affected */
  otherKitchenCabinetsCount?: number;
}

// ============================================================================
// Component
// ============================================================================

export function CountertopConfigDialog({
  open,
  onOpenChange,
  config,
  onConfigChange,
  isExistingCabinet = false,
  onApplyToAll,
  otherKitchenCabinetsCount = 0,
}: CountertopConfigDialogProps) {
  const [showApplyAllConfirm, setShowApplyAllConfirm] = useState(false);

  // Local state for editing
  const [localConfig, setLocalConfig] = useState<CabinetCountertopConfig>(() => ({
    hasCountertop: config?.hasCountertop ?? true,
    overhangOverride: config?.overhangOverride,
    excludeFromGroup: config?.excludeFromGroup ?? false,
    cutoutPreset: config?.cutoutPreset,
    thicknessOverride: config?.thicknessOverride,
  }));

  // Reset local state when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setLocalConfig({
        hasCountertop: config?.hasCountertop ?? true,
        overhangOverride: config?.overhangOverride,
        excludeFromGroup: config?.excludeFromGroup ?? false,
        cutoutPreset: config?.cutoutPreset,
        thicknessOverride: config?.thicknessOverride,
      });
      setShowApplyAllConfirm(false);
    }
    onOpenChange(newOpen);
  };

  const handleSave = () => {
    onConfigChange(localConfig);
    onOpenChange(false);
  };

  const handleApplyToAll = () => {
    if (onApplyToAll) {
      onApplyToAll(localConfig);
    }
    onOpenChange(false);
  };

  const updateOverhang = (key: 'front' | 'back' | 'left' | 'right', value: number) => {
    setLocalConfig(prev => ({
      ...prev,
      overhangOverride: {
        ...prev.overhangOverride,
        [key]: value,
      },
    }));
  };

  const getOverhangValue = (key: 'front' | 'back' | 'left' | 'right'): number => {
    return localConfig.overhangOverride?.[key] ?? COUNTERTOP_DEFAULTS.OVERHANG[key];
  };

  const hasOverhangOverride = localConfig.overhangOverride &&
    Object.keys(localConfig.overhangOverride).length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Konfiguracja blatu
          </DialogTitle>
          <DialogDescription>
            Ustaw parametry blatu dla tej szafki. Możesz nadpisać domyślne wartości.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Main Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Blat kuchenny</Label>
              <p className="text-xs text-muted-foreground">
                Czy ta szafka ma mieć blat
              </p>
            </div>
            <Switch
              checked={localConfig.hasCountertop}
              onCheckedChange={(checked) =>
                setLocalConfig(prev => ({ ...prev, hasCountertop: checked }))
              }
            />
          </div>

          {localConfig.hasCountertop && (
            <>
              <Separator />

              {/* Thickness Override */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Grubość blatu</Label>
                <Select
                  value={localConfig.thicknessOverride?.toString() || 'default'}
                  onValueChange={(val) =>
                    setLocalConfig(prev => ({
                      ...prev,
                      thicknessOverride: val === 'default' ? undefined : parseInt(val),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Domyślna (z grupy)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Domyślna (z grupy)</SelectItem>
                    {THICKNESS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value.toString()}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cutout Preset */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Wycięcie CNC</Label>
                <Select
                  value={localConfig.cutoutPreset || 'NONE'}
                  onValueChange={(val) =>
                    setLocalConfig(prev => ({
                      ...prev,
                      cutoutPreset: val === 'NONE' ? undefined : val as CutoutPresetType,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CUTOUT_PRESET_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex flex-col">
                          <span>{opt.label}</span>
                          {opt.description && (
                            <span className="text-xs text-muted-foreground">{opt.description}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Overhang Override */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Nawisy (mm)</Label>
                  {hasOverhangOverride && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() =>
                        setLocalConfig(prev => ({ ...prev, overhangOverride: undefined }))
                      }
                    >
                      Resetuj do domyślnych
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Przód</Label>
                    <NumberInput
                      value={getOverhangValue('front')}
                      onChange={(val) => updateOverhang('front', val)}
                      min={COUNTERTOP_LIMITS.OVERHANG.min}
                      max={COUNTERTOP_LIMITS.OVERHANG.max}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Tył</Label>
                    <NumberInput
                      value={getOverhangValue('back')}
                      onChange={(val) => updateOverhang('back', val)}
                      min={COUNTERTOP_LIMITS.OVERHANG.min}
                      max={COUNTERTOP_LIMITS.OVERHANG.max}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Lewo</Label>
                    <NumberInput
                      value={getOverhangValue('left')}
                      onChange={(val) => updateOverhang('left', val)}
                      min={COUNTERTOP_LIMITS.OVERHANG.min}
                      max={COUNTERTOP_LIMITS.OVERHANG.max}
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Prawo</Label>
                    <NumberInput
                      value={getOverhangValue('right')}
                      onChange={(val) => updateOverhang('right', val)}
                      min={COUNTERTOP_LIMITS.OVERHANG.min}
                      max={COUNTERTOP_LIMITS.OVERHANG.max}
                      className="h-8"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Exclude from Group */}
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Oddzielny blat</Label>
                  <p className="text-xs text-muted-foreground">
                    Wyklucz z automatycznego grupowania z sąsiednimi szafkami
                  </p>
                </div>
                <Switch
                  checked={localConfig.excludeFromGroup ?? false}
                  onCheckedChange={(checked) =>
                    setLocalConfig(prev => ({ ...prev, excludeFromGroup: checked }))
                  }
                />
              </div>
            </>
          )}

          {/* Apply to All Confirmation */}
          {showApplyAllConfirm && isExistingCabinet && onApplyToAll && otherKitchenCabinetsCount > 0 && (
            <Alert className="border-amber-500/50 bg-amber-500/10">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm">
                <p className="font-medium text-amber-700 mb-2">
                  Zastosować do wszystkich szafek kuchennych?
                </p>
                <p className="text-amber-600 text-xs mb-3">
                  Ta konfiguracja zostanie zastosowana do {otherKitchenCabinetsCount} innych szafek kuchennych.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => setShowApplyAllConfirm(false)}
                  >
                    Anuluj
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-amber-600 hover:bg-amber-700"
                    onClick={handleApplyToAll}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Tak, zastosuj do wszystkich
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isExistingCabinet && onApplyToAll && otherKitchenCabinetsCount > 0 && !showApplyAllConfirm && (
            <Button
              variant="outline"
              onClick={() => setShowApplyAllConfirm(true)}
              className="sm:mr-auto"
            >
              Zastosuj do wszystkich ({otherKitchenCabinetsCount + 1})
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button onClick={handleSave}>
            Zapisz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Get a summary string for countertop configuration
 */
export function getCountertopSummary(config?: CabinetCountertopConfig): string {
  if (!config?.hasCountertop) {
    return 'Brak blatu';
  }

  const parts: string[] = [];

  if (config.thicknessOverride) {
    parts.push(`${config.thicknessOverride}mm`);
  }

  if (config.cutoutPreset) {
    const preset = CUTOUT_PRESET_OPTIONS.find(p => p.value === config.cutoutPreset);
    if (preset) {
      parts.push(preset.label);
    }
  }

  if (config.excludeFromGroup) {
    parts.push('oddzielny');
  }

  if (parts.length === 0) {
    return 'Standardowy blat';
  }

  return parts.join(' • ');
}
