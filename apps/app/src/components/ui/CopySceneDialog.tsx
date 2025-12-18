import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Checkbox,
  ScrollArea,
} from '@meble/ui';
import { useStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import { Copy, Check, CheckCheck } from 'lucide-react';
import type { Part } from '@/types';

interface CopySceneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Generate minimal scene data for a single part
 */
function getPartSceneData(part: Part) {
  return {
    id: part.id,
    name: part.name,
    width: part.width,
    height: part.height,
    depth: part.depth,
    position: {
      x: part.position[0],
      y: part.position[1],
      z: part.position[2],
    },
    rotation: {
      x: part.rotation[0],
      y: part.rotation[1],
      z: part.rotation[2],
    },
    shapeType: part.shapeType,
  };
}

/**
 * Generate scene data for multiple parts
 */
function generateSceneData(parts: Part[]) {
  return {
    exportedAt: new Date().toISOString(),
    partsCount: parts.length,
    parts: parts.map(getPartSceneData),
  };
}

export function CopySceneDialog({ open, onOpenChange }: CopySceneDialogProps) {
  const t = useTranslations('CopySceneDialog');
  const parts = useStore(useShallow((state) => state.parts));
  const [selectedPartIds, setSelectedPartIds] = useState<Set<string>>(
    () => new Set(parts.map((p) => p.id))
  );
  const [copied, setCopied] = useState(false);

  // Reset selection when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setSelectedPartIds(new Set(parts.map((p) => p.id)));
      setCopied(false);
    }
    onOpenChange(newOpen);
  };

  const selectedParts = useMemo(() => {
    return parts.filter((p) => selectedPartIds.has(p.id));
  }, [parts, selectedPartIds]);

  const allSelected = selectedPartIds.size === parts.length;
  const someSelected = selectedPartIds.size > 0 && !allSelected;

  const togglePart = (partId: string) => {
    setSelectedPartIds((prev) => {
      const next = new Set(prev);
      if (next.has(partId)) {
        next.delete(partId);
      } else {
        next.add(partId);
      }
      return next;
    });
    setCopied(false);
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedPartIds(new Set());
    } else {
      setSelectedPartIds(new Set(parts.map((p) => p.id)));
    }
    setCopied(false);
  };

  const handleCopy = async () => {
    const sceneData = generateSceneData(selectedParts);
    const jsonString = JSON.stringify(sceneData, null, 2);

    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Select all checkbox */}
          <div className="flex items-center gap-2 px-1">
            <Checkbox
              id="select-all"
              checked={allSelected ? true : someSelected ? 'indeterminate' : false}
              onCheckedChange={toggleAll}
            />
            <label
              htmlFor="select-all"
              className="text-sm font-medium cursor-pointer select-none"
            >
              {t('selectAll')} ({parts.length})
            </label>
          </div>

          {/* Parts list */}
          <ScrollArea className="flex-1 max-h-[300px] border rounded-md">
            <div className="p-2 space-y-1">
              {parts.map((part) => (
                <div
                  key={part.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                  onClick={() => togglePart(part.id)}
                >
                  <Checkbox
                    checked={selectedPartIds.has(part.id)}
                    onCheckedChange={() => togglePart(part.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {part.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {part.width} × {part.height} × {part.depth} mm
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Selected count */}
          <div className="text-sm text-muted-foreground text-center">
            {t('selectedCount', { count: selectedParts.length })}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button
            onClick={handleCopy}
            disabled={selectedParts.length === 0}
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                {t('copied')}
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                {t('copy')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Copy scene data directly to clipboard (for small scenes)
 */
export async function copySceneToClipboard(parts: Part[]): Promise<boolean> {
  const sceneData = generateSceneData(parts);
  const jsonString = JSON.stringify(sceneData, null, 2);

  try {
    await navigator.clipboard.writeText(jsonString);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}
