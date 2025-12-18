'use client';

/**
 * DimensionDisplay - Shows dimension value during resize drag
 */

import { Html } from '@react-three/drei';

// ============================================================================
// Types
// ============================================================================

export interface DimensionDisplayProps {
  position: [number, number, number];
  dimension: number;
  axis: 'width' | 'height' | 'depth';
}

// ============================================================================
// Constants
// ============================================================================

const AXIS_LABELS: Record<string, string> = {
  width: 'Szer.',
  height: 'Wys.',
  depth: 'Głęb.',
};

// ============================================================================
// Component
// ============================================================================

export function DimensionDisplay({ position, dimension, axis }: DimensionDisplayProps) {
  return (
    <Html position={position} center>
      <div className="pointer-events-none rounded bg-background/90 px-2 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm">
        {AXIS_LABELS[axis]}: {Math.round(dimension)}mm
      </div>
    </Html>
  );
}
