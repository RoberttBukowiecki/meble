"use client";

/**
 * Main 3D scene component using React Three Fiber
 * Renders the furniture parts in 3D space with controls and lighting
 */

import { useRef, useCallback } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Grid, SoftShadows } from "@react-three/drei";
import {
  useSelectedFurnitureParts,
  useStore,
  useSelectedPart,
  useIsMultiSelectActive,
} from "@/lib/store";
import { Part3D } from "./Part3D";
import { Room3D } from "./Room3D";
import { RoomLighting } from "./RoomLighting";
import { FloorCeiling3D } from "./FloorCeiling3D";
import { CabinetLegs } from "./Leg3D";
import { CabinetTransformDomain } from "@/lib/domain";
import { Button } from "@meble/ui";
import { Camera, Move, RotateCw, Maximize2, PanelRight, Globe, Box } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { KeyboardShortcutsHelp } from "@/components/ui/KeyboardShortcutsHelp";
import { CollisionWarning } from "@/components/ui/CollisionWarning";
import { SCENE_CONFIG, KEYBOARD_SHORTCUTS, formatShortcutLabel } from "@/lib/config";
import { useQualityPreset } from "@/hooks/useQualityPreset";
import { CabinetGroupTransform } from "./CabinetGroupTransform";
import { CabinetResizeControls } from "./CabinetResizeControls";
import { PartTransformControls } from "./PartTransformControls";
import { PartResizeControls } from "./PartResizeControls";
import { MultiSelectTransformControls } from "./MultiSelectTransformControls";
import { MultiSelectResizeControls } from "./MultiSelectResizeControls";
import { CountertopPart3D } from "./CountertopPart3D";
import { SnapGuidesRenderer } from "./SnapGuidesRenderer";
import { SnapDebugRenderer } from "./SnapDebugRenderer";
import { DimensionRenderer } from "./DimensionRenderer";
import { SnapProvider } from "@/lib/snap-context";
import { DimensionProvider } from "@/lib/dimension-context";
import { SnapControlPanel } from "@/components/layout/SnapControlPanel";
import { GraphicsSettingsPanel } from "@/components/layout/GraphicsSettingsPanel";
import { DimensionControlPanel } from "@/components/layout/DimensionControlPanel";
import { SceneEffects } from "./SceneEffects";
import { ObjectDimensionControlPanel } from "@/components/layout/ObjectDimensionControlPanel";
import { ObjectDimensionRenderer } from "./ObjectDimensionRenderer";
import { OrthographicCameraController } from "./OrthographicCameraController";
import { PerspectiveCameraController } from "./PerspectiveCameraController";
import { ViewModePanel } from "./ViewModePanel";
import { ORTHOGRAPHIC_VIEW_CONFIGS } from "@/types";

interface SceneProps {
  onOpenMobileSidebar?: () => void;
  isMobile?: boolean;
}

