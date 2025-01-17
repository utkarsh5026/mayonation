/// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from "vitest";
import PathBuilder from "../svg/path-builder";

describe("PathBuilder", () => {
  let pathBuilder: PathBuilder;

  beforeEach(() => {
    pathBuilder = new PathBuilder();
  });

  describe("Basic Path Commands", () => {
    it("should create a simple move command", () => {
      const path = pathBuilder.moveTo(100, 100).toString();
      expect(path).toBe("M 100 100");
    });

    it("should create a line command", () => {
      const path = pathBuilder.moveTo(0, 0).lineTo(100, 100).toString();
      expect(path).toBe("M 0 0 L 100 100");
    });

    it("should create horizontal and vertical lines", () => {
      const path = pathBuilder
        .moveTo(0, 0)
        .horizontalLineTo(100)
        .verticalLineTo(100)
        .toString();
      expect(path).toBe("M 0 0 H 100 V 100");
    });

    it("should close a path properly", () => {
      const path = pathBuilder
        .moveTo(0, 0)
        .lineTo(100, 0)
        .lineTo(100, 100)
        .closePath()
        .toString();
      expect(path).toBe("M 0 0 L 100 0 L 100 100 Z");
    });
  });

  describe("Curve Commands", () => {
    it("should create a cubic bezier curve", () => {
      const path = pathBuilder
        .moveTo(0, 0)
        .curveTo(20, 20, 40, 20, 50, 0)
        .toString();
      expect(path).toBe("M 0 0 C 20 20, 40 20, 50 0");
    });

    it("should create a smooth cubic bezier curve", () => {
      const path = pathBuilder
        .moveTo(0, 0)
        .smoothCurveTo(40, 20, 50, 0)
        .toString();
      expect(path).toBe("M 0 0 S 40 20, 50 0");
    });

    it("should create a quadratic curve", () => {
      const path = pathBuilder
        .moveTo(0, 0)
        .quadraticCurveTo(25, 25, 50, 0)
        .toString();
      expect(path).toBe("M 0 0 Q 25 25, 50 0");
    });
  });

  describe("Arc Commands", () => {
    it("should create an arc", () => {
      const path = pathBuilder
        .moveTo(0, 0)
        .arcTo(30, 30, 0, 0, 1, 60, 60)
        .toString();
      expect(path).toBe("M 0 0 A 30 30 0 0 1 60 60");
    });

    it("should handle different arc flags", () => {
      const path = pathBuilder
        .moveTo(0, 0)
        .arcTo(30, 30, 0, 1, 0, 60, 60)
        .toString();
      expect(path).toBe("M 0 0 A 30 30 0 1 0 60 60");
    });
  });

  describe("Edge Cases and Validation", () => {
    it("should handle zero-length paths", () => {
      const path = new PathBuilder().toString();
      expect(path).toBe("");
    });

    it("should handle multiple consecutive moves", () => {
      const path = pathBuilder.moveTo(0, 0).moveTo(50, 50).toString();
      expect(path).toBe("M 0 0 M 50 50");
    });
  });

  describe("Complex Path Construction", () => {
    it("should create a complex path with multiple command types", () => {
      const path = pathBuilder
        .moveTo(0, 0)
        .lineTo(50, 0)
        .arcTo(25, 25, 0, 0, 1, 50, 50)
        .quadraticCurveTo(75, 75, 100, 50)
        .curveTo(125, 25, 150, 25, 200, 50)
        .closePath()
        .toString();

      // Verify the path contains all expected command types
      expect(path).toContain("M"); // Move
      expect(path).toContain("L"); // Line
      expect(path).toContain("A"); // Arc
      expect(path).toContain("Q"); // Quadratic curve
      expect(path).toContain("C"); // Cubic curve
      expect(path).toContain("Z"); // Close path
    });
  });
});
