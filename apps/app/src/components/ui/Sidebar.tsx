import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useShallow } from 'zustand/react/shallow';
import { useStore, useSelectedPart, useSelectedCabinet } from '@/lib/store';
import { Button } from '@meble/ui';
import { Plus, Download, Settings, List, Package, House } from 'lucide-react';
import { APP_NAME } from '@meble/constants';
import { PropertiesPanel } from './PropertiesPanel';
import { PartsTable } from './PartsTable';
import { RoomPanel } from './RoomPanel';
import { validateParts } from '@/lib/csv';
import { CabinetTemplateDialog } from './CabinetTemplateDialog';
import { HistoryButtons } from './HistoryButtons';
import { SettingsDropdown } from './SettingsDropdown';
import { ExportDialog } from './ExportDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@meble/ui';

type TabType = 'properties' | 'list' | 'room';

export function Sidebar() {
  const t = useTranslations('Sidebar');
  const tRoom = useTranslations('RoomPanel');
  // PERFORMANCE: Use useShallow to prevent re-renders during 3D transforms
  const { selectedFurnitureId, addPart, parts, materials, furnitures, featureFlags } = useStore(
    useShallow((state) => ({
      selectedFurnitureId: state.selectedFurnitureId,
      addPart: state.addPart,
      parts: state.parts,
      materials: state.materials,
      furnitures: state.furnitures,
      featureFlags: state.featureFlags,
    }))
  );
  const selectedPart = useSelectedPart();
  const selectedCabinet = useSelectedCabinet();
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('properties');
  const [cabinetDialogOpen, setCabinetDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

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

    setExportDialogOpen(true);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            {APP_NAME}
          </h2>
          <div className="flex items-center gap-1">
            <HistoryButtons />
            <SettingsDropdown />
          </div>
        </div>

        <div className="space-y-2">
          <Button onClick={handleAddPart} variant="outline" className="w-full h-10 md:h-8" size="sm">
            <Plus className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">{t('addPart')}</span>
            <span className="md:hidden ml-2">{t('addPart')}</span>
          </Button>

          <Button
            onClick={() => setCabinetDialogOpen(true)}
            variant="outline"
            className="w-full h-10 md:h-8"
            size="sm"
          >
            <Package className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">{t('addCabinet')}</span>
            <span className="md:hidden ml-2">{t('addCabinet')}</span>
          </Button>

          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="w-full h-10 md:h-8"
            size="sm"
            disabled={parts.length === 0}
          >
            <Download className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">{t('exportCSV')}</span>
            <span className="md:hidden ml-2">{t('exportCSV')}</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('properties')}
          className={`flex flex-1 items-center justify-center gap-1 md:gap-2 px-2 md:px-4 py-3 md:py-3 text-xs md:text-sm font-medium transition-colors ${
            activeTab === 'properties'
              ? 'border-b-2 border-primary bg-muted text-foreground'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          }`}
        >
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">{t('propertiesTab')}</span>
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`flex flex-1 items-center justify-center gap-1 md:gap-2 px-2 md:px-4 py-3 md:py-3 text-xs md:text-sm font-medium transition-colors ${
            activeTab === 'list'
              ? 'border-b-2 border-primary bg-muted text-foreground'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          }`}
        >
          <List className="h-4 w-4" />
          <span className="hidden sm:inline">{t('listTabWithCount', { count: parts.length })}</span>
          <span className="sm:hidden">({parts.length})</span>
        </button>
        {!featureFlags.HIDE_ROOMS_TAB && (
          <button
            onClick={() => setActiveTab('room')}
            className={`flex flex-1 items-center justify-center gap-1 md:gap-2 px-2 md:px-4 py-3 md:py-3 text-xs md:text-sm font-medium transition-colors ${
              activeTab === 'room'
                ? 'border-b-2 border-primary bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
          >
            <House className="h-4 w-4" />
            <span className="hidden sm:inline">{tRoom('roomTab')}</span>
          </button>
        )}
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
        ) : activeTab === 'list' ? (
          <div className="p-4">
            <PartsTable />
          </div>
        ) : (
          <RoomPanel />
        )}
      </div>

      {/* Cabinet template dialog */}
      <CabinetTemplateDialog
        open={cabinetDialogOpen}
        onOpenChange={setCabinetDialogOpen}
        furnitureId={selectedFurnitureId}
      />

      {/* Export CSV Dialog */}
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
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
