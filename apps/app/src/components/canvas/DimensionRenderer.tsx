'use client';

/**
 * DimensionRenderer Component
 *
 * Renders CAD-style dimension lines during transform operations.
 * Uses useFrame to read from refs for high-performance updates without rerenders.
 *
 * Visual style:
 * - Main line between start and end points
 * - Extension lines perpendicular to main line
 * - Arrow heads at both ends
 * - Distance label centered on line
 */

import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '@/lib/store';
import { useDimensionLinesRef } from '@/lib/dimension-context';
import type { DimensionLine } from '@/types';

// THREE is used for Vector3 in calculations

// ============================================================================
// Constants
// ============================================================================

/** Maximum number of dimension lines to render */
const MAX_DIMENSION_LINES = 9; // 3 per axis × 3 axes

/** Visual configuration */
const CONFIG = {
  // Line styling
  LINE_COLOR: 0x2563eb, // Blue-600
  LINE_WIDTH: 2,

  // Extension line
  EXTENSION_LENGTH: 20, // mm
  EXTENSION_OFFSET: 5, // mm offset from face

  // Arrow
  ARROW_SIZE: 6, // mm

  // Label
  LABEL_OFFSET: 15, // mm above line

  // Axis colors (when showAxisColors is enabled)
  AXIS_COLORS: {
    X: 0xef4444, // Red
    Y: 0x22c55e, // Green
    Z: 0x3b82f6, // Blue
  } as const,
};

// ============================================================================
// Helper Functions
// ============================================================================

type Vec3 = [number, number, number];

/**
 * Get perpendicular direction for extension lines
 */
function getPerpendicularDirection(axis: 'X' | 'Y' | 'Z'): Vec3 {
  // Return a direction perpendicular to the axis for drawing extension lines
  switch (axis) {
    case 'X': return [0, 1, 0]; // Y direction
    case 'Y': return [1, 0, 0]; // X direction
    case 'Z': return [0, 1, 0]; // Y direction
  }
}

/**
 * Format distance for display
 */
function formatDistance(distance: number): string {
  if (distance >= 10) {
    return `${Math.round(distance)} mm`;
  }
  return `${distance.toFixed(1)} mm`;
}

// ============================================================================
// Single Dimension Line Component
// ============================================================================

interface DimensionLineDisplayProps {
  line: DimensionLine;
  showAxisColors: boolean;
}

