/**
 * CountertopConfigDialog Tests
 *
 * Tests for helper functions used in countertop configuration
 */

import { getCountertopSummary } from "./CountertopConfigDialog";
import type { CabinetCountertopConfig } from "@/types";

describe("getCountertopSummary", () => {
  it('should return "Brak blatu" when config is undefined', () => {
    expect(getCountertopSummary(undefined)).toBe("Brak blatu");
  });

  it('should return "Brak blatu" when hasCountertop is false', () => {
    const config: CabinetCountertopConfig = {
      hasCountertop: false,
    };
    expect(getCountertopSummary(config)).toBe("Brak blatu");
  });

  it('should return "Standardowy blat" for default countertop config', () => {
    const config: CabinetCountertopConfig = {
      hasCountertop: true,
    };
    expect(getCountertopSummary(config)).toBe("Standardowy blat");
  });

  it("should return standard text when only thicknessOverride is set (thickness not shown in summary)", () => {
    const config: CabinetCountertopConfig = {
      hasCountertop: true,
      thicknessOverride: 28,
    };
    // Current implementation doesn't include thickness in summary
    expect(getCountertopSummary(config)).toBe("Standardowy blat");
  });

  it("should include cutout preset label when cutoutPreset is set", () => {
    const config: CabinetCountertopConfig = {
      hasCountertop: true,
      cutoutPreset: "SINK_STANDARD",
    };
    expect(getCountertopSummary(config)).toBe("Zlewozmywak standardowy");
  });

  it('should include "oddzielny" when excludeFromGroup is true', () => {
    const config: CabinetCountertopConfig = {
      hasCountertop: true,
      excludeFromGroup: true,
    };
    expect(getCountertopSummary(config)).toBe("oddzielny");
  });

  it("should combine multiple parts with bullet separator (thickness not included)", () => {
    const config: CabinetCountertopConfig = {
      hasCountertop: true,
      thicknessOverride: 38,
      cutoutPreset: "COOKTOP_60",
      excludeFromGroup: true,
    };
    // Current implementation doesn't include thickness, only cutout and excludeFromGroup
    expect(getCountertopSummary(config)).toBe("Płyta grzewcza 60cm • oddzielny");
  });

  it("should handle cutout without excludeFromGroup (thickness not included)", () => {
    const config: CabinetCountertopConfig = {
      hasCountertop: true,
      thicknessOverride: 40,
      cutoutPreset: "SINK_SMALL",
    };
    // Current implementation doesn't include thickness
    expect(getCountertopSummary(config)).toBe("Zlewozmywak mały");
  });

  it("should handle all cutout presets correctly", () => {
    const presets: { preset: CabinetCountertopConfig["cutoutPreset"]; expected: string }[] = [
      { preset: "SINK_STANDARD", expected: "Zlewozmywak standardowy" },
      { preset: "SINK_SMALL", expected: "Zlewozmywak mały" },
      { preset: "SINK_ROUND", expected: "Zlewozmywak okrągły" },
      { preset: "COOKTOP_60", expected: "Płyta grzewcza 60cm" },
      { preset: "COOKTOP_80", expected: "Płyta grzewcza 80cm" },
    ];

    presets.forEach(({ preset, expected }) => {
      const config: CabinetCountertopConfig = {
        hasCountertop: true,
        cutoutPreset: preset,
      };
      expect(getCountertopSummary(config)).toBe(expected);
    });
  });
});
