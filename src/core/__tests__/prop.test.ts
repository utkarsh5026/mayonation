// property-manager.test.ts
/// @vitest-environment jsdom
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
      expect(result.value).toEqual({ h: 300, s: 100, l: 50, a: 1 });
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

      expect(element.style.transform).toContain("translate3d(100px, 0px, 0px)");
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
      expect(transform).toContain("translate3d(100px, 50px, 0px)");
    });

    it("should handle multiple property types simultaneously", () => {
      manager.updateProperty("translateX", createValue.numeric(100, "px"));
      manager.applyUpdates();

      expect(element.style.transform).toContain("translate3d(100px, 0px, 0px)");
    });
  });

  describe("reset", () => {
    it("should reset all properties to initial values", () => {
      // Set some properties first
      manager.updateProperty("translateX", createValue.numeric(100, "px"));
      manager.applyUpdates();

      // Reset everything
      manager.reset();

      // Check if values are back to initial state
      expect(element.style.transform).toBe("");
    });
  });

  describe("isAnimatable", () => {
    it("should validate transform properties", () => {
      expect(PropertyManager.isAnimatable("translateX")).toBe(true);
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

  describe("parse", () => {
    it("should parse transform numeric values", () => {
      // Translation properties (px)
      expect(manager.parse("translateX", 100)).toEqual(
        createValue.numeric(100, "px")
      );
      expect(manager.parse("translateY", -50)).toEqual(
        createValue.numeric(-50, "px")
      );
      expect(manager.parse("translateZ", 25)).toEqual(
        createValue.numeric(25, "px")
      );

      expect(manager.parse("rotateX", 90)).toEqual(
        createValue.numeric(90, "deg")
      );
      expect(manager.parse("rotateY", 180)).toEqual(
        createValue.numeric(180, "deg")
      );
      expect(manager.parse("rotateZ", -45)).toEqual(
        createValue.numeric(-45, "deg")
      );

      // Scale properties (unitless)
      expect(manager.parse("scale", 2)).toEqual(createValue.numeric(2, ""));
      expect(manager.parse("scaleX", 0.5)).toEqual(
        createValue.numeric(0.5, "")
      );
      expect(manager.parse("scaleY", 1.5)).toEqual(
        createValue.numeric(1.5, "")
      );
      expect(manager.parse("scaleZ", 1)).toEqual(createValue.numeric(1, ""));

      // Skew properties (deg)
      expect(manager.parse("skewX", 30)).toEqual(
        createValue.numeric(30, "deg")
      );
      expect(manager.parse("skewY", -15)).toEqual(
        createValue.numeric(-15, "deg")
      );
    });

    it("should parse CSS numeric values", () => {
      // Opacity (unitless)
      expect(manager.parse("opacity", "0.5")).toEqual(
        createValue.numeric(0.5, "")
      );
      expect(manager.parse("opacity", "1")).toEqual(createValue.numeric(1, ""));

      // Dimensions with various units
      expect(manager.parse("width", "100px")).toEqual(
        createValue.numeric(100, "px")
      );
      expect(manager.parse("width", "50%")).toEqual(
        createValue.numeric(50, "%")
      );
      expect(manager.parse("height", "200px")).toEqual(
        createValue.numeric(200, "px")
      );
      expect(manager.parse("height", "75%")).toEqual(
        createValue.numeric(75, "%")
      );

      // Border properties
      expect(manager.parse("borderRadius", "10px")).toEqual(
        createValue.numeric(10, "px")
      );
      expect(manager.parse("borderWidth", "2px")).toEqual(
        createValue.numeric(2, "px")
      );
    });

    it("should parse CSS color values", () => {
      // Test various color properties
      const redHsl = createValue.hsl(0, 100, 50);
      const blueHsl = createValue.hsl(240, 100, 50);

      expect(manager.parse("backgroundColor", "hsl(0, 100%, 50%)")).toEqual(
        redHsl
      );
      expect(manager.parse("color", "hsl(240, 100%, 50%)")).toEqual(blueHsl);
      expect(manager.parse("borderColor", "hsl(0, 100%, 50%)")).toEqual(redHsl);
      expect(manager.parse("outlineColor", "hsl(240, 100%, 50%)")).toEqual(
        blueHsl
      );
      expect(manager.parse("textDecorationColor", "hsl(0, 100%, 50%)")).toEqual(
        redHsl
      );
      expect(manager.parse("textEmphasisColor", "hsl(240, 100%, 50%)")).toEqual(
        blueHsl
      );
    });

    it("should handle invalid values appropriately", () => {
      // Transform properties should throw for invalid values
      expect(() => manager.parse("translateX", "invalid")).toThrow(
        'Invalid value "invalid" for the property "translateX"'
      );

      // CSS properties should throw for invalid numeric values
      expect(() => manager.parse("opacity", "invalid")).toThrow();
      expect(() => manager.parse("width", "invalid")).toThrow();

      // Color properties should return null for invalid values
      expect(() => manager.parse("backgroundColor", "invalid")).toThrow();
    });

    it("should handle edge cases", () => {
      // Zero values
      expect(manager.parse("translateX", 0)).toEqual(
        createValue.numeric(0, "px")
      );
      expect(manager.parse("opacity", "0")).toEqual(createValue.numeric(0, ""));

      expect(manager.parse("translateX", -100)).toEqual(
        createValue.numeric(-100, "px")
      );

      expect(manager.parse("opacity", "1")).toEqual(createValue.numeric(1, ""));
      expect(manager.parse("scale", 10)).toEqual(createValue.numeric(10, ""));
    });
  });
});
