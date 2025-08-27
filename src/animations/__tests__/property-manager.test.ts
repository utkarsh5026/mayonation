/// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PropertyManager } from "../prop-manager/property-manager";
import { createValue } from "../../core/animation-val";

describe("PropertyManager - Unit Tests", () => {
  let element: HTMLElement;
  let manager: PropertyManager;
  let parentElement: HTMLElement;

  beforeEach(() => {
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

    it("should handle missing parent element", () => {
      const orphanElement = document.createElement("div");
      const orphanManager = new PropertyManager(orphanElement);
      expect(orphanManager).toBeInstanceOf(PropertyManager);
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

    it("should parse transform string values", () => {
      const result = manager.parse("translateY", "50px");
      expect(result).toEqual(createValue.numeric(50, "px"));
    });

    it("should handle invalid property names", () => {
      expect(() => manager.parse("invalid" as any, "10px")).toThrow();
    });

    it("should handle parsing errors gracefully", () => {
      const result = manager.parse("width", "invalid-value");
      expect(result).toEqual(createValue.numeric(0, "px"));
    });
  });

  describe("reset method", () => {
    it("should clear all internal state", () => {
      // Apply some values first
      manager.updateProperty("width", createValue.numeric(200, "px"));
      manager.updateProperty("translateX", createValue.numeric(50, "px"));

      expect((manager as any).propertyStates.size).toBeGreaterThan(0);

      manager.reset();
      expect((manager as any).propertyStates.size).toBe(0);
      expect((manager as any).pendingTransformUpdates.size).toBe(0);
      expect((manager as any).pendingCSSUpdates.size).toBe(0);
    });

    it("should handle reset errors gracefully", () => {
      expect(() => manager.reset()).not.toThrow();
    });
  });

  describe("interpolate method", () => {
    it("should interpolate CSS numeric properties", () => {
      const from = createValue.numeric(0, "px");
      const to = createValue.numeric(100, "px");
      const result = manager.interpolate("width", from, to, 0.5);
      expect(result).toEqual(createValue.numeric(50, "px"));
    });

    it("should interpolate CSS color properties", () => {
      const from = createValue.rgb(255, 0, 0, 1);
      const to = createValue.rgb(0, 255, 0, 1);
      const result = manager.interpolate("backgroundColor", from, to, 0.5);
      expect(result.type).toBe("color");
    });

    it("should interpolate transform properties", () => {
      const from = createValue.numeric(0, "px");
      const to = createValue.numeric(100, "px");
      const result = manager.interpolate("translateX", from, to, 0.3);
      expect(result).toEqual(createValue.numeric(30, "px"));
    });

    it("should handle progress boundary values", () => {
      const from = createValue.numeric(10, "px");
      const to = createValue.numeric(90, "px");

      const atStart = manager.interpolate("width", from, to, 0);
      expect(atStart).toEqual(from);

      const atEnd = manager.interpolate("width", from, to, 1);
      expect(atEnd).toEqual(to);
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

    it("should handle unsupported property types", () => {
      const from = createValue.numeric(0, "px");
      const to = createValue.numeric(100, "px");

      expect(() =>
        manager.interpolate("unsupported" as any, from, to, 0.5)
      ).toThrow();
    });

    it("should require numeric values for transform properties", () => {
      const colorValue = createValue.rgb(255, 0, 0, 1);
      const numericValue = createValue.numeric(100, "px");

      expect(() =>
        manager.interpolate("translateX", colorValue, numericValue, 0.5)
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

      // Check that cache was used (state should not be dirty)
      const state = (manager as any).propertyStates.get("opacity");
      expect(state.isDirty).toBe(false);
    });

    it("should handle invalid property names", () => {
      expect(() => manager.getCurrentValue("invalid" as any)).toThrow();
    });

    it("should update cache when value is dirty", () => {
      const value1 = manager.getCurrentValue("width");

      // Mark as dirty
      const state = (manager as any).propertyStates.get("width");
      state.isDirty = true;

      const value2 = manager.getCurrentValue("width");
      expect(value2).toEqual(value1); // Should get fresh value but be equal
    });
  });

  describe("updateProperty method", () => {
    it("should update CSS properties immediately when batching is disabled", () => {
      const noBatchManager = new PropertyManager(element, {
        batchUpdates: false,
      });
      const value = createValue.numeric(250, "px");

      noBatchManager.updateProperty("width", value);

      return new Promise<void>((resolve) => {
        // Without batching, changes should be applied immediately
        setTimeout(() => {
          expect(element.style.width).toBe("250px");
          resolve();
        }, 0);
      });
    });

    it("should update transform properties immediately when batching is disabled", async () => {
      const noBatchManager = new PropertyManager(element, {
        batchUpdates: false,
      });
      const value = createValue.numeric(50, "px");

      noBatchManager.updateProperty("translateX", value);

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(element.style.transform).toContain("50px"); // May be translate3d
    });

    it("should batch updates when batchUpdates is enabled", async () => {
      const value = createValue.numeric(300, "px");
      manager.updateProperty("width", value);

      // Should not be applied immediately
      expect(element.style.width).not.toBe("300px");

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(element.style.width).toBe("300px");
    });

    it("should validate property names", () => {
      const value = createValue.numeric(100, "px");
      expect(() => manager.updateProperty("invalid" as any, value)).toThrow();
    });

    it("should validate transform property values are numeric", () => {
      const colorValue = createValue.rgb(255, 0, 0, 1);
      expect(() => manager.updateProperty("translateX", colorValue)).toThrow();
    });

    it("should handle disposed manager gracefully", () => {
      (manager as any).isDisposed = true;
      const value = createValue.numeric(100, "px");

      expect(() => manager.updateProperty("width", value)).not.toThrow();
    });

    it("should update property state tracking", () => {
      const value = createValue.numeric(150, "px");
      manager.updateProperty("width", value);

      const state = (manager as any).propertyStates.get("width");
      expect(state).toBeDefined();
      expect(state.lastValue).toEqual(value);
      expect(state.isDirty).toBe(false);
    });

    it("should handle update errors gracefully", () => {
      // Mock element.style.setProperty to throw
      const originalSetProperty = element.style.setProperty;
      element.style.setProperty = vi.fn(() => {
        throw new Error("Test error");
      });

      const value = createValue.numeric(100, "px");
      expect(() => manager.updateProperty("width", value)).not.toThrow();

      // Restore
      element.style.setProperty = originalSetProperty;
    });
  });

  describe("applyUpdates method", () => {
    it("should apply batched updates", () => {
      const widthValue = createValue.numeric(200, "px");
      const heightValue = createValue.numeric(150, "px");

      manager.updateProperty("width", widthValue);
      manager.updateProperty("height", heightValue);

      // Force apply updates
      manager.applyUpdates();

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(element.style.width).toBe("200px");
          expect(element.style.height).toBe("150px");
          resolve();
        });
      });
    });

    it("should apply transform updates to DOM", async () => {
      const translateValue = createValue.numeric(100, "px");
      const scaleValue = createValue.numeric(1.5, "");

      manager.updateProperty("translateX", translateValue);
      manager.updateProperty("scaleX", scaleValue);

      manager.applyUpdates();

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(element.style.transform).toContain("100px"); // translateX
      expect(element.style.transform).toContain("1.5"); // scaleX
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

  describe("property validation", () => {
    it("should validate CSS property values", () => {
      const validValue = createValue.numeric(100, "px");
      expect(() => manager.updateProperty("width", validValue)).not.toThrow();

      const colorValue = createValue.rgb(255, 0, 0, 1);
      expect(() =>
        manager.updateProperty("backgroundColor", colorValue)
      ).not.toThrow();
    });

    it("should validate transform property values", () => {
      const validValue = createValue.numeric(50, "px");
      expect(() =>
        manager.updateProperty("translateX", validValue)
      ).not.toThrow();

      const invalidValue = createValue.rgb(255, 0, 0, 1);
      expect(() =>
        manager.updateProperty("translateY", invalidValue)
      ).toThrow();
    });

    it("should validate value objects", () => {
      expect(() => manager.updateProperty("width", null as any)).toThrow();
      expect(() => manager.updateProperty("width", undefined as any)).toThrow();
      expect(() => manager.updateProperty("width", "invalid" as any)).toThrow();
    });
  });

  describe("batch update scheduling", () => {
    it("should schedule only one update per frame", () => {
      const scheduleSpy = vi.spyOn(window, "requestAnimationFrame");

      manager.updateProperty("width", createValue.numeric(100, "px"));
      manager.updateProperty("height", createValue.numeric(200, "px"));
      manager.updateProperty("opacity", createValue.numeric(0.5, ""));

      // Should only schedule one update despite multiple property changes
      expect(scheduleSpy).toHaveBeenCalledTimes(1);

      scheduleSpy.mockRestore();
    });

    it("should not schedule duplicate updates", () => {
      const scheduleSpy = vi.spyOn(window, "requestAnimationFrame");

      manager.updateProperty("width", createValue.numeric(100, "px"));
      manager.updateProperty("width", createValue.numeric(150, "px"));
      manager.updateProperty("width", createValue.numeric(200, "px"));

      expect(scheduleSpy).toHaveBeenCalledTimes(1);
      scheduleSpy.mockRestore();
    });

    it("should clear scheduled flag after update", () => {
      const value = createValue.numeric(100, "px");
      manager.updateProperty("width", value);

      expect((manager as any).updateScheduled).toBe(true);

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect((manager as any).updateScheduled).toBe(false);
          resolve();
        });
      });
    });
  });

  describe("property state management", () => {
    it("should track transform property changes", () => {
      manager.updateProperty("translateX", createValue.numeric(100, "px"));

      const state = (manager as any).propertyStates.get("translateX");
      expect(state.hasTransformChanges).toBe(true);
    });

    it("should track CSS property changes", () => {
      manager.updateProperty("width", createValue.numeric(200, "px"));

      const state = (manager as any).propertyStates.get("width");
      expect(state.hasTransformChanges).toBe(false);
    });

    it("should maintain separate state for each property", () => {
      manager.updateProperty("width", createValue.numeric(200, "px"));
      manager.updateProperty("translateX", createValue.numeric(50, "px"));

      const widthState = (manager as any).propertyStates.get("width");
      const transformState = (manager as any).propertyStates.get("translateX");

      expect(widthState.hasTransformChanges).toBe(false);
      expect(transformState.hasTransformChanges).toBe(true);
    });
  });
});
