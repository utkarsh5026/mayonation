/// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from "vitest";
import { KeyframeManager } from "../keyframe";

describe("KeyframeManager", () => {
  let element: HTMLElement;
  let manager: KeyframeManager;

  beforeEach(() => {
    element = document.createElement("div");
    document.body.appendChild(element);
  });

  describe("Constructor and Initialization", () => {
    it("should create a KeyframeManager instance with valid keyframes", () => {
      const keyframes = [
        { offset: 0, translateX: 0, opacity: 1 },
        { offset: 1, translateX: 100, opacity: 0 },
      ];

      expect(() => new KeyframeManager(element, keyframes)).not.toThrow();
    });

    it("should throw error for invalid keyframe sequence", () => {
      const invalidKeyframes = [{ translateX: 0 }]; // Only one keyframe

      expect(() => new KeyframeManager(element, invalidKeyframes)).toThrow(
        "Animation must have at least 2 keyframes"
      );
    });

    it("should throw error for inconsistent offset usage", () => {
      const inconsistentKeyframes = [
        { offset: 0, translateX: 0 },
        { translateX: 50 }, // Missing offset
        { offset: 1, translateX: 100 },
      ];

      expect(() => new KeyframeManager(element, inconsistentKeyframes)).toThrow(
        "If any keyframe has an offset, all must have offsets"
      );
    });
  });

  describe("Offset Distribution", () => {
    it("should distribute offsets evenly when not provided", () => {
      const keyframes = [
        { translateX: 0 },
        { translateX: 50 },
        { translateX: 100 },
      ];

      manager = new KeyframeManager(element, keyframes);
      const values = manager.getValuesAtProgress(0.5);
      expect(values.get("translateX")?.value).toBe(50);
    });

    it("should respect provided offsets", () => {
      const keyframes = [
        { offset: 0, translateX: 0 },
        { offset: 0.7, translateX: 50 },
        { offset: 1, translateX: 100 },
      ];

      manager = new KeyframeManager(element, keyframes);
      const values = manager.getValuesAtProgress(0.7);
      expect(values.get("translateX")?.value).toBe(50);
    });
  });

  describe("Value Interpolation", () => {
    beforeEach(() => {
      manager = new KeyframeManager(element, [
        {
          offset: 0,
          translateX: 0,
          opacity: 1,
          backgroundColor: "rgb(0, 0, 0)",
        },
        {
          offset: 1,
          translateX: 100,
          opacity: 0,
          backgroundColor: "rgb(255, 255, 255)",
        },
      ]);
    });

    it("should interpolate numeric values", () => {
      const values = manager.getValuesAtProgress(0.5);
      expect(values.get("translateX")?.value).toBe(50);
      expect(values.get("opacity")?.value).toBe(0.5);
    });

    it("should interpolate color values", () => {
      const values = manager.getValuesAtProgress(0.5);
      const color = values.get("backgroundColor");
      expect(color?.type).toBe("color");
      if (color?.type === "color") {
        const hsl = color.value;
        expect(hsl).toEqual({ h: 0, s: 0, l: 50, a: 1 });
      }
    });

    it("should handle boundary conditions", () => {
      expect(manager.getValuesAtProgress(0).get("translateX")?.value).toBe(0);
      expect(manager.getValuesAtProgress(1).get("translateX")?.value).toBe(100);
    });
  });

  describe("Property Management", () => {
    it("should handle transform properties", () => {
      manager = new KeyframeManager(element, [
        { offset: 0, translateX: 0, rotateZ: 0, scale: 1 },
        { offset: 1, translateX: 100, rotateZ: 180, scale: 2 },
      ]);

      const values = manager.getValuesAtProgress(0.5);
      expect(values.get("translateX")?.value).toBe(50);
      expect(values.get("rotateZ")?.value).toBe(90);
      expect(values.get("scale")?.value).toBeCloseTo(1.414, 3);
    });

    it("should handle CSS properties", () => {
      // Set initial styles before creating manager
      element.style.width = "100px";
      element.style.opacity = "1";

      manager = new KeyframeManager(element, [
        { offset: 0, opacity: 1, width: "100px" },
        { offset: 1, opacity: 0, width: "200px" },
      ]);

      const values = manager.getValuesAtProgress(0.5);
      expect(values.get("opacity")?.value).toBe(0.5);
      expect(values.get("width")?.value).toBe(150);
    });
  });

  describe("Animation Updates", () => {
    beforeEach(() => {
      manager = new KeyframeManager(element, [
        { offset: 0, translateX: 0, opacity: 1 },
        { offset: 1, translateX: 100, opacity: 0 },
      ]);
    });

    it("should update element properties", () => {
      manager.update(0.5);
      expect(element.style.transform).toContain("translate3d(50px, 0px, 0px)");
      expect(element.style.opacity).toBe("0.5");
    });

    it("should reset properties to initial values", () => {
      manager.update(0.5);
      manager.reset();
      expect(element.style.transform).toBe("");
      expect(element.style.opacity).toBe("");
    });
  });

  describe("Error Handling", () => {
    it("should handle missing property values", () => {
      const keyframes = [
        { offset: 0, translateX: 0 },
        { offset: 1 }, // Missing translateX
      ];

      expect(() => new KeyframeManager(element, keyframes)).toThrow(
        'Missing value for property "translateX"'
      );
    });

    it("should handle invalid property values", () => {
      const keyframes = [
        { offset: 0, translateX: "invalid" },
        { offset: 1, translateX: 100 },
      ];

      expect(() => new KeyframeManager(element, keyframes)).toThrow(
        'Invalid value "invalid" for the property "translateX"'
      );
    });
  });
});
