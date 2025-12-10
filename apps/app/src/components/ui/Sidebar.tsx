'use client';

/**
 * Sidebar component containing tools and properties panel
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useStore, useSelectedPart, useSelectedCabinet } from '@/lib/store';
import { Button } from '@meble/ui';
import { Plus, Download, Settings, List, Package } from 'lucide-react';
import { APP_NAME } from '@meble/constants';
import { PropertiesPanel } from './PropertiesPanel';
import { PartsTable } from './PartsTable';
import { generateCSV, downloadCSV, validateParts } from '@/lib/csv';
import { CabinetTemplateDialog } from './CabinetTemplateDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@meble/ui';

type TabType = 'properties' | 'list';

export function Sidebar() {
  const t = useTranslations('Sidebar');
  const { selectedFurnitureId, addPart, parts, materials, furnitures } = useStore();
  const selectedPart = useSelectedPart();
  const selectedCabinet = useSelectedCabinet();
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('properties');
  const [cabinetDialogOpen, setCabinetDialogOpen] = useState(false);

  const handleAddPart = () => {
    addPart(selectedFurnitureId);
  };

  const handleExportCSV = () => {
    // Validate parts
    const errors = validateParts(parts, materials);

    if (errors.length > 0) {
      setValidationErrors(errors);
      setShowErrorDialog(true);
      return;
    }

    // Generate and download CSV
    const csv = generateCSV(parts, materials, furnitures);
    const timestamp = new Date().toISOString().split('T')[0];
    downloadCSV(csv, `meblarz_export_${timestamp}.csv`);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border p-4">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          {APP_NAME}
        </h2>

        <div className="space-y-2">
          <Button onClick={handleAddPart} className="w-full" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            {t('addPart')}
          </Button>

          <Button
            onClick={() => setCabinetDialogOpen(true)}
            variant="outline"
            className="w-full"
            size="sm"
          >
            <Package className="mr-2 h-4 w-4" />
            {t('addCabinet')}
          </Button>

          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="w-full"
            size="sm"
            disabled={parts.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            {t('exportCSV')}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('properties')}
          className={`flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'properties'
              ? 'border-b-2 border-primary bg-muted text-foreground'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          }`}
        >
          <Settings className="h-4 w-4" />
          {t('propertiesTab')}
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'list'
              ? 'border-b-2 border-primary bg-muted text-foreground'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          }`}
        >
          <List className="h-4 w-4" />
          {t('listTabWithCount', { count: parts.length })}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'properties' ? (
          selectedPart || selectedCabinet ? (
            <PropertiesPanel />
          ) : (
            <div className="p-4 text-sm text-muted-foreground">
              {t('selectPartToEdit')}
            </div>
          )
        ) : (
          <div className="p-4">
            <PartsTable />
          </div>
        )}
      </div>

      {/* Cabinet template dialog */}
      <CabinetTemplateDialog
        open={cabinetDialogOpen}
        onOpenChange={setCabinetDialogOpen}
        furnitureId={selectedFurnitureId}
      />

      {/* Validation Error Dialog */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('validationErrors')}</DialogTitle>
            <DialogDescription>
              {t('validationErrorsDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {validationErrors.map((error, index) => (
              <div
                key={index}
                className="rounded-md bg-destructive/10 p-2 text-sm text-destructive"
              >
                {error}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
