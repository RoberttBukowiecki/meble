'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { LightSource } from '@/types';

interface LightSource3DProps {
  light: LightSource;
  roomHeight: number;
}

export function LightSource3D({ light, roomHeight }: LightSource3DProps) {
  const intensity = light.intensity || 1;
  const color = light.color || '#ffffff';
  
  if (light.type === 'POINT') {
      return (
          <group position={[light.position[0], roomHeight - 100, light.position[1]]}>
              {/* Visual Bulb */}
              <mesh>
                  <sphereGeometry args={[50, 16, 16]} />
                  <meshStandardMaterial color="white" emissive={color} emissiveIntensity={1} />
              </mesh>
              {/* Light */}
              <pointLight 
                  intensity={intensity * 500} // Point lights need high intensity in large scenes if no decay adjustments
                  distance={5000} 
                  decay={2} 
                  color={color} 
                  castShadow
              />
          </group>
      );
  }
  
  if (light.type === 'LED_STRIP') {
      const length = light.length || 1000;
      const rotation = light.rotation || 0;
      
      return (
          <group 
            position={[light.position[0], roomHeight - 10, light.position[1]]} 
            rotation={[0, -rotation, 0]}
          >
              {/* Visual Strip */}
              <mesh rotation={[Math.PI/2, 0, 0]}>
                  <planeGeometry args={[length, 20]} />
                  <meshStandardMaterial color="white" emissive={color} emissiveIntensity={2} />
              </mesh>
              {/* Light - RectAreaLight for strip */}
              <rectAreaLight
                  width={length}
                  height={20}
                  intensity={intensity * 10}
                  color={color}
                  rotation={[-Math.PI/2, 0, 0]} // Point down
              />
          </group>
      );
  }

  return null;
}
