import { NumericInterpolator, ColorInterpolator } from "../interpolate";
import { describe, expect, test } from "vitest";
describe("NumericInterpolator", () => {
  describe("linear interpolation", () => {
    const interpolator = new NumericInterpolator("linear");

    test("interpolates between two numbers linearly", () => {
      expect(interpolator.interpolate(0, 100, 0.5)).toBe(50);
      expect(interpolator.interpolate(0, 100, 0.25)).toBe(25);
      expect(interpolator.interpolate(0, 100, 0)).toBe(0);
      expect(interpolator.interpolate(0, 100, 1)).toBe(100);
    });

    test("handles negative numbers", () => {
      expect(interpolator.interpolate(-100, 100, 0.5)).toBe(0);
      expect(interpolator.interpolate(-50, -25, 0.5)).toBe(-37.5);
    });
  });

  describe("logarithmic interpolation", () => {
    const interpolator = new NumericInterpolator("logarithmic");

    test("interpolates between positive numbers logarithmically", () => {
      expect(interpolator.interpolate(1, 100, 0.5)).toBeCloseTo(10);
      expect(interpolator.interpolate(1, 1000, 0.5)).toBeCloseTo(31.622776601);
    });

    test("handles very small numbers using epsilon", () => {
      const result = interpolator.interpolate(0, 100, 0.5);
      expect(result).toBeGreaterThan(0);
    });
  });
});

describe("ColorInterpolator", () => {
  describe("RGB interpolation", () => {
    const interpolator = new ColorInterpolator("rgb");

    test("interpolates between two RGB colors", () => {
      const black = { r: 0, g: 0, b: 0 };
      const white = { r: 255, g: 255, b: 255 };

      expect(interpolator.interpolate(black, white, 0.5)).toEqual({
        r: 128,
        g: 128,
        b: 128,
      });
    });

    test("handles partial progress", () => {
      const red = { r: 255, g: 0, b: 0 };
      const blue = { r: 0, g: 0, b: 255 };

      expect(interpolator.interpolate(red, blue, 0.25)).toEqual({
        r: 191,
        g: 0,
        b: 64,
      });
    });
  });

  describe("HSL interpolation", () => {
    const interpolator = new ColorInterpolator("hsl");

    test("interpolates between two HSL colors", () => {
      const red = { h: 0, s: 100, l: 50 };
      const blue = { h: 240, s: 100, l: 50 };

      expect(interpolator.interpolate(red, blue, 0.5)).toEqual({
        h: 300,
        s: 100,
        l: 50,
      });
    });

    test("handles hue wrapping around 360 degrees", () => {
      const red = { h: 0, s: 100, l: 50 };
      const purple = { h: 300, s: 100, l: 50 };

      // Should go counterclockwise (through 330) instead of clockwise
      expect(interpolator.interpolate(red, purple, 0.5)).toEqual({
        h: 330,
        s: 100,
        l: 50,
      });
    });

    test("interpolates saturation and lightness", () => {
      const color1 = { h: 0, s: 0, l: 0 };
      const color2 = { h: 0, s: 100, l: 100 };

      expect(interpolator.interpolate(color1, color2, 0.5)).toEqual({
        h: 0,
        s: 50,
        l: 50,
      });
    });
  });
});
