'use client';

/**
 * 3D representation of a furniture part
 * Renders parts with different geometries based on shape type
 */

import { useRef, useMemo } from 'react';
import { Mesh, Shape, ExtrudeGeometry, EdgesGeometry, LineBasicMaterial, LineSegments, BoxGeometry } from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { Edges, TransformControls } from '@react-three/drei';
import { useMaterial, useStore } from '@/lib/store';
import { SCENE_CONFIG, PART_CONFIG, MATERIAL_CONFIG } from '@/lib/config';
import type { Part, ShapeParamsRect, ShapeParamsTrapezoid, ShapeParamsLShape, ShapeParamsPolygon, EdgeBandingRect } from '@/types';

interface Part3DProps {
  part: Part;
}

export function Part3D({ part }: Part3DProps) {
  const meshRef = useRef<Mesh>(null);
  const material = useMaterial(part.materialId);
  const selectedPartId = useStore((state) => state.selectedPartId);
  const selectPart = useStore((state) => state.selectPart);
  const updatePart = useStore((state) => state.updatePart);
  const setIsTransforming = useStore((state) => state.setIsTransforming);
  const transformMode = useStore((state) => state.transformMode);

  const isSelected = selectedPartId === part.id;

  // Get material color or fallback to gray
  const color = material?.color || MATERIAL_CONFIG.DEFAULT_MATERIAL_COLOR;

  // Handle click to select part
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectPart(part.id);
  };

  // Handle transform end - update part position/rotation in store
  const handleTransformEnd = () => {
    if (meshRef.current) {
      if (transformMode === 'translate') {
        const newPosition = meshRef.current.position.toArray() as [
          number,
          number,
          number
        ];
        updatePart(part.id, { position: newPosition });
      } else if (transformMode === 'rotate') {
        const newRotation = meshRef.current.rotation.toArray().slice(0, 3) as [
          number,
          number,
          number
        ];
        updatePart(part.id, { rotation: newRotation });
      }
    }
    setIsTransforming(false);
  };

  // Render geometry based on shape type
  const geometry = useMemo(() => {
    switch (part.shapeType) {
      case 'RECT': {
        // For rectangular parts, use BoxGeometry (fastest)
        return <boxGeometry args={[part.width, part.depth, part.height]} />;
      }

      case 'TRAPEZOID': {
        const params = part.shapeParams as ShapeParamsTrapezoid;
        const shape = new Shape();

        // Create trapezoid in X-Y plane (width x height)
        // Center the shape
        const maxX = Math.max(params.frontX, params.backX);
        const offsetX = maxX / 2;

        if (params.skosSide === 'left') {
          // Skos on left side
          shape.moveTo(-params.frontX / 2, -params.y / 2);
          shape.lineTo(params.frontX / 2, -params.y / 2);
          shape.lineTo(params.backX / 2, params.y / 2);
          shape.lineTo(-params.backX / 2, params.y / 2);
        } else {
          // Skos on right side
          shape.moveTo(-params.backX / 2, -params.y / 2);
          shape.lineTo(params.backX / 2, -params.y / 2);
          shape.lineTo(params.frontX / 2, params.y / 2);
          shape.lineTo(-params.frontX / 2, params.y / 2);
        }
        shape.closePath();

        const extrudeGeometry = new ExtrudeGeometry(shape, {
          depth: part.depth,
          bevelEnabled: false,
        });
        // Rotate 90 degrees to align Z as thickness
        extrudeGeometry.rotateX(Math.PI / 2);
        extrudeGeometry.translate(0, part.depth / 2, 0);

        return <primitive object={extrudeGeometry} attach="geometry" />;
      }

      case 'L_SHAPE': {
        const params = part.shapeParams as ShapeParamsLShape;
        const shape = new Shape();

        // Create L-shape centered
        const halfX = params.x / 2;
        const halfY = params.y / 2;

        shape.moveTo(-halfX, -halfY);
        shape.lineTo(halfX, -halfY);
        shape.lineTo(halfX, halfY - params.cutY);
        shape.lineTo(halfX - params.cutX, halfY - params.cutY);
        shape.lineTo(halfX - params.cutX, halfY);
        shape.lineTo(-halfX, halfY);
        shape.closePath();

        const extrudeGeometry = new ExtrudeGeometry(shape, {
          depth: part.depth,
          bevelEnabled: false,
        });
        extrudeGeometry.rotateX(Math.PI / 2);
        extrudeGeometry.translate(0, part.depth / 2, 0);

        return <primitive object={extrudeGeometry} attach="geometry" />;
      }

      case 'POLYGON': {
        const params = part.shapeParams as ShapeParamsPolygon;
        if (params.points.length < 3) {
          // Fallback to box if invalid polygon
          return <boxGeometry args={[part.width, part.depth, part.height]} />;
        }

        const shape = new Shape();

        // Calculate center
        const xs = params.points.map((p) => p[0]);
        const ys = params.points.map((p) => p[1]);
        const centerX = (Math.max(...xs) + Math.min(...xs)) / 2;
        const centerY = (Math.max(...ys) + Math.min(...ys)) / 2;

        // Create shape centered
        shape.moveTo(params.points[0][0] - centerX, params.points[0][1] - centerY);
        for (let i = 1; i < params.points.length; i++) {
          shape.lineTo(params.points[i][0] - centerX, params.points[i][1] - centerY);
        }
        shape.closePath();

        const extrudeGeometry = new ExtrudeGeometry(shape, {
          depth: part.depth,
          bevelEnabled: false,
        });
        extrudeGeometry.rotateX(Math.PI / 2);
        extrudeGeometry.translate(0, part.depth / 2, 0);

        return <primitive object={extrudeGeometry} attach="geometry" />;
      }

      default:
        return <boxGeometry args={[part.width, part.depth, part.height]} />;
    }
  }, [part.shapeType, part.width, part.height, part.depth, part.shapeParams]);

  return (
    <>
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
          emissive={isSelected ? PART_CONFIG.SELECTION_EMISSIVE_COLOR : '#000000'}
          emissiveIntensity={isSelected ? PART_CONFIG.SELECTION_EMISSIVE_INTENSITY : 0}
        />

        {/* Selection highlight */}
        {isSelected && (
          <Edges
            scale={1.0}
            threshold={15}
            color={PART_CONFIG.SELECTION_EDGE_COLOR}
            lineWidth={PART_CONFIG.SELECTION_EDGE_LINE_WIDTH}
          />
        )}

        {/* Edge visualization for edges without banding (RECT only) */}
        {!isSelected && part.shapeType === 'RECT' && (
          <>
            {/* Show wood-colored edges where there's no edge banding */}
            <Edges
              scale={1.0}
              threshold={15}
              color={MATERIAL_CONFIG.EDGE_COLOR}
              lineWidth={1.5}
            />
          </>
        )}
      </mesh>

      {/* Transform controls for selected part */}
      {isSelected && meshRef.current && (
        <TransformControls
          object={meshRef.current}
          mode={transformMode}
          translationSnap={SCENE_CONFIG.TRANSLATION_SNAP}
          rotationSnap={(Math.PI / 180) * SCENE_CONFIG.ROTATION_SNAP}
          onMouseDown={() => setIsTransforming(true)}
          onMouseUp={handleTransformEnd}
        />
      )}
    </>
  );
}
