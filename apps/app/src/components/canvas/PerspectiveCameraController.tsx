"use client";

/**
 * PerspectiveCameraController
 *
 * Manages the perspective camera with state persistence:
 * - Saves camera position/target before switching to orthographic view
 * - Restores camera position/target when switching back to perspective
 * - Handles camera reset events
 */

import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import { SCENE_CONFIG } from "@/lib/config";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";
import * as THREE from "three";

interface PerspectiveCameraControllerProps {
  isTransforming: boolean;
  onResetRef?: (resetFn: () => void) => void;
}

export function PerspectiveCameraController({
  isTransforming,
  onResetRef,
}: PerspectiveCameraControllerProps) {
  const controlsRef = useRef<OrbitControlsType>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const hasRestoredRef = useRef(false);
  const { camera } = useThree();

  const {
    perspectiveCameraPosition,
    perspectiveCameraTarget,
    savePerspectiveCameraState,
    cameraMode,
  } = useStore(
    useShallow((state) => ({
      perspectiveCameraPosition: state.perspectiveCameraPosition,
      perspectiveCameraTarget: state.perspectiveCameraTarget,
      savePerspectiveCameraState: state.savePerspectiveCameraState,
      cameraMode: state.cameraMode,
    }))
  );

  // Expose reset function to parent
  useEffect(() => {
    if (onResetRef) {
      onResetRef(() => {
        if (controlsRef.current) {
          controlsRef.current.reset();
        }
      });
    }
  }, [onResetRef]);

  // Restore camera position when switching back to perspective
  useEffect(() => {
    if (cameraMode === "perspective" && controlsRef.current && !hasRestoredRef.current) {
      // Set camera position
      camera.position.set(
        perspectiveCameraPosition[0],
        perspectiveCameraPosition[1],
        perspectiveCameraPosition[2]
      );

      // Set orbit controls target
      controlsRef.current.target.set(
        perspectiveCameraTarget[0],
        perspectiveCameraTarget[1],
        perspectiveCameraTarget[2]
      );

      // Update controls
      controlsRef.current.update();
      hasRestoredRef.current = true;
    }
  }, [cameraMode, perspectiveCameraPosition, perspectiveCameraTarget, camera]);

  // Reset the restoration flag when leaving perspective mode
  useEffect(() => {
    if (cameraMode !== "perspective") {
      hasRestoredRef.current = false;
    }
  }, [cameraMode]);

  // Save camera state periodically (when in perspective mode)
  // This ensures we always have the latest position before switching
  useFrame(() => {
    if (cameraMode === "perspective" && controlsRef.current) {
      const pos = camera.position;
      const target = controlsRef.current.target;

      // Only save if there's actual change (avoid unnecessary store updates)
      const currentPos: [number, number, number] = [pos.x, pos.y, pos.z];
      const currentTarget: [number, number, number] = [target.x, target.y, target.z];

      // Check if position changed significantly (more than 1mm)
      const posDiff =
        Math.abs(pos.x - perspectiveCameraPosition[0]) +
        Math.abs(pos.y - perspectiveCameraPosition[1]) +
        Math.abs(pos.z - perspectiveCameraPosition[2]);
      const targetDiff =
        Math.abs(target.x - perspectiveCameraTarget[0]) +
        Math.abs(target.y - perspectiveCameraTarget[1]) +
        Math.abs(target.z - perspectiveCameraTarget[2]);

      if (posDiff > 1 || targetDiff > 1) {
        savePerspectiveCameraState(currentPos, currentTarget);
      }
    }
  });

  // Listen for camera reset event
  useEffect(() => {
    const handleReset = () => {
      if (controlsRef.current) {
        controlsRef.current.reset();
      }
    };

    window.addEventListener("keyboard:resetCamera", handleReset);
    return () => window.removeEventListener("keyboard:resetCamera", handleReset);
  }, []);

  return (
    <>
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        position={perspectiveCameraPosition}
        fov={SCENE_CONFIG.CAMERA_FOV}
        near={0.1}
        far={100000}
      />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        dampingFactor={0.05}
        enableDamping
        enabled={!isTransforming}
      />
    </>
  );
}

export default PerspectiveCameraController;
