'use client';

/**
 * 3D representation of a furniture part
 * Renders parts with different geometries based on shape type
 * Supports multiselect with Cmd/Ctrl+click and Shift+click
 */

import { useRef, useMemo } from 'react';
import { Mesh } from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import { useShallow } from 'zustand/react/shallow';
import { useMaterial, useStore } from '@/lib/store';
import { PART_CONFIG, MATERIAL_CONFIG } from '@/lib/config';
import type { Part } from '@/types';
import { isPartColliding, isGroupColliding, getGroupId } from '@/lib/collisionDetection';
import { Handle3D } from './Handle3D';

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

  // Hide this part when it or its cabinet is being transformed (preview mesh is shown instead)
  const isBeingTransformed =
    transformingPartId === part.id ||
    transformingPartIds.has(part.id) ||
    (transformingCabinetId !== null && part.cabinetMetadata?.cabinetId === transformingCabinetId);

  // Selection states
  const isPartSelected = selectedPartIds.has(part.id);
  const isMultiSelected = isPartSelected && selectedPartIds.size > 1;
  const isCabinetSelected = part.cabinetMetadata?.cabinetId === selectedCabinetId;

  // Check if this part or its group is colliding
  const groupId = getGroupId(part);
  const isColliding = isPartColliding(part.id, collisions) ||
    (groupId ? isGroupColliding(groupId, collisions) : false);

  const color = material?.color || MATERIAL_CONFIG.DEFAULT_MATERIAL_COLOR;

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
      default:
         return <boxGeometry args={[part.width, part.height, part.depth]} />;
    }
  }, [part.shapeType, part.width, part.height, part.depth, part.shapeParams]);

  // Hide this part when it or its cabinet is being transformed (preview mesh is shown instead)
  if (isBeingTransformed) {
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

  // Check if this part is a door with handle metadata
  const isDoor = part.cabinetMetadata?.role === 'DOOR';
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
          emissive={getEmissiveColor()}
          emissiveIntensity={getEmissiveIntensity()}
        />

        {showEdges && (
          <Edges color={getEdgeColor()} />
        )}
      </mesh>

      {/* Render handle for door parts */}
      {isDoor && handleMetadata && (
        <Handle3D handleMetadata={handleMetadata} doorDepth={part.depth} />
      )}
    </group>
  );
}
