'use client';

/**
 * 3D representation of a furniture part
 * Renders parts with different geometries based on shape type
 * Supports multiselect with Cmd/Ctrl+click and Shift+click
 */

import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { Mesh } from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import { useShallow } from 'zustand/react/shallow';
import { useMaterial, useStore, useIsPartHidden } from '@/lib/store';
import { useMaterialTexture } from '@/hooks';
import { PART_CONFIG, MATERIAL_CONFIG } from '@/lib/config';
import type { Part, ShapeParamsLShape, ShapeParamsTrapezoid, ShapeParamsPolygon } from '@/types';
import { isPartColliding, isGroupColliding, getGroupId } from '@/lib/collisionDetection';
import { Handle3D } from './Handle3D';

// ============================================================================
// GEOMETRY CREATION FUNCTIONS
// ============================================================================

/**
 * Create L-shape geometry from ShapeParamsLShape
 */
function createLShapeGeometry(params: ShapeParamsLShape, depth: number): THREE.BufferGeometry {
  const { x, y, cutX, cutY } = params;

  // Create 2D shape (centered)
  const shape = new THREE.Shape();
  shape.moveTo(-x / 2, -y / 2);           // Start at bottom-left
  shape.lineTo(x / 2, -y / 2);            // Bottom edge
  shape.lineTo(x / 2, y / 2 - cutY);      // Right edge (partial)
  shape.lineTo(x / 2 - cutX, y / 2 - cutY); // Inner horizontal
  shape.lineTo(x / 2 - cutX, y / 2);      // Inner vertical
  shape.lineTo(-x / 2, y / 2);            // Top edge
  shape.closePath();

  // Extrude to 3D
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: depth,
    bevelEnabled: false,
  });

  // Center the geometry (ExtrudeGeometry extrudes along +Z)
  geometry.translate(0, 0, -depth / 2);

  return geometry;
}

/**
 * Create trapezoid geometry from ShapeParamsTrapezoid
 */
function createTrapezoidGeometry(params: ShapeParamsTrapezoid, depth: number): THREE.BufferGeometry {
  const { frontX, backX, y, skosSide } = params;

  const shape = new THREE.Shape();
  const halfY = y / 2;

  if (skosSide === 'left') {
    const diff = backX - frontX;
    shape.moveTo(-frontX / 2 + diff / 2, -halfY);
    shape.lineTo(frontX / 2 + diff / 2, -halfY);
    shape.lineTo(backX / 2, halfY);
    shape.lineTo(-backX / 2, halfY);
  } else {
    const diff = backX - frontX;
    shape.moveTo(-frontX / 2 - diff / 2, -halfY);
    shape.lineTo(frontX / 2 - diff / 2, -halfY);
    shape.lineTo(backX / 2, halfY);
    shape.lineTo(-backX / 2, halfY);
  }
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: depth,
    bevelEnabled: false,
  });
  geometry.translate(0, 0, -depth / 2);

  return geometry;
}

/**
 * Create polygon geometry from ShapeParamsPolygon
 *
 * IMPORTANT: Points are expected to already be centered around (0,0).
 * We use bounding box center for centering (not vertex centroid) because
 * for shapes with asymmetric vertex distribution (e.g., back panel with
 * cutouts at the top), vertex centroid would incorrectly offset the geometry.
 */
function createPolygonGeometry(params: ShapeParamsPolygon, depth: number): THREE.BufferGeometry {
  const { points } = params;

  // Calculate bounding box center for proper centering
  // This is more accurate than vertex centroid for shapes with asymmetric vertex distribution
  const minX = Math.min(...points.map(p => p[0]));
  const maxX = Math.max(...points.map(p => p[0]));
  const minY = Math.min(...points.map(p => p[1]));
  const maxY = Math.max(...points.map(p => p[1]));
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const shape = new THREE.Shape();
  shape.moveTo(points[0][0] - cx, points[0][1] - cy);
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i][0] - cx, points[i][1] - cy);
  }
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: depth,
    bevelEnabled: false,
  });
  geometry.translate(0, 0, -depth / 2);

  return geometry;
}

interface Part3DProps {
  part: Part;
}

