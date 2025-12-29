"use client";

import { useTheme } from "next-themes";
import { useMemo } from "react";
import { SCENE_THEME_CONFIG, type SceneTheme } from "@/lib/config";

/**
 * Hook to get theme-aware scene configuration
 * Returns scene colors and lighting settings based on current theme (light/dark)
 */
export function useSceneTheme() {
  const { resolvedTheme } = useTheme();

  const sceneTheme = useMemo(() => {
    const theme: SceneTheme = resolvedTheme === "dark" ? "dark" : "light";
    return SCENE_THEME_CONFIG[theme];
  }, [resolvedTheme]);

  const isDark = resolvedTheme === "dark";

  return { sceneTheme, isDark };
}
