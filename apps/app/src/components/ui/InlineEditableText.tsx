'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PencilLine } from 'lucide-react';
import { cn } from '@meble/ui';
import { sanitizeName, NAME_MAX_LENGTH } from '@/lib/naming';

const COMMIT_DEBOUNCE_MS = 180;

interface InlineEditableTextProps {
  value: string;
  onCommit: (value: string) => void;
  onCancel?: () => void;
  disabled?: boolean;
  isDirty?: boolean;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  maxLength?: number;
  ariaLabel?: string;
  /**
   * When true, renders a div with role="button" instead of a native button.
   * Useful to avoid nested buttons (e.g., inside AccordionTrigger).
   */
  asChild?: boolean;
  activationMode?: 'click' | 'doubleClick';
}

export function InlineEditableText({
  value,
  onCommit,
  onCancel,
  disabled = false,
  isDirty = false,
  className,
  inputClassName,
  placeholder,
  maxLength = NAME_MAX_LENGTH,
  ariaLabel,
  asChild = false,
  activationMode = 'click',
}: InlineEditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const commitTimer = useRef<NodeJS.Timeout | null>(null);
  const cancelBlur = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const stopPropagation = useCallback((event: React.SyntheticEvent) => {
    event.stopPropagation();
  }, []);

  useEffect(() => () => {
    if (commitTimer.current) {
      clearTimeout(commitTimer.current);
    }
  }, []);

  useEffect(() => {
    if (!isEditing) {
      setDraft(value);
    }
  }, [value, isEditing]);

  const scheduleCommit = useCallback((nextValue: string) => {
    if (commitTimer.current) {
      clearTimeout(commitTimer.current);
    }
    commitTimer.current = setTimeout(() => onCommit(nextValue), COMMIT_DEBOUNCE_MS);
  }, [onCommit]);

  const closeEditor = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleCommit = useCallback(() => {
    const normalized = sanitizeName(draft, maxLength);
    closeEditor();
    if (!normalized || normalized === value) {
      setDraft(value);
      return;
    }
    setDraft(normalized);
    scheduleCommit(normalized);
  }, [closeEditor, draft, maxLength, scheduleCommit, value]);

  const handleCancel = useCallback(() => {
    cancelBlur.current = true;
    closeEditor();
    setDraft(value);
    onCancel?.();
    setTimeout(() => {
      cancelBlur.current = false;
    }, 0);
  }, [closeEditor, onCancel, value]);

  const handleBlur = useCallback(() => {
    if (cancelBlur.current) {
      cancelBlur.current = false;
      return;
    }
    handleCommit();
  }, [handleCommit]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleCommit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
    }
  }, [handleCancel, handleCommit]);

  const beginEditing = useCallback((event?: React.SyntheticEvent) => {
    event?.stopPropagation();
    if (disabled) return;
    setIsEditing(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [disabled]);

  const handleKeyDownTrigger = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      beginEditing(event);
    }
  }, [beginEditing]);

  const handleClickTrigger = useCallback((event: React.MouseEvent) => {
    if (activationMode !== 'click') return;
    beginEditing(event);
  }, [activationMode, beginEditing]);

  const handleDoubleClickTrigger = useCallback((event: React.MouseEvent) => {
    if (activationMode !== 'doubleClick') return;
    beginEditing(event);
  }, [activationMode, beginEditing]);

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onClick={stopPropagation}
        onMouseDown={stopPropagation}
        maxLength={maxLength}
        className={cn(
          'w-full rounded border border-input bg-background px-1.5 py-0.5 text-sm leading-[1.2] shadow-sm focus:border-primary focus:outline-none',
          inputClassName
        )}
        aria-label={ariaLabel ?? placeholder ?? value}
      />
    );
  }

  const TriggerComponent = asChild ? 'div' : 'button';
  const triggerProps = asChild
    ? {
        role: 'button',
        tabIndex: disabled ? -1 : 0,
        onKeyDown: handleKeyDownTrigger,
      }
    : { type: 'button' as const };

  return (
    <TriggerComponent
      className={cn(
        'group inline-flex w-full items-center gap-2 rounded px-1 py-0.5 text-left transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70',
        className
      )}
      onClick={handleClickTrigger}
      onDoubleClick={handleDoubleClickTrigger}
      onMouseDown={activationMode === 'click' ? (e) => e.stopPropagation() : undefined}
      aria-label={ariaLabel ?? value}
      {...triggerProps}
      {...(disabled ? { 'aria-disabled': true } : {})}
    >
      <span className="flex w-full items-center gap-1 truncate">
        <span className="truncate text-sm font-medium leading-5">
          {value || placeholder}
        </span>
        {isDirty && <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden />}
        <PencilLine
          className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-70 group-focus-visible:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            beginEditing(e);
          }}
          role="presentation"
        />
      </span>
    </TriggerComponent>
  );
}
