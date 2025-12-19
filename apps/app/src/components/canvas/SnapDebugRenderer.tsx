'use client';

/**
 * SnapDebugRenderer - Visual debug overlay for Snap V3
 *
 * Shows:
 * - Moving part OBB (wireframe, blue)
 * - Target part OBBs (wireframe, gray)
 * - Leading faces (green plane with normal arrow)
 * - Selected snap candidate (highlighted)
 * - T-joint candidates (purple)
 * - Connection candidates (red)
 * - Alignment candidates (yellow)
 */

import { useFrame } from '@react-three/fiber';
import { useState, useRef } from 'react';
import * as THREE from 'three';
import { lastSnapV3Debug, type SnapV3DebugInfo, type SnapV3Candidate } from '@/lib/snapping-v3';
import type { Vec3, OBBFace, OrientedBoundingBox } from '@/lib/obb';

interface SnapDebugRendererProps {
  enabled?: boolean;
}

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Create box edges from OBB
 */
function createOBBEdges(obb: OrientedBoundingBox): THREE.Vector3[] {
  const { center, halfExtents, axes } = obb;
  const c = new THREE.Vector3(...center);
  const ax = new THREE.Vector3(...axes[0]).multiplyScalar(halfExtents[0]);
  const ay = new THREE.Vector3(...axes[1]).multiplyScalar(halfExtents[1]);
  const az = new THREE.Vector3(...axes[2]).multiplyScalar(halfExtents[2]);

  // 8 corners
  const corners = [
    c.clone().sub(ax).sub(ay).sub(az),
    c.clone().add(ax).sub(ay).sub(az),
    c.clone().add(ax).add(ay).sub(az),
    c.clone().sub(ax).add(ay).sub(az),
    c.clone().sub(ax).sub(ay).add(az),
    c.clone().add(ax).sub(ay).add(az),
    c.clone().add(ax).add(ay).add(az),
    c.clone().sub(ax).add(ay).add(az),
  ];

  // 12 edges as pairs of points
  const edges: THREE.Vector3[] = [];
  const edgeIndices = [
    [0, 1], [1, 2], [2, 3], [3, 0], // bottom
    [4, 5], [5, 6], [6, 7], [7, 4], // top
    [0, 4], [1, 5], [2, 6], [3, 7], // vertical
  ];

  for (const [i, j] of edgeIndices) {
    edges.push(corners[i], corners[j]);
  }

  return edges;
}

/**
 * OBB wireframe component
 */
function OBBWireframe({ obb, color }: { obb: OrientedBoundingBox; color: string }) {
  const edges = createOBBEdges(obb);
  const points = edges.map((v) => v.toArray() as [number, number, number]).flat();

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[new Float32Array(points), 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial color={color} linewidth={2} />
    </lineSegments>
  );
}

/**
 * Face plane component
 */
function FacePlane({
  face,
  color,
  opacity = 0.5,
}: {
  face: OBBFace;
  color: string;
  opacity?: number;
}) {
  const corners = face.corners;

  // Create geometry from 4 corners (2 triangles)
  const positions = new Float32Array([
    // Triangle 1
    ...corners[0],
    ...corners[1],
    ...corners[2],
    // Triangle 2
    ...corners[0],
    ...corners[2],
    ...corners[3],
  ]);

  return (
    <mesh>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * Face normal arrow component
 */
function FaceNormalArrow({
  face,
  color,
  length = 50,
}: {
  face: OBBFace;
  color: string;
  length?: number;
}) {
  const start = new THREE.Vector3(...face.center);
  const end = start
    .clone()
    .add(new THREE.Vector3(...face.normal).multiplyScalar(length));

  const points = [start.toArray(), end.toArray()].flat();

  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[new Float32Array(points), 3]}
        />
      </bufferGeometry>
      <lineBasicMaterial color={color} linewidth={3} />
    </lineSegments>
  );
}

/**
 * Snap candidate visualization
 */
