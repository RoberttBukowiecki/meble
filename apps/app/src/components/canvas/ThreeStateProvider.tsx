"use client";

/**
 * Component that captures Three.js renderer and scene references
 * and stores them in Zustand for use in thumbnail generation.
 *
 * Must be placed inside a R3F Canvas component.
 */

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { useStore } from "@/lib/store";

export function ThreeStateProvider() {
  const { gl, scene } = useThree();
  const setThreeState = useStore((state) => state.setThreeState);
  const clearThreeState = useStore((state) => state.clearThreeState);

  useEffect(() => {
    // Store references when component mounts
    setThreeState(gl, scene);

    // Clear references when component unmounts
    return () => {
      clearThreeState();
    };
  }, [gl, scene, setThreeState, clearThreeState]);

  // This component doesn't render anything
  return null;
}
