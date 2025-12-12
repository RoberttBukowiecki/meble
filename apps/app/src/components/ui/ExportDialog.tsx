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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Label,
} from '@meble/ui';
import { useStore } from '@/lib/store';
import {
  AVAILABLE_COLUMNS,
  generateCSV,
  downloadCSV,
  DEFAULT_COLUMNS,
} from '@/lib/csv';
import { Download } from 'lucide-react';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const t = useTranslations('ExportDialog');
  const { parts, materials, furnitures } = useStore();
  const [selectedColumnIds, setSelectedColumnIds] = useState<string[]>(
    DEFAULT_COLUMNS.map((c) => c.id)
  );

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

  const handleExport = () => {
    const csv = generateCSV(parts, materials, furnitures, selectedColumns);
    const timestamp = new Date().toISOString().split('T')[0];
    downloadCSV(csv, `meblarz_export_${timestamp}.csv`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="space-y-4">
            <h3 className="text-sm font-medium">{t('selectColumns')}</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {AVAILABLE_COLUMNS.map((col) => (
                <div key={col.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`col-${col.id}`}
                    checked={selectedColumnIds.includes(col.id)}
                    onChange={() => toggleColumn(col.id)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label
                    htmlFor={`col-${col.id}`}
                    className="cursor-pointer text-sm"
                  >
                    {t(`columns.${col.label}`)}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium">{t('preview')}</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {selectedColumns.map((col) => (
                      <TableHead key={col.id}>
                        {t(`columns.${col.label}`)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((part) => (
                    <TableRow key={part.id}>
                      {selectedColumns.map((col) => (
                        <TableCell key={col.id}>
                          {col.accessor(part, materials, furnitures)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {parts.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={selectedColumns.length}
                        className="h-24 text-center"
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

          <div className="space-y-4">
            <h3 className="text-sm font-medium">{t('csvPreview')}</h3>
            <textarea
              readOnly
              value={csvPreviewContent}
              className="h-48 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono text-xs"
              placeholder={t('noData')}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button
            onClick={handleExport}
            disabled={parts.length === 0 || selectedColumns.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            {t('export')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
