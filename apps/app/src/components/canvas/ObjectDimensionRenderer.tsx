'use client';

/**
 * ObjectDimensionRenderer Component
 *
 * Renders W/H/D dimension lines for selected or all objects.
 * Updates dimensions based on camera position for optimal visibility.
 *
 * Performance optimizations:
 * - Throttled camera position checks (max 20 updates/sec)
 * - Memoized dimension line components
 * - Early exits for disabled states
 * - Stable keys to prevent unnecessary remounts
 */

import { useRef, useState, memo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import { useStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import { calculateAllObjectDimensions } from '@/lib/object-dimensions-calculator';
import type { ObjectDimension, ObjectDimensionSet } from '@/types';

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  // Line styling
  LINE_COLOR: 0x16a34a, // Green-600 (distinct from blue distance dimensions)
  LINE_WIDTH: 2,

  // Extension line
  EXTENSION_LENGTH: 15,
  EXTENSION_OFFSET: 5,

  // Arrow (sphere)
  ARROW_SIZE: 4,

  // Label
  LABEL_OFFSET: 12,

  // Axis colors
  AXIS_COLORS: {
    X: 0xef4444, // Red - Width
    Y: 0x22c55e, // Green - Height
    Z: 0x3b82f6, // Blue - Depth
  } as const,

  // Performance
  THROTTLE_MS: 50, // 20 updates/sec max
  CAMERA_MOVE_THRESHOLD: 1, // mm - ignore tiny movements
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

type Vec3 = [number, number, number];

function getPerpendicularDirection(axis: 'X' | 'Y' | 'Z'): Vec3 {
  switch (axis) {
    case 'X':
      return [0, 1, 0]; // Width: extension lines go up (Y)
    case 'Y':
      return [1, 0, 0]; // Height: extension lines go right (X)
    case 'Z':
      return [1, 0, 0]; // Depth: extension lines go right (X)
  }
}

// ============================================================================
// Single Dimension Line Component (Memoized)
// ============================================================================

interface ObjectDimensionLineProps {
  dimension: ObjectDimension;
  showAxisColors: boolean;
  showLabel: boolean;
}

const ObjectDimensionLine = memo(function ObjectDimensionLine({
  dimension,
  showAxisColors,
  showLabel,
}: ObjectDimensionLineProps) {
  const color = showAxisColors
    ? CONFIG.AXIS_COLORS[dimension.axis]
    : CONFIG.LINE_COLOR;
  const colorHex = `#${color.toString(16).padStart(6, '0')}`;

  // Calculate perpendicular direction for extension lines
  const perpDir = getPerpendicularDirection(dimension.axis);

  // Start and end points
  const [sx, sy, sz] = dimension.startPoint;
  const [ex, ey, ez] = dimension.endPoint;

  // Offset for extension lines
  const offsetX = perpDir[0] * CONFIG.EXTENSION_OFFSET;
  const offsetY = perpDir[1] * CONFIG.EXTENSION_OFFSET;
  const offsetZ = perpDir[2] * CONFIG.EXTENSION_OFFSET;

  // Extension end offset
  const extX = perpDir[0] * CONFIG.EXTENSION_LENGTH;
  const extY = perpDir[1] * CONFIG.EXTENSION_LENGTH;
  const extZ = perpDir[2] * CONFIG.EXTENSION_LENGTH;

  // Main line positions (offset from object)
  const mainStart: Vec3 = [sx + offsetX, sy + offsetY, sz + offsetZ];
  const mainEnd: Vec3 = [ex + offsetX, ey + offsetY, ez + offsetZ];

  // Extension lines
  const ext1Start: Vec3 = [sx, sy, sz];
  const ext1End: Vec3 = [sx + offsetX + extX, sy + offsetY + extY, sz + offsetZ + extZ];
  const ext2Start: Vec3 = [ex, ey, ez];
  const ext2End: Vec3 = [ex + offsetX + extX, ey + offsetY + extY, ez + offsetZ + extZ];

  // Label position
  const [lx, ly, lz] = dimension.labelPosition;
  const labelPos: Vec3 = [
    lx + perpDir[0] * CONFIG.LABEL_OFFSET,
    ly + perpDir[1] * CONFIG.LABEL_OFFSET,
    lz + perpDir[2] * CONFIG.LABEL_OFFSET,
  ];

  return (
    <group renderOrder={1900}>
      {/* Extension line 1 */}
      <Line
        points={[ext1Start, ext1End]}
        color={colorHex}
        lineWidth={1}
        transparent
        opacity={0.6}
        depthTest={false}
      />

      {/* Main dimension line */}
      <Line
        points={[mainStart, mainEnd]}
        color={colorHex}
        lineWidth={CONFIG.LINE_WIDTH}
        transparent
        opacity={0.85}
        depthTest={false}
      />

      {/* Extension line 2 */}
      <Line
        points={[ext2Start, ext2End]}
        color={colorHex}
        lineWidth={1}
        transparent
        opacity={0.6}
        depthTest={false}
      />

      {/* Arrow at start */}
      <mesh position={mainStart} renderOrder={1901}>
        <sphereGeometry args={[CONFIG.ARROW_SIZE, 6, 6]} />
        <meshBasicMaterial color={color} depthTest={false} transparent opacity={0.9} />
      </mesh>

      {/* Arrow at end */}
      <mesh position={mainEnd} renderOrder={1901}>
        <sphereGeometry args={[CONFIG.ARROW_SIZE, 6, 6]} />
        <meshBasicMaterial color={color} depthTest={false} transparent opacity={0.9} />
      </mesh>

      {/* Label */}
      <Html
        position={labelPos}
        center
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        <div
          className="whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium shadow-sm"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.92)',
            color: colorHex,
            border: `1px solid ${colorHex}`,
          }}
        >
          {showLabel && (
            <span className="mr-1 opacity-60">{dimension.label}:</span>
          )}
          {Math.round(dimension.length)} mm
        </div>
      </Html>
    </group>
  );
});

