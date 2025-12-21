/**
 * Mock for @react-three/fiber in test environment
 */

import React from 'react';

export const Canvas = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="r3f-canvas">{children}</div>;
};

export const useThree = () => ({
  camera: { position: { x: 0, y: 0, z: 0 } },
  scene: {},
  gl: { domElement: document.createElement('canvas') },
  size: { width: 800, height: 600 },
  viewport: { width: 800, height: 600 },
});

export const useFrame = () => {};

export const extend = () => {};

export const createPortal = (children: React.ReactNode) => children;

// ThreeEvent mock
export type ThreeEvent<T> = T & {
  stopPropagation: () => void;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
};
