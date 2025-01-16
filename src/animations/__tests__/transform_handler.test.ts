/// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from "vitest";
import type { TransformPropertyName } from "../transform/units";
import { TransformHandler } from "../transform/handler";
import { createValue, NumericValue } from "../../core/animation-val";

describe("TransformHandler", () => {
  let element: HTMLElement;
  let handler: TransformHandler;

  beforeEach(() => {
    element = document.createElement("div");
    document.body.appendChild(element);
    handler = new TransformHandler(element);
  });

  describe("initialization", () => {
    it("should initialize with default transform state", () => {
      expect(handler.computeTransform()).toBe("");
    });
  });

  describe("transform updates", () => {
    it("should handle translation updates", () => {
      handler.updateTransform("translateX", createValue.numeric(100, "px"));
      expect(handler.computeTransform()).toBe("translate3d(100px, 0px, 0px)");
    });

    it("should handle rotation updates", () => {
      handler.updateTransform("rotate", createValue.numeric(90, "deg"));
      expect(handler.computeTransform()).toBe("rotateZ(90deg)");
    });

    it("should handle scale updates", () => {
      handler.updateTransform("scale", createValue.numeric(2, ""));
      expect(handler.computeTransform()).toBe("scale3d(2, 2, 1)");
    });

    it("should handle multiple transform updates", () => {
      const updates = new Map<TransformPropertyName, NumericValue>([
        ["translateX", createValue.numeric(100, "px")],
        ["rotate", createValue.numeric(90, "deg")],
        ["scale", createValue.numeric(2, "")],
      ]);

      handler.updateTransforms(updates);
      expect(handler.computeTransform()).toBe(
        "translate3d(100px, 0px, 0px) rotateZ(90deg) scale3d(2, 2, 1)"
      );
    });

    it("should handle negative translations", () => {
      handler.updateTransform("translateX", createValue.numeric(-100, "px"));
      expect(handler.computeTransform()).toBe("translate3d(-100px, 0px, 0px)");
    });

    it("should handle fractional translations", () => {
      handler.updateTransform("translateX", createValue.numeric(10.5, "px"));
      expect(handler.computeTransform()).toBe("translate3d(10.5px, 0px, 0px)");
    });

    it("should handle multiple axis translations", () => {
      handler.updateTransform("translate", createValue.numeric(100, "px"));
      expect(handler.computeTransform()).toBe("translate3d(100px, 100px, 0px)");
    });

    it("should handle rotation beyond 360 degrees", () => {
      handler.updateTransform("rotate", createValue.numeric(720, "deg"));
      expect(handler.computeTransform()).toBe("rotateZ(720deg)");
    });

    it("should handle negative rotation", () => {
      handler.updateTransform("rotate", createValue.numeric(-90, "deg"));
      expect(handler.computeTransform()).toBe("rotateZ(-90deg)");
    });

    it("should handle fractional scale values", () => {
      handler.updateTransform("scale", createValue.numeric(1.5, ""));
      expect(handler.computeTransform()).toBe("scale3d(1.5, 1.5, 1)");
    });

    it("should handle very small scale values", () => {
      handler.updateTransform("scale", createValue.numeric(0.0001, ""));
      expect(handler.computeTransform()).toBe("scale3d(0.0001, 0.0001, 1)");
    });
  });

  describe("getCurrentTransform", () => {
    it("should return current transform values", () => {
      handler.updateTransform("translateX", createValue.numeric(100, "px"));
      const value = handler.getCurrentTransform("translateX");
      expect(value).toEqual(createValue.numeric(100, "px"));
    });

    it("should throw error for invalid property", () => {
      expect(() => {
        handler.getCurrentTransform("invalid" as any);
      }).toThrow("Invalid transform property: invalid");
    });
  });

  describe("interpolation", () => {
    it("should interpolate translation linearly", () => {
      const result = handler.interpolate(
        "translateX",
        createValue.numeric(0, "px"),
        createValue.numeric(100, "px"),
        0.5
      );
      expect(result).toEqual(createValue.numeric(50, "px"));
    });

    it("should interpolate rotation using shortest path", () => {
      const result = handler.interpolate(
        "rotate",
        createValue.numeric(0, "deg"),
        createValue.numeric(180, "deg"),
        0.5
      );
      expect(result).toEqual(createValue.numeric(90, "deg"));
    });

    it("should interpolate scale logarithmically", () => {
      const result = handler.interpolate(
        "scale",
        createValue.numeric(1, ""),
        createValue.numeric(4, ""),
        0.5
      );
      expect(result.value).toBeCloseTo(2); // Geometric mean of 1 and 4
      expect(result.unit).toBe("");
    });

    it("should handle rotation interpolation beyond 360 degrees", () => {
      const result = handler.interpolate(
        "rotate",
        createValue.numeric(0, "deg"),
        createValue.numeric(720, "deg"),
        0.5
      );
      expect(result).toEqual(createValue.numeric(360, "deg"));
    });

    it("should handle negative to positive rotation interpolation", () => {
      const result = handler.interpolate(
        "rotate",
        createValue.numeric(-180, "deg"),
        createValue.numeric(180, "deg"),
        0.5
      );
      expect(result).toEqual(createValue.numeric(0, "deg"));
    });

    it("should handle very small scale interpolation", () => {
      const result = handler.interpolate(
        "scale",
        createValue.numeric(0.0001, ""),
        createValue.numeric(1, ""),
        0.5
      );
      expect(result.value).toBeGreaterThan(0);
      expect(result.unit).toBe("");
    });

    it("should throw error for invalid scale values", () => {
      expect(() => {
        handler.interpolate(
          "scale",
          createValue.numeric(-1, ""),
          createValue.numeric(1, ""),
          0.5
        );
      }).toThrow("Scale values must be positive numbers");
    });
  });

  describe("reset", () => {
    it("should reset all transforms to initial state", () => {
      handler.updateTransform("translateX", createValue.numeric(100, "px"));
      handler.updateTransform("rotate", createValue.numeric(90, "deg"));
      handler.reset();
      expect(handler.computeTransform()).toBe("");
    });
  });

  describe("static methods", () => {
    it("should validate transform properties", () => {
      expect(TransformHandler.isTransformProperty("translateX")).toBe(true);
      expect(TransformHandler.isTransformProperty("invalid")).toBe(false);
    });
  });

  describe("transform state management", () => {
    it("should maintain transform order consistency", () => {
      const updates = new Map<TransformPropertyName, NumericValue>([
        ["scale", createValue.numeric(2, "")],
        ["rotate", createValue.numeric(90, "deg")],
        ["translateX", createValue.numeric(100, "px")],
      ]);

      handler.updateTransforms(updates);
      const transform = handler.computeTransform();
      // Order should be: translate -> rotate -> scale
      expect(transform).toBe(
        "translate3d(100px, 0px, 0px) rotateZ(90deg) scale3d(2, 2, 1)"
      );
    });

    it("should handle multiple updates to same property", () => {
      handler.updateTransform("translateX", createValue.numeric(100, "px"));
      handler.updateTransform("translateX", createValue.numeric(200, "px"));
      expect(handler.computeTransform()).toBe("translate3d(200px, 0px, 0px)");
    });

    it("should handle concurrent updates to different axes", () => {
      handler.updateTransform("translateX", createValue.numeric(100, "px"));
      handler.updateTransform("translateY", createValue.numeric(200, "px"));
      expect(handler.computeTransform()).toBe("translate3d(100px, 200px, 0px)");
    });
  });

  describe("error handling", () => {
    it("should throw error for invalid transform axis", () => {
      expect(() => {
        (handler as any).parseTransformProperty("invalid");
      }).toThrow("Invalid transform property: invalid");
    });

    it("should handle zero values correctly", () => {
      handler.updateTransform("translateX", createValue.numeric(0, "px"));
      handler.updateTransform("rotate", createValue.numeric(0, "deg"));
      handler.updateTransform("scale", createValue.numeric(1, ""));
      expect(handler.computeTransform()).toBe("");
    });

    it("should validate transform property units", () => {
      const value = handler.parseTransformValue("rotate", 90);
      expect(value.unit).toBe("deg");
    });
  });

  describe("caching behavior", () => {
    it("should cache transform string when unchanged", () => {
      handler.updateTransform("translateX", createValue.numeric(100, "px"));
      const first = handler.computeTransform();
      const second = handler.computeTransform();
      expect(first).toBe(second);
    });

    it("should update cache when transform changes", () => {
      handler.updateTransform("translateX", createValue.numeric(100, "px"));
      const first = handler.computeTransform();
      handler.updateTransform("translateX", createValue.numeric(200, "px"));
      const second = handler.computeTransform();
      expect(first).not.toBe(second);
    });
  });
});
