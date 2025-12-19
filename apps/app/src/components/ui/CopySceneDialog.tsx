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
import { Copy, Check } from 'lucide-react';
import type { Part } from '@/types';
import { lastSnapV3Debug, type SnapV3DebugInfo, type SnapV3Candidate } from '@/lib/snapping-v3';
import type { OBBFace, OrientedBoundingBox } from '@/lib/obb';

interface CopySceneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Format OBB for debug output
 */
function formatOBB(obb: OrientedBoundingBox) {
  return {
    center: { x: obb.center[0], y: obb.center[1], z: obb.center[2] },
    halfExtents: { x: obb.halfExtents[0], y: obb.halfExtents[1], z: obb.halfExtents[2] },
    rotation: {
      x: Math.round(obb.rotation[0] * (180 / Math.PI) * 100) / 100,
      y: Math.round(obb.rotation[1] * (180 / Math.PI) * 100) / 100,
      z: Math.round(obb.rotation[2] * (180 / Math.PI) * 100) / 100,
    },
    axes: obb.axes.map((axis, i) => ({
      [`axis${i}`]: { x: axis[0].toFixed(3), y: axis[1].toFixed(3), z: axis[2].toFixed(3) },
    })),
  };
}

/**
 * Format Face for debug output
 */
function formatFace(face: OBBFace, index: number) {
  const faceNames = ['+X (right)', '-X (left)', '+Y (top)', '-Y (bottom)', '+Z (front)', '-Z (back)'];
  return {
    faceIndex: index,
    faceName: faceNames[index] || `face-${index}`,
    center: { x: face.center[0].toFixed(1), y: face.center[1].toFixed(1), z: face.center[2].toFixed(1) },
    normal: { x: face.normal[0].toFixed(3), y: face.normal[1].toFixed(3), z: face.normal[2].toFixed(3) },
    axisIndex: face.axisIndex,
    sign: face.sign,
    corners: face.corners.map((c, i) => ({
      [`corner${i}`]: { x: c[0].toFixed(1), y: c[1].toFixed(1), z: c[2].toFixed(1) },
    })),
  };
}

/**
 * Format candidate for debug output
 */
function formatCandidate(c: SnapV3Candidate, movingFaces: OBBFace[]) {
  return {
    type: c.type,
    targetPartId: c.targetPartId,
    snapOffset: c.snapOffset.toFixed(2),
    distance: c.distance.toFixed(2),
    movingFace: formatFace(c.movingFace, movingFaces.indexOf(c.movingFace)),
    targetFace: formatFace(c.targetFace, 0),
  };
}

/**
 * Generate V3 snap debug data
 */
function generateSnapV3DebugData(debug: SnapV3DebugInfo) {
  return {
    dragAxis: debug.dragAxis,
    movementDirection: debug.movementDirection > 0 ? 'positive' : 'negative',
    currentOffset: {
      x: debug.currentOffset[0].toFixed(1),
      y: debug.currentOffset[1].toFixed(1),
      z: debug.currentOffset[2].toFixed(1),
    },
    hysteresisActive: debug.hysteresisActive,
    crossAxisEnabled: debug.crossAxisEnabled,
    movingPart: {
      id: debug.movingPartId,
      obb: formatOBB(debug.movingOBB),
      allFaces: debug.movingFaces.map((f: OBBFace, i: number) => formatFace(f, i)),
      relevantFaces: debug.relevantFaces.map((f: OBBFace, i: number) => ({
        ...formatFace(f, debug.movingFaces.indexOf(f)),
        reason: 'aligned with drag axis',
      })),
      leadingFaces: debug.leadingFaces.map((f: OBBFace, i: number) => ({
        ...formatFace(f, debug.movingFaces.indexOf(f)),
        reason: 'facing movement direction',
      })),
    },
    targetParts: debug.targetParts.map((tp) => ({
      id: tp.partId,
      obb: formatOBB(tp.obb),
      faces: tp.faces.map((f: OBBFace, i: number) => formatFace(f, i)),
    })),
    candidatesByType: {
      connection: debug.connectionCandidates.map((c: SnapV3Candidate) => formatCandidate(c, debug.movingFaces)),
      alignment: debug.alignmentCandidates.map((c: SnapV3Candidate) => formatCandidate(c, debug.movingFaces)),
      tjoint: debug.tjointCandidates.map((c: SnapV3Candidate) => formatCandidate(c, debug.movingFaces)),
    },
    selectedCandidate: debug.selectedCandidate
      ? {
          type: debug.selectedCandidate.type,
          targetPartId: debug.selectedCandidate.targetPartId,
          snapOffset: debug.selectedCandidate.snapOffset.toFixed(2),
          movingFaceNormal: {
            x: debug.selectedCandidate.movingFace.normal[0].toFixed(3),
            y: debug.selectedCandidate.movingFace.normal[1].toFixed(3),
            z: debug.selectedCandidate.movingFace.normal[2].toFixed(3),
          },
          targetFaceNormal: {
            x: debug.selectedCandidate.targetFace.normal[0].toFixed(3),
            y: debug.selectedCandidate.targetFace.normal[1].toFixed(3),
            z: debug.selectedCandidate.targetFace.normal[2].toFixed(3),
          },
        }
      : null,
  };
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
    // Rotation in degrees (converted from radians)
    rotation: {
      x: Math.round(part.rotation[0] * (180 / Math.PI) * 100) / 100,
      y: Math.round(part.rotation[1] * (180 / Math.PI) * 100) / 100,
      z: Math.round(part.rotation[2] * (180 / Math.PI) * 100) / 100,
    },
    shapeType: part.shapeType,
  };
}

/**
 * Generate scene data for multiple parts
 */
function generateSceneData(parts: Part[], includeSnapDebug: boolean) {
  const baseData = {
    exportedAt: new Date().toISOString(),
    partsCount: parts.length,
    parts: parts.map(getPartSceneData),
  };

  if (includeSnapDebug && lastSnapV3Debug) {
    return {
      ...baseData,
      snapV3Debug: generateSnapV3DebugData(lastSnapV3Debug),
    };
  }

  return baseData;
}

export function CopySceneDialog({ open, onOpenChange }: CopySceneDialogProps) {
  const t = useTranslations('CopySceneDialog');
  const { parts, snapSettings } = useStore(
    useShallow((state) => ({
      parts: state.parts,
      snapSettings: state.snapSettings,
    }))
  );
  const includeSnapDebug = snapSettings?.debug;
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
    const sceneData = generateSceneData(selectedParts, includeSnapDebug ?? false);
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

          {/* Snap debug indicator */}
          {includeSnapDebug && lastSnapV3Debug && (
            <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400 rounded-md p-2 text-center">
              <strong>Debug V3:</strong> Dane OBB i faces zostaną dołączone do eksportu
              {lastSnapV3Debug.selectedCandidate && (
                <div className="mt-1">
                  Snap: {lastSnapV3Debug.selectedCandidate.type} → {lastSnapV3Debug.selectedCandidate.targetPartId}
                </div>
              )}
            </div>
          )}
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
export async function copySceneToClipboard(
  parts: Part[],
  includeSnapDebug = false
): Promise<boolean> {
  const sceneData = generateSceneData(parts, includeSnapDebug);
  const jsonString = JSON.stringify(sceneData, null, 2);

  try {
    await navigator.clipboard.writeText(jsonString);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}
