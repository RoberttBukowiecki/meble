'use client';

/**
 * 3D representation of a furniture handle
 * Renders different handle types (bar, knob, strip, etc.)
 */

import { useMemo } from 'react';
import { DoubleSide } from 'three';
import type { HandleMetadata, HandleType, HandleOrientation } from '@/types';

// Handle finish colors (metallic colors)
const FINISH_COLORS: Record<string, string> = {
  chrome: '#C0C0C0',
  brushed_nickel: '#A0A0A0',
  black_matte: '#252525',
  gold: '#D4AF37',
  aluminum: '#B0B0B0',
  stainless: '#C8C8C8',
};

interface Handle3DProps {
  handleMetadata: HandleMetadata;
  doorDepth: number;
}

export function Handle3D({ handleMetadata, doorDepth }: Handle3DProps) {
  const { config, actualPosition } = handleMetadata;
  const { type, dimensions, orientation, finish = 'chrome' } = config;

  const handleColor = FINISH_COLORS[finish] || FINISH_COLORS.chrome;

  // Calculate handle position - handle sits on front of door
  const handleZ = doorDepth / 2 + (dimensions?.height ?? 20) / 2;

  // Render different handle types
  const handleGeometry = useMemo(() => {
    switch (type) {
      case 'BAR':
        return <BarHandle dimensions={dimensions} orientation={orientation} />;
      case 'STRIP':
        return <StripHandle dimensions={dimensions} orientation={orientation} />;
      case 'KNOB':
        return <KnobHandle dimensions={dimensions} />;
      case 'MILLED':
        return <MilledHandle config={config} />;
      case 'EDGE_MOUNTED':
        return <EdgeMountedHandle dimensions={dimensions} orientation={orientation} />;
      case 'GOLA':
        return <GolaHandle dimensions={dimensions} orientation={orientation} />;
      case 'TIP_ON':
      case 'PUSH_LATCH':
        // Handleless - render as small indicator
        return <HandlelessIndicator type={type} />;
      default:
        return null;
    }
  }, [type, dimensions, orientation, config]);

  if (!handleGeometry) return null;

  return (
    <group position={[actualPosition.x, actualPosition.y, handleZ]}>
      <meshStandardMaterial
        color={handleColor}
        metalness={0.8}
        roughness={0.2}
        side={DoubleSide}
        attach="material"
      />
      {handleGeometry}
    </group>
  );
}

// ============================================================================
// Handle Type Components
// ============================================================================

interface BarHandleProps {
  dimensions?: { length: number; height?: number; holeSpacing?: number };
  orientation: HandleOrientation;
}

