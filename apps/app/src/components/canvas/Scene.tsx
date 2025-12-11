'use client';

/**
 * Main 3D scene component using React Three Fiber
 * Renders the furniture parts in 3D space with controls and lighting
 */

import { useRef, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { useSelectedFurnitureParts, useStore, useSelectedPart } from '@/lib/store';
import { Part3D } from './Part3D';
import { Button } from '@meble/ui';
import { Camera, Move, RotateCw } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { KeyboardShortcutsHelp } from '@/components/ui/KeyboardShortcutsHelp';
import { CollisionWarning } from '@/components/ui/CollisionWarning';
import { SCENE_CONFIG, KEYBOARD_SHORTCUTS, formatShortcutLabel } from '@/lib/config';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';
import { CabinetGroupTransform } from './CabinetGroupTransform';
import { PartTransformControls } from './PartTransformControls';

export function Scene() {
  const parts = useSelectedFurnitureParts();
  const selectedPart = useSelectedPart();
  const {
    isTransforming,
    transformMode,
    setTransformMode,
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
  } = useStore(
      useShallow((state) => ({
        isTransforming: state.isTransforming,
        transformMode: state.transformMode,
        setTransformMode: state.setTransformMode,
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
      }))
    );
  const controlsRef = useRef<OrbitControlsType>(null);

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const handleDelete = () => {
    // If cabinet is selected, delete entire cabinet
    if (selectedCabinetId) {
      if (window.confirm('Usunąć całą szafkę i wszystkie jej części?')) {
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
    if (selectedPartId || selectedCabinetId) {
      selectPart(null);
      selectCabinet(null);
    }
  }, [selectedPartId, selectedCabinetId, selectPart, selectCabinet]);

  // Listen for camera reset custom event from GlobalKeyboardListener
  useEffect(() => {
    const handleCameraReset = () => {
      if (controlsRef.current) {
        controlsRef.current.reset();
      }
    };

    window.addEventListener('keyboard:resetCamera', handleCameraReset);
    return () => window.removeEventListener('keyboard:resetCamera', handleCameraReset);
  }, []);

  return (
    <div className="relative h-full w-full">
      {/* Top-right controls */}
      <div className="absolute right-4 top-4 z-10 flex gap-2">
        {/* Transform Mode Toggle */}
        <div className="flex gap-1 rounded-md bg-background/80 p-1 backdrop-blur-sm">
          <Button
            variant={transformMode === 'translate' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTransformMode('translate')}
            className="h-8 px-2"
            title={`Przesuwanie (${formatShortcutLabel(KEYBOARD_SHORTCUTS.TRANSLATE_MODE)})`}
          >
            <Move className="h-4 w-4" />
          </Button>
          <Button
            variant={transformMode === 'rotate' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTransformMode('rotate')}
            className="h-8 px-2"
            title={`Obrót (${formatShortcutLabel(KEYBOARD_SHORTCUTS.ROTATE_MODE)})`}
          >
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Camera Reset Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleResetCamera}
          className="bg-background/80 backdrop-blur-sm"
          title={`Reset widoku (${formatShortcutLabel(KEYBOARD_SHORTCUTS.RESET_CAMERA)})`}
        >
          <Camera className="mr-2 h-4 w-4" />
          Reset widoku
        </Button>

        {/* Keyboard Shortcuts Help */}
        <KeyboardShortcutsHelp />
      </div>

      <Canvas
        camera={{
          position: SCENE_CONFIG.CAMERA_INITIAL_POSITION,
          fov: SCENE_CONFIG.CAMERA_FOV,
          near: 0.1,
          far: 100000,
        }}
        shadows
        onPointerMissed={handlePointerMissed}
      >
        {/* Controls */}
        <OrbitControls
          ref={controlsRef}
          makeDefault
          dampingFactor={0.05}
          enableDamping
          enabled={!isTransforming}
        />

        {/* Lighting */}
        <ambientLight intensity={SCENE_CONFIG.AMBIENT_LIGHT_INTENSITY} />
        <directionalLight
          position={[300, 400, 200]}
          intensity={SCENE_CONFIG.DIRECTIONAL_LIGHT_INTENSITY}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />

        {/* Grid */}
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
        />

        {parts.map((part) => (
          <Part3D key={part.id} part={part} />
        ))}

        {/* Transform controls for cabinet groups */}
        {selectedCabinetId && <CabinetGroupTransform cabinetId={selectedCabinetId} />}

        {/* Transform controls for individual parts (not in a cabinet or cabinet not selected) */}
        {selectedPart && !selectedCabinetId && (
          <PartTransformControls
            part={selectedPart}
            mode={transformMode}
            onTransformStart={() => setIsTransforming(true)}
            onTransformEnd={handlePartTransformEnd}
          />
        )}
      </Canvas>

      {/* Collision warning overlay */}
      <CollisionWarning />
    </div>
  );
}
