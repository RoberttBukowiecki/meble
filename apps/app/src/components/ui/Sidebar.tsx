import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useShallow } from 'zustand/react/shallow';
import { useStore, useSelectedPart, useSelectedCabinet } from '@/lib/store';
import { Button } from '@meble/ui';
import { Plus, Download, Settings, List, Package, House, Database, Copy, Check } from 'lucide-react';
import { useIsAdmin } from '@/hooks';
import { APP_NAME } from '@meble/constants';
import { PropertiesPanel } from './PropertiesPanel';
import { PartsTable } from './PartsTable';
import { RoomPanel } from './RoomPanel';
import { validateParts } from '@/lib/csv';
import { CabinetTemplateDialog } from './CabinetTemplateDialog';
import { HistoryButtons } from './HistoryButtons';
import { SettingsDropdown } from './SettingsDropdown';
import { ExportDialog } from './ExportDialog';
import { CopySceneDialog, copySceneToClipboard } from './CopySceneDialog';
import { UserMenu } from '@/components/auth';
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
  const { isAdmin } = useIsAdmin();
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('properties');
  const [cabinetDialogOpen, setCabinetDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [justCopied, setJustCopied] = useState(false);

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

  const handleExportSceneData = () => {
    // Export minimal scene data for admin analysis
    const sceneData = {
      exportedAt: new Date().toISOString(),
      partsCount: parts.length,
      parts: parts.map((part) => ({
        id: part.id,
        name: part.name,
        // Dimensions (BOX)
        width: part.width,
        height: part.height,
        depth: part.depth,
        // Position in 3D space
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
      })),
    };

    const blob = new Blob([JSON.stringify(sceneData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scene-data_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyScene = async () => {
    // If more than 2 parts, open dialog for selection
    if (parts.length > 2) {
      setCopyDialogOpen(true);
      return;
    }

    // For 2 or fewer parts, copy directly to clipboard
    const success = await copySceneToClipboard(parts);
    if (success) {
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 2000);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-foreground whitespace-nowrap">
            {APP_NAME}
          </h2>
          <div className="flex items-center gap-1">
            <HistoryButtons />
            <SettingsDropdown />
            <UserMenu />
          </div>
        </div>

        <div className="space-y-2">
          <Button onClick={handleAddPart} variant="outline" className="w-full h-11 md:h-8" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t('addPart')}
          </Button>

          <Button
            onClick={() => setCabinetDialogOpen(true)}
            variant="outline"
            className="w-full h-11 md:h-8"
            size="sm"
          >
            <Package className="h-4 w-4 mr-2" />
            {t('addCabinet')}
          </Button>

          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="w-full h-11 md:h-8"
            size="sm"
            disabled={parts.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            {t('exportCSV')}
          </Button>

          {/* Admin-only: Export scene data */}
          {isAdmin && (
            <Button
              onClick={handleExportSceneData}
              variant="outline"
              className="w-full h-11 md:h-8 border-dashed border-amber-500 text-amber-600 hover:bg-amber-50"
              size="sm"
              disabled={parts.length === 0}
            >
              <Database className="h-4 w-4 mr-2" />
              Export Scene (Admin)
            </Button>
          )}

          {/* Admin-only: Copy scene data */}
          {isAdmin && (
            <Button
              onClick={handleCopyScene}
              variant="outline"
              className="w-full h-11 md:h-8 border-dashed border-amber-500 text-amber-600 hover:bg-amber-50"
              size="sm"
              disabled={parts.length === 0}
            >
              {justCopied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Skopiowano!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Scene (Admin)
                </>
              )}
            </Button>
          )}
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

      {/* Export Dialog */}
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
      />

      {/* Copy Scene Dialog (Admin) */}
      <CopySceneDialog
        open={copyDialogOpen}
        onOpenChange={setCopyDialogOpen}
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
