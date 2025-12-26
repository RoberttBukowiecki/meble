"use client";

/**
 * Orthographic Camera Controller
 * Provides 2D orthographic view with pan and zoom controls
 */

import { useRef, useEffect, useMemo } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { OrthographicCamera, MapControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrthographicView } from "@/types";
import { ORTHOGRAPHIC_VIEW_CONFIGS, DEFAULT_ORTHO_CAMERA_DISTANCE } from "@/types";
import type { MapControls as MapControlsType } from "three-stdlib";

interface OrthographicCameraControllerProps {
  /** Current orthographic view direction */
  view: OrthographicView;
  /** Zoom level (higher = more zoomed out) */
  zoom: number;
  /** Callback when zoom changes (via scroll) */
  onZoomChange: (zoom: number) => void;
  /** Target point (center of view) */
  target: [number, number, number];
  /** Callback when target changes (via pan) */
  onTargetChange?: (target: [number, number, number]) => void;
  /** Whether transform is in progress (disables controls) */
  isTransforming?: boolean;
}

/**
 * Orthographic camera with pan and zoom controls
 * - No rotation allowed (locked orientation)
 * - Pan: mouse drag / two-finger gesture
 * - Zoom: scroll wheel / pinch gesture
 */
export function OrthographicCameraController({
  view,
  zoom,
  onZoomChange,
  target,
  onTargetChange,
  isTransforming = false,
}: OrthographicCameraControllerProps) {
  const cameraRef = useRef<THREE.OrthographicCamera>(null);
  const controlsRef = useRef<MapControlsType>(null);
  const { size } = useThree();

  // Get view configuration
  const viewConfig = ORTHOGRAPHIC_VIEW_CONFIGS[view];

  // Calculate camera position based on view direction and target
  const cameraPosition = useMemo((): [number, number, number] => {
    const [dx, dy, dz] = viewConfig.direction;
    const [tx, ty, tz] = target;
    return [
      tx + dx * DEFAULT_ORTHO_CAMERA_DISTANCE,
      ty + dy * DEFAULT_ORTHO_CAMERA_DISTANCE,
      tz + dz * DEFAULT_ORTHO_CAMERA_DISTANCE,
    ];
  }, [viewConfig.direction, target]);

  // Calculate frustum size based on viewport and zoom
  const frustumSize = useMemo(() => {
    // Base size - adjust for reasonable default view
    const baseSize = 2000;
    return baseSize * zoom;
  }, [zoom]);

  // Calculate aspect-corrected frustum bounds
  const frustumBounds = useMemo(() => {
    const aspect = size.width / size.height;
    const halfHeight = frustumSize / 2;
    const halfWidth = halfHeight * aspect;
    return {
      left: -halfWidth,
      right: halfWidth,
      top: halfHeight,
      bottom: -halfHeight,
    };
  }, [frustumSize, size.width, size.height]);

  // Update camera when view changes
  useEffect(() => {
    if (cameraRef.current && controlsRef.current) {
      const camera = cameraRef.current;
      const controls = controlsRef.current;

      // Set camera position
      camera.position.set(...cameraPosition);

      // Set camera up vector
      camera.up.set(...viewConfig.up);

      // Update controls target
      controls.target.set(...target);

      // Look at target
      camera.lookAt(...target);

      // Update controls
      controls.update();
    }
  }, [view, cameraPosition, viewConfig.up, target]);

  // Update frustum when size or zoom changes
  useEffect(() => {
    if (cameraRef.current) {
      const camera = cameraRef.current;
      camera.left = frustumBounds.left;
      camera.right = frustumBounds.right;
      camera.top = frustumBounds.top;
      camera.bottom = frustumBounds.bottom;
      camera.updateProjectionMatrix();
    }
  }, [frustumBounds]);

  // Handle zoom changes from controls
  useFrame(() => {
    if (cameraRef.current && controlsRef.current) {
      // MapControls changes camera.zoom, we need to sync it
      const currentZoom = cameraRef.current.zoom;
      // Convert camera.zoom to our zoom scale (inverse relationship)
      // When camera.zoom increases, we want our zoom to decrease (more zoomed in)
      const newZoom = 1 / currentZoom;

      // Only update if significantly different (avoid infinite loops)
      if (Math.abs(newZoom - zoom) > 0.01) {
        onZoomChange(newZoom);
      }

      // Sync target if changed via panning
      if (onTargetChange) {
        const controlsTarget = controlsRef.current.target;
        const [tx, ty, tz] = target;
        if (
          Math.abs(controlsTarget.x - tx) > 1 ||
          Math.abs(controlsTarget.y - ty) > 1 ||
          Math.abs(controlsTarget.z - tz) > 1
        ) {
          onTargetChange([controlsTarget.x, controlsTarget.y, controlsTarget.z]);
        }
      }
    }
  });

  return (
    <>
      <OrthographicCamera
        ref={cameraRef}
        makeDefault
        position={cameraPosition}
        zoom={1 / zoom}
        left={frustumBounds.left}
        right={frustumBounds.right}
        top={frustumBounds.top}
        bottom={frustumBounds.bottom}
        near={0.1}
        far={DEFAULT_ORTHO_CAMERA_DISTANCE * 2 + 10000}
        up={viewConfig.up}
      />
      <MapControls
        ref={controlsRef}
        makeDefault
        // Enable panning and zooming
        enablePan={!isTransforming}
        enableZoom={!isTransforming}
        // Disable rotation (this is 2D view)
        enableRotate={false}
        // Smooth controls
        dampingFactor={0.1}
        enableDamping
        // Zoom settings
        minZoom={0.1}
        maxZoom={10}
        zoomSpeed={1.2}
        // Pan settings
        panSpeed={1}
        screenSpacePanning={true}
        // Target
        target={new THREE.Vector3(...target)}
      />
    </>
  );
}
