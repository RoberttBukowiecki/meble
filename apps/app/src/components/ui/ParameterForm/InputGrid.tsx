/**
 * InputGrid & InputField - Consistent grid layout for form inputs
 *
 * Provides:
 * - Responsive grid with configurable columns
 * - Consistent label styling
 * - Support for NumberInput, Select, and other input types
 */

import { ReactNode } from "react";
import {
  NumberInput,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@meble/ui";
import { cn } from "@/lib/utils";

// ============================================================================
// InputGrid - Container for grid of inputs
// ============================================================================

interface InputGridProps {
  /** Number of columns (responsive) */
  columns?: 2 | 3 | 4;
  /** Grid items */
  children: ReactNode;
  /** Additional class names */
  className?: string;
}

export function InputGrid({ columns = 3, children, className }: InputGridProps) {
  const colsClass = {
    2: "grid-cols-2",
    3: "grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-4",
  };

  return <div className={cn("grid gap-3", colsClass[columns], className)}>{children}</div>;
}

// ============================================================================
// InputField - Single input with label
// ============================================================================

interface InputFieldProps {
  /** Field label */
  label: string;
  /** Optional unit suffix (e.g., "mm", "%") */
  unit?: string;
  /** Current value */
  value: number | undefined;
  /** Change handler */
  onChange: (value: number) => void;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Step increment */
  step?: number;
  /** Disable the input */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

export function InputField({
  label,
  unit,
  value,
  onChange,
  min,
  max,
  step,
  disabled = false,
  className,
}: InputFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs text-muted-foreground font-medium">
        {label}
        {unit && <span className="text-muted-foreground/60 ml-1">({unit})</span>}
      </Label>
      <NumberInput
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        allowNegative={false}
        disabled={disabled}
        className="h-9"
      />
    </div>
  );
}

// ============================================================================
// SelectField - Single select with label
// ============================================================================

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  /** Field label */
  label: string;
  /** Current value */
  value: string | undefined;
  /** Change handler */
  onChange: (value: string) => void;
  /** Available options */
  options: SelectOption[];
  /** Placeholder text */
  placeholder?: string;
  /** Disable the select */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = "Wybierz...",
  disabled = false,
  className,
}: SelectFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs text-muted-foreground font-medium">{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ============================================================================
// SliderField - Slider with label and value display
// ============================================================================

interface SliderFieldProps {
  /** Field label */
  label: string;
  /** Current value (0-1 for percentage, or actual value) */
  value: number;
  /** Change handler */
  onChange: (value: number) => void;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Step increment */
  step?: number;
  /** Format the displayed value */
  formatValue?: (value: number) => string;
  /** Additional class names */
  className?: string;
}

export function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  formatValue = (v) => String(v),
  className,
}: SliderFieldProps) {
  // Import Slider dynamically to avoid issues
  const { Slider } = require("@meble/ui");

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground font-medium">{label}</Label>
        <span className="text-xs font-mono text-foreground bg-muted/50 px-2 py-0.5 rounded">
          {formatValue(value)}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([val]: number[]) => onChange(val)}
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
}
