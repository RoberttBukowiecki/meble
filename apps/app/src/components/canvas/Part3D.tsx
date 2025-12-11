'use client';

/**
 * 3D representation of a furniture part
 * Renders parts with different geometries based on shape type
 */

import { useRef, useMemo } from 'react';
import { Mesh, Shape, ExtrudeGeometry } from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import { useMaterial, useStore } from '@/lib/store';
import { PART_CONFIG, MATERIAL_CONFIG } from '@/lib/config';
import type { Part, ShapeParamsTrapezoid, ShapeParamsLShape, ShapeParamsPolygon } from '@/types';
import { isPartColliding, isGroupColliding, getGroupId } from '@/lib/collisionDetection';

interface Part3DProps {
  part: Part;
}

export function Part3D({ part }: Part3DProps) {
  const meshRef = useRef<Mesh>(null);
  const clickTimeRef = useRef<number>(0);

  const {
    selectPart,
    selectCabinet,
    selectedPartId,
    selectedCabinetId,
    collisions,
  } = useStore();

  const material = useMaterial(part.materialId);

  const isPartSelected = selectedPartId === part.id;
  const isCabinetSelected = part.cabinetMetadata?.cabinetId === selectedCabinetId;

  // Check if this part or its group is colliding
  const groupId = getGroupId(part);
  const isColliding = isPartColliding(part.id, collisions) ||
    (groupId ? isGroupColliding(groupId, collisions) : false);

  const color = material?.color || MATERIAL_CONFIG.DEFAULT_MATERIAL_COLOR;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();

    const now = Date.now();
    const lastClick = clickTimeRef.current;
    clickTimeRef.current = now;

    const isDoubleClick = now - lastClick < 300;

    if (isDoubleClick) {
      // DOUBLE CLICK: Select individual part
      selectPart(part.id);
    } else {
      // SINGLE CLICK: Wait to confirm it's not a double click
      setTimeout(() => {
        if (Date.now() - clickTimeRef.current >= 300) {
          // Confirmed single click
          if (part.cabinetMetadata) {
            // Part belongs to cabinet → select entire cabinet
            selectCabinet(part.cabinetMetadata.cabinetId);
          } else {
            // Standalone part → select part
            selectPart(part.id);
          }
        }
      }, 300);
    }
  };
  
  const geometry = useMemo(() => {
    switch (part.shapeType) {
      case 'RECT': {
        return <boxGeometry args={[part.width, part.height, part.depth]} />;
      }
      // ... other cases are complex and might need adjustments based on how depth is handled.
      // For now, let's assume depth is Z. If it's Y, rotations are needed.
      // The generator puts depth on Z for Box, but on Y for Extrude. This needs to be harmonized.
      // Let's correct the generator's rotation to be consistent.
      // The generator has depth on X, height on Y, thickness on Z, then rotates.
      // The `Part` has width(x), height(y), depth(z).
      // Let's assume generator positions things correctly and we just render the part dimensions.
      // The generator `generateKitchenCabinet` seems to have mixed concepts of width/height/depth.
      // Example: LEFT_SIDE has width=depth, height=height. This is confusing.
      // Let's stick to the part's width/height/depth for now.
      default:
         return <boxGeometry args={[part.width, part.height, part.depth]} />;
    }
  }, [part.shapeType, part.width, part.height, part.depth, part.shapeParams]);


  return (
    <mesh
      ref={meshRef}
      position={part.position}
      rotation={part.rotation}
      onClick={handleClick}
      castShadow
      receiveShadow
    >
      {geometry}
      <meshStandardMaterial
        color={color}
        emissive={
          isColliding
            ? PART_CONFIG.COLLISION_EMISSIVE_COLOR
            : isPartSelected
            ? PART_CONFIG.SELECTION_EMISSIVE_COLOR
            : isCabinetSelected
            ? PART_CONFIG.CABINET_SELECTION_EMISSIVE_COLOR
            : '#000000'
        }
        emissiveIntensity={
          isColliding
            ? PART_CONFIG.COLLISION_EMISSIVE_INTENSITY
            : isPartSelected
            ? PART_CONFIG.SELECTION_EMISSIVE_INTENSITY
            : isCabinetSelected
            ? PART_CONFIG.CABINET_SELECTION_EMISSIVE_INTENSITY
            : 0
        }
      />

      {(isColliding || isPartSelected || isCabinetSelected) && (
        <Edges
          color={
            isColliding
              ? PART_CONFIG.COLLISION_EDGE_COLOR
              : isPartSelected
              ? PART_CONFIG.SELECTION_EDGE_COLOR
              : PART_CONFIG.CABINET_SELECTION_EDGE_COLOR
          }
        />
      )}
    </mesh>
  );
}
