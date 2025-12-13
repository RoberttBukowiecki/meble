'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { Opening } from '@/types';

interface Opening3DProps {
  opening: Opening;
  wallThickness: number;
}

export function Opening3D({ opening, wallThickness }: Opening3DProps) {
  const { widthMm, heightMm, type, depthMm, insetMm } = opening;
  
  // Default values if not specified
  const frameDepth = depthMm || 100; // Frame depth (thickness of profile)
  const frameWidth = 50; // Width of the frame profile (face width)
  const inset = insetMm || (wallThickness - frameDepth) / 2; // Center by default

  const geometry = useMemo(() => {
    // Frame geometry
    // Outer rect is w x h
    // Inner rect is (w - 2*frameWidth) x (h - 2*frameWidth)
    
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(widthMm, 0);
    shape.lineTo(widthMm, heightMm);
    shape.lineTo(0, heightMm);
    shape.lineTo(0, 0);

    const hole = new THREE.Path();
    const fw = frameWidth;
    hole.moveTo(fw, fw);
    hole.lineTo(widthMm - fw, fw);
    hole.lineTo(widthMm - fw, heightMm - fw);
    hole.lineTo(fw, heightMm - fw);
    hole.lineTo(fw, fw);
    
    shape.holes.push(hole);

    return new THREE.ExtrudeGeometry(shape, {
      depth: frameDepth,
      bevelEnabled: false,
    });
  }, [widthMm, heightMm, frameDepth, frameWidth]);

  const glassGeometry = useMemo(() => {
    const fw = frameWidth;
    const w = widthMm - 2 * fw;
    const h = heightMm - 2 * fw;
    return new THREE.BoxGeometry(w, h, 10); // 10mm glass
  }, [widthMm, heightMm, frameWidth]);

  const doorGeometry = useMemo(() => {
    // Simple door leaf
    // Full size minus frame
    // But for door, frame is usually 3-sided (no bottom frame)?
    // Or 4-sided for window.
    // Let's assume 3-sided for Door.
    
    // For now, simple box for door leaf
    const fw = frameWidth;
    const w = widthMm - 2 * fw;
    const h = heightMm - fw; // No bottom frame? Or assume 4 sided frame for simplicity?
    // Let's assume 4 sided frame for now.
    
    return new THREE.BoxGeometry(w, heightMm - 2*fw, 40); // 40mm door leaf
  }, [widthMm, heightMm, frameWidth]);

  return (
    <group position={[opening.offsetFromStartMm, opening.sillHeightMm, -wallThickness/2 + inset]}>
      {/* Frame */}
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color="#333" />
      </mesh>

      {/* Glass or Door Leaf */}
      {type === 'WINDOW' && (
        <mesh 
            geometry={glassGeometry} 
            position={[widthMm/2, heightMm/2, frameDepth/2]}
        >
          <meshPhysicalMaterial 
            color="#aaddff" 
            metalness={0.1} 
            roughness={0.1} 
            transmission={0.9} 
            transparent 
            opacity={0.3} 
          />
        </mesh>
      )}
      
      {type === 'DOOR' && (
        <mesh 
            geometry={doorGeometry} 
            position={[widthMm/2, heightMm/2, frameDepth/2]}
            // Add rotation for open door?
            rotation={[0, opening.swing === 'LEFT' ? -0.5 : 0.5, 0]} 
        >
           <meshStandardMaterial color="#8B4513" />
        </mesh>
      )}
    </group>
  );
}
