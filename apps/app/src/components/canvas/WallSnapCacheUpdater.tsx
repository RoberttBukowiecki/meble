"use client";

/**
 * WallSnapCacheUpdater
 *
 * Watches room/walls state and updates the wall snap cache when they change.
 * This component should be rendered inside the SnapProvider context.
 *
 * The cache is updated automatically when:
 * - Active room changes
 * - Walls are added/removed/modified
 * - Room properties change (wall thickness, height)
 */

import { useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/lib/store";
import { useWallSnapCache } from "@/lib/snap-context";
import { buildWallSnapCache } from "@/lib/wall-snap-geometry";
import type { Room, WallSegment } from "@/types/room";

/**
 * Generate a hash of walls for change detection
 */
function getWallsHash(walls: WallSegment[]): string {
  return walls
    .map((w) => `${w.id}:${w.start.join(",")}-${w.end.join(",")}:${w.thicknessMm}:${w.heightMm}`)
    .join("|");
}

/**
 * Generate a hash of room for change detection
 */
function getRoomHash(room: Room | undefined): string {
  if (!room) return "";
  return `${room.id}:${room.wallThicknessMm}:${room.heightMm}`;
}

/**
 * WallSnapCacheUpdater component
 *
 * Must be rendered inside SnapProvider. Renders nothing but updates cache.
 */
export function WallSnapCacheUpdater() {
  const { wallSnapCacheRef, updateWallSnapCache } = useWallSnapCache();

  // Get room/walls from store
  const { activeRoomId, rooms, walls } = useStore(
    useShallow((state) => ({
      activeRoomId: state.activeRoomId,
      rooms: state.rooms,
      walls: state.walls,
    }))
  );

  // Track previous state for change detection
  const prevStateRef = useRef<{
    roomId: string | null;
    wallsHash: string;
    roomHash: string;
  }>({
    roomId: null,
    wallsHash: "",
    roomHash: "",
  });

  // Update cache when room/walls change
  useEffect(() => {
    const activeRoom = rooms.find((r) => r.id === activeRoomId);
    const roomWalls = walls.filter((w) => w.roomId === activeRoomId);

    const wallsHash = getWallsHash(roomWalls);
    const roomHash = getRoomHash(activeRoom);

    // Check if anything changed
    const prev = prevStateRef.current;
    if (
      prev.roomId === activeRoomId &&
      prev.wallsHash === wallsHash &&
      prev.roomHash === roomHash
    ) {
      return; // No change
    }

    // Update previous state
    prevStateRef.current = {
      roomId: activeRoomId,
      wallsHash,
      roomHash,
    };

    // Build new cache
    const { surfaces, corners } = buildWallSnapCache(activeRoomId, roomWalls, activeRoom ?? null);

    // Update cache
    updateWallSnapCache({
      roomId: activeRoomId,
      surfaces,
      corners,
      version: wallSnapCacheRef.current.version + 1,
    });
  }, [activeRoomId, rooms, walls, updateWallSnapCache, wallSnapCacheRef]);

  // This component renders nothing
  return null;
}

export default WallSnapCacheUpdater;
