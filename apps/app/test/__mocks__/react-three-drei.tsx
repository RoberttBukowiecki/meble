/**
 * Mock for @react-three/drei in test environment
 */

import React from 'react';

export const OrbitControls = React.forwardRef<any, any>((props, ref) => {
  return <div data-testid="orbit-controls" />;
});
OrbitControls.displayName = 'OrbitControls';

export const TransformControls = React.forwardRef<any, any>((props, ref) => {
  return <div data-testid="transform-controls">{props.children}</div>;
});
TransformControls.displayName = 'TransformControls';

export const Grid = (props: any) => <div data-testid="grid" />;

export const Edges = (props: any) => <div data-testid="edges" />;

export const SoftShadows = (props: any) => null;

export const Html = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="html">{children}</div>
);

export const useTexture = (path: string | string[]) => {
  if (Array.isArray(path)) {
    return path.map(() => ({}));
  }
  return {};
};

export const Line = (props: any) => <div data-testid="line" />;

export const Text = (props: any) => <div data-testid="text">{props.children}</div>;
