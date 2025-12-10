'use client';

/**
 * Main 3D scene component using React Three Fiber
 * Renders the furniture parts in 3D space with controls and lighting
 */

import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { useSelectedFurnitureParts, useStore } from '@/lib/store';
import { Part3D } from './Part3D';
import { Button } from '@meble/ui';
import { Camera, Move, RotateCw } from 'lucide-react';
import { KeyboardShortcutsHelp } from '@/components/ui/KeyboardShortcutsHelp';
import { useKeyboardShortcuts } from '@/lib/useKeyboardShortcuts';
import { SCENE_CONFIG, KEYBOARD_SHORTCUTS } from '@/lib/config';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';

export function Scene() {
  const parts = useSelectedFurnitureParts();
  const isTransforming = useStore((state) => state.isTransforming);
  const transformMode = useStore((state) => state.transformMode);
  const setTransformMode = useStore((state) => state.setTransformMode);
  const controlsRef = useRef<OrbitControlsType>(null);

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onTranslateMode: () => setTransformMode('translate'),
    onRotateMode: () => setTransformMode('rotate'),
    onResetCamera: handleResetCamera,
  });

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
            title={`Przesuwanie (${KEYBOARD_SHORTCUTS.TRANSLATE_MODE.toUpperCase()})`}
          >
            <Move className="h-4 w-4" />
          </Button>
          <Button
            variant={transformMode === 'rotate' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTransformMode('rotate')}
            className="h-8 px-2"
            title={`Obrót (${KEYBOARD_SHORTCUTS.ROTATE_MODE.toUpperCase()})`}
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
          title={`Reset widoku (${KEYBOARD_SHORTCUTS.RESET_CAMERA.toUpperCase()})`}
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
      </Canvas>
    </div>
  );
}
