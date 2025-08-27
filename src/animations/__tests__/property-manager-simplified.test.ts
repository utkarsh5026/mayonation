/// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PropertyManager } from "../prop-manager/property-manager";
import { createValue } from "../../core/animation-val";
import type { CSSPropertyName } from "../styles/type";
import type { TransformPropertyName } from "../transform/types";

describe("PropertyManager - Comprehensive Test Suite", () => {
  let element: HTMLElement;
  let manager: PropertyManager;
  let parentElement: HTMLElement;

  beforeEach(() => {
    // Create DOM structure
    document.body.innerHTML = '<div id="parent"><div id="target"></div></div>';
    parentElement = document.getElementById("parent") as HTMLElement;
    element = document.getElementById("target") as HTMLElement;

    // Setup parent dimensions
    Object.defineProperty(parentElement, "getBoundingClientRect", {
      value: () => ({ width: 500, height: 300 }),
    });

    // Mock getComputedStyle
    Object.defineProperty(window, "getComputedStyle", {
      value: (el: HTMLElement) => ({
        getPropertyValue: (prop: string) => {
          const styles: Record<string, string> = {
            opacity: "1",
            width: "100px",
            height: "200px",
            "background-color": "rgb(255, 0, 0)",
            color: "rgb(0, 0, 0)",
            "border-width": "1px",
            "border-radius": "5px",
            "font-size": "16px",
            transform: "matrix(1, 0, 0, 1, 0, 0)",
          };
          return styles[prop] || "0";
        },
        fontSize: "16px",
      }),
      configurable: true,
    });

    manager = new PropertyManager(element);
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  describe("Unit Tests - Core Functionality", () => {
    describe("constructor and initialization", () => {
      it("should create PropertyManager with default options", () => {
        expect(manager).toBeInstanceOf(PropertyManager);
      });

      it("should create PropertyManager with custom options", () => {
        const options = {
          colorSpace: "rgb" as const,
          batchUpdates: false,
          precision: 2,
          useGPUAcceleration: false,
        };
        const customManager = new PropertyManager(element, options);
        expect(customManager).toBeInstanceOf(PropertyManager);
      });
    });

    describe("parse method", () => {
      it("should parse CSS numeric properties", () => {
        const result = manager.parse("width", "200px");
        expect(result).toEqual(createValue.numeric(200, "px"));
      });

      it("should parse CSS color properties", () => {
        const result = manager.parse("backgroundColor", "#ff0000");
        expect(result?.type).toBe("color");
      });

      it("should parse transform numeric properties", () => {
        const result = manager.parse("translateX", 100);
        expect(result).toEqual(createValue.numeric(100, "px"));
      });

      it("should return fallback for invalid parsing", () => {
        const result = manager.parse("width", "invalid-value");
        expect(result).toEqual(createValue.numeric(0, "px"));
      });
    });

    describe("interpolate method", () => {
      it("should interpolate CSS numeric properties", () => {
        const from = createValue.numeric(0, "px");
        const to = createValue.numeric(100, "px");
        const result = manager.interpolate("width", from, to, 0.5);
        expect(result).toEqual(createValue.numeric(50, "px"));
      });

      it("should interpolate transform properties", () => {
        const from = createValue.numeric(0, "px");
        const to = createValue.numeric(100, "px");
        const result = manager.interpolate("translateX", from, to, 0.3);
        expect(result).toEqual(createValue.numeric(30, "px"));
      });

      it("should validate progress range", () => {
        const from = createValue.numeric(0, "px");
        const to = createValue.numeric(100, "px");

        expect(() => manager.interpolate("width", from, to, -0.1)).toThrow();
        expect(() => manager.interpolate("width", from, to, 1.1)).toThrow();
      });

      it("should validate value types match", () => {
        const numericValue = createValue.numeric(10, "px");
        const colorValue = createValue.rgb(255, 0, 0, 1);

        expect(() =>
          manager.interpolate("width", numericValue, colorValue, 0.5)
        ).toThrow();
      });
    });

    describe("getCurrentValue method", () => {
      it("should get current CSS property values", () => {
        const value = manager.getCurrentValue("width");
        expect(value).toEqual(createValue.numeric(100, "px"));
      });

      it("should get current transform property values", () => {
        const value = manager.getCurrentValue("translateX");
        expect(value).toEqual(createValue.numeric(0, "px"));
      });

      it("should cache values for performance", () => {
        const value1 = manager.getCurrentValue("opacity");
        const value2 = manager.getCurrentValue("opacity");
        expect(value1).toEqual(value2);
      });
    });

    describe("updateProperty method", () => {
      it("should handle CSS property updates with batching disabled", async () => {
        const noBatchManager = new PropertyManager(element, {
          batchUpdates: false,
        });
        const value = createValue.numeric(250, "px");

        noBatchManager.updateProperty("width", value);

        // Give some time for DOM update
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(element.style.width).toBe("250px");
      });

      it("should handle transform property updates", async () => {
        const value = createValue.numeric(50, "px");
        manager.updateProperty("translateX", value);

        // Apply updates manually to avoid timing issues
        manager.applyUpdates();
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(element.style.transform).toContain("50px"); // May be translate3d
      });

      it("should validate property names", () => {
        const value = createValue.numeric(100, "px");
        expect(() => manager.updateProperty("invalid" as any, value)).toThrow();
      });

      it("should validate transform property values are numeric", () => {
        const colorValue = createValue.rgb(255, 0, 0, 1);
        expect(() =>
          manager.updateProperty("translateX", colorValue)
        ).toThrow();
      });
    });

    describe("reset method", () => {
      it("should clear all internal state", () => {
        manager.updateProperty("width", createValue.numeric(200, "px"));
        manager.updateProperty("translateX", createValue.numeric(50, "px"));

        expect((manager as any).propertyStates.size).toBeGreaterThan(0);

        manager.reset();
        expect((manager as any).propertyStates.size).toBe(0);
        expect((manager as any).pendingTransformUpdates.size).toBe(0);
        expect((manager as any).pendingCSSUpdates.size).toBe(0);
      });
    });

    describe("static isAnimatable method", () => {
      it("should validate CSS properties", () => {
        expect(PropertyManager.isAnimatable("width")).toBe(true);
        expect(PropertyManager.isAnimatable("backgroundColor")).toBe(true);
        expect(PropertyManager.isAnimatable("opacity")).toBe(true);
      });

      it("should validate transform properties", () => {
        expect(PropertyManager.isAnimatable("translateX")).toBe(true);
        expect(PropertyManager.isAnimatable("scaleY")).toBe(true);
        expect(PropertyManager.isAnimatable("rotateZ")).toBe(true);
      });

      it("should reject invalid properties", () => {
        expect(PropertyManager.isAnimatable("display")).toBe(false);
        expect(PropertyManager.isAnimatable("position")).toBe(false);
        expect(PropertyManager.isAnimatable("invalid")).toBe(false);
      });
    });
  });

  describe("Integration Tests - Component Interactions", () => {
    it("should coordinate between StyleAnimator and TransformHandler", async () => {
      const manager = new PropertyManager(element);

      // Apply both CSS and transform properties
      manager.updateProperty("width", createValue.numeric(200, "px"));
      manager.updateProperty(
        "backgroundColor",
        createValue.rgb(255, 0, 128, 1)
      );
      manager.updateProperty("translateX", createValue.numeric(100, "px"));
      manager.updateProperty("scaleY", createValue.numeric(1.2, ""));

      manager.applyUpdates();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check CSS properties were applied
      expect(element.style.width).toBe("200px");
      expect(element.style.backgroundColor).toContain("rgb");

      // Check transform properties were combined correctly
      expect(element.style.transform).toContain("100px"); // May be translate3d
      expect(element.style.transform).toContain("1.2"); // scaleY value
    });

    it("should handle complex transform combinations", async () => {
      const transforms = [
        {
          prop: "translateX" as TransformPropertyName,
          value: createValue.numeric(50, "px"),
        },
        {
          prop: "translateY" as TransformPropertyName,
          value: createValue.numeric(-25, "px"),
        },
        {
          prop: "rotateZ" as TransformPropertyName,
          value: createValue.numeric(30, "deg"),
        },
        {
          prop: "scaleX" as TransformPropertyName,
          value: createValue.numeric(1.1, ""),
        },
        {
          prop: "scaleY" as TransformPropertyName,
          value: createValue.numeric(0.9, ""),
        },
      ];

      transforms.forEach(({ prop, value }) => {
        manager.updateProperty(prop, value);
      });

      manager.applyUpdates();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const transformStyle = element.style.transform;
      expect(transformStyle).toContain("50px"); // translateX
      expect(transformStyle).toContain("-25px"); // translateY
      expect(transformStyle).toContain("30deg"); // rotateZ
      expect(transformStyle).toContain("1.1"); // scaleX
      expect(transformStyle).toContain("0.9"); // scaleY
    });

    it("should handle interpolation between different property types", () => {
      // Test CSS property interpolation
      const widthFrom = createValue.numeric(100, "px");
      const widthTo = createValue.numeric(200, "px");
      const widthResult = manager.interpolate(
        "width",
        widthFrom,
        widthTo,
        0.75
      );
      expect(widthResult).toEqual(createValue.numeric(175, "px"));

      // Test color interpolation
      const colorFrom = createValue.rgb(255, 0, 0, 1);
      const colorTo = createValue.rgb(0, 255, 0, 1);
      const colorResult = manager.interpolate(
        "backgroundColor",
        colorFrom,
        colorTo,
        0.5
      );
      expect(colorResult.type).toBe("color");

      // Test transform interpolation
      const transformFrom = createValue.numeric(0, "px");
      const transformTo = createValue.numeric(100, "px");
      const transformResult = manager.interpolate(
        "translateX",
        transformFrom,
        transformTo,
        0.25
      );
      expect(transformResult).toEqual(createValue.numeric(25, "px"));
    });

    it("should maintain state across multiple operations", () => {
      // Apply initial values
      manager.updateProperty("width", createValue.numeric(200, "px"));
      manager.updateProperty("translateX", createValue.numeric(50, "px"));

      // Get current values (should use cache)
      const width1 = manager.getCurrentValue("width");
      const transform1 = manager.getCurrentValue("translateX");

      // Update and get again
      manager.updateProperty("width", createValue.numeric(250, "px"));
      const width2 = manager.getCurrentValue("width");

      expect(width1).toEqual(createValue.numeric(200, "px"));
      expect(width2).toEqual(createValue.numeric(250, "px"));
      expect(transform1).toEqual(createValue.numeric(50, "px"));
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle invalid property names gracefully", () => {
      const invalidProps = [
        "",
        "   ",
        "nonExistentProp",
        "display",
        "position",
      ];

      invalidProps.forEach((prop) => {
        expect(() => manager.parse(prop as any, "10px")).toThrow();
        expect(() => manager.getCurrentValue(prop as any)).toThrow();
        expect(() =>
          manager.updateProperty(prop as any, createValue.numeric(10, "px"))
        ).toThrow();
      });
    });

    it("should handle malformed value objects", () => {
      const invalidValues = [null, undefined];

      invalidValues.forEach((value) => {
        expect(() => manager.updateProperty("width", value as any)).toThrow();
      });

      // These should also be handled as validation errors
      expect(() => manager.updateProperty("width", {} as any)).toThrow(); // Empty object now throws due to enhanced validation
      expect(() => manager.updateProperty("width", "string" as any)).toThrow();
    });

    it("should handle extreme numeric values", () => {
      const extremeValues = [
        Number.MAX_SAFE_INTEGER,
        -Number.MAX_SAFE_INTEGER,
        0,
        -0,
      ];

      extremeValues.forEach((value) => {
        const numericValue = createValue.numeric(value, "px");
        expect(() =>
          manager.updateProperty("width", numericValue)
        ).not.toThrow();
      });
    });

    it("should handle detached elements", () => {
      const detachedElement = document.createElement("div");
      const detachedManager = new PropertyManager(detachedElement);

      expect(() => {
        detachedManager.updateProperty("width", createValue.numeric(100, "px"));
        detachedManager.getCurrentValue("opacity");
        detachedManager.parse("height", "200px");
      }).not.toThrow();
    });

    it("should handle DOM manipulation failures gracefully", () => {
      const originalSetProperty = element.style.setProperty;
      element.style.setProperty = vi.fn(() => {
        throw new Error("DOM manipulation failed");
      });

      // Should handle failures gracefully
      expect(() => {
        manager.updateProperty("width", createValue.numeric(200, "px"));
      }).not.toThrow();

      // Restore
      element.style.setProperty = originalSetProperty;
    });

    it("should handle interpolation edge cases", () => {
      // Identical values
      const value = createValue.numeric(100, "px");
      const result = manager.interpolate("width", value, value, 0.5);
      expect(result).toEqual(value);

      // Progress at boundaries
      const from = createValue.numeric(0, "px");
      const to = createValue.numeric(100, "px");

      const atZero = manager.interpolate("width", from, to, 0);
      expect(atZero).toEqual(from);

      const atOne = manager.interpolate("width", from, to, 1);
      expect(atOne).toEqual(to);
    });

    it("should handle reset during complex operations", async () => {
      // Apply various properties
      manager.updateProperty("width", createValue.numeric(300, "px"));
      manager.updateProperty(
        "backgroundColor",
        createValue.rgb(255, 128, 0, 1)
      );
      manager.updateProperty("translateX", createValue.numeric(100, "px"));
      manager.updateProperty("scaleY", createValue.numeric(1.5, ""));

      // Verify properties were tracked
      expect((manager as any).propertyStates.size).toBeGreaterThan(0);

      // Reset
      manager.reset();

      // Check internal state is cleared
      expect((manager as any).propertyStates.size).toBe(0);
      expect((manager as any).pendingTransformUpdates.size).toBe(0);
      expect((manager as any).pendingCSSUpdates.size).toBe(0);
    });

    it("should handle invalid configuration options", () => {
      const invalidConfigs = [
        { precision: -1 },
        { precision: NaN },
        { colorSpace: "invalid" as any },
        { batchUpdates: "not-boolean" as any },
      ];

      invalidConfigs.forEach((config) => {
        // Should not throw, should use defaults
        expect(() => {
          const configManager = new PropertyManager(element, config);
          configManager.updateProperty("width", createValue.numeric(100, "px"));
        }).not.toThrow();
      });
    });

    it("should handle color interpolation with transparency", () => {
      const transparent = createValue.rgb(255, 0, 0, 0);
      const opaque = createValue.rgb(255, 0, 0, 1);
      const result = manager.interpolate(
        "backgroundColor",
        transparent,
        opaque,
        0.5
      );

      expect(result.type).toBe("color");
      expect((result as any).value.a).toBeCloseTo(0.5, 2);
    });

    it("should handle disposed manager gracefully", () => {
      (manager as any).isDisposed = true;
      const value = createValue.numeric(100, "px");

      // Should not throw but should be a no-op
      expect(() => manager.updateProperty("width", value)).not.toThrow();
    });
  });

  describe("Performance and Batching", () => {
    it("should batch multiple property updates", async () => {
      const properties = [
        {
          prop: "width" as CSSPropertyName,
          value: createValue.numeric(200, "px"),
        },
        {
          prop: "height" as CSSPropertyName,
          value: createValue.numeric(150, "px"),
        },
        {
          prop: "opacity" as CSSPropertyName,
          value: createValue.numeric(0.8, ""),
        },
      ];

      const spy = vi.spyOn(window, "requestAnimationFrame");

      properties.forEach(({ prop, value }) => {
        manager.updateProperty(prop, value);
      });

      // Should only schedule one update despite multiple property changes
      expect(spy).toHaveBeenCalledTimes(1);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(element.style.width).toBe("200px");
      expect(element.style.height).toBe("150px");
      expect(element.style.opacity).toBe("0.8");

      spy.mockRestore();
    });

    it("should handle rapid property updates efficiently", () => {
      const updateCount = 50;
      const startTime = performance.now();

      for (let i = 0; i < updateCount; i++) {
        manager.updateProperty("width", createValue.numeric(100 + i, "px"));
        manager.updateProperty("translateX", createValue.numeric(i, "px"));
      }

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // Should be fast due to batching
    });

    it("should maintain performance with cache access", () => {
      const accessCount = 100;
      const properties: Array<CSSPropertyName | TransformPropertyName> = [
        "width",
        "height",
        "opacity",
        "translateX",
        "scaleX",
      ];

      const startTime = performance.now();

      for (let i = 0; i < accessCount; i++) {
        properties.forEach((prop) => {
          manager.getCurrentValue(prop as any);
        });
      }

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(50); // Should be very fast due to caching
    });
  });
});
