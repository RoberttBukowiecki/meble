import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import { QUALITY_PRESETS } from '@/lib/config';

/**
 * Custom hook for getting the current quality preset based on graphics settings.
 * Centralizes the quality preset selection logic to avoid code duplication.
 */
export function useQualityPreset() {
  const { graphicsSettings } = useStore(
    useShallow((state) => ({
      graphicsSettings: state.graphicsSettings,
    }))
  );

  return useMemo(() => {
    const quality = graphicsSettings?.quality || 'high';
    return QUALITY_PRESETS[quality] || QUALITY_PRESETS.high;
  }, [graphicsSettings?.quality]);
}
