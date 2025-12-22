'use client';

/**
 * Post-processing effects for the 3D scene
 * Includes SSAO (Screen Space Ambient Occlusion) for better depth perception
 */

import { EffectComposer, SSAO } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { useStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import { useMemo } from 'react';
import * as THREE from 'three';
import { QUALITY_PRESETS } from '@/lib/config';

interface SceneEffectsProps {
  enabled?: boolean;
}

// Black color for AO (memoized to prevent recreation)
const AO_COLOR = new THREE.Color(0x000000);

export function SceneEffects({ enabled = true }: SceneEffectsProps) {
  const { graphicsSettings } = useStore(
    useShallow((state) => ({
      graphicsSettings: state.graphicsSettings,
    }))
  );

  // Get quality preset for AO settings
  const qualityPreset = useMemo(() => {
    const quality = graphicsSettings?.quality || 'high';
    return QUALITY_PRESETS[quality as keyof typeof QUALITY_PRESETS] || QUALITY_PRESETS.high;
  }, [graphicsSettings?.quality]);

  // Only render effects if AO is enabled
  const aoEnabled = graphicsSettings?.ambientOcclusion && enabled;

  if (!aoEnabled) {
    return null;
  }

  return (
    <EffectComposer>
      <SSAO
        blendFunction={BlendFunction.MULTIPLY}
        samples={qualityPreset.aoSamples}
        radius={qualityPreset.aoRadius}
        intensity={qualityPreset.aoIntensity}
        luminanceInfluence={0.6}
        color={AO_COLOR}
        worldDistanceThreshold={1000}
        worldDistanceFalloff={100}
        worldProximityThreshold={10}
        worldProximityFalloff={5}
      />
    </EffectComposer>
  );
}
