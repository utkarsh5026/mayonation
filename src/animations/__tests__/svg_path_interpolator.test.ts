/// @vitest-environment jsdom
import {
  InterpolationError,
  LineInterpolator,
  INTERPOLATION_CONSTANTS,
} from "../svg/path_interpolate";
import { describe, expect, test, beforeEach } from "vitest";

describe("LineInterpolator", () => {
  let interpolator: LineInterpolator;

  beforeEach(() => {
    interpolator = new LineInterpolator();
  });

  // Basic Interpolation Tests
  describe("basic interpolation", () => {
    test("interpolates horizontal line correctly", () => {
      const start = { x: 0, y: 0 };
      const end = { x: 10, y: 0 };
      const result = interpolator.interpolate(start, end, 1, { steps: 2 });

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ x: 0, y: 0 });
      expect(result[1]).toEqual({ x: 5, y: 0 });
      expect(result[2]).toEqual({ x: 10, y: 0 });
    });

    test("interpolates vertical line correctly", () => {
      const start = { x: 0, y: 0 };
      const end = { x: 0, y: 10 };
      const result = interpolator.interpolate(start, end, 1, { steps: 2 });

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ x: 0, y: 0 });
      expect(result[1]).toEqual({ x: 0, y: 5 });
      expect(result[2]).toEqual({ x: 0, y: 10 });
    });

    test("interpolates diagonal line correctly", () => {
      const start = { x: 0, y: 0 };
      const end = { x: 10, y: 10 };
      const result = interpolator.interpolate(start, end, 1, { steps: 4 });

      expect(result).toHaveLength(5);
      expect(result[0]).toEqual({ x: 0, y: 0 });
      expect(result[2]).toEqual({ x: 5, y: 5 });
      expect(result[4]).toEqual({ x: 10, y: 10 });
    });
  });

  // Progress Tests
  describe("progress parameter", () => {
    test("handles 0% progress", () => {
      const start = { x: 0, y: 0 };
      const end = { x: 10, y: 10 };
      const result = interpolator.interpolate(start, end, 0, { steps: 2 });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(start);
    });

    test("handles 50% progress", () => {
      const start = { x: 0, y: 0 };
      const end = { x: 10, y: 10 };
      const result = interpolator.interpolate(start, end, 0.5, { steps: 2 });

      expect(result[result.length - 1]).toEqual({ x: 5, y: 5 });
    });

    test("clamps progress values outside 0-1 range", () => {
      const start = { x: 0, y: 0 };
      const end = { x: 10, y: 10 };

      const resultNegative = interpolator.interpolate(start, end, -0.5, {
        steps: 2,
      });
      expect(resultNegative[0]).toEqual(start);

      const resultOver = interpolator.interpolate(start, end, 1.5, {
        steps: 2,
      });
      expect(resultOver[resultOver.length - 1]).toEqual(end);
    });
  });

  // Attribute Interpolation Tests
  describe("attribute interpolation", () => {
    test("interpolates pressure linearly", () => {
      const start = { x: 0, y: 0, pressure: 0.2 };
      const end = { x: 10, y: 10, pressure: 0.8 };
      const result = interpolator.interpolate(start, end, 1, { steps: 2 });

      expect(result[0].pressure).toBe(0.2);
      expect(result[1].pressure).toBe(0.5);
      expect(result[2].pressure).toBe(0.8);
    });

    test("interpolates angle correctly", () => {
      const start = { x: 0, y: 0, angle: 0 };
      const end = { x: 10, y: 10, angle: 90 };
      const result = interpolator.interpolate(start, end, 1, { steps: 2 });

      expect(result[0].angle).toBe(0);
      expect(result[1].angle).toBe(45);
      expect(result[2].angle).toBe(90);
    });

    test("handles missing optional attributes", () => {
      const start = { x: 0, y: 0, pressure: 0.5 };
      const end = { x: 10, y: 10 };
      const result = interpolator.interpolate(start, end, 1, { steps: 1 });

      expect(result[0]).toHaveProperty("x");
      expect(result[0]).toHaveProperty("y");
      expect(result[0]).not.toHaveProperty("pressure");
    });
  });

  // Edge Cases and Error Handling
  describe("edge cases and errors", () => {
    test("handles identical start and end points", () => {
      const point = { x: 5, y: 5 };
      const result = interpolator.interpolate(point, point, 1);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(point);
    });

    test("throws on invalid coordinates", () => {
      const start = { x: 0, y: 0 };
      const end = { x: Infinity, y: 10 };

      expect(() => {
        interpolator.interpolate(start, end, 1);
      }).toThrow(InterpolationError);
    });

    test("throws on NaN coordinates", () => {
      const start = { x: 0, y: 0 };
      const end = { x: NaN, y: 10 };

      expect(() => {
        interpolator.interpolate(start, end, 1);
      }).toThrow(InterpolationError);
    });

    test("respects min and max step constraints", () => {
      const start = { x: 0, y: 0 };
      const end = { x: 10, y: 10 };

      const resultMin = interpolator.interpolate(start, end, 1, { steps: 1 });
      expect(resultMin.length).toBeGreaterThanOrEqual(
        INTERPOLATION_CONSTANTS.MIN_STEPS
      );

      const resultMax = interpolator.interpolate(start, end, 1, {
        steps: 2000,
      });
      expect(resultMax.length).toBeLessThanOrEqual(
        INTERPOLATION_CONSTANTS.MAX_STEPS + 1
      );
    });
  });

  // Utility Method Tests
  describe("utility methods", () => {
    test("calculateLength returns correct distance", () => {
      const start = { x: 0, y: 0 };
      const end = { x: 3, y: 4 };

      expect(interpolator.calculateLength(start, end)).toBe(5);
    });

    test("getPointAtDistance returns correct point", () => {
      const start = { x: 0, y: 0 };
      const end = { x: 10, y: 0 };
      const point = interpolator.getPointAtDistance(start, end, 5);

      expect(point).toEqual({ x: 5, y: 0 });
    });

    test("getAngle returns correct angle in degrees", () => {
      const start = { x: 0, y: 0 };
      const end = { x: 10, y: 10 };
      const angle = interpolator.getAngle(start, end);

      expect(angle).toBe(45);
    });
  });
});