// ============================================================================
// Main Component
// ============================================================================

export function ObjectDimensionRenderer() {
  const { camera } = useThree();

  // Settings from store (shallow comparison for performance)
  const settings = useStore((state) => state.objectDimensionSettings);

  // Selection state
  const {
    selectedPartId,
    selectedCabinetId,
    selectedPartIds,
    selectedCountertopGroupId,
    selectedFurnitureId,
  } = useStore(
    useShallow((state) => ({
      selectedPartId: state.selectedPartId,
      selectedCabinetId: state.selectedCabinetId,
      selectedPartIds: state.selectedPartIds,
      selectedCountertopGroupId: state.selectedCountertopGroupId,
      selectedFurnitureId: state.selectedFurnitureId,
    }))
  );

  // Data from store
  const { parts, cabinets, countertopGroups, hiddenPartIds } = useStore(
    useShallow((state) => ({
      parts: state.parts,
      cabinets: state.cabinets,
      countertopGroups: state.countertopGroups,
      hiddenPartIds: state.hiddenPartIds,
    }))
  );

  // State for rendered dimensions
  const [dimensionSets, setDimensionSets] = useState<ObjectDimensionSet[]>([]);

  // Refs for throttling
  const lastCameraX = useRef(0);
  const lastCameraY = useRef(0);
  const lastCameraZ = useRef(0);
  const lastUpdateTime = useRef(0);
  const lastSelectionKey = useRef('');

  // Calculate dimensions in render loop with throttling
  useFrame(() => {
    if (!settings?.enabled) return;

    const now = Date.now();
    const timeSinceUpdate = now - lastUpdateTime.current;

    // Check if camera moved significantly
    const camX = camera.position.x;
    const camY = camera.position.y;
    const camZ = camera.position.z;

    const dx = Math.abs(camX - lastCameraX.current);
    const dy = Math.abs(camY - lastCameraY.current);
    const dz = Math.abs(camZ - lastCameraZ.current);
    const cameraMoved =
      dx > CONFIG.CAMERA_MOVE_THRESHOLD ||
      dy > CONFIG.CAMERA_MOVE_THRESHOLD ||
      dz > CONFIG.CAMERA_MOVE_THRESHOLD;

    // Build selection key to detect selection changes
    const selectionKey = `${selectedPartId}-${selectedCabinetId}-${selectedPartIds.size}-${selectedCountertopGroupId}`;
    const selectionChanged = selectionKey !== lastSelectionKey.current;

    // Skip update if nothing changed and throttle time not exceeded
    if (!cameraMoved && !selectionChanged && timeSinceUpdate < CONFIG.THROTTLE_MS) {
      return;
    }

    // Check if we should hide when no selection
    const hasSelection =
      selectedPartId ||
      selectedCabinetId ||
      selectedPartIds.size > 0 ||
      selectedCountertopGroupId;

    if (settings.mode === 'selection' && !hasSelection) {
      if (dimensionSets.length > 0) {
        setDimensionSets([]);
      }
      lastSelectionKey.current = selectionKey;
      return;
    }

    // Update tracking refs
    lastCameraX.current = camX;
    lastCameraY.current = camY;
    lastCameraZ.current = camZ;
    lastUpdateTime.current = now;
    lastSelectionKey.current = selectionKey;

    // Calculate new dimensions
    const newDimensions = calculateAllObjectDimensions(
      settings.mode,
      settings.granularity,
      parts,
      cabinets,
      countertopGroups,
      selectedPartId,
      selectedCabinetId,
      selectedPartIds,
      selectedCountertopGroupId,
      selectedFurnitureId,
      hiddenPartIds,
      camX,
      camY,
      camZ
    );

    setDimensionSets(newDimensions);
  });

  // Early exit if disabled or no dimensions
  if (!settings?.enabled || dimensionSets.length === 0) {
    return null;
  }

  return (
    <group>
      {dimensionSets.map((set) =>
        set.dimensions.map((dim) => (
          <ObjectDimensionLine
            key={dim.id}
            dimension={dim}
            showAxisColors={settings.showAxisColors}
            showLabel={settings.showLabels}
          />
        ))
      )}
    </group>
  );
}