export function Scene({ onOpenMobileSidebar, isMobile }: SceneProps) {
  const parts = useSelectedFurnitureParts();
  const selectedPart = useSelectedPart();
  const isMultiSelect = useIsMultiSelectActive();
  const {
    isTransforming,
    transformMode,
    setTransformMode,
    transformSpace,
    setTransformSpace,
    selectedCabinetId,
    selectedPartId,
    removePart,
    removeCabinet,
    duplicatePart,
    duplicateCabinet,
    updatePart,
    setIsTransforming,
    selectPart,
    selectCabinet,
    clearSelection,
    snapEnabled,
    snapSettings,
    dimensionSettings,
    objectDimensionSettings,
    showGrid,
    graphicsSettings,
    rooms,
    cabinets,
    countertopGroups,
    selectedFurnitureId,
    transformingCabinetId,
    // View state
    cameraMode,
    orthographicView,
    orthographicZoom,
    orthographicTarget,
    setOrthographicZoom,
    setOrthographicTarget,
  } = useStore(
    useShallow((state) => ({
      isTransforming: state.isTransforming,
      transformMode: state.transformMode,
      setTransformMode: state.setTransformMode,
      transformSpace: state.transformSpace,
      setTransformSpace: state.setTransformSpace,
      selectedCabinetId: state.selectedCabinetId,
      selectedPartId: state.selectedPartId,
      removePart: state.removePart,
      removeCabinet: state.removeCabinet,
      duplicatePart: state.duplicatePart,
      duplicateCabinet: state.duplicateCabinet,
      updatePart: state.updatePart,
      setIsTransforming: state.setIsTransforming,
      selectPart: state.selectPart,
      selectCabinet: state.selectCabinet,
      clearSelection: state.clearSelection,
      snapEnabled: state.snapEnabled,
      snapSettings: state.snapSettings,
      dimensionSettings: state.dimensionSettings,
      objectDimensionSettings: state.objectDimensionSettings,
      showGrid: state.showGrid,
      graphicsSettings: state.graphicsSettings,
      rooms: state.rooms,
      cabinets: state.cabinets,
      countertopGroups: state.countertopGroups,
      selectedFurnitureId: state.selectedFurnitureId,
      transformingCabinetId: state.transformingCabinetId,
      // View state
      cameraMode: state.cameraMode,
      orthographicView: state.orthographicView,
      orthographicZoom: state.orthographicZoom,
      orthographicTarget: state.orthographicTarget,
      setOrthographicZoom: state.setOrthographicZoom,
      setOrthographicTarget: state.setOrthographicTarget,
    }))
  );

  const isPerspective = cameraMode === "perspective";
  const resetCameraRef = useRef<(() => void) | null>(null);

  // Get quality preset based on current graphics settings (centralized hook)
  const qualityPreset = useQualityPreset();

  const handleResetCamera = () => {
    if (resetCameraRef.current) {
      resetCameraRef.current();
    }
  };

  // Store reset function from PerspectiveCameraController
  const handleResetRef = useCallback((resetFn: () => void) => {
    resetCameraRef.current = resetFn;
  }, []);

  const handleDelete = () => {
    // If cabinet is selected, delete entire cabinet
    if (selectedCabinetId) {
      if (window.confirm("Usunąć całą szafkę i wszystkie jej części?")) {
        removeCabinet(selectedCabinetId);
      }
    }
    // Otherwise, if part is selected, delete just that part
    else if (selectedPartId) {
      removePart(selectedPartId);
    }
  };

  const handleDuplicate = () => {
    // If cabinet is selected, duplicate entire cabinet
    if (selectedCabinetId) {
      duplicateCabinet(selectedCabinetId);
    }
    // Otherwise, if part is selected, duplicate just that part
    else if (selectedPartId) {
      duplicatePart(selectedPartId);
    }
  };

  // Handle part transform end - this will be called by PartTransformControls
  // We don't need to do anything here because the transform is already applied to the part
  const handlePartTransformEnd = useCallback(() => {
    setIsTransforming(false);
  }, [setIsTransforming]);

  const handlePointerMissed = useCallback(() => {
    if (selectedPartId || selectedCabinetId || isMultiSelect) {
      clearSelection();
    }
  }, [selectedPartId, selectedCabinetId, isMultiSelect, clearSelection]);

  return (
    <div className="relative h-full w-full touch-none select-none">
      {/* Top-right controls */}
      <div className="absolute right-2 top-2 md:right-4 md:top-4 z-10 flex flex-wrap gap-1 md:gap-2 max-w-[calc(100%-1rem)] touch-auto select-auto">
        {/* Transform Mode Toggle */}
        <div className="flex gap-1 rounded-md bg-background/80 p-1 backdrop-blur-sm">
          <Button
            variant={transformMode === "translate" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTransformMode("translate")}
            className="h-11 w-11 md:h-8 md:w-auto md:px-2 p-0"
            title={`Przesuwanie (${formatShortcutLabel(KEYBOARD_SHORTCUTS.TRANSLATE_MODE)})`}
          >
            <Move className="h-5 w-5 md:h-4 md:w-4" />
          </Button>
          <Button
            variant={transformMode === "rotate" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTransformMode("rotate")}
            className="h-11 w-11 md:h-8 md:w-auto md:px-2 p-0"
            title={`Obrót (${formatShortcutLabel(KEYBOARD_SHORTCUTS.ROTATE_MODE)})`}
          >
            <RotateCw className="h-5 w-5 md:h-4 md:w-4" />
          </Button>
          <Button
            variant={transformMode === "resize" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTransformMode("resize")}
            className="h-11 w-11 md:h-8 md:w-auto md:px-2 p-0"
            title={`Zmień rozmiar (${formatShortcutLabel(KEYBOARD_SHORTCUTS.RESIZE_MODE)})`}
          >
            <Maximize2 className="h-5 w-5 md:h-4 md:w-4" />
          </Button>
          {/* Separator */}
          <div className="w-px bg-border mx-0.5" />
          {/* Transform Space Toggle (only for translate mode, rotate/resize always use local) */}
          <Button
            variant={
              transformMode === "translate" && transformSpace === "world" ? "default" : "ghost"
            }
            size="sm"
            onClick={() => setTransformSpace("world")}
            className="h-11 w-11 md:h-8 md:w-auto md:px-2 p-0"
            title="Globalne osie (L)"
            disabled={transformMode !== "translate"}
          >
            <Globe className="h-5 w-5 md:h-4 md:w-4" />
          </Button>
          <Button
            variant={
              transformMode !== "translate" || transformSpace === "local" ? "default" : "ghost"
            }
            size="sm"
            onClick={() => setTransformSpace("local")}
            className="h-11 w-11 md:h-8 md:w-auto md:px-2 p-0"
            title="Lokalne osie (L)"
            disabled={transformMode !== "translate"}
          >
            <Box className="h-5 w-5 md:h-4 md:w-4" />
          </Button>
        </div>

        {/* Snap Control Panel */}
        <SnapControlPanel />

        {/* Distance Dimensions (during drag) */}
        <DimensionControlPanel />

        {/* Object Dimensions (W/H/D) */}
        <ObjectDimensionControlPanel />

        {/* View Mode Panel */}
        <ViewModePanel />

        {/* Graphics Settings - hidden on mobile */}
        <div className="hidden md:block">
          <GraphicsSettingsPanel />
        </div>

        {/* Camera Reset Button */}
        <div className="flex items-center gap-1 rounded-md bg-background/80 p-1 backdrop-blur-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetCamera}
            className="h-11 md:h-8 gap-1 px-2"
            title={`Reset widoku (${formatShortcutLabel(KEYBOARD_SHORTCUTS.RESET_CAMERA)})`}
          >
            <Camera className="h-5 w-5 md:h-4 md:w-4" />
            <span className="hidden md:inline">Reset</span>
          </Button>
        </div>

        {/* Keyboard Shortcuts Help - hidden on mobile */}
        <div className="hidden md:block">
          <KeyboardShortcutsHelp />
        </div>

        {/* Mobile Sidebar Toggle */}
        {isMobile && onOpenMobileSidebar && (
          <div className="flex items-center gap-1 rounded-md bg-background/80 p-1 backdrop-blur-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenMobileSidebar}
              className="h-11 w-11 md:h-8 md:w-8 p-0"
              title="Panel właściwości"
            >
              <PanelRight className="h-5 w-5 md:h-4 md:w-4" />
            </Button>
          </div>
        )}
      </div>

      <DimensionProvider>
        <SnapProvider>
          <Canvas shadows dpr={[1, qualityPreset.pixelRatio]} onPointerMissed={handlePointerMissed}>
            {/* Camera and Controls - conditional based on view mode */}
            {isPerspective ? (
              <PerspectiveCameraController
                isTransforming={isTransforming}
                onResetRef={handleResetRef}
              />
            ) : (
              <OrthographicCameraController
                view={orthographicView}
                zoom={orthographicZoom}
                onZoomChange={setOrthographicZoom}
                target={orthographicTarget}
                onTargetChange={setOrthographicTarget}
                isTransforming={isTransforming}
              />
            )}

            {graphicsSettings?.shadows && (
              <SoftShadows
                size={qualityPreset.softShadowSize}
                samples={qualityPreset.softShadowSamples}
                focus={0.5}
              />
            )}

            {/* Lighting */}
            <RoomLighting />

            <directionalLight
              position={[300, 400, 200]}
              intensity={SCENE_CONFIG.DIRECTIONAL_LIGHT_INTENSITY}
              castShadow
              shadow-mapSize-width={qualityPreset.shadowMapSize}
              shadow-mapSize-height={qualityPreset.shadowMapSize}
              shadow-camera-far={5000}
              shadow-camera-left={-2000}
              shadow-camera-right={2000}
              shadow-camera-top={2000}
              shadow-camera-bottom={-2000}
            />

            {/* Grid - rotates based on orthographic view */}
            {showGrid && (
              <Grid
                args={[SCENE_CONFIG.GRID_SIZE, SCENE_CONFIG.GRID_SIZE]}
                cellSize={SCENE_CONFIG.GRID_CELL_SIZE}
                cellThickness={0.5}
                cellColor="#6b7280"
                sectionSize={500}
                sectionThickness={1}
                sectionColor="#374151"
                fadeDistance={SCENE_CONFIG.GRID_FADE_DISTANCE}
                followCamera={false}
                infiniteGrid={false}
                rotation={
                  isPerspective
                    ? [0, 0, 0]
                    : orthographicView === "FRONT" || orthographicView === "BACK"
                      ? [-Math.PI / 2, 0, 0] // XY plane
                      : orthographicView === "LEFT" || orthographicView === "RIGHT"
                        ? [0, 0, Math.PI / 2] // YZ plane
                        : [0, 0, 0] // XZ plane (TOP/BOTTOM)
                }
              />
            )}

            {/* Room Structure */}
            <Room3D />
            {rooms.map((room) => (
              <FloorCeiling3D key={room.id} roomId={room.id} />
            ))}

            {parts.map((part) => (
              <Part3D key={part.id} part={part} />
            ))}

            {/* Cabinet legs (rendered separately, not as Part) */}
            {/* Hide legs when cabinet is being transformed (preview shown instead) */}
            {cabinets
              .filter((c) => c.legs && c.legs.length > 0 && c.id !== transformingCabinetId)
              .map((cabinet) => {
                const cabinetParts = parts.filter((p) => cabinet.partIds.includes(p.id));
                if (cabinetParts.length === 0) return null;

                // Use geometric bounds for correct legs positioning at all rotations
                const bounds = CabinetTransformDomain.getCabinetGeometricBounds(cabinetParts);
                const legsAnchor = CabinetTransformDomain.getLegsAnchorPoint(bounds);
                const euler = new THREE.Euler().setFromQuaternion(legsAnchor.rotation, "XYZ");

                return (
                  <group
                    key={`legs-${cabinet.id}`}
                    position={legsAnchor.position}
                    rotation={[euler.x, euler.y, euler.z]}
                  >
                    <CabinetLegs legs={cabinet.legs!} />
                  </group>
                );
              })}

            {/* Countertops for selected furniture */}
            {countertopGroups
              .filter((group) => group.furnitureId === selectedFurnitureId)
              .map((group) => (
                <CountertopPart3D key={group.id} group={group} />
              ))}

            {/* Transform controls for cabinet groups (translate/rotate) */}
            {selectedCabinetId && (transformMode === "translate" || transformMode === "rotate") && (
              <CabinetGroupTransform cabinetId={selectedCabinetId} space={transformSpace} />
            )}

            {/* Resize controls for cabinet groups */}
            {selectedCabinetId && transformMode === "resize" && (
              <CabinetResizeControls
                cabinetId={selectedCabinetId}
                onTransformStart={() => setIsTransforming(true)}
                onTransformEnd={handlePartTransformEnd}
              />
            )}

            {/* Transform controls for multiselect (translate/rotate modes) */}
            {isMultiSelect &&
              !selectedCabinetId &&
              (transformMode === "translate" || transformMode === "rotate") && (
                <MultiSelectTransformControls
                  mode={transformMode}
                  space={transformSpace}
                  onTransformStart={() => setIsTransforming(true)}
                  onTransformEnd={handlePartTransformEnd}
                />
              )}

            {/* Resize controls for multiselect (resize mode) */}
            {isMultiSelect && !selectedCabinetId && transformMode === "resize" && (
              <MultiSelectResizeControls
                onTransformStart={() => setIsTransforming(true)}
                onTransformEnd={handlePartTransformEnd}
              />
            )}

            {/* Transform controls for individual parts (translate/rotate modes) */}
            {selectedPart &&
              !isMultiSelect &&
              !selectedCabinetId &&
              (transformMode === "translate" || transformMode === "rotate") && (
                <PartTransformControls
                  part={selectedPart}
                  mode={transformMode}
                  space={transformSpace}
                  onTransformStart={() => setIsTransforming(true)}
                  onTransformEnd={handlePartTransformEnd}
                />
              )}

            {/* Resize controls for individual parts (resize mode) */}
            {selectedPart && !isMultiSelect && !selectedCabinetId && transformMode === "resize" && (
              <PartResizeControls
                part={selectedPart}
                onTransformStart={() => setIsTransforming(true)}
                onTransformEnd={handlePartTransformEnd}
              />
            )}

            {/* Snap guides (rendered based on snap context) */}
            {snapEnabled && <SnapGuidesRenderer />}

            {/* Snap Debug visualization (OBBs, faces, normals) */}
            {snapEnabled && snapSettings?.debug && <SnapDebugRenderer enabled />}

            {/* Distance dimension lines (rendered during drag) */}
            {dimensionSettings?.enabled && <DimensionRenderer />}

            {/* Object dimension lines (W/H/D of selected/all objects) */}
            {objectDimensionSettings?.enabled && <ObjectDimensionRenderer />}

            {/* Post-processing effects (SSAO for ambient occlusion) */}
            <SceneEffects />
          </Canvas>
        </SnapProvider>
      </DimensionProvider>

      {/* Collision warning overlay */}
      <CollisionWarning />
    </div>
  );
}
