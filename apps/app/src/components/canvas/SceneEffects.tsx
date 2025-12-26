"use client";

/**
 * Post-processing effects for the 3D scene
 * Includes SSAO (Screen Space Ambient Occlusion) for better depth perception
 */

import { EffectComposer, SSAO } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import * as THREE from "three";
import { useQualityPreset } from "@/hooks/useQualityPreset";

// Black color for AO (memoized to prevent recreation)
const AO_COLOR = new THREE.Color(0x000000);

export function SceneEffects() {
  const { graphicsSettings } = useStore(
    useShallow((state) => ({
      graphicsSettings: state.graphicsSettings,
    }))
  );

  // Get quality preset for AO settings (centralized hook)
  const qualityPreset = useQualityPreset();

  // Only render effects if AO is enabled
  if (!graphicsSettings?.ambientOcclusion) {
    return null;
  }

  return (
    <EffectComposer enableNormalPass>
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
