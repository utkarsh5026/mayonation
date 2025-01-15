// property-manager.test.ts
import { PropertyManager } from "../prop";
import { createValue } from "../animation-val";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("PropertyManager", () => {
  let element: HTMLElement;
  let manager: PropertyManager;

  // Helper function to create a test element and attach it to the document
  beforeEach(() => {
    element = document.createElement("div");
    document.body.appendChild(element);
    manager = new PropertyManager(element);
  });

  // Clean up after each test to prevent side effects
  afterEach(() => {
    document.body.removeChild(element);
  });

  describe("Constructor", () => {
    it("should create a new PropertyManager instance", () => {
      expect(manager).toBeInstanceOf(PropertyManager);
    });

    it("should accept custom color space configuration", () => {
      const rgbManager = new PropertyManager(element, "rgb");
      expect(rgbManager).toBeInstanceOf(PropertyManager);
    });
  });

  describe("getCurrentValue", () => {
    it("should get initial transform values", () => {
      const translateX = manager.getCurrentValue("translateX");
      expect(translateX).toEqual(createValue.numeric(0, "px"));
    });

    it("should get initial CSS values", () => {
      const opacity = manager.getCurrentValue("opacity");
      expect(opacity).toEqual(createValue.numeric(1, ""));
    });

    it("should throw error for invalid properties", () => {
      expect(() => {
        // @ts-expect-error - Testing invalid property
        manager.getCurrentValue("invalidProperty");
      }).toThrow();
    });
  });

  describe("interpolate", () => {
    it("should interpolate transform properties", () => {
      const from = createValue.numeric(0, "px");
      const to = createValue.numeric(100, "px");
      const result = manager.interpolate("translateX", from, to, 0.5);

      expect(result).toEqual(createValue.numeric(50, "px"));
    });

    it("should interpolate CSS properties", () => {
      const from = createValue.numeric(0, "");
      const to = createValue.numeric(1, "");
      const result = manager.interpolate("opacity", from, to, 0.5);

      expect(result).toEqual(createValue.numeric(0.5, ""));
    });

    it("should interpolate colors in HSL space", () => {
      const from = createValue.hsl(0, 100, 50);
      const to = createValue.hsl(240, 100, 50);
      const result = manager.interpolate("backgroundColor", from, to, 0.5);

      // Should be purple (120 degrees, halfway between red and blue)
      expect(result.value).toEqual({ h: 120, s: 100, l: 50 });
    });

    it("should throw error for mismatched value types", () => {
      const from = createValue.numeric(0, "px");
      const to = createValue.hsl(0, 100, 50);

      expect(() => {
        manager.interpolate("translateX", from, to, 0.5);
      }).toThrow();
    });
  });

  describe("updateProperty", () => {
    it("should update transform properties", () => {
      const value = createValue.numeric(100, "px");
      manager.updateProperty("translateX", value);
      manager.applyUpdates();

      expect(element.style.transform).toContain("translateX(100px)");
    });

    it("should update CSS properties", () => {
      const value = createValue.numeric(0.5, "");
      manager.updateProperty("opacity", value);

      expect(element.style.opacity).toBe("0.5");
    });

    it("should batch transform updates", () => {
      manager.updateProperty("translateX", createValue.numeric(100, "px"));
      manager.updateProperty("translateY", createValue.numeric(50, "px"));
      manager.applyUpdates();

      const transform = element.style.transform;
      expect(transform).toContain("translateX(100px)");
      expect(transform).toContain("translateY(50px)");
    });

    it("should handle multiple property types simultaneously", () => {
      manager.updateProperty("translateX", createValue.numeric(100, "px"));
      manager.updateProperty("opacity", createValue.numeric(0.5, ""));
      manager.applyUpdates();

      expect(element.style.transform).toContain("translateX(100px)");
      expect(element.style.opacity).toBe("0.5");
    });
  });

  describe("reset", () => {
    it("should reset all properties to initial values", () => {
      // Set some properties first
      manager.updateProperty("translateX", createValue.numeric(100, "px"));
      manager.updateProperty("opacity", createValue.numeric(0.5, ""));
      manager.applyUpdates();

      // Reset everything
      manager.reset();

      // Check if values are back to initial state
      expect(element.style.transform).toBe("");
      expect(element.style.opacity).toBe("");
    });
  });

  describe("isAnimatable", () => {
    it("should validate transform properties", () => {
      expect(PropertyManager.isAnimatable("translateX")).toBe(true);
      expect(PropertyManager.isAnimatable("rotate")).toBe(true);
      expect(PropertyManager.isAnimatable("scale")).toBe(true);
    });

    it("should validate CSS properties", () => {
      expect(PropertyManager.isAnimatable("opacity")).toBe(true);
      expect(PropertyManager.isAnimatable("backgroundColor")).toBe(true);
    });

    it("should reject invalid properties", () => {
      expect(PropertyManager.isAnimatable("invalidProperty")).toBe(false);
    });
  });
});
