"use client";

import { useMemo, useEffect } from "react";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import { Room, WallSegment, Opening } from "@/types";
import { DoubleSide } from "three";
import { Opening3D } from "./Opening3D";
import { useSceneTheme } from "@/hooks/useSceneTheme";

// Helper to create shape for a wall segment with holes for openings
function createWallShape(wall: WallSegment, openings: Opening[], wallHeight: number): THREE.Shape {
  const length = Math.sqrt(
    Math.pow(wall.end[0] - wall.start[0], 2) + Math.pow(wall.end[1] - wall.start[1], 2)
  );

  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(length, 0);
  shape.lineTo(length, wallHeight);
  shape.lineTo(0, wallHeight);
  shape.lineTo(0, 0);

  // Add holes for openings
  const wallOpenings = openings.filter((o) => o.wallId === wall.id);
  wallOpenings.forEach((opening) => {
    const hole = new THREE.Path();
    const x = opening.offsetFromStartMm;
    const y = opening.sillHeightMm;
    const w = opening.widthMm;
    const h = opening.heightMm;

    // Create hole path (counter-clockwise for holes usually, but THREE.Shape handles it)
    hole.moveTo(x, y);
    hole.lineTo(x + w, y);
    hole.lineTo(x + w, y + h);
    hole.lineTo(x, y + h);
    hole.lineTo(x, y);

    shape.holes.push(hole);
  });

  return shape;
}

function Wall3D({ wall, room, openings }: { wall: WallSegment; room: Room; openings: Opening[] }) {
  const { sceneTheme } = useSceneTheme();

  // Subscribe to occlusion state - selector returns boolean for this specific wall
  const isOccluding = useStore(
    (state) => state.wallOcclusionEnabled && state.occludingWallIds.has(wall.id)
  );

  const shape = useMemo(() => {
    const height = wall.heightMm || room.heightMm;
    return createWallShape(wall, openings, height);
  }, [wall, room.heightMm, openings]);

  const geometry = useMemo(() => {
    const thickness = wall.thicknessMm || room.wallThicknessMm;
    // Extrude depth is along Z axis. Shape is in XY plane.
    return new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: false,
    });
  }, [shape, wall.thicknessMm, room.wallThicknessMm]);

  // CRITICAL: Dispose geometry on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  const { position, rotation } = useMemo(() => {
    const dx = wall.end[0] - wall.start[0];
    const dz = wall.end[1] - wall.start[1];
    const angle = Math.atan2(dz, dx);

    // In Three.js:
    // +X is right, +Z is towards viewer (South).
    // Rotation around Y:
    // 0 = +X
    // -90deg (-PI/2) = +Z
    // 90deg (PI/2) = -Z

    // Math.atan2(dz, dx) gives angle from +X (0) towards +Z (positive angle if Z>0? No, standard math Y is up)
    // In 2D map: X is Right, Z is Down (usually in screen coords) or Up?
    // In 3D World: X is Right, Z is Front.
    // Let's assume standard XZ plane.
    // If wall is (0,0)->(0,10) (Along Z axis). dx=0, dz=10. atan2(10,0) = PI/2.
    // We want object X axis to point along Z.
    // Object starts with X axis along World X.
    // We need to rotate it to point to World Z.
    // Rotation Y -PI/2 rotates +X to +Z.
    // So if angle is PI/2, we need rotation -PI/2.
    // So rotation = -angle.

    return {
      position: [wall.start[0], 0, wall.start[1]] as [number, number, number],
      rotation: [0, -angle, 0] as [number, number, number],
    };
  }, [wall]);

  const thickness = wall.thicknessMm || room.wallThicknessMm;

  return (
    <group position={position} rotation={rotation}>
      {/* Wall Mesh */}
      {/* Offset Z by -thickness/2 to center the wall on the line */}
      <mesh geometry={geometry} position={[0, 0, -thickness / 2]} castShadow receiveShadow>
        <meshStandardMaterial
          color={sceneTheme.WALL_COLOR}
          side={DoubleSide}
          transparent={isOccluding}
          opacity={isOccluding ? 0.2 : 1}
        />
      </mesh>

      {openings
        .filter((o) => o.wallId === wall.id)
        .map((opening) => (
          <Opening3D key={opening.id} opening={opening} wallThickness={thickness} />
        ))}
    </group>
  );
}

export function Room3D() {
  const { rooms, walls, openings } = useStore(
    useShallow((state) => ({
      rooms: state.rooms,
      walls: state.walls,
      openings: state.openings,
    }))
  );

  return (
    <group>
      {rooms.map((room) => (
        <group key={room.id} position={[room.origin[0], 0, room.origin[1]]}>
          {walls
            .filter((w) => w.roomId === room.id)
            .map((wall) => (
              <Wall3D key={wall.id} wall={wall} room={room} openings={openings} />
            ))}
        </group>
      ))}
    </group>
  );
}
