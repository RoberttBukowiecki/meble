import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Label,
  Badge,
} from '@meble/ui';
import { track, AnalyticsEvent } from '@meble/analytics';
import { useStore } from '@/lib/store';
import {
  AVAILABLE_COLUMNS,
  generateCSV,
  downloadCSV,
  DEFAULT_COLUMNS,
} from '@/lib/csv';
import JSZip from 'jszip';
import {
  generateAllPartsDXF,
  countDXFParts,
  type DXFExportResult,
} from '@/lib/export/dxf';
import type { Part, Material, Furniture } from '@/types';
import { generatePartsHash } from '@/lib/projectHash';
import { Download, CreditCard, Sparkles, Clock, Loader2, ShoppingCart } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';
import { useGuestCredits } from '@/hooks/useGuestCredits';
import { CreditsPurchaseModal } from './CreditsPurchaseModal';
import { useAuth } from '@/providers/AuthProvider';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportDialog({
  open,
  onOpenChange,
}: ExportDialogProps) {
  const { user, isAuthenticated } = useAuth();
  const userEmail = user?.email;
  const t = useTranslations('ExportDialog');
  const { parts, materials, furnitures } = useStore();
  const [selectedColumnIds, setSelectedColumnIds] = useState<string[]>(
    DEFAULT_COLUMNS.map((c) => c.id)
  );
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [exportingFormat, setExportingFormat] = useState<'csv' | 'dxf' | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  // Credits hooks - use based on auth status
  const userCredits = useCredits(isAuthenticated);
  const guestCredits = useGuestCredits();

  // Determine which credits to use
  const credits = isAuthenticated ? userCredits : guestCredits;
  const availableCredits = credits.balance?.availableCredits ?? 0;
  const hasUnlimited = isAuthenticated && userCredits.balance?.hasUnlimited;
  const hasCredits = hasUnlimited || availableCredits > 0;

  // Check if user has ever had credits (for Smart Export eligibility)
  // Guest: check if balance exists, Auth: check if balance exists
  const hasEverHadCredits = credits.balance !== null;

  // Generate project hash for Smart Export
  const projectHash = useMemo(() => {
    if (parts.length === 0) return null;
    return generatePartsHash(parts);
  }, [parts]);

  const dxfPartsCount = useMemo(() => countDXFParts(parts), [parts]);

  // Track when export dialog opens
  useEffect(() => {
    if (open && parts.length > 0) {
      track(AnalyticsEvent.EXPORT_INITIATED, {
        parts_count: parts.length,
        cabinet_count: furnitures.length,
      });
    }
  }, [open, parts.length, furnitures.length]);

  const toggleColumn = (id: string) => {
    setSelectedColumnIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const selectedColumns = useMemo(() => {
    // Maintain the order defined in AVAILABLE_COLUMNS
    return AVAILABLE_COLUMNS.filter((c) => selectedColumnIds.includes(c.id));
  }, [selectedColumnIds]);

  const previewData = useMemo(() => {
    return parts.slice(0, 5);
  }, [parts]);

  const csvPreviewContent = useMemo(() => {
    return generateCSV(parts, materials, furnitures, selectedColumns);
  }, [parts, materials, furnitures, selectedColumns]);

  const handleExport = async (format: 'csv' | 'dxf') => {
    if (!projectHash) return;

    if (format === 'dxf' && dxfPartsCount === 0) {
      setExportStatus('error');
      setExportMessage(t('dxfMissing'));
      track(AnalyticsEvent.EXPORT_VALIDATION_FAILED, {
        error_count: 1,
        error_types: ['no_dxf_parts'],
      });
      return;
    }

    // If never had credits, show purchase modal
    // (Smart Export requires at least one previous purchase)
    if (!hasEverHadCredits) {
      track(AnalyticsEvent.PURCHASE_MODAL_OPENED, { trigger: 'export' });
      setShowPurchaseModal(true);
      return;
    }

    setExportStatus('processing');
    setExportingFormat(format);
    setExportMessage(null);

    try {
      // Use credit (handles Smart Export automatically)
      const result = await credits.useCredit(projectHash);

      if (!result) {
        // Credit use failed - show purchase modal if no credits
        setExportStatus('idle');
        setExportingFormat(null);

        // Check if it's an insufficient credits error
        if (credits.error?.includes('credit') || credits.error?.includes('kredyt') || !hasCredits) {
          track(AnalyticsEvent.PURCHASE_MODAL_OPENED, { trigger: 'export_no_credits' });
          setShowPurchaseModal(true);
        } else {
          setExportStatus('error');
          setExportMessage(credits.error || 'Nie udało się użyć kredytu');
          track(AnalyticsEvent.EXPORT_VALIDATION_FAILED, {
            error_count: 1,
            error_types: ['credit_error'],
          });
        }
        return;
      }

      const timestamp = new Date().toISOString().split('T')[0];

      if (format === 'csv') {
        const csv = generateCSV(parts, materials, furnitures, selectedColumns);
        downloadCSV(csv, `e-meble_export_${timestamp}.csv`);
      } else {
        const dxfFiles = generateAllPartsDXF(parts);

        if (dxfFiles.length === 0) {
          setExportStatus('error');
          setExportMessage(t('dxfMissing'));
          setExportingFormat(null);
          track(AnalyticsEvent.EXPORT_VALIDATION_FAILED, {
            error_count: 1,
            error_types: ['no_dxf_parts'],
          });
          return;
        }

        const zip = new JSZip();
        dxfFiles.forEach((file) => {
          zip.file(file.filename, file.content);
        });

        const manifest = buildDXFManifest(parts, materials, furnitures, dxfFiles);
        zip.file('manifest.json', JSON.stringify(manifest, null, 2));

        const blob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(blob, `e-meble_export_${timestamp}.zip`);
      }

      // Track successful export
      track(AnalyticsEvent.EXPORT_COMPLETED, {
        parts_count: parts.length,
        used_credit: !result.isFreeReexport,
        export_format: format,
      });

      // Track Smart Export usage
      if (result.isFreeReexport) {
        track(AnalyticsEvent.SMART_EXPORT_USED, { parts_count: parts.length });
      }

      setExportStatus('success');
      setExportMessage(
        result.isFreeReexport
          ? 'Darmowy re-export (Smart Export aktywny)'
          : `Eksport ${format.toUpperCase()} ukończony. Pozostało kredytów: ${result.creditsRemaining}`
      );
      setExportingFormat(null);

      // Close dialog after short delay on success
      setTimeout(() => {
        onOpenChange(false);
        setExportStatus('idle');
        setExportMessage(null);
        setExportingFormat(null);
      }, 1500);
    } catch (error) {
      setExportStatus('error');
      setExportMessage('Wystąpił błąd podczas eksportu');
      setExportingFormat(null);
      track(AnalyticsEvent.EXPORT_VALIDATION_FAILED, {
        error_count: 1,
        error_types: ['unknown_error'],
      });
    }
  };

  const handleBuyCredits = () => {
    setShowPurchaseModal(true);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[calc(100vw-2rem)] md:max-w-4xl max-h-[85vh] md:max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 py-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">{t('title')}</DialogTitle>
              <DialogDescription>{t('description')}</DialogDescription>
            </div>
            {/* Credits Badge */}
            <div className="flex items-center gap-2">
              {hasUnlimited ? (
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  Pro
                </Badge>
              ) : (
                <Badge
                  variant={hasCredits ? 'secondary' : 'destructive'}
                  className="gap-1 cursor-pointer"
                  onClick={handleBuyCredits}
                >
                  <CreditCard className="h-3 w-3" />
                  {availableCredits} kredyt{availableCredits === 1 ? '' : availableCredits < 5 ? 'y' : 'ów'}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">{t('selectColumns')}</h3>
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 md:gap-3 sm:grid-cols-3 md:grid-cols-4">
              {AVAILABLE_COLUMNS.map((col) => (
                <div key={col.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`col-${col.id}`}
                    checked={selectedColumnIds.includes(col.id)}
                    onChange={() => toggleColumn(col.id)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
                  />
                  <Label
                    htmlFor={`col-${col.id}`}
                    className="cursor-pointer text-sm font-normal"
                  >
                    {t(`columns.${col.label}`)}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">{t('preview')}</h3>
            <div className="rounded-md border overflow-x-auto">
              <Table className="min-w-[500px]">
                <TableHeader>
                  <TableRow>
                    {selectedColumns.map((col) => (
                      <TableHead key={col.id} className="text-xs h-9">
                        {t(`columns.${col.label}`)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((part) => (
                    <TableRow key={part.id}>
                      {selectedColumns.map((col) => (
                        <TableCell key={col.id} className="text-xs py-2">
                          {col.accessor(part, materials, furnitures)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {parts.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={selectedColumns.length}
                        className="h-24 text-center text-sm"
                      >
                        {t('noData')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {parts.length > 5 && (
              <p className="text-xs text-muted-foreground">
                {t('showingFirst', { count: 5, total: parts.length })}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">{t('csvPreview')}</h3>
            <textarea
              readOnly
              value={csvPreviewContent}
              className="h-32 w-full rounded-md border border-input bg-muted/20 px-3 py-2 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono"
              placeholder={t('noData')}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">DXF</h3>
            <p className="text-xs text-muted-foreground">{t('dxfHint')}</p>
            <div
              className={`rounded-md border px-3 py-2 text-xs ${
                dxfPartsCount === 0
                  ? 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200'
                  : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200'
              }`}
            >
              {dxfPartsCount === 0
                ? t('dxfMissing')
                : t('dxfCount', { count: dxfPartsCount })}
            </div>
          </div>
        </div>

        {/* Export Status Message */}
        {exportMessage && (
          <div className={`mx-6 mb-4 p-3 rounded-lg text-sm ${
            exportStatus === 'success'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
              : exportStatus === 'error'
              ? 'bg-destructive/10 text-destructive'
              : 'bg-muted'
          }`}>
            {exportMessage}
          </div>
        )}

        {/* Smart Export Info */}
        {hasCredits && (
          <div className="mx-6 mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-sm flex items-start gap-2">
            <Clock className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium text-blue-700 dark:text-blue-300">Smart Export:</span>
              <span className="text-blue-600 dark:text-blue-400 ml-1">
                Po eksporcie masz 24h na darmowe re-eksporty tego samego projektu.
              </span>
            </div>
          </div>
        )}

        {/* No Credits Warning - but Smart Export might be available */}
        {!hasCredits && hasEverHadCredits && !credits.isLoading && (
          <div className="mx-6 mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-sm flex items-start gap-2">
            <Clock className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium text-blue-700 dark:text-blue-300">0 kredytów.</span>
              <span className="text-blue-600 dark:text-blue-400 ml-1">
                Jeśli eksportowałeś ten projekt w ciągu 24h, re-eksport jest darmowy (Smart Export).
              </span>
            </div>
          </div>
        )}

        {/* Never had credits */}
        {!hasEverHadCredits && !credits.isLoading && (
          <div className="mx-6 mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-sm flex items-start gap-2">
            <CreditCard className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium text-amber-700 dark:text-amber-300">Brak kredytów.</span>
              <span className="text-amber-600 dark:text-amber-400 ml-1">
                Aby eksportować projekt, musisz kupić kredyty.
              </span>
            </div>
          </div>
        )}

        <DialogFooter className="flex-shrink-0 border-t bg-muted/20 px-4 md:px-6 py-3 md:py-4 flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            {t('cancel')}
          </Button>

          {/* Show export buttons if user has credits OR might have Smart Export available */}
          {(hasCredits || hasEverHadCredits) ? (
            <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2">
              <Button
                variant="secondary"
                onClick={() => handleExport('dxf')}
                disabled={parts.length === 0 || dxfPartsCount === 0 || exportStatus === 'processing'}
                className="w-full sm:w-auto"
              >
                {exportStatus === 'processing' && exportingFormat === 'dxf' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Eksportowanie DXF...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    {t('exportDXF')}
                  </>
                )}
              </Button>
              <Button
                onClick={() => handleExport('csv')}
                disabled={parts.length === 0 || selectedColumns.length === 0 || exportStatus === 'processing'}
                className="w-full sm:w-auto"
              >
                {exportStatus === 'processing' && exportingFormat === 'csv' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Eksportowanie CSV...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    {t('exportCSV')}
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleBuyCredits}
              className="w-full sm:w-auto"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Kup kredyty
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Purchase Modal */}
    <CreditsPurchaseModal
      open={showPurchaseModal}
      onOpenChange={setShowPurchaseModal}
      isAuthenticated={isAuthenticated}
      userEmail={userEmail}
      guestSessionId={guestCredits.sessionId}
      onSuccess={() => {
        credits.refetch();
        setShowPurchaseModal(false);
      }}
    />
    </>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function buildDXFManifest(
  parts: Part[],
  materials: Material[],
  furnitures: Furniture[],
  dxfFiles: DXFExportResult[]
) {
  const materialById = new Map(materials.map((m) => [m.id, m]));
  const furnitureById = new Map(furnitures.map((f) => [f.id, f]));
  const partById = new Map(parts.map((p) => [p.id, p]));

  return {
    generatedAt: new Date().toISOString(),
    totalParts: parts.length,
    dxfFileCount: dxfFiles.length,
    note: 'Rectangular parts do not require DXF. Use the CSV for full part list and cutting details.',
    files: dxfFiles.map((file) => {
      const part = partById.get(file.partId);
      const material = part ? materialById.get(part.materialId) : undefined;
      const furniture = part ? furnitureById.get(part.furnitureId) : undefined;

      return {
        file: file.filename,
        partId: file.partId,
        name: file.partName,
        furniture: furniture?.name ?? null,
        material: material?.name ?? null,
        thicknessMm: part?.depth ?? null,
        dimensionsMm: part ? [part.width, part.height] : null,
        shapeType: part?.shapeType ?? null,
        notes: part?.notes ?? null,
        cabinetRole: part?.cabinetMetadata?.role ?? null,
        drawerIndex: part?.cabinetMetadata?.drawerIndex ?? null,
      };
    }),
  };
}
