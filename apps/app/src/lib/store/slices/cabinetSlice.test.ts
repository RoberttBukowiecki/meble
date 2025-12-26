jest.mock("uuid", () => {
  let counter = 0;
  return { v4: jest.fn(() => `uuid-${++counter}`) };
});

jest.mock("../utils", () => ({
  applyCabinetTransform: jest.fn((parts) => parts),
  getCabinetTransform: jest.fn(() => ({ center: "center", rotation: "rotation" })),
  triggerDebouncedCollisionDetection: jest.fn(),
  getDefaultBackMaterial: jest.fn((materials) => materials.find((m: any) => m.id === "body-1")),
}));

jest.mock("../../cabinetGenerators", () => ({
  getGeneratorForType: jest.fn(),
}));

import { create } from "zustand";
import { createCabinetSlice } from "./cabinetSlice";
import type { CabinetSlice } from "../types";
import type { Cabinet, CabinetMaterials, CabinetParams, Material, Part } from "@/types";
import {
  applyCabinetTransform,
  getCabinetTransform,
  triggerDebouncedCollisionDetection,
} from "../utils";
import { getGeneratorForType } from "../../cabinetGenerators";

type CabinetTestState = CabinetSlice & {
  materials: Material[];
  parts: Part[];
  cabinets: Cabinet[];
  selectedCabinetId: string | null;
  selectedPartId: string | null;
  selectedCountertopGroupId: string | null;
  countertopGroups: Array<{ id: string; segments: Array<{ cabinetIds: string[] }> }>;
  pushEntry: jest.Mock;
  detectCollisions: jest.Mock;
  generateCountertopsForFurniture: jest.Mock;
};

const baseMaterials: Material[] = [
  { id: "body-1", name: "Body", color: "#fff", thickness: 18, isDefault: true },
  { id: "front-1", name: "Front", color: "#000", thickness: 18, isDefault: false },
];

const defaultParams: CabinetParams = {
  type: "KITCHEN",
  width: 100,
  height: 200,
  depth: 300,
  shelfCount: 1,
  hasDoors: false,
  topBottomPlacement: "inset",
  hasBack: true,
  backOverlapRatio: 2 / 3,
  backMountType: "overlap",
};

const makeGeneratedPart = (name: string, cabinetId: string, furnitureId: string) => ({
  name,
  furnitureId,
  group: cabinetId,
  shapeType: "RECT" as const,
  shapeParams: { type: "RECT" as const, x: 10, y: 10 },
  width: 10,
  height: 10,
  depth: 18,
  position: [0, 0, 0] as [number, number, number],
  rotation: [0, 0, 0] as [number, number, number],
  materialId: "body-1",
  edgeBanding: { type: "RECT" as const, top: false, bottom: false, left: false, right: false },
  cabinetMetadata: { cabinetId, role: "BOTTOM" } as any,
});

const createCabinetStore = (initial: Partial<CabinetTestState> = {}) =>
  create<CabinetTestState>()((set, get, api) => ({
    ...createCabinetSlice(set as unknown as any, get as unknown as any, api as unknown as any),
    materials: baseMaterials,
    parts: [],
    cabinets: [],
    selectedCabinetId: null,
    selectedPartId: null,
    selectedCountertopGroupId: null,
    countertopGroups: [],
    pushEntry: jest.fn(),
    detectCollisions: jest.fn(),
    generateCountertopsForFurniture: jest.fn(),
    ...initial,
  }));

