import { createValue } from "../../core/animation-val";
import {
  interpolateScale,
  interpolateRotation,
  interpolateLinear,
  type RotationOptions,
} from "../transform_handler";
import { describe, it, expect } from "vitest";

describe("Transform Interpolation Functions", () => {
  describe("interpolateScale", () => {
    it("should correctly interpolate scale values", () => {
      const from = createValue.numeric(1, "");
      const to = createValue.numeric(4, "");
      expect(interpolateScale(from, to, 0).value).toBeCloseTo(1);
      expect(interpolateScale(from, to, 0.5).value).toBeCloseTo(2);
      expect(interpolateScale(from, to, 1).value).toBeCloseTo(4);
    });

    it("should maintain the same unit", () => {
      const from = createValue.numeric(1, "");
      const to = createValue.numeric(4, "");

      expect(interpolateScale(from, to, 0.5).unit).toBe("");
    });

    it("should throw error for negative or zero scale values", () => {
      const from = createValue.numeric(-1, "");
      const to = createValue.numeric(4, "");

      expect(() => interpolateScale(from, to, 0.5)).toThrow();
    });
  });

  describe("interpolateRotation", () => {
    it("should interpolate rotation values using shortest path by default", () => {
      const from = createValue.numeric(350, "deg");
      const to = createValue.numeric(10, "deg");

      expect(interpolateRotation(from, to, 0).value).toBeCloseTo(350);
      expect(interpolateRotation(from, to, 0.5).value).toBeCloseTo(0);
      expect(interpolateRotation(from, to, 1).value).toBeCloseTo(10);
    });

    it("should respect clockwise direction option", () => {
      const from = createValue.numeric(350, "deg");
      const to = createValue.numeric(10, "deg");
      const options: RotationOptions = { direction: "clockwise" };

      expect(interpolateRotation(from, to, 0.5, options).value).toBeCloseTo(0);
    });

    it("should respect counterclockwise direction option", () => {
      const from = createValue.numeric(10, "deg");
      const to = createValue.numeric(350, "deg");
      const options: RotationOptions = { direction: "counterclockwise" };

      expect(interpolateRotation(from, to, 0.5, options).value).toBeCloseTo(0);
    });

    it("should maintain revolution when specified", () => {
      const from = createValue.numeric(710, "deg"); // 710° = 350° + 360°
      const to = createValue.numeric(730, "deg"); // 730° = 10° + 720°
      const options: RotationOptions = { maintainRevolution: true };

      expect(interpolateRotation(from, to, 0.5, options).value).toBeCloseTo(
        720
      );
    });

    it("should always return values in degrees", () => {
      const from = createValue.numeric(0, "deg");
      const to = createValue.numeric(180, "deg");

      expect(interpolateRotation(from, to, 0.5).unit).toBe("deg");
    });
  });

  describe("interpolateLinear", () => {
    it("should correctly interpolate linear values", () => {
      const from = createValue.numeric(0, "px");
      const to = createValue.numeric(100, "px");

      expect(interpolateLinear(from, to, 0).value).toBeCloseTo(0);
      expect(interpolateLinear(from, to, 0.5).value).toBeCloseTo(50);
      expect(interpolateLinear(from, to, 1).value).toBeCloseTo(100);
    });

    it("should work with negative values", () => {
      const from = createValue.numeric(-50, "px");
      const to = createValue.numeric(50, "px");

      expect(interpolateLinear(from, to, 0.5).value).toBeCloseTo(0);
    });

    it("should maintain the same unit", () => {
      const from = createValue.numeric(0, "px");
      const to = createValue.numeric(100, "px");

      expect(interpolateLinear(from, to, 0.5).unit).toBe("px");
    });

    it("should handle different units", () => {
      const tests = ["px", "%", "em", "rem", "vh", "vw"];

      tests.forEach((unit) => {
        const from = createValue.numeric(0, unit as any);
        const to = createValue.numeric(100, unit as any);
        expect(interpolateLinear(from, to, 0.5).unit).toBe(unit);
      });
    });
  });
});
