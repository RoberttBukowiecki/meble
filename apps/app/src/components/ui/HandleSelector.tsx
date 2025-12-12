'use client';

import { useState } from 'react';
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
  Button,
  NumberInput,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@meble/ui';

import type {
  HandleConfig,
  HandleCategory,
  HandleType,
  HandlePositionPreset,
  HandleOrientation,
} from '@/types';
import {
  HANDLE_PRESETS,
  HANDLE_TYPE_LABELS,
  HANDLE_CATEGORY_LABELS,
  POSITION_PRESET_LABELS,
  HANDLE_FINISH_LABELS,
  getTypesForCategory,
  getDefaultPresetForCategory,
  getDimensionsForType,
} from '@/lib/handlePresets';

interface HandleSelectorProps {
  value?: HandleConfig;
  onChange: (config: HandleConfig | undefined) => void;
  doorWidth: number;
  doorHeight: number;
}

type CategoryOrNone = HandleCategory | 'NONE';

export function HandleSelector({ value, onChange, doorWidth, doorHeight }: HandleSelectorProps) {
  const [category, setCategory] = useState<CategoryOrNone>(value?.category ?? 'NONE');

  const handleCategoryChange = (newCategory: CategoryOrNone) => {
    setCategory(newCategory);
    if (newCategory === 'NONE') {
      onChange(undefined);
    } else {
      const defaultPreset = getDefaultPresetForCategory(newCategory);
      onChange(HANDLE_PRESETS[defaultPreset]);
    }
  };

  return (
    <Accordion type="multiple" defaultValue={['category']} className="w-full">
      <AccordionItem value="category" className="border-b-0">
        <AccordionTrigger className="py-2 text-xs font-medium hover:no-underline">
          Rodzaj uchwytu
        </AccordionTrigger>
        <AccordionContent className="pb-2 pt-0">
          <div className="grid grid-cols-2 gap-1">
            {(['NONE', 'TRADITIONAL', 'MODERN', 'HANDLELESS'] as const).map((cat) => (
              <Button
                key={cat}
                variant={category === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleCategoryChange(cat)}
                className="h-7 text-[10px]"
              >
                {cat === 'NONE' ? 'Brak' : HANDLE_CATEGORY_LABELS[cat]}
              </Button>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>

      {category !== 'NONE' && value && (
        <>
          <HandleTypeSelector
            category={category}
            value={value.type}
            onChange={(type) => {
              const availableDimensions = getDimensionsForType(type);
              const defaultDimensions = availableDimensions[0]?.dimensions;
              onChange({
                ...value,
                type,
                dimensions: defaultDimensions,
              });
            }}
          />
          <HandleDimensionSelector config={value} onChange={onChange} />
          <HandlePositionSelector
            config={value}
            onChange={onChange}
            doorWidth={doorWidth}
            doorHeight={doorHeight}
          />
          {value.category !== 'HANDLELESS' && (
            <HandleFinishSelector config={value} onChange={onChange} />
          )}
        </>
      )}
    </Accordion>
  );
}

function HandleTypeSelector({ category, value, onChange }: HandleTypeSelectorProps) {
  const types = getTypesForCategory(category);
  return (
    <AccordionItem value="type" className="border-b-0">
      <AccordionTrigger className="py-2 text-xs font-medium hover:no-underline">
        Typ
      </AccordionTrigger>
      <AccordionContent className="pb-2 pt-0">
        <div className="grid grid-cols-2 gap-1">
          {types.map((type) => (
            <Button
              key={type}
              variant={value === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => onChange(type)}
              className="h-7 text-[10px] justify-start"
            >
              {HANDLE_TYPE_LABELS[type]}
            </Button>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function HandleDimensionSelector({ config, onChange }: HandleDimensionSelectorProps) {
  const availableSizes = getDimensionsForType(config.type);
  if (availableSizes.length === 0) return null;

  return (
    <AccordionItem value="dimensions" className="border-b-0">
      <AccordionTrigger className="py-2 text-xs font-medium hover:no-underline">
        Rozmiar
      </AccordionTrigger>
      <AccordionContent className="pb-2 pt-0">
        <Select
          value={config.dimensions ? JSON.stringify(config.dimensions) : undefined}
          onValueChange={(val) => onChange({ ...config, dimensions: JSON.parse(val) })}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Wybierz rozmiar" />
          </SelectTrigger>
          <SelectContent>
            {availableSizes.map((size, index) => (
              <SelectItem key={index} value={JSON.stringify(size.dimensions)} className="text-xs">
                {size.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </AccordionContent>
    </AccordionItem>
  );
}

function HandlePositionSelector({
  config,
  onChange,
  doorWidth,
  doorHeight,
}: HandlePositionSelectorProps) {
  const positionPresets: HandlePositionPreset[] = [
    'TOP_LEFT', 'TOP_CENTER', 'TOP_RIGHT', 'MIDDLE_LEFT', 'MIDDLE_RIGHT',
    'BOTTOM_LEFT', 'BOTTOM_CENTER', 'BOTTOM_RIGHT', 'CUSTOM',
  ];

  return (
    <AccordionItem value="position" className="border-b-0">
      <AccordionTrigger className="py-2 text-xs font-medium hover:no-underline">
        Pozycja i orientacja
      </AccordionTrigger>
      <AccordionContent className="pb-2 pt-0 space-y-2">
        <Select
          value={config.position.preset}
          onValueChange={(preset: HandlePositionPreset) =>
            onChange({ ...config, position: { ...config.position, preset } })
          }
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {positionPresets.map((preset) => (
              <SelectItem key={preset} value={preset} className="text-xs">
                {POSITION_PRESET_LABELS[preset]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {config.position.preset === 'CUSTOM' && (
          <div className="grid grid-cols-2 gap-1">
            <div>
              <span className="text-[10px] text-muted-foreground">X (od środka)</span>
              <NumberInput
                className="h-7 text-xs"
                value={config.position.x ?? 0}
                onChange={(val) => onChange({ ...config, position: { ...config.position, x: val } })}
                min={-doorWidth / 2}
                max={doorWidth / 2}
              />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground">Y (od środka)</span>
              <NumberInput
                className="h-7 text-xs"
                value={config.position.y ?? 0}
                onChange={(val) => onChange({ ...config, position: { ...config.position, y: val } })}
                min={-doorHeight / 2}
                max={doorHeight / 2}
              />
            </div>
          </div>
        )}

        <div>
          <span className="text-[10px] text-muted-foreground">Odstęp od krawędzi ({config.position.offsetFromEdge ?? 30}mm)</span>
          <Slider
            className="w-full"
            value={[config.position.offsetFromEdge ?? 30]}
            onValueChange={([val]) => onChange({ ...config, position: { ...config.position, offsetFromEdge: val } })}
            min={10} max={100} step={5}
          />
        </div>

        {(config.type === 'BAR' || config.type === 'STRIP') && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Orientacja</span>
            <div className="flex gap-1">
              <Button
                variant={config.orientation === 'VERTICAL' ? 'default' : 'outline'}
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => onChange({ ...config, orientation: 'VERTICAL' })}
              >
                Pionowo
              </Button>
              <Button
                variant={config.orientation === 'HORIZONTAL' ? 'default' : 'outline'}
                size="sm"
                className="h-6 text-[10px] px-2"
                onClick={() => onChange({ ...config, orientation: 'HORIZONTAL' })}
              >
                Poziomo
              </Button>
            </div>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

function HandleFinishSelector({ config, onChange }: HandleFinishSelectorProps) {
  const finishes = ['chrome', 'brushed_nickel', 'black_matte', 'gold', 'aluminum', 'stainless'];
  return (
    <AccordionItem value="finish" className="border-b-0">
      <AccordionTrigger className="py-2 text-xs font-medium hover:no-underline">
        Wykończenie
      </AccordionTrigger>
      <AccordionContent className="pb-2 pt-0">
        <Select
          value={config.finish ?? 'chrome'}
          onValueChange={(finish) => onChange({ ...config, finish })}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {finishes.map((finish) => (
              <SelectItem key={finish} value={finish} className="text-xs">
                {HANDLE_FINISH_LABELS[finish]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </AccordionContent>
    </AccordionItem>
  );
}