function CandidateVisualization({
  candidate,
  isSelected,
}: {
  candidate: SnapV3Candidate;
  isSelected: boolean;
}) {
  // Color based on type
  const colors = {
    connection: isSelected ? '#ff0000' : '#ff6666',
    alignment: isSelected ? '#ffff00' : '#ffff99',
    tjoint: isSelected ? '#ff00ff' : '#ff99ff',
  };

  const color = colors[candidate.type];
  const opacity = isSelected ? 0.8 : 0.3;

  return (
    <group>
      {/* Target face */}
      <FacePlane face={candidate.targetFace} color={color} opacity={opacity} />
      {isSelected && (
        <FaceNormalArrow face={candidate.targetFace} color={color} length={80} />
      )}

      {/* Moving face (only for selected) */}
      {isSelected && (
        <>
          <FacePlane face={candidate.movingFace} color="#00ff00" opacity={0.6} />
          <FaceNormalArrow face={candidate.movingFace} color="#00ff00" length={80} />

          {/* Line between face centers */}
          <lineSegments>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[
                  new Float32Array([
                    ...candidate.movingFace.center,
                    ...candidate.targetFace.center,
                  ]),
                  3,
                ]}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#ffffff" linewidth={3} />
          </lineSegments>
        </>
      )}
    </group>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SnapDebugRenderer({ enabled = true }: SnapDebugRendererProps) {
  const [debugState, setDebugState] = useState<SnapV3DebugInfo | null>(null);
  const lastUpdateRef = useRef(0);

  // Update debug state from global variable (throttled to 10fps)
  useFrame(() => {
    const now = Date.now();
    if (now - lastUpdateRef.current > 100) {
      lastUpdateRef.current = now;
      if (lastSnapV3Debug !== debugState) {
        setDebugState(lastSnapV3Debug ? { ...lastSnapV3Debug } : null);
      }
    }
  });

  if (!enabled || !debugState) {
    return null;
  }

  const {
    movingOBB,
    movingFaces,
    relevantFaces,
    leadingFaces,
    targetParts,
    allCandidates,
    selectedCandidate,
    dragAxis,
  } = debugState;

  return (
    <group>
      {/* Moving part OBB - Blue wireframe */}
      <OBBWireframe obb={movingOBB} color="#0088ff" />

      {/* All moving faces - Light blue, very transparent */}
      {movingFaces.map((face, i) => (
        <FacePlane key={`mf-${i}`} face={face} color="#0088ff" opacity={0.1} />
      ))}

      {/* Relevant faces (aligned with axis) - Cyan */}
      {relevantFaces.map((face, i) => (
        <group key={`rf-${i}`}>
          <FacePlane face={face} color="#00ffff" opacity={0.2} />
          <FaceNormalArrow face={face} color="#00ffff" length={30} />
        </group>
      ))}

      {/* Leading faces (facing movement direction) - Green */}
      {leadingFaces.map((face, i) => (
        <group key={`lf-${i}`}>
          <FacePlane face={face} color="#00ff00" opacity={0.4} />
          <FaceNormalArrow face={face} color="#00ff00" length={50} />
        </group>
      ))}

      {/* Target parts OBBs - Gray wireframe */}
      {targetParts.map((tp) => (
        <OBBWireframe key={`tp-${tp.partId}`} obb={tp.obb} color="#888888" />
      ))}

      {/* All candidates (non-selected) */}
      {allCandidates
        .filter((c) => c !== selectedCandidate)
        .slice(0, 10) // Limit for performance
        .map((candidate, i) => (
          <CandidateVisualization
            key={`cand-${i}`}
            candidate={candidate}
            isSelected={false}
          />
        ))}

      {/* Selected candidate - highlighted */}
      {selectedCandidate && (
        <CandidateVisualization
          candidate={selectedCandidate}
          isSelected={true}
        />
      )}

      {/* Axis indicator */}
      <group position={[movingOBB.center[0], movingOBB.center[1] + 100, movingOBB.center[2]]}>
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[
                new Float32Array([
                  0, 0, 0,
                  dragAxis === 'X' ? 50 : 0,
                  dragAxis === 'Y' ? 50 : 0,
                  dragAxis === 'Z' ? 50 : 0,
                ]),
                3,
              ]}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color={dragAxis === 'X' ? '#ff0000' : dragAxis === 'Y' ? '#00ff00' : '#0000ff'}
            linewidth={5}
          />
        </lineSegments>
      </group>
    </group>
  );
}
