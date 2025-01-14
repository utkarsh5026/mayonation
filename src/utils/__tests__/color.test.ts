/// <reference types="jest" />
import { parseColor, rgbToHsl, hslToRgb, toCSSString } from "../color";
import type { RGB, HSL } from "../../core/animation-val";

describe("Color Utilities", () => {
  describe("parseColor", () => {
    it("should parse hex colors to RGB", () => {
      expect(parseColor("#ff0000", "rgb")).toEqual({ r: 255, g: 0, b: 0 });
      expect(parseColor("#00ff00", "rgb")).toEqual({ r: 0, g: 255, b: 0 });
      expect(parseColor("#0000ff", "rgb")).toEqual({ r: 0, g: 0, b: 255 });
      expect(parseColor("#f00", "rgb")).toEqual({ r: 255, g: 0, b: 0 });
    });

    it("should parse RGB strings to RGB", () => {
      expect(parseColor("rgb(255,0,0)", "rgb")).toEqual({ r: 255, g: 0, b: 0 });
      expect(parseColor("rgb(0,255,0)", "rgb")).toEqual({ r: 0, g: 255, b: 0 });
      expect(parseColor("rgb(0,0,255)", "rgb")).toEqual({ r: 0, g: 0, b: 255 });
    });

    it("should parse HSL strings to HSL", () => {
      expect(parseColor("hsl(0,100,50)", "hsl")).toEqual({
        h: 0,
        s: 100,
        l: 50,
      });
      expect(parseColor("hsl(120,100,50)", "hsl")).toEqual({
        h: 120,
        s: 100,
        l: 50,
      });
      expect(parseColor("hsl(240,100,50)", "hsl")).toEqual({
        h: 240,
        s: 100,
        l: 50,
      });
    });

    it("should convert hex colors to HSL", () => {
      expect(parseColor("#ff0000", "hsl")).toEqual({ h: 0, s: 100, l: 50 });
      expect(parseColor("#00ff00", "hsl")).toEqual({ h: 120, s: 100, l: 50 });
    });

    it("should throw error for invalid color formats", () => {
      expect(() => parseColor("invalid", "rgb")).toThrow(
        "Unsupported color format"
      );
      expect(() => parseColor("#xyz", "rgb")).toThrow(
        "Invalid hex color format"
      );
      expect(() => parseColor("rgb(invalid)", "rgb")).toThrow(
        "Invalid RGB color format"
      );
      expect(() => parseColor("hsl(invalid)", "hsl")).toThrow(
        "Invalid HSL color format"
      );
    });
  });

  describe("rgbToHsl", () => {
    it("should convert RGB to HSL correctly", () => {
      expect(rgbToHsl({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 100, l: 50 });
      expect(rgbToHsl({ r: 0, g: 255, b: 0 })).toEqual({
        h: 120,
        s: 100,
        l: 50,
      });
      expect(rgbToHsl({ r: 0, g: 0, b: 255 })).toEqual({
        h: 240,
        s: 100,
        l: 50,
      });
      expect(rgbToHsl({ r: 255, g: 255, b: 255 })).toEqual({
        h: 0,
        s: 0,
        l: 100,
      });
      expect(rgbToHsl({ r: 0, g: 0, b: 0 })).toEqual({ h: 0, s: 0, l: 0 });
    });
  });

  describe("hslToRgb", () => {
    it("should convert HSL to RGB correctly", () => {
      expect(hslToRgb({ h: 0, s: 100, l: 50 })).toEqual({ r: 255, g: 0, b: 0 });
      expect(hslToRgb({ h: 120, s: 100, l: 50 })).toEqual({
        r: 0,
        g: 255,
        b: 0,
      });
      expect(hslToRgb({ h: 240, s: 100, l: 50 })).toEqual({
        r: 0,
        g: 0,
        b: 255,
      });
      expect(hslToRgb({ h: 0, s: 0, l: 100 })).toEqual({
        r: 255,
        g: 255,
        b: 255,
      });
      expect(hslToRgb({ h: 0, s: 0, l: 0 })).toEqual({ r: 0, g: 0, b: 0 });
    });
  });
});

describe("toCSSString", () => {
  it("should convert RGB object to CSS rgb string", () => {
    const rgb: RGB = { r: 255, g: 0, b: 0 };
    expect(toCSSString(rgb)).toBe("rgb(255, 0, 0)");
  });

  it("should convert RGB object with alpha to CSS rgba string", () => {
    const rgba: RGB = { r: 255, g: 0, b: 0, a: 0.5 };
    expect(toCSSString(rgba)).toBe("rgba(255, 0, 0, 0.5)");
  });

  it("should convert HSL object to CSS hsl string", () => {
    const hsl: HSL = { h: 0, s: 100, l: 50 };
    expect(toCSSString(hsl)).toBe("hsl(0, 100%, 50%)");
  });

  it("should convert HSL object with alpha to CSS hsla string", () => {
    const hsla: HSL = { h: 0, s: 100, l: 50, a: 0.5 };
    expect(toCSSString(hsla)).toBe("hsla(0, 100%, 50%, 0.5)");
  });
});
