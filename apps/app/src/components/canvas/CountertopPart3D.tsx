"use client";

/**
 * 3D representation of a countertop segment
 * Renders countertops positioned on top of kitchen cabinets
 * - Follows cabinet position and rotation
 * - Overhangs rotate with cabinet
 * - Click to select cabinet, double-click to select countertop group
 */

import { useMemo, useRef } from "react";
import { Edges } from "@react-three/drei";
import { useShallow } from "zustand/react/shallow";
import * as THREE from "three";
import { Euler, Quaternion, Vector3, Shape, ExtrudeGeometry } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import { useStore, useMaterial } from "@/lib/store";
import { useMaterialTexture } from "@/hooks";
import { MATERIAL_CONFIG } from "@/lib/config";
import type { CountertopGroup, CountertopSegment, CncOperation } from "@/types/countertop";
import type { KitchenCabinetParams } from "@/types";
import { getCabinetBounds } from "@/lib/domain/countertop/helpers";
import { CabinetTransformDomain } from "@/lib/domain";

// ============================================================================
// Geometry Helpers
// ============================================================================

/**
 * Creates a rounded rectangle path for a cutout
 */
function createRoundedRectPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): THREE.Path {
  const path = new THREE.Path();
  const r = Math.min(radius, width / 2, height / 2);

  path.moveTo(x + r, y);
  path.lineTo(x + width - r, y);
  path.quadraticCurveTo(x + width, y, x + width, y + r);
  path.lineTo(x + width, y + height - r);
  path.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  path.lineTo(x + r, y + height);
  path.quadraticCurveTo(x, y + height, x, y + height - r);
  path.lineTo(x, y + r);
  path.quadraticCurveTo(x, y, x + r, y);

  return path;
}

/**
 * Creates a countertop shape with cutouts
 */
function createCountertopShape(width: number, depth: number, cutouts: CncOperation[]): THREE.Shape {
  // Main countertop shape (centered at origin)
  const shape = new THREE.Shape();
  const halfW = width / 2;
  const halfD = depth / 2;

  shape.moveTo(-halfW, -halfD);
  shape.lineTo(halfW, -halfD);
  shape.lineTo(halfW, halfD);
  shape.lineTo(-halfW, halfD);
  shape.closePath();

  // Add cutout holes
  // NOTE: The ExtrudeGeometry is rotated -90° around X axis, which inverts Y axis.
  // In Shape coords: Y+ = "up" in 2D
  // After rotation: original Y+ becomes Z- (towards camera = front)
  // Therefore, cutout.position.y (distance from front edge) must be inverted
  // to get correct Shape Y coordinate.
  for (const cutout of cutouts) {
    if (
      cutout.type === "RECTANGULAR_CUTOUT" &&
      cutout.dimensions.width &&
      cutout.dimensions.height
    ) {
      const cutW = cutout.dimensions.width;
      const cutH = cutout.dimensions.height;
      const radius = cutout.dimensions.radius ?? 10;

      // Cutout position is from left-front corner, convert to centered coordinates
      // X axis: position.x from left edge -> shapeX = position.x - halfW (correct)
      // Y axis: position.y from front edge -> after rotation, front = shapeY+, so:
      //         shapeY = halfD - position.y (inverted!)
      // Bottom-left corner of cutout rectangle:
      const cutX = cutout.position.x - halfW - cutW / 2;
      const cutY = halfD - cutout.position.y - cutH / 2;

      const holePath = createRoundedRectPath(cutX, cutY, cutW, cutH, radius);
      shape.holes.push(holePath);
    } else if (cutout.type === "CIRCULAR_HOLE" && cutout.dimensions.diameter) {
      const r = cutout.dimensions.diameter / 2;
      // Same logic: X is correct, Y must be inverted
      const cx = cutout.position.x - halfW;
      const cy = halfD - cutout.position.y;

      const holePath = new THREE.Path();
      holePath.absarc(cx, cy, r, 0, Math.PI * 2, true);
      shape.holes.push(holePath);
    }
  }

  return shape;
}

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
  const { position, rotation, dimensions } = useMemo(() => {
    if (segmentCabinets.length === 0) {
      return {
        position: [0, 0, 0] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
        dimensions: { width: 100, height: materialThickness, depth: 100 },
      };
    }

    // Get cabinet rotation from first cabinet
    const firstCabinet = segmentCabinets[0];
    const cabinetRotation = firstCabinet.worldTransform?.rotation || [0, 0, 0];
    const rotationQuat = new Quaternion().setFromEuler(
      new Euler(cabinetRotation[0], cabinetRotation[1], cabinetRotation[2])
    );

    // Calculate LOCAL dimensions from cabinet params (rotation-invariant!)
    // Sum widths for all cabinets, use max depth
    let totalLocalWidth = 0;
    let maxLocalDepth = 0;
    for (const cabinet of segmentCabinets) {
      const params = cabinet.params as KitchenCabinetParams;
      totalLocalWidth += params.width;
      maxLocalDepth = Math.max(maxLocalDepth, params.depth);
    }

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

    // Use LOCAL dimensions for countertop size (don't change with rotation!)
    const countertopWidth = totalLocalWidth + segment.overhang.left + segment.overhang.right;
    const countertopDepth = maxLocalDepth + segment.overhang.front + segment.overhang.back;

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
        width: countertopWidth, // LOCAL X axis dimension (rotation-invariant)
        height: materialThickness, // Y axis - use material thickness
        depth: countertopDepth, // LOCAL Z axis dimension (rotation-invariant)
      },
    };
  }, [segment, segmentCabinets, parts, materialThickness]); // parts dependency ensures updates when cabinet moves

  // Create geometry with cutouts
  const geometry = useMemo(() => {
    const hasCutouts = segment.cncOperations.length > 0;

    if (!hasCutouts) {
      // No cutouts - use simple box geometry
      return new THREE.BoxGeometry(dimensions.width, dimensions.height, dimensions.depth);
    }

    // Create extruded shape with cutouts
    const shape = createCountertopShape(dimensions.width, dimensions.depth, segment.cncOperations);

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: dimensions.height,
      bevelEnabled: false,
    };

    const extrudeGeom = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    // Rotate geometry so extrusion is along Y axis (up) instead of Z
    // After rotation, extrusion goes from Y=0 upward to Y=height
    extrudeGeom.rotateX(-Math.PI / 2);
    // Center vertically to match BoxGeometry (which is centered at origin: -height/2 to +height/2)
    // Must translate DOWN by height/2 so geometry goes from -height/2 to +height/2
    extrudeGeom.translate(0, -dimensions.height / 2, 0);

    return extrudeGeom;
  }, [dimensions, segment.cncOperations]);

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