export function Part3D({ part }: Part3DProps) {
  const meshRef = useRef<Mesh>(null);
  const clickTimeRef = useRef<number>(0);

  // PERFORMANCE: Use useShallow to prevent re-renders when unrelated store state changes
  const {
    selectPart,
    selectCabinet,
    togglePartSelection,
    addToSelection,
    removeFromSelection,
    selectRange,
    parts: allParts,
    cabinets,
    selectedPartId,
    selectedPartIds,
    selectedCabinetId,
    multiSelectAnchorId,
    collisions,
    transformingPartId,
    transformingCabinetId,
    transformingPartIds,
  } = useStore(
    useShallow((state) => ({
      selectPart: state.selectPart,
      selectCabinet: state.selectCabinet,
      togglePartSelection: state.togglePartSelection,
      addToSelection: state.addToSelection,
      removeFromSelection: state.removeFromSelection,
      selectRange: state.selectRange,
      parts: state.parts,
      cabinets: state.cabinets,
      selectedPartId: state.selectedPartId,
      selectedPartIds: state.selectedPartIds,
      selectedCabinetId: state.selectedCabinetId,
      multiSelectAnchorId: state.multiSelectAnchorId,
      collisions: state.collisions,
      transformingPartId: state.transformingPartId,
      transformingCabinetId: state.transformingCabinetId,
      transformingPartIds: state.transformingPartIds,
    }))
  );

  const material = useMaterial(part.materialId);
  const { diffuseMap, normalMap, roughness, metalness } = useMaterialTexture(material);

  // PERFORMANCE: Use optimized selector - only re-renders when THIS part's hidden status changes
  const isManuallyHidden = useIsPartHidden(part.id);

  // Hide this part when it or its cabinet is being transformed (preview mesh is shown instead)
  const isBeingTransformed =
    transformingPartId === part.id ||
    transformingPartIds.has(part.id) ||
    (transformingCabinetId !== null && part.cabinetMetadata?.cabinetId === transformingCabinetId);

  // Check if this part should be hidden (front parts when cabinet.hideFronts is true)
  const isFrontPart =
    part.cabinetMetadata?.role === 'DOOR' ||
    part.cabinetMetadata?.role === 'DRAWER_FRONT' ||
    part.cabinetMetadata?.role === 'SIDE_FRONT_LEFT' ||
    part.cabinetMetadata?.role === 'SIDE_FRONT_RIGHT';
  const parentCabinet = part.cabinetMetadata ? cabinets.find(c => c.id === part.cabinetMetadata?.cabinetId) : null;
  const shouldHideFront = isFrontPart && parentCabinet?.hideFronts === true;

  // Selection states
  const isPartSelected = selectedPartIds.has(part.id);
  const isMultiSelected = isPartSelected && selectedPartIds.size > 1;
  const isCabinetSelected = part.cabinetMetadata?.cabinetId === selectedCabinetId;

  // Check if this part or its group is colliding
  const groupId = getGroupId(part);
  const isColliding = isPartColliding(part.id, collisions) ||
    (groupId ? isGroupColliding(groupId, collisions) : false);

  // Determine part color from material
  const color = useMemo(() => {
    return material?.color || MATERIAL_CONFIG.DEFAULT_MATERIAL_COLOR;
  }, [material?.color]);

  // Helper to get all part IDs for a cabinet
  const getCabinetPartIds = (cabinetId: string): string[] => {
    const cabinet = cabinets.find(c => c.id === cabinetId);
    return cabinet ? cabinet.partIds : [];
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();

    const now = Date.now();
    const lastClick = clickTimeRef.current;
    clickTimeRef.current = now;

    const isDoubleClick = now - lastClick < 300;
    const isCmd = e.metaKey || e.ctrlKey;
    const isShift = e.shiftKey;

    if (isDoubleClick) {
      // DOUBLE CLICK: Isolate select (clear others, select only this part)
      selectPart(part.id);
      return;
    }

    // Handle modifier keys immediately (no delay)
    if (isCmd) {
      // CMD/CTRL+CLICK: Toggle part/cabinet in/out of selection
      if (part.cabinetMetadata) {
        // Part belongs to cabinet → toggle ALL cabinet parts
        const cabinetPartIds = getCabinetPartIds(part.cabinetMetadata.cabinetId);
        const anySelected = cabinetPartIds.some(id => selectedPartIds.has(id));

        if (anySelected) {
          // Remove all cabinet parts from selection
          removeFromSelection(cabinetPartIds);
        } else {
          // Add all cabinet parts to selection
          addToSelection(cabinetPartIds);
        }
      } else {
        // Standalone part → toggle single part
        togglePartSelection(part.id);
      }
      return;
    }

    if (isShift && multiSelectAnchorId) {
      // SHIFT+CLICK: Range select from anchor to this part
      // For cabinet parts, we include all parts of the cabinet in the range
      selectRange(multiSelectAnchorId, part.id);
      return;
    }

    // SINGLE CLICK: Wait to confirm it's not a double click
    setTimeout(() => {
      if (Date.now() - clickTimeRef.current >= 300) {
        // Confirmed single click
        if (part.cabinetMetadata) {
          // Part belongs to cabinet → select entire cabinet
          selectCabinet(part.cabinetMetadata.cabinetId);
        } else {
          // Standalone part → select part (clears multiselect)
          selectPart(part.id);
        }
      }
    }, 300);
  };

  const geometry = useMemo(() => {
    switch (part.shapeType) {
      case 'RECT': {
        return <boxGeometry args={[part.width, part.height, part.depth]} />;
      }
      case 'L_SHAPE': {
        const geom = createLShapeGeometry(part.shapeParams as ShapeParamsLShape, part.depth);
        return <primitive object={geom} attach="geometry" />;
      }
      case 'TRAPEZOID': {
        const geom = createTrapezoidGeometry(part.shapeParams as ShapeParamsTrapezoid, part.depth);
        return <primitive object={geom} attach="geometry" />;
      }
      case 'POLYGON': {
        const geom = createPolygonGeometry(part.shapeParams as ShapeParamsPolygon, part.depth);
        return <primitive object={geom} attach="geometry" />;
      }
      default:
        return <boxGeometry args={[part.width, part.height, part.depth]} />;
    }
  }, [part.shapeType, part.width, part.height, part.depth, part.shapeParams]);

  // Hide this part when:
  // - Being transformed (preview mesh is shown instead)
  // - Front parts when cabinet.hideFronts is enabled
  // - Manually hidden via H shortcut
  if (isBeingTransformed || shouldHideFront || isManuallyHidden) {
    return null;
  }

  // Determine visual feedback colors
  const getEmissiveColor = () => {
    if (isColliding) return PART_CONFIG.COLLISION_EMISSIVE_COLOR;
    if (isMultiSelected) return PART_CONFIG.MULTISELECT_EMISSIVE_COLOR;
    if (isPartSelected) return PART_CONFIG.SELECTION_EMISSIVE_COLOR;
    if (isCabinetSelected) return PART_CONFIG.CABINET_SELECTION_EMISSIVE_COLOR;
    return '#000000';
  };

  const getEmissiveIntensity = () => {
    if (isColliding) return PART_CONFIG.COLLISION_EMISSIVE_INTENSITY;
    if (isMultiSelected) return PART_CONFIG.MULTISELECT_EMISSIVE_INTENSITY;
    if (isPartSelected) return PART_CONFIG.SELECTION_EMISSIVE_INTENSITY;
    if (isCabinetSelected) return PART_CONFIG.CABINET_SELECTION_EMISSIVE_INTENSITY;
    return 0;
  };

  const getEdgeColor = () => {
    if (isColliding) return PART_CONFIG.COLLISION_EDGE_COLOR;
    if (isMultiSelected) return PART_CONFIG.MULTISELECT_EDGE_COLOR;
    if (isPartSelected) return PART_CONFIG.SELECTION_EDGE_COLOR;
    return PART_CONFIG.CABINET_SELECTION_EDGE_COLOR;
  };

  const showEdges = isColliding || isPartSelected || isCabinetSelected;

  // Check if this part is a door or drawer front with handle metadata
  const isDoorOrDrawerFront = part.cabinetMetadata?.role === 'DOOR' || part.cabinetMetadata?.role === 'DRAWER_FRONT';
  const handleMetadata = part.cabinetMetadata?.handleMetadata;

  return (
    <group position={part.position} rotation={part.rotation}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        castShadow
        receiveShadow
      >
        {geometry}
        <meshStandardMaterial
          color={color}
          map={diffuseMap}
          normalMap={normalMap}
          roughness={roughness}
          metalness={metalness}
          emissive={getEmissiveColor()}
          emissiveIntensity={getEmissiveIntensity()}
        />

        {showEdges && (
          <Edges color={getEdgeColor()} />
        )}
      </mesh>

      {/* Render handle for door and drawer front parts */}
      {isDoorOrDrawerFront && handleMetadata && (
        <Handle3D handleMetadata={handleMetadata} doorDepth={part.depth} />
      )}
    </group>
  );
}
