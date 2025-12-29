"use client";

/**
 * 3D representation of a countertop segment
 * Renders countertops positioned on top of kitchen cabinets
 * - Follows cabinet position and rotation
 * - Overhangs rotate with cabinet
 * - Click to select cabinet, double-click to select countertop group
 */

import { useMemo, useRef, useEffect } from "react";
import { Edges } from "@react-three/drei";
import { useShallow } from "zustand/react/shallow";
import * as THREE from "three";
import { Euler, Quaternion, Vector3 } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { useStore, useMaterial } from "@/lib/store";
import { useMaterialTexture } from "@/hooks";
import { MATERIAL_CONFIG } from "@/lib/config";
import type { CountertopGroup, CountertopSegment } from "@/types/countertop";
import { getCabinetBounds } from "@/lib/domain/countertop/helpers";
import { createCountertopGeometry } from "@/lib/countertopGeometry";

// ============================================================================
// Components
// ============================================================================

interface CountertopSegment3DProps {
  segment: CountertopSegment;
  group: CountertopGroup;
  isSelected: boolean;
}

/**
 * Single countertop segment 3D mesh
 */
function CountertopSegment3D({ segment, group, isSelected }: CountertopSegment3DProps) {
  const clickTimeRef = useRef<number>(0);

  const { cabinets, parts, selectCabinet, selectCountertopGroup, transformingCabinetId } = useStore(
    useShallow((state) => ({
      cabinets: state.cabinets,
      parts: state.parts,
      selectCabinet: state.selectCabinet,
      selectCountertopGroup: state.selectCountertopGroup,
      transformingCabinetId: state.transformingCabinetId,
    }))
  );

  const material = useMaterial(group.materialId);
  const { diffuseMap, normalMap, roughness, metalness } = useMaterialTexture(material);

  // Use material thickness (if available) instead of segment default
  const materialThickness = material?.thickness ?? segment.thickness;

  // Check if any cabinet in this segment is being transformed
  const isBeingTransformed =
    transformingCabinetId !== null && segment.cabinetIds.includes(transformingCabinetId);

  // Get cabinets for this segment
  const segmentCabinets = useMemo(
    () => cabinets.filter((c) => segment.cabinetIds.includes(c.id)),
    [cabinets, segment.cabinetIds]
  );

  // Calculate transform based on cabinet positions - reactive to part changes
  // IMPORTANT: Use segment.length and segment.width directly - they include:
  // - Cabinet dimensions
  // - Overhangs
  // - Bridge gaps (if any)
  // These are the "source of truth" from the domain model
  const { position, rotation, dimensions } = useMemo(() => {
    if (segmentCabinets.length === 0) {
      return {
        position: [0, 0, 0] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
        dimensions: { width: segment.length, height: materialThickness, depth: segment.width },
      };
    }

    // Get cabinet rotation from first cabinet
    const firstCabinet = segmentCabinets[0];
    const cabinetRotation = firstCabinet.worldTransform?.rotation || [0, 0, 0];
    const rotationQuat = new Quaternion().setFromEuler(
      new Euler(cabinetRotation[0], cabinetRotation[1], cabinetRotation[2])
    );

    // Use segment dimensions directly (includes overhangs and bridge gaps)
    // segment.length = countertop width (X axis in local space)
    // segment.width = countertop depth (Z axis in local space)
    const countertopWidth = segment.length;
    const countertopDepth = segment.width;

    // Get world bounds for positioning (topY and center)
    let minX = Infinity,
      maxX = -Infinity;
    let minZ = Infinity,
      maxZ = -Infinity;
    let maxY = -Infinity;
    for (const cabinet of segmentCabinets) {
      const bounds = getCabinetBounds(cabinet, parts);
      minX = Math.min(minX, bounds.min[0]);
      maxX = Math.max(maxX, bounds.max[0]);
      minZ = Math.min(minZ, bounds.min[2]);
      maxZ = Math.max(maxZ, bounds.max[2]);
      maxY = Math.max(maxY, bounds.max[1]);
    }

    // Calculate world position from bounds center
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const topY = maxY + materialThickness / 2;

    // Calculate overhang offset in LOCAL space
    // Positive X offset = more overhang on right than left
    // Positive Z offset = more overhang on front than back
    const localOffsetX = (segment.overhang.right - segment.overhang.left) / 2;
    const localOffsetZ = (segment.overhang.front - segment.overhang.back) / 2;

    // Transform offset from local to world space using cabinet rotation
    const localOffset = new Vector3(localOffsetX, 0, localOffsetZ);
    localOffset.applyQuaternion(rotationQuat);

    return {
      position: [centerX + localOffset.x, topY, centerZ + localOffset.z] as [
        number,
        number,
        number,
      ],
      rotation: cabinetRotation as [number, number, number],
      dimensions: {
        width: countertopWidth, // segment.length - includes overhangs and bridge gaps
        height: materialThickness, // Y axis - use material thickness
        depth: countertopDepth, // segment.width - includes overhangs
      },
    };
  }, [segment, segmentCabinets, parts, materialThickness]); // parts dependency ensures updates when cabinet moves

  // Create geometry with cutouts using extracted utility
  const geometry = useMemo(
    () => createCountertopGeometry(dimensions, segment.cncOperations),
    [dimensions, segment.cncOperations]
  );

  // Cleanup geometry on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  const color = material?.color || MATERIAL_CONFIG.DEFAULT_MATERIAL_COLOR;

  // Selection visual feedback
  const emissiveColor = isSelected ? "#4169E1" : "#000000";
  const emissiveIntensity = isSelected ? 0.3 : 0;

  // Handle click - single click selects cabinet, double click selects countertop
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();

    const now = Date.now();
    const lastClick = clickTimeRef.current;
    clickTimeRef.current = now;

    const isDoubleClick = now - lastClick < 300;

    if (isDoubleClick) {
      // Double click: select countertop group
      selectCountertopGroup(group.id);
      return;
    }

    // Single click: select the first cabinet in this segment
    if (segment.cabinetIds.length > 0) {
      selectCabinet(segment.cabinetIds[0]);
    }
  };

  // Hide during transform (preview mesh is shown instead)
  if (isBeingTransformed) {
    return null;
  }

  return (
    <mesh
      position={position}
      rotation={rotation}
      onClick={handleClick}
      castShadow
      receiveShadow
      geometry={geometry}
    >
      <meshStandardMaterial
        color={color}
        map={diffuseMap}
        normalMap={normalMap}
        roughness={roughness}
        metalness={metalness}
        emissive={emissiveColor}
        emissiveIntensity={emissiveIntensity}
      />
      {isSelected && <Edges color="#4169E1" />}
    </mesh>
  );
}

interface CountertopPart3DProps {
  group: CountertopGroup;
}

/**
 * Renders all segments of a countertop group
 */
export function CountertopPart3D({ group }: CountertopPart3DProps) {
  const selectedCountertopGroupId = useStore((state) => state.selectedCountertopGroupId);

  const isGroupSelected = selectedCountertopGroupId === group.id;

  return (
    <group>
      {group.segments.map((segment) => (
        <CountertopSegment3D
          key={segment.id}
          segment={segment}
          group={group}
          isSelected={isGroupSelected}
        />
      ))}
    </group>
  );
}

export default CountertopPart3D;