function BarHandle({ dimensions, orientation }: BarHandleProps) {
  const length = dimensions?.length ?? 128;
  const height = dimensions?.height ?? 35;
  const barRadius = 6; // 12mm diameter bar
  const postRadius = barRadius * 0.6;
  const postHeight = height; // Full height from door surface to bar center

  const isVertical = orientation === 'VERTICAL';

  // Calculate hole spacing for mounting posts
  const holeSpacing = dimensions?.holeSpacing ?? length - 2 * barRadius;
  const postOffset = holeSpacing / 2;

  return (
    <group rotation={isVertical ? [0, 0, Math.PI / 2] : [0, 0, 0]}>
      {/* Main bar - rotated 90° around Z to lie along X axis */}
      <mesh position={[0, 0, height]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[barRadius, barRadius, length, 16]} />
        <meshStandardMaterial color="#C0C0C0" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Left mounting post - rotated 90° around X to point along Z axis */}
      <mesh position={[-postOffset, 0, height / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[postRadius, postRadius, postHeight, 16]} />
        <meshStandardMaterial color="#C0C0C0" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Right mounting post - rotated 90° around X to point along Z axis */}
      <mesh position={[postOffset, 0, height / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[postRadius, postRadius, postHeight, 16]} />
        <meshStandardMaterial color="#C0C0C0" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

interface StripHandleProps {
  dimensions?: { length: number; width?: number; height?: number };
  orientation: HandleOrientation;
}

function StripHandle({ dimensions, orientation }: StripHandleProps) {
  const length = dimensions?.length ?? 200;
  const width = dimensions?.width ?? 20;
  const height = dimensions?.height ?? 25;

  const isVertical = orientation === 'VERTICAL';

  return (
    <mesh rotation={isVertical ? [0, 0, Math.PI / 2] : [0, 0, 0]}>
      <boxGeometry args={[length, width, height]} />
      <meshStandardMaterial color="#A0A0A0" metalness={0.7} roughness={0.3} />
    </mesh>
  );
}

interface KnobHandleProps {
  dimensions?: { diameter?: number; height?: number };
}

function KnobHandle({ dimensions }: KnobHandleProps) {
  const diameter = dimensions?.diameter ?? 32;
  const height = dimensions?.height ?? 30;
  const stemRadius = diameter * 0.15;
  const stemHeight = height - diameter / 2; // Stem from door to bottom of sphere

  return (
    <group>
      {/* Knob sphere - positioned at full height */}
      <mesh position={[0, 0, height]}>
        <sphereGeometry args={[diameter / 2, 16, 16]} />
        <meshStandardMaterial color="#C0C0C0" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Mounting stem - rotated 90° around X to point along Z axis */}
      <mesh position={[0, 0, stemHeight / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[stemRadius, stemRadius, stemHeight, 16]} />
        <meshStandardMaterial color="#C0C0C0" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

interface MilledHandleProps {
  config: HandleMetadata['config'];
}

function MilledHandle({ config }: MilledHandleProps) {
  const milledDepth = config.milledDepth ?? 15;
  const milledWidth = config.milledWidth ?? 40;
  const length = config.dimensions?.length ?? 200;

  // Milled handle is a groove cut into the top edge - visualize as an indent
  return (
    <mesh position={[0, 0, -milledDepth / 2]}>
      <boxGeometry args={[length || 200, milledWidth, milledDepth]} />
      <meshStandardMaterial color="#404040" metalness={0.3} roughness={0.8} />
    </mesh>
  );
}

interface EdgeMountedHandleProps {
  dimensions?: { length: number; height?: number };
  orientation: HandleOrientation;
}

function EdgeMountedHandle({ dimensions, orientation }: EdgeMountedHandleProps) {
  const height = dimensions?.height ?? 20;
  const isVertical = orientation === 'VERTICAL';

  return (
    <mesh rotation={isVertical ? [0, 0, Math.PI / 2] : [0, 0, 0]}>
      <boxGeometry args={[100, 10, height]} />
      <meshStandardMaterial color="#252525" metalness={0.6} roughness={0.4} />
    </mesh>
  );
}

interface GolaHandleProps {
  dimensions?: { length: number; height?: number };
  orientation: HandleOrientation;
}

function GolaHandle({ dimensions, orientation }: GolaHandleProps) {
  const height = dimensions?.height ?? 37;
  const isVertical = orientation === 'VERTICAL';

  // GOLA profile - rendered as an L-shaped profile
  return (
    <mesh rotation={isVertical ? [0, 0, Math.PI / 2] : [0, 0, 0]}>
      <boxGeometry args={[200, 5, height]} />
      <meshStandardMaterial color="#B0B0B0" metalness={0.9} roughness={0.1} />
    </mesh>
  );
}

interface HandlelessIndicatorProps {
  type: 'TIP_ON' | 'PUSH_LATCH';
}

function HandlelessIndicator({ type }: HandlelessIndicatorProps) {
  // Small indicator for handleless systems
  const color = type === 'TIP_ON' ? '#404040' : '#303030';

  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[10, 10, 5, 8]} />
      <meshStandardMaterial color={color} metalness={0.3} roughness={0.7} />
    </mesh>
  );
}
