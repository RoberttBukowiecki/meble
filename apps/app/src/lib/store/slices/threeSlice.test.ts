import { create } from "zustand";
import type { StateCreator } from "zustand";
import { createThreeSlice, type ThreeSlice } from "./threeSlice";
import * as THREE from "three";

const createThreeStore = () =>
  create<ThreeSlice>()(createThreeSlice as unknown as StateCreator<ThreeSlice, [], [], ThreeSlice>);

describe("threeSlice", () => {
  it("initializes with null renderer and scene", () => {
    const store = createThreeStore();
    const state = store.getState();

    expect(state.threeRenderer).toBeNull();
    expect(state.threeScene).toBeNull();
  });

  it("sets Three.js state when setThreeState is called", () => {
    const store = createThreeStore();

    // Create mock renderer and scene
    const mockRenderer = {} as THREE.WebGLRenderer;
    const mockScene = new THREE.Scene();

    store.getState().setThreeState(mockRenderer, mockScene);

    const state = store.getState();
    expect(state.threeRenderer).toBe(mockRenderer);
    expect(state.threeScene).toBe(mockScene);
  });

  it("clears Three.js state when clearThreeState is called", () => {
    const store = createThreeStore();

    // Set state first
    const mockRenderer = {} as THREE.WebGLRenderer;
    const mockScene = new THREE.Scene();
    store.getState().setThreeState(mockRenderer, mockScene);

    // Clear state
    store.getState().clearThreeState();

    const state = store.getState();
    expect(state.threeRenderer).toBeNull();
    expect(state.threeScene).toBeNull();
  });

  it("allows setting null values explicitly", () => {
    const store = createThreeStore();

    // Set some values
    const mockRenderer = {} as THREE.WebGLRenderer;
    const mockScene = new THREE.Scene();
    store.getState().setThreeState(mockRenderer, mockScene);

    // Set to null explicitly
    store.getState().setThreeState(null, null);

    const state = store.getState();
    expect(state.threeRenderer).toBeNull();
    expect(state.threeScene).toBeNull();
  });

  it("updates references when called multiple times", () => {
    const store = createThreeStore();

    const renderer1 = {} as THREE.WebGLRenderer;
    const scene1 = new THREE.Scene();
    store.getState().setThreeState(renderer1, scene1);

    const renderer2 = {} as THREE.WebGLRenderer;
    const scene2 = new THREE.Scene();
    store.getState().setThreeState(renderer2, scene2);

    const state = store.getState();
    expect(state.threeRenderer).toBe(renderer2);
    expect(state.threeScene).toBe(scene2);
    expect(state.threeRenderer).not.toBe(renderer1);
    expect(state.threeScene).not.toBe(scene1);
  });
});
