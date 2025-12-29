jest.mock("../../collisionDetection", () => ({
  detectCollisions: jest.fn(),
}));

import { create } from "zustand";
import type { StateCreator } from "zustand";
import { createCollisionSlice } from "./collisionSlice";
import type { CollisionSlice } from "../types";
import { detectCollisions } from "../../collisionDetection";

type CollisionTestState = CollisionSlice & {
  parts: { id: string; furnitureId: string }[];
  selectedFurnitureId: string;
  snapSettings: { collisionMargin: number };
};

const createCollisionStore = () =>
  create<CollisionTestState>()((set, get, api) => ({
    ...createCollisionSlice(set as unknown as any, get as unknown as any, api as unknown as any),
    parts: [],
    selectedFurnitureId: "f-1",
    snapSettings: { collisionMargin: 0.01 },
  }));

describe("collisionSlice", () => {
  it("runs collision detection for selected furniture parts", () => {
    const store = createCollisionStore();
    const collisionsMock = [{ partId1: "p1", partId2: "p3" }];
    (detectCollisions as jest.Mock).mockReturnValue(collisionsMock);

    store.setState({
      parts: [
        { id: "p1", furnitureId: "f-1" },
        { id: "p2", furnitureId: "f-2" },
        { id: "p3", furnitureId: "f-1" },
      ],
    });

    store.getState().detectCollisions();

    expect(detectCollisions).toHaveBeenCalledWith(
      [
        { id: "p1", furnitureId: "f-1" },
        { id: "p3", furnitureId: "f-1" },
      ],
      undefined, // selectedCabinetId
      0.01 // collisionThreshold from snapSettings.collisionMargin
    );
    expect(store.getState().collisions).toEqual(collisionsMock);
  });
});
