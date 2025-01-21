/// @vitest-environment jsdom
import { normalizeAngle } from "../../utils/math";
import {
  InterpolationError,
  LineInterpolator,
  QuadraticBezierInterpolator,
  INTERPOLATION_CONSTANTS,
} from "../svg/path_interpolate";
import type { Point } from "../svg/unit";
import { describe, expect, test, beforeEach, it } from "vitest";

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

describe("QuadraticBezierInterpolator", () => {
  const interpolator = new QuadraticBezierInterpolator();

  const expectPointsClose = (actual: Point, expected: Point) => {
    expect(actual.x).toBeCloseTo(expected.x, 6);
    expect(actual.y).toBeCloseTo(expected.y, 6);
    if (expected.pressure !== undefined) {
      expect(actual.pressure).toBeCloseTo(expected.pressure, 6);
    }
    if (expected.angle !== undefined) {
      const normalizedActual = normalizeAngle(actual.angle ?? 0);
      const normalizedExpected = normalizeAngle(expected.angle ?? 0);
      expect(normalizedActual).toBeCloseTo(normalizedExpected, 6);
    }
  };

  describe("Basic Interpolation", () => {
    it("should interpolate a simple quadratic curve", () => {
      const points = {
        start: { x: 0, y: 0 },
        control1: { x: 50, y: 100 },
        end: { x: 100, y: 0 },
      };

      const result = interpolator.interpolate(points, 1);

      expectPointsClose(result[0], points.start);
      expectPointsClose(result[result.length - 1], points.end);

      const midPoint = result[Math.floor(result.length / 2)];
      expect(midPoint.x).toBeCloseTo(50, 1);
      expect(midPoint.y).toBeCloseTo(50, 1);
    });

    it("should handle partial progress", () => {
      const points = {
        start: { x: 0, y: 0 },
        control1: { x: 50, y: 100 },
        end: { x: 100, y: 0 },
      };

      const result = interpolator.interpolate(points, 0.5);
      expect(result[result.length - 1].x).toBeCloseTo(50, 1);
    });
  });

  describe("Pressure Interpolation", () => {
    it("should interpolate pressure values", () => {
      const points = {
        start: { x: 0, y: 0, pressure: 0 },
        control1: { x: 50, y: 100, pressure: 0.5 },
        end: { x: 100, y: 0, pressure: 1 },
      };

      const result = interpolator.interpolate(points, 1);
      expect(result[0].pressure).toBe(0);
      expect(result[result.length - 1].pressure).toBe(1);
    });

    it("should handle missing pressure values", () => {
      const points = {
        start: { x: 0, y: 0 },
        control1: { x: 50, y: 100 },
        end: { x: 100, y: 0, pressure: 1 },
      };

      const result = interpolator.interpolate(points, 1);
      expect(result[0].pressure).toBeUndefined();
    });
  });

  describe("Angle Interpolation", () => {
    it("should interpolate angle values", () => {
      const points = {
        start: { x: 0, y: 0, angle: 0 },
        control1: { x: 50, y: 100, angle: 180 },
        end: { x: 100, y: 0, angle: 360 },
      };

      const result = interpolator.interpolate(points, 1);
      expect(result[0].angle).toBe(0);
      expect(result[result.length - 1].angle).toBeCloseTo(0, 6); // 360° === 0°
    });

    it("should handle angle wraparound", () => {
      const points = {
        start: { x: 0, y: 0, angle: -30 },
        control1: { x: 50, y: 100, angle: 180 },
        end: { x: 100, y: 0, angle: 390 },
      };

      const result = interpolator.interpolate(points, 1);
      expect(result[0].angle).toBeCloseTo(330, 6); // -30° normalized to 330°
      expect(result[result.length - 1].angle).toBeCloseTo(30, 6); // 390° normalized to 30°
    });
  });

  describe("Error Handling", () => {
    it("should throw on missing control point", () => {
      const points = {
        start: { x: 0, y: 0 },
        end: { x: 100, y: 0 },
      };

      expect(() => interpolator.interpolate(points, 1)).toThrow(
        InterpolationError
      );
    });

    it("should throw on invalid control point coordinates", () => {
      const points = {
        start: { x: 0, y: 0 },
        control1: { x: Infinity, y: 100 },
        end: { x: 100, y: 0 },
      };

      expect(() => interpolator.interpolate(points, 1)).toThrow(
        InterpolationError
      );
    });

    it("should handle NaN values", () => {
      const points = {
        start: { x: 0, y: 0 },
        control1: { x: NaN, y: 100 },
        end: { x: 100, y: 0 },
      };

      expect(() => interpolator.interpolate(points, 1)).toThrow(
        InterpolationError
      );
    });
  });

  describe("Adaptive Steps", () => {
    it("should use more steps for complex curves", () => {
      const simplePoints = {
        start: { x: 0, y: 0 },
        control1: { x: 50, y: 0 },
        end: { x: 100, y: 0 },
      };

      const complexPoints = {
        start: { x: 0, y: 0 },
        control1: { x: 50, y: 200 },
        end: { x: 100, y: 0 },
      };

      const simpleResult = interpolator.interpolate(simplePoints, 1, {
        adaptiveSteps: true,
      });
      const complexResult = interpolator.interpolate(complexPoints, 1, {
        adaptiveSteps: true,
      });

      expect(complexResult.length).toBeGreaterThan(simpleResult.length);
    });

    it("should respect minStepSize", () => {
      const points = {
        start: { x: 0, y: 0 },
        control1: { x: 50, y: 100 },
        end: { x: 100, y: 0 },
      };

      const result1 = interpolator.interpolate(points, 1, {
        adaptiveSteps: true,
        minStepSize: 1,
      });
      const result2 = interpolator.interpolate(points, 1, {
        adaptiveSteps: true,
        minStepSize: 10,
      });

      expect(result1.length).toBeGreaterThan(result2.length);
    });
  });

  describe("Edge Cases", () => {
    it("should handle coincident points", () => {
      const points = {
        start: { x: 0, y: 0 },
        control1: { x: 0, y: 0 },
        end: { x: 0, y: 0 },
      };

      const result = interpolator.interpolate(points, 1);
      expect(result.every((p) => p.x === 0 && p.y === 0)).toBe(true);
    });

    it("should handle zero progress", () => {
      const points = {
        start: { x: 0, y: 0 },
        control1: { x: 50, y: 100 },
        end: { x: 100, y: 0 },
      };

      const result = interpolator.interpolate(points, 0);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toEqual(points.start);
    });

    it("should clamp progress values", () => {
      const points = {
        start: { x: 0, y: 0 },
        control1: { x: 50, y: 100 },
        end: { x: 100, y: 0 },
      };

      const result1 = interpolator.interpolate(points, -1);
      const result2 = interpolator.interpolate(points, 2);

      expectPointsClose(result1[0], points.start);
      expectPointsClose(result2[result2.length - 1], points.end);
    });
  });
});