function DimensionLineDisplay({ line, showAxisColors }: DimensionLineDisplayProps) {
  // Calculate color based on settings
  const color = useMemo(() => {
    if (showAxisColors) {
      return CONFIG.AXIS_COLORS[line.axis];
    }
    return CONFIG.LINE_COLOR;
  }, [line.axis, showAxisColors]);

  // Calculate geometry for the dimension line
  const { points, midpoint, labelPosition } = useMemo(() => {
    const start = new THREE.Vector3(...line.startPoint);
    const end = new THREE.Vector3(...line.endPoint);

    // Get perpendicular direction for extension lines
    const perpDir = new THREE.Vector3(...getPerpendicularDirection(line.axis));

    // Calculate offset for the main line (slightly away from the objects)
    const mainLineOffset = perpDir.clone().multiplyScalar(CONFIG.EXTENSION_OFFSET);

    // Offset start and end points
    const startOffset = start.clone().add(mainLineOffset);
    const endOffset = end.clone().add(mainLineOffset);

    // Extension line endpoints
    const extStart1 = start.clone();
    const extEnd1 = startOffset.clone().add(perpDir.clone().multiplyScalar(CONFIG.EXTENSION_LENGTH));

    const extStart2 = end.clone();
    const extEnd2 = endOffset.clone().add(perpDir.clone().multiplyScalar(CONFIG.EXTENSION_LENGTH));

    // Main line with arrows
    // Arrow points
    const direction = endOffset.clone().sub(startOffset).normalize();
    const arrowOffset1 = direction.clone().multiplyScalar(CONFIG.ARROW_SIZE);
    const arrowOffset2 = direction.clone().multiplyScalar(-CONFIG.ARROW_SIZE);

    // Build points array for the complete dimension line
    // Format: ext1_start, ext1_end, (break), main_start, main_end, (break), ext2_start, ext2_end
    const allPoints = [
      // Extension line 1
      extStart1, extEnd1,
      // Main line
      startOffset, endOffset,
      // Extension line 2
      extStart2, extEnd2,
    ];

    // Midpoint for label
    const mid = startOffset.clone().add(endOffset).multiplyScalar(0.5);

    // Label position (above the line)
    const labelPos = mid.clone().add(perpDir.clone().multiplyScalar(CONFIG.LABEL_OFFSET));

    return {
      points: allPoints,
      midpoint: mid,
      labelPosition: labelPos,
    };
  }, [line.startPoint, line.endPoint, line.axis]);

  // Convert color to hex string
  const colorHex = `#${color.toString(16).padStart(6, '0')}`;

  return (
    <group renderOrder={2000}>
      {/* Extension line 1 */}
      <Line
        points={[
          [points[0].x, points[0].y, points[0].z],
          [points[1].x, points[1].y, points[1].z],
        ]}
        color={colorHex}
        lineWidth={1}
        transparent
        opacity={0.7}
        depthTest={false}
      />

      {/* Main dimension line */}
      <Line
        points={[
          [points[2].x, points[2].y, points[2].z],
          [points[3].x, points[3].y, points[3].z],
        ]}
        color={colorHex}
        lineWidth={2}
        transparent
        opacity={0.9}
        depthTest={false}
      />

      {/* Extension line 2 */}
      <Line
        points={[
          [points[4].x, points[4].y, points[4].z],
          [points[5].x, points[5].y, points[5].z],
        ]}
        color={colorHex}
        lineWidth={1}
        transparent
        opacity={0.7}
        depthTest={false}
      />

      {/* Arrow at start */}
      <mesh position={[points[2].x, points[2].y, points[2].z]} renderOrder={2001}>
        <sphereGeometry args={[3, 8, 8]} />
        <meshBasicMaterial color={color} depthTest={false} />
      </mesh>

      {/* Arrow at end */}
      <mesh position={[points[3].x, points[3].y, points[3].z]} renderOrder={2001}>
        <sphereGeometry args={[3, 8, 8]} />
        <meshBasicMaterial color={color} depthTest={false} />
      </mesh>

      {/* Distance label */}
      <Html
        position={[labelPosition.x, labelPosition.y, labelPosition.z]}
        center
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <div
          className="whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium shadow-sm"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            color: colorHex,
            border: `1px solid ${colorHex}`,
          }}
        >
          {formatDistance(line.distance)}
        </div>
      </Html>
    </group>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DimensionRenderer() {
  const dimensionSettings = useStore((state) => state.dimensionSettings);
  const { dimensionLinesRef, versionRef } = useDimensionLinesRef();

  // Track last version to detect changes
  const lastVersionRef = useRef(-1);

  // State for current dimension lines (triggers rerender when changed)
  const currentLinesRef = useRef<DimensionLine[]>([]);

  // Force update mechanism
  const [, forceUpdate] = useState(0);

  // Update lines in render loop
  useFrame(() => {
    if (!dimensionSettings?.enabled) return;

    const currentVersion = versionRef.current;
    if (currentVersion === lastVersionRef.current) return;
    lastVersionRef.current = currentVersion;

    // Update current lines and force rerender
    // Always update when version changes - distances change during drag even if IDs stay same
    const newLines = dimensionLinesRef.current.slice(0, MAX_DIMENSION_LINES);
    currentLinesRef.current = newLines;
    forceUpdate((v) => v + 1);
  });

  if (!dimensionSettings?.enabled) return null;

  return (
    <group>
      {currentLinesRef.current.map((line) => (
        <DimensionLineDisplay
          key={`${line.id}-${line.distance.toFixed(1)}`}
          line={line}
          showAxisColors={dimensionSettings.showAxisColors}
        />
      ))}
    </group>
  );
}
