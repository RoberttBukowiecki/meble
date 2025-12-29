"use client";

/**
 * WallOcclusionController
 *
 * Detects which walls should be transparent based on camera position.
 * Uses useFrame with debouncing for performance - only recalculates
 * when camera moves significantly.
 */

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import { isWallOccluding, setsEqual } from "@/lib/wallOcclusionUtils";

// Thresholds for debouncing - only recalculate when camera moves significantly
const POSITION_THRESHOLD = 10; // mm
const ROTATION_THRESHOLD = 0.02; // radians

export function WallOcclusionController() {
  const { camera } = useThree();

  const { wallOcclusionEnabled, setOccludingWallIds, walls, rooms } = useStore(
    useShallow((state) => ({
      wallOcclusionEnabled: state.wallOcclusionEnabled,
      setOccludingWallIds: state.setOccludingWallIds,
      walls: state.walls,
      rooms: state.rooms,
    }))
  );

  // Track previous camera state for debouncing
  const prevCameraPos = useRef(new THREE.Vector3());
  const prevCameraRot = useRef(new THREE.Quaternion());
  const prevOccludingIds = useRef(new Set<string>());

  useFrame(() => {
    // Skip if feature is disabled
    if (!wallOcclusionEnabled) {
      // Clear any remaining occlusion if feature was just disabled
      if (prevOccludingIds.current.size > 0) {
        prevOccludingIds.current = new Set<string>();
        setOccludingWallIds(new Set<string>());
      }
      return;
    }

    // Skip if there are no walls to process
    if (walls.length === 0) {
      if (prevOccludingIds.current.size > 0) {
        prevOccludingIds.current = new Set<string>();
        setOccludingWallIds(new Set<string>());
      }
      return;
    }

    // Check if camera has moved significantly
    const posDiff = camera.position.distanceTo(prevCameraPos.current);
    const rotDiff = camera.quaternion.angleTo(prevCameraRot.current);

    if (posDiff < POSITION_THRESHOLD && rotDiff < ROTATION_THRESHOLD) {
      return; // No significant change, skip calculation
    }

    // Update previous state
    prevCameraPos.current.copy(camera.position);
    prevCameraRot.current.copy(camera.quaternion);

    // Calculate which walls are occluding
    const occludingIds = new Set<string>();

    // Create room lookup map for O(1) access instead of O(n) find in loop
    const roomsById = new Map(rooms.map((r) => [r.id, r]));

    for (const wall of walls) {
      const room = roomsById.get(wall.roomId);
      if (!room) continue;

      const wallHeight = wall.heightMm || room.heightMm;

      if (isWallOccluding(wall, room.origin, wallHeight, camera.position)) {
        occludingIds.add(wall.id);
      }
    }

    // Only update store if the set actually changed
    if (!setsEqual(occludingIds, prevOccludingIds.current)) {
      prevOccludingIds.current = occludingIds;
      setOccludingWallIds(occludingIds);
    }
  });

  return null; // No visual output - this is a logic-only controller
}