describe("cabinetSlice", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("adds cabinet with generated parts and selects it", () => {
    const store = createCabinetStore();
    const materials: CabinetMaterials = {
      bodyMaterialId: "body-1",
      frontMaterialId: "front-1",
    };
    const generator = jest.fn((cabinetId: string, furnitureId: string) => [
      makeGeneratedPart("Bottom", cabinetId, furnitureId),
      makeGeneratedPart("Top", cabinetId, furnitureId),
    ]);
    (getGeneratorForType as jest.Mock).mockReturnValue(generator);

    store.getState().addCabinet("f-1", "KITCHEN", defaultParams, materials, true);

    const state = store.getState();
    expect(generator).toHaveBeenCalledWith(
      expect.any(String),
      "f-1",
      defaultParams,
      materials,
      expect.objectContaining({ id: "body-1" }),
      expect.objectContaining({ id: "body-1" }) // backMaterial defaults to bodyMaterial
    );
    expect(state.cabinets).toHaveLength(1);
    expect(state.parts).toHaveLength(2);
    expect(new Set(state.cabinets[0].partIds).size).toBe(2);
    expect(state.selectedCabinetId).toBe(state.cabinets[0].id);
    expect(state.selectedPartId).toBeNull();
    expect(triggerDebouncedCollisionDetection).toHaveBeenCalledTimes(1);
  });

  it("regenerates cabinet parts when placement changes", () => {
    const existingCabinet: Cabinet = {
      id: "cab-1",
      name: "Szafka 1",
      furnitureId: "f-1",
      type: "KITCHEN",
      params: defaultParams,
      materials: { bodyMaterialId: "body-1", frontMaterialId: "front-1" },
      topBottomPlacement: "inset",
      partIds: ["old-1"],
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    };
    const oldPart: Part = {
      ...makeGeneratedPart("Old", "cab-1", "f-1"),
      id: "old-1",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    };

    const store = createCabinetStore({
      cabinets: [existingCabinet],
      parts: [
        oldPart,
        { ...oldPart, id: "other", cabinetMetadata: { cabinetId: "other", role: "BOTTOM" } },
      ],
    });

    const generator = jest.fn((cabinetId: string, furnitureId: string) => [
      makeGeneratedPart("New", cabinetId, furnitureId),
    ]);
    (getGeneratorForType as jest.Mock).mockReturnValue(generator);
    (applyCabinetTransform as jest.Mock).mockImplementation((parts: Part[]) =>
      parts.map((p: Part) => ({ ...p, position: [1, 2, 3] as [number, number, number] }))
    );

    store.getState().updateCabinet("cab-1", { topBottomPlacement: "overlay" });

    const state = store.getState();
    expect(getCabinetTransform).toHaveBeenCalledWith([oldPart]);
    expect(generator).toHaveBeenCalledWith(
      "cab-1",
      "f-1",
      { ...defaultParams, topBottomPlacement: "overlay" },
      existingCabinet.materials,
      expect.objectContaining({ id: "body-1" }),
      expect.objectContaining({ id: "body-1" }) // backMaterial
    );
    expect(applyCabinetTransform).toHaveBeenCalled();
    const updatedCabinet = state.cabinets.find((c) => c.id === "cab-1")!;
    expect(updatedCabinet.topBottomPlacement).toBe("overlay");
    expect(updatedCabinet.partIds).toHaveLength(1);
    expect(updatedCabinet.partIds[0]).not.toBe("old-1");
    expect(state.parts.some((p) => p.id === "old-1")).toBe(false);
    expect(state.parts.some((p) => p.id === "other")).toBe(true);
    expect(triggerDebouncedCollisionDetection).toHaveBeenCalledTimes(1);
  });

  it("regenerates cabinet when params change with skipHistory", () => {
    const existingCabinet: Cabinet = {
      id: "cab-2",
      name: "Szafka 2",
      furnitureId: "f-1",
      type: "KITCHEN",
      params: defaultParams,
      materials: { bodyMaterialId: "body-1", frontMaterialId: "front-1" },
      topBottomPlacement: "inset",
      partIds: ["old-2"],
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    };
    const oldPart: Part = {
      ...makeGeneratedPart("Old2", "cab-2", "f-1"),
      id: "old-2",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    };
    const newParams: CabinetParams = {
      ...defaultParams,
      width: 150,
      topBottomPlacement: "overlay",
    };
    const generator = jest.fn((cabinetId: string, furnitureId: string) => [
      makeGeneratedPart("Regenerated", cabinetId, furnitureId),
      makeGeneratedPart("Shelf", cabinetId, furnitureId),
    ]);
    (getGeneratorForType as jest.Mock).mockReturnValue(generator);

    const store = createCabinetStore({
      cabinets: [existingCabinet],
      parts: [oldPart],
    });

    store.getState().updateCabinetParams("cab-2", newParams, true);

    const state = store.getState();
    const updatedCabinet = state.cabinets.find((c) => c.id === "cab-2")!;
    expect(updatedCabinet.params.width).toBe(150);
    expect(updatedCabinet.topBottomPlacement).toBe("overlay");
    expect(updatedCabinet.partIds).toHaveLength(2);
    expect(updatedCabinet.partIds.includes("old-2")).toBe(false);
    expect(state.parts.filter((p) => p.cabinetMetadata?.cabinetId === "cab-2")).toHaveLength(2);
    expect(triggerDebouncedCollisionDetection).toHaveBeenCalledTimes(1);
  });

  it("removes cabinet and associated parts", () => {
    const cabinet: Cabinet = {
      id: "cab-3",
      name: "Szafka 3",
      furnitureId: "f-1",
      type: "KITCHEN",
      params: defaultParams,
      materials: { bodyMaterialId: "body-1", frontMaterialId: "front-1" },
      topBottomPlacement: "inset",
      partIds: ["p-remove"],
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    };
    const parts: Part[] = [
      {
        ...makeGeneratedPart("Keep", "other", "f-1"),
        id: "p-keep",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      },
      {
        ...makeGeneratedPart("Remove", "cab-3", "f-1"),
        id: "p-remove",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      },
    ];

    const store = createCabinetStore({
      cabinets: [cabinet],
      parts,
      selectedCabinetId: "cab-3",
    });

    store.getState().removeCabinet("cab-3", true);

    const state = store.getState();
    expect(state.cabinets.some((c) => c.id === "cab-3")).toBe(false);
    expect(state.parts.map((p) => p.id)).toEqual(["p-keep"]);
    expect(state.selectedCabinetId).toBeNull();
    expect(triggerDebouncedCollisionDetection).toHaveBeenCalledTimes(1);
  });

  it("duplicates cabinet with offset parts and selects the copy", () => {
    const cabinet: Cabinet = {
      id: "cab-4",
      name: "Szafka 4",
      furnitureId: "f-1",
      type: "KITCHEN",
      params: defaultParams,
      materials: { bodyMaterialId: "body-1", frontMaterialId: "front-1" },
      topBottomPlacement: "inset",
      partIds: ["p1", "p2"],
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    };
    const parts: Part[] = [
      {
        ...makeGeneratedPart("Part1", "cab-4", "f-1"),
        id: "p1",
        position: [10, 0, 0],
        cabinetMetadata: { cabinetId: "cab-4", role: "BOTTOM" },
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      },
      {
        ...makeGeneratedPart("Part2", "cab-4", "f-1"),
        id: "p2",
        position: [20, 0, 0],
        cabinetMetadata: { cabinetId: "cab-4", role: "TOP" },
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      },
    ];

    const store = createCabinetStore({
      cabinets: [cabinet],
      parts,
    });

    store.getState().duplicateCabinet("cab-4", true);

    const state = store.getState();
    expect(state.cabinets).toHaveLength(2);
    const duplicated = state.cabinets.find((c) => c.id !== "cab-4")!;
    expect(duplicated.name).toContain("(kopia)");
    expect(duplicated.partIds).toHaveLength(2);
    expect(state.parts).toHaveLength(4);
    const duplicatedParts = state.parts.filter(
      (p) => p.cabinetMetadata?.cabinetId === duplicated.id
    );
    expect(duplicatedParts.every((p) => p.id !== "p1" && p.id !== "p2")).toBe(true);
    expect(duplicatedParts.map((p) => p.position[0])).toEqual([110, 120]); // +100 offset
    expect(duplicatedParts.every((p) => p.cabinetMetadata?.cabinetId === duplicated.id)).toBe(true);
    expect(state.selectedCabinetId).toBe(duplicated.id);
    expect(state.selectedPartId).toBeNull();
    expect(triggerDebouncedCollisionDetection).toHaveBeenCalledTimes(1);
  });

  it("renames cabinet and records history", () => {
    const now = new Date("2024-01-01T00:00:00Z");
    const cabinet: Cabinet = {
      id: "cab-rename",
      name: "Stara nazwa",
      furnitureId: "f-1",
      type: "KITCHEN",
      params: defaultParams,
      materials: { bodyMaterialId: "body-1", frontMaterialId: "front-1" },
      topBottomPlacement: "inset",
      partIds: [],
      createdAt: now,
      updatedAt: now,
    };

    const store = createCabinetStore({ cabinets: [cabinet] });

    store.getState().renameCabinet("cab-rename", "  Nowa nazwa  ");

    const updated = store.getState().cabinets[0];
    expect(updated.name).toBe("Nowa nazwa");
    expect(updated.updatedAt.getTime()).toBeGreaterThan(now.getTime());
    expect(store.getState().pushEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "UPDATE_CABINET",
        before: { name: "Stara nazwa" },
        after: { name: "Nowa nazwa" },
      })
    );
  });

  describe("countertop handling during duplication", () => {
    it("calls generateCountertopsForFurniture when duplicating kitchen cabinet with countertop enabled", () => {
      const generateCountertopsForFurniture = jest.fn();
      const countertopMaterial: Material = {
        id: "countertop-1",
        name: "Blat",
        color: "#ccc",
        thickness: 38,
        isDefault: false,
        category: "countertop",
      };

      const kitchenParams = {
        ...defaultParams,
        countertopConfig: {
          hasCountertop: true,
          materialId: "countertop-1",
        },
      };

      const cabinet: Cabinet = {
        id: "cab-countertop",
        name: "Kitchen Cabinet",
        furnitureId: "f-1",
        type: "KITCHEN",
        params: kitchenParams,
        materials: { bodyMaterialId: "body-1", frontMaterialId: "front-1" },
        topBottomPlacement: "inset",
        partIds: ["p1"],
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      const parts: Part[] = [
        {
          ...makeGeneratedPart("Part1", "cab-countertop", "f-1"),
          id: "p1",
          position: [0, 0, 0],
          cabinetMetadata: { cabinetId: "cab-countertop", role: "BOTTOM" },
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        },
      ];

      const store = createCabinetStore({
        cabinets: [cabinet],
        parts,
        materials: [...baseMaterials, countertopMaterial],
        generateCountertopsForFurniture,
      } as any);

      store.getState().duplicateCabinet("cab-countertop", true);

      expect(generateCountertopsForFurniture).toHaveBeenCalledWith("f-1", "countertop-1");
    });

    it("does not call generateCountertopsForFurniture when duplicating cabinet without countertop", () => {
      const generateCountertopsForFurniture = jest.fn();

      const cabinet: Cabinet = {
        id: "cab-no-countertop",
        name: "Cabinet without countertop",
        furnitureId: "f-1",
        type: "KITCHEN",
        params: { ...defaultParams, countertopConfig: { hasCountertop: false } },
        materials: { bodyMaterialId: "body-1", frontMaterialId: "front-1" },
        topBottomPlacement: "inset",
        partIds: ["p1"],
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      const parts: Part[] = [
        {
          ...makeGeneratedPart("Part1", "cab-no-countertop", "f-1"),
          id: "p1",
          position: [0, 0, 0],
          cabinetMetadata: { cabinetId: "cab-no-countertop", role: "BOTTOM" },
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        },
      ];

      const store = createCabinetStore({
        cabinets: [cabinet],
        parts,
        generateCountertopsForFurniture,
      } as any);

      store.getState().duplicateCabinet("cab-no-countertop", true);

      expect(generateCountertopsForFurniture).not.toHaveBeenCalled();
    });

    it("does not call generateCountertopsForFurniture when duplicating non-kitchen cabinet", () => {
      const generateCountertopsForFurniture = jest.fn();

      const cabinet: Cabinet = {
        id: "cab-wardrobe",
        name: "Wardrobe",
        furnitureId: "f-1",
        type: "WARDROBE",
        params: defaultParams,
        materials: { bodyMaterialId: "body-1", frontMaterialId: "front-1" },
        topBottomPlacement: "inset",
        partIds: ["p1"],
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      const parts: Part[] = [
        {
          ...makeGeneratedPart("Part1", "cab-wardrobe", "f-1"),
          id: "p1",
          position: [0, 0, 0],
          cabinetMetadata: { cabinetId: "cab-wardrobe", role: "BOTTOM" },
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        },
      ];

      const store = createCabinetStore({
        cabinets: [cabinet],
        parts,
        generateCountertopsForFurniture,
      } as any);

      store.getState().duplicateCabinet("cab-wardrobe", true);

      expect(generateCountertopsForFurniture).not.toHaveBeenCalled();
    });
  });
});
