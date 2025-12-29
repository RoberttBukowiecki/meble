"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import { DoubleSide } from "three";
import { useSceneTheme } from "@/hooks/useSceneTheme";

interface FloorCeiling3DProps {
  roomId: string;
}

export function FloorCeiling3D({ roomId }: FloorCeiling3DProps) {
  const { sceneTheme } = useSceneTheme();

  // FIX: Select all walls and filter in useMemo to avoid infinite loop in useStore
  const { allWalls, rooms, graphicsSettings } = useStore(
    useShallow((state) => ({
      allWalls: state.walls,
      rooms: state.rooms,
      graphicsSettings: state.graphicsSettings,
    }))
  );

  const walls = useMemo(() => allWalls.filter((w) => w.roomId === roomId), [allWalls, roomId]);
  const room = rooms.find((r) => r.id === roomId);

  const shape = useMemo(() => {
    if (walls.length < 3) return null;

    // Extract all unique points
    const points: { x: number; y: number }[] = [];
    const threshold = 1; // 1mm merge threshold

    walls.forEach((w) => {
      // Add start/end
      [w.start, w.end].forEach((p) => {
        const exists = points.some((ep) => Math.hypot(ep.x - p[0], ep.y - p[1]) < threshold);
        if (!exists) {
          points.push({ x: p[0], y: p[1] });
        }
      });
    });

    if (points.length < 3) return null;

    // Simple Convex Hull?
    // Convex Hull is safe for convex rooms (Rect, L-shape sometimes if points are ordered).
    // But L-shape is concave.
    // We need to order points.

    // Sort by angle from center? Works for star-shaped polygons.
    // Calculate center
    const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
    const cy = points.reduce((s, p) => s + p.y, 0) / points.length;

    const sortedPoints = [...points].sort((a, b) => {
      return Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx);
    });

    // Create Shape
    const s = new THREE.Shape();
    s.moveTo(sortedPoints[0].x, sortedPoints[0].y);
    for (let i = 1; i < sortedPoints.length; i++) {
      s.lineTo(sortedPoints[i].x, sortedPoints[i].y);
    }
    s.closePath();
    return s;
  }, [walls]);

  if (!room || !shape) return null;

  return (
    <group position={[room.origin[0], 0, room.origin[1]]}>
      {/* Floor */}
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, -1, 0]} // Slight offset to avoid Z-fighting
        receiveShadow
      >
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial color={sceneTheme.FLOOR_COLOR} side={THREE.BackSide} />
      </mesh>

      {/* Ceiling */}
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, room.heightMm, 0]}
        castShadow
        receiveShadow
      >
        <shapeGeometry args={[shape]} />
        {/* Render visible ceiling from inside (FrontSide, normal points down). */}
        {/* shadowSide=BackSide so the top (back) casts shadow from sun. */}
        <meshStandardMaterial
          color={sceneTheme.CEILING_COLOR}
          side={THREE.FrontSide}
          shadowSide={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}
