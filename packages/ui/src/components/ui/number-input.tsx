import * as React from "react"
import { cn } from "../../lib/utils"

export interface NumberInputProps
  extends Omit<React.ComponentProps<"input">, "type" | "value" | "onChange"> {
  value: number | undefined;
  onChange: (value: number) => void;
  /** Allow negative numbers (default: true) */
  allowNegative?: boolean;
  /** Allow decimals (default: false) */
  allowDecimals?: boolean;
}

/**
 * A controlled number input that provides better UX:
 * - Allows clearing the field completely while typing
 * - Allows typing negative numbers (doesn't reset to 0 after "-")
 * - Only commits the value on blur or when a valid number is typed
 */
const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      className,
      value,
      onChange,
      allowNegative = true,
      allowDecimals = false,
      min,
      max,
      ...props
    },
    ref
  ) => {
    // Local string state for the input
    const [localValue, setLocalValue] = React.useState<string>(
      value !== undefined ? String(value) : ""
    );

    // Track if the input is focused
    const [isFocused, setIsFocused] = React.useState(false);

    // Sync local state when external value changes (but not while focused)
    React.useEffect(() => {
      if (!isFocused) {
        setLocalValue(value !== undefined ? String(value) : "");
      }
    }, [value, isFocused]);

    const parseValue = (str: string): number | null => {
      if (str === "" || str === "-" || str === ".") {
        return null;
      }
      const num = allowDecimals ? parseFloat(str) : parseInt(str, 10);
      if (isNaN(num)) {
        return null;
      }
      return num;
    };

    const clampValue = (num: number): number => {
      let result = num;
      if (min !== undefined && result < Number(min)) {
        result = Number(min);
      }
      if (max !== undefined && result > Number(max)) {
        result = Number(max);
      }
      return result;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;

      // Allow empty string
      if (inputValue === "") {
        setLocalValue("");
        return;
      }

      // Build regex based on options
      let pattern: RegExp;
      if (allowDecimals && allowNegative) {
        pattern = /^-?\d*\.?\d*$/;
      } else if (allowDecimals) {
        pattern = /^\d*\.?\d*$/;
      } else if (allowNegative) {
        pattern = /^-?\d*$/;
      } else {
        pattern = /^\d*$/;
      }

      // Only accept valid partial input
      if (!pattern.test(inputValue)) {
        return;
      }

      setLocalValue(inputValue);

      // If it's a valid complete number, update immediately (only if changed)
      const parsed = parseValue(inputValue);
      if (parsed !== null) {
        const clamped = clampValue(parsed);
        if (clamped !== value) {
          onChange(clamped);
        }
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);

      const parsed = parseValue(localValue);
      if (parsed !== null) {
        const clamped = clampValue(parsed);
        // Only call onChange if the value actually changed
        if (clamped !== value) {
          onChange(clamped);
        }
        setLocalValue(String(clamped));
      } else {
        // Empty or invalid input - default to 0 (clamped by min/max)
        const defaultValue = clampValue(0);
        if (defaultValue !== value) {
          onChange(defaultValue);
        }
        setLocalValue(String(defaultValue));
      }

      props.onBlur?.(e);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      props.onFocus?.(e);
    };

    return (
      <input
        type="text"
        inputMode={allowDecimals ? "decimal" : "numeric"}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        {...props}
      />
    );
  }
);
NumberInput.displayName = "NumberInput";

export { NumberInput };
