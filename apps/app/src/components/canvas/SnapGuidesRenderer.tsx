'use client';

/**
 * SnapGuidesRenderer Component
 *
 * Renders visual snap guides (planes) during transform/resize operations.
 * Uses useFrame to read from refs for high-performance updates without rerenders.
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '@/lib/store';
import { useSnapPointsRef } from '@/lib/snap-context';

// ============================================================================
// Constants
// ============================================================================

/** Maximum number of guides to render */
const MAX_GUIDES = 3;

/** Size of the snap plane indicator */
const PLANE_SIZE = 1000;

/** Guide plane color (bright green for visibility) */
const PLANE_COLOR = 0x00ff00;

// ============================================================================
// Component
// ============================================================================

export function SnapGuidesRenderer() {
  const showGuides = useStore((state) => state.snapSettings.showGuides);
  const { snapPointsRef, versionRef } = useSnapPointsRef();

  // Track last version to detect changes
  const lastVersionRef = useRef(-1);

  // Refs for plane meshes
  const planesRef = useRef<THREE.InstancedMesh>(null);

  // Plane geometry - will be rotated based on snap axis
  const planeGeometry = useMemo(() => new THREE.PlaneGeometry(PLANE_SIZE, PLANE_SIZE), []);
  const planeMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: PLANE_COLOR,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      depthTest: false,
    });
  }, []);

  // Dummy object for instanced mesh matrix updates
  const dummyObj = useMemo(() => new THREE.Object3D(), []);

  // Update guides in render loop (no rerenders!)
  useFrame(() => {
    if (!showGuides) return;

    const currentVersion = versionRef.current;
    if (currentVersion === lastVersionRef.current) return;
    lastVersionRef.current = currentVersion;

    const snapPoints = snapPointsRef.current;
    const planes = planesRef.current;

    if (!planes) return;

    // Update plane instances
    for (let i = 0; i < MAX_GUIDES; i++) {
      if (i < snapPoints.length) {
        const snap = snapPoints[i];
        const [x, y, z] = snap.position;
        const axis = snap.axis;

        // Position the plane at the snap edge
        dummyObj.position.set(x, y, z);

        // Rotate plane to be perpendicular to the snap axis
        // PlaneGeometry is in XY plane by default, facing +Z
        if (axis === 'X') {
          // Snap on X axis - plane perpendicular to X (in YZ plane)
          dummyObj.rotation.set(0, Math.PI / 2, 0);
        } else if (axis === 'Y') {
          // Snap on Y axis - plane perpendicular to Y (in XZ plane)
          dummyObj.rotation.set(Math.PI / 2, 0, 0);
        } else {
          // Snap on Z axis - plane perpendicular to Z (in XY plane) - default
          dummyObj.rotation.set(0, 0, 0);
        }

        dummyObj.scale.setScalar(1);
        dummyObj.updateMatrix();
        planes.setMatrixAt(i, dummyObj.matrix);
      } else {
        // Hide unused instances by scaling to 0
        dummyObj.scale.setScalar(0);
        dummyObj.updateMatrix();
        planes.setMatrixAt(i, dummyObj.matrix);
      }
    }
    planes.instanceMatrix.needsUpdate = true;
  });

  if (!showGuides) return null;

  return (
    <group renderOrder={1000}>
      {/* Snap plane indicators */}
      <instancedMesh
        ref={planesRef}
        args={[planeGeometry, planeMaterial, MAX_GUIDES]}
        frustumCulled={false}
      />
    </group>
  );
}
