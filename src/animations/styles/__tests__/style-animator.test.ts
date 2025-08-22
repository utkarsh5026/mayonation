/// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { StyleAnimator } from "../style-animator";
import { createValue } from "../../../core/animation-val";
import { CSSHandlerOptions } from "../type";

describe("StyleAnimator", () => {
  let element: HTMLElement;
  let animator: StyleAnimator;
  let parentElement: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="parent"><div id="target"></div></div>';
    parentElement = document.getElementById("parent") as HTMLElement;
    element = document.getElementById("target") as HTMLElement;

    Object.defineProperty(parentElement, "getBoundingClientRect", {
      value: () => ({ width: 500, height: 300 }),
    });

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
            "line-height": "1.5",
            margin: "10px",
            padding: "5px",
          };
          return styles[prop] || "auto";
        },
        fontSize: "16px",
      }),
    });

    animator = new StyleAnimator(element);
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  describe("constructor and initialization", () => {
    it("creates animator with default options", () => {
      expect(animator).toBeInstanceOf(StyleAnimator);
    });

    it("creates animator with custom options", () => {
      const options: CSSHandlerOptions = {
        colorSpace: "rgb",
        precision: 2,
        useGPUAcceleration: false,
      };
      const customAnimator = new StyleAnimator(element, options);
      expect(customAnimator).toBeInstanceOf(StyleAnimator);
    });

    it("handles missing parent element gracefully", () => {
      const orphanElement = document.createElement("div");
      const orphanAnimator = new StyleAnimator(orphanElement);
      expect(orphanAnimator).toBeInstanceOf(StyleAnimator);
    });
  });

  describe("interpolate method", () => {
    it("interpolates between numeric values correctly", () => {
      const from = createValue.numeric(0, "px");
      const to = createValue.numeric(100, "px");

      const result = animator.interpolate("width", from, to, 0.5);
      expect(result).toEqual(createValue.numeric(50, "px"));
    });

    it("interpolates between color values in RGB space", () => {
      const rgbAnimator = new StyleAnimator(element, { colorSpace: "rgb" });
      const from = createValue.rgb(255, 0, 0, 1);
      const to = createValue.rgb(0, 255, 0, 1);

      const result = rgbAnimator.interpolate("color", from, to, 0.5);
      expect(result.type).toBe("color");
      expect(result.space).toBe("rgb");
    });

    it("interpolates between color values in HSL space", () => {
      const hslAnimator = new StyleAnimator(element, { colorSpace: "hsl" });
      const from = createValue.hsl(0, 100, 50, 1);
      const to = createValue.hsl(120, 100, 50, 1);

      const result = hslAnimator.interpolate("color", from, to, 0.5);
      expect(result.type).toBe("color");
      expect(result.space).toBe("hsl");
    });

    it("handles progress boundaries correctly", () => {
      const from = createValue.numeric(0, "px");
      const to = createValue.numeric(100, "px");

      const resultStart = animator.interpolate("width", from, to, 0);
      expect(resultStart).toEqual(createValue.numeric(0, "px"));

      const resultEnd = animator.interpolate("width", from, to, 1);
      expect(resultEnd).toEqual(createValue.numeric(100, "px"));
    });

    it("applies precision rounding correctly", () => {
      const preciseAnimator = new StyleAnimator(element, { precision: 2 });
      const from = createValue.numeric(0, "px");
      const to = createValue.numeric(1, "px");

      const result = preciseAnimator.interpolate("width", from, to, 0.333);
      expect((result as any).value).toBeCloseTo(0.33, 2);
    });

    it("throws error for invalid progress values", () => {
      const from = createValue.numeric(0, "px");
      const to = createValue.numeric(100, "px");

      expect(() => animator.interpolate("width", from, to, -0.1)).toThrow();
      expect(() => animator.interpolate("width", from, to, 1.1)).toThrow();
    });

    it("throws error for mismatched value types", () => {
      const numericValue = createValue.numeric(0, "px");
      const colorValue = createValue.rgb(255, 0, 0, 1);

      expect(() =>
        animator.interpolate("width", numericValue, colorValue, 0.5)
      ).toThrow();
    });

    it("returns fallback value on interpolation error", () => {
      const from = createValue.numeric(0, "px");
      const to = createValue.numeric(100, "px");

      // Mock interpolation to throw error
      const originalInterpolate = (animator as any).interpolateNumeric;
      (animator as any).interpolateNumeric = vi.fn(() => {
        throw new Error("Test error");
      });

      const result = animator.interpolate("width", from, to, 0.5);
      expect(result).toEqual(to); // Should return 'to' as fallback for progress >= 0.5
    });

    it("handles different numeric units correctly", () => {
      const from = createValue.numeric(10, "em");
      const to = createValue.numeric(20, "em");

      const result = animator.interpolate("fontSize", from, to, 0.5);
      expect(result).toEqual(createValue.numeric(15, "em"));
    });

    it("interpolates opacity values correctly", () => {
      const from = createValue.numeric(0.2, "");
      const to = createValue.numeric(0.8, "");

      const result = animator.interpolate("opacity", from, to, 0.5);
      expect(result).toEqual(createValue.numeric(0.5, ""));
    });

    it("handles color interpolation with alpha channel", () => {
      const from = createValue.rgb(255, 0, 0, 0.2);
      const to = createValue.rgb(0, 255, 0, 0.8);

      const result = animator.interpolate("color", from, to, 0.5);
      expect(result.type).toBe("color");
      const colorValue = result as any;
      expect(colorValue.value.a).toBeCloseTo(0.5, 3);
    });
  });

  describe("getCurrentAnimatedValue method", () => {
    it("gets current value and caches it", () => {
      const value = animator.getCurrentAnimatedValue("opacity");
      expect(value).toEqual(createValue.numeric(1, ""));

      // Second call should use cache
      const cachedValue = animator.getCurrentAnimatedValue("opacity");
      expect(cachedValue).toEqual(value);
    });

    it("gets current width value correctly", () => {
      const value = animator.getCurrentAnimatedValue("width");
      expect(value).toEqual(createValue.numeric(100, "px"));
    });

    it("gets current color value correctly", () => {
      const value = animator.getCurrentAnimatedValue("backgroundColor");
      expect(value.type).toBe("color");
    });

    it("handles properties with 'auto' or 'none' values", () => {
      // Mock computed style to return 'auto'
      Object.defineProperty(window, "getComputedStyle", {
        value: () => ({
          getPropertyValue: () => "auto",
        }),
      });

      const newAnimator = new StyleAnimator(element);
      const value = newAnimator.getCurrentAnimatedValue("width");
      expect(value).toEqual(createValue.numeric(0, "px")); // Should use default
    });

    it("invalidates cache when property is marked dirty", () => {
      const value1 = animator.getCurrentAnimatedValue("opacity");

      // Modify cache to be dirty
      const cache = (animator as any).propertyCache.get("opacity");
      cache.isDirty = true;

      const value2 = animator.getCurrentAnimatedValue("opacity");
      expect(value2).toEqual(value1); // Should re-parse but get same result
    });
  });

  describe("parseCSSValueToAnimationValue method", () => {
    it("parses valid CSS numeric value", () => {
      const result = animator.parseCSSValueToAnimationValue("width", "150px");
      expect(result).toEqual(createValue.numeric(150, "px"));
    });

    it("parses valid CSS color value", () => {
      const result = animator.parseCSSValueToAnimationValue("color", "#ff0000");
      expect(result.type).toBe("color");
    });

    it("throws error for unsupported property", () => {
      expect(() =>
        animator.parseCSSValueToAnimationValue("unsupported" as any, "10px")
      ).toThrow("Unsupported CSS property");
    });

    it("handles opacity values correctly", () => {
      const result = animator.parseCSSValueToAnimationValue("opacity", "0.75");
      expect(result).toEqual(createValue.numeric(0.75, ""));
    });

    it("handles percentage values correctly", () => {
      const result = animator.parseCSSValueToAnimationValue("width", "50%");
      expect(result).toEqual(createValue.numeric(50, "%"));
    });

    it("handles em values correctly", () => {
      const result = animator.parseCSSValueToAnimationValue(
        "fontSize",
        "1.5em"
      );
      expect(result).toEqual(createValue.numeric(1.5, "em"));
    });
  });

  describe("applyAnimatedPropertyValue method", () => {
    it("applies numeric value correctly", () => {
      const value = createValue.numeric(200, "px");
      animator.applyAnimatedPropertyValue("width", value);

      // Should be batched, need to flush
      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(element.style.width).toBe("200px");
          resolve();
        });
      });
    });

    it("applies color value correctly", () => {
      const value = createValue.rgb(255, 128, 0, 1);
      animator.applyAnimatedPropertyValue("backgroundColor", value);

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(element.style.backgroundColor).toContain("rgb(255, 128, 0)");
          resolve();
        });
      });
    });

    it("applies opacity value correctly", () => {
      const value = createValue.numeric(0.7, "");
      animator.applyAnimatedPropertyValue("opacity", value);

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(element.style.opacity).toBe("0.7");
          resolve();
        });
      });
    });

    it("updates cache when applying value", () => {
      // First get the value to create cache entry
      animator.getCurrentAnimatedValue("width");

      const value = createValue.numeric(200, "px");
      animator.applyAnimatedPropertyValue("width", value);

      const cached = (animator as any).getCached("width");
      expect(cached?.currentValue).toEqual(value);
      expect(cached?.isDirty).toBe(false);
    });

    it("batches multiple property updates", () => {
      const widthValue = createValue.numeric(200, "px");
      const heightValue = createValue.numeric(300, "px");

      animator.applyAnimatedPropertyValue("width", widthValue);
      animator.applyAnimatedPropertyValue("height", heightValue);

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(element.style.width).toBe("200px");
          expect(element.style.height).toBe("300px");
          resolve();
        });
      });
    });

    it("handles camelCase to dash-case conversion", () => {
      const value = createValue.rgb(0, 255, 0, 1);
      animator.applyAnimatedPropertyValue("backgroundColor", value);

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(element.style.backgroundColor).toBeTruthy();
          resolve();
        });
      });
    });

    it("applies border radius correctly", () => {
      const value = createValue.numeric(10, "px");
      animator.applyAnimatedPropertyValue("borderRadius", value);

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(element.style.borderRadius).toBe("10px");
          resolve();
        });
      });
    });

    it("handles precision rounding in applied values", () => {
      const preciseAnimator = new StyleAnimator(element, { precision: 1 });
      const value = createValue.numeric(10.666, "px");
      preciseAnimator.applyAnimatedPropertyValue("width", value);

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(element.style.width).toBe("10.7px");
          resolve();
        });
      });
    });
  });

  describe("restoreOriginalPropertyValues method", () => {
    it("restores all cached original values", () => {
      // First get values to create cache with original values
      animator.getCurrentAnimatedValue("width");
      animator.getCurrentAnimatedValue("opacity");

      // Apply some values
      const value1 = createValue.numeric(200, "px");
      const value2 = createValue.numeric(0.5, "");

      animator.applyAnimatedPropertyValue("width", value1);
      animator.applyAnimatedPropertyValue("opacity", value2);

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          // Values should be applied
          expect(element.style.width).toBe("200px");
          expect(element.style.opacity).toBe("0.5");

          // Now restore
          animator.restoreOriginalPropertyValues();

          // Cache should be cleared
          expect((animator as any).propertyCache.size).toBe(0);
          resolve();
        });
      });
    });

    it("clears property cache after restore", () => {
      animator.getCurrentAnimatedValue("width"); // Create cache
      expect((animator as any).propertyCache.size).toBeGreaterThan(0);

      animator.restoreOriginalPropertyValues();
      expect((animator as any).propertyCache.size).toBe(0);
    });

    it("clears batched updates on restore", () => {
      const value = createValue.numeric(200, "px");
      animator.applyAnimatedPropertyValue("width", value);

      expect((animator as any).batchedUpdates.size).toBeGreaterThan(0);
      animator.restoreOriginalPropertyValues();
      expect((animator as any).batchedUpdates.size).toBe(0);
    });

    it("handles restore errors gracefully", () => {
      // Create a spy that throws on setProperty
      const mockSetProperty = vi.fn(() => {
        throw new Error("Test error");
      });
      element.style.setProperty = mockSetProperty;

      // This should not throw
      expect(() => animator.restoreOriginalPropertyValues()).not.toThrow();
    });
  });

  describe("edge cases and error handling", () => {
    it("handles invalid color space configuration", () => {
      const invalidAnimator = new StyleAnimator(element, {
        colorSpace: "invalid" as any,
      });
      const from = createValue.rgb(255, 0, 0, 1);
      const to = createValue.rgb(0, 255, 0, 1);

      // The error is caught by safeOperation and returns fallback
      const result = invalidAnimator.interpolate("color", from, to, 0.5);
      expect(result).toEqual(to); // Should return fallback value
    });

    it("handles missing computed styles gracefully", () => {
      // Mock getComputedStyle to return null/undefined
      Object.defineProperty(window, "getComputedStyle", {
        value: () => ({
          getPropertyValue: () => "",
        }),
      });

      const newAnimator = new StyleAnimator(element);
      const value = newAnimator.getCurrentAnimatedValue("width");
      expect(value).toEqual(createValue.numeric(0, "px")); // Should use default
    });

    it("handles zero precision configuration", () => {
      const zeroAnimator = new StyleAnimator(element, { precision: 0 });
      const from = createValue.numeric(0, "px");
      const to = createValue.numeric(1, "px");

      const result = zeroAnimator.interpolate("width", from, to, 0.333);
      expect(Math.round((result as any).value)).toBe(0);
    });

    it("handles very large numeric values", () => {
      const largeValue = createValue.numeric(999999, "px");
      expect(() =>
        animator.applyAnimatedPropertyValue("width", largeValue)
      ).not.toThrow();
    });

    it("handles very small numeric values", () => {
      const smallValue = createValue.numeric(0.001, "px");
      const result = animator.interpolate(
        "width",
        smallValue,
        createValue.numeric(1, "px"),
        0.5
      );
      expect((result as any).value).toBeCloseTo(0.5005, 3);
    });

    it("handles negative numeric values", () => {
      const negativeValue = createValue.numeric(-10, "px");
      expect(() =>
        animator.applyAnimatedPropertyValue("width", negativeValue)
      ).not.toThrow();
    });

    it("handles interpolation with same from/to values", () => {
      const value = createValue.numeric(100, "px");
      const result = animator.interpolate("width", value, value, 0.5);
      expect(result).toEqual(value);
    });

    it("handles color interpolation with different alpha values", () => {
      const from = createValue.rgb(255, 0, 0, 0);
      const to = createValue.rgb(255, 0, 0, 1);

      const result = animator.interpolate("color", from, to, 0.5);
      expect((result as any).value.a).toBeCloseTo(0.5, 3);
    });

    it("handles unsupported value types gracefully", () => {
      // Mock an unsupported value type
      const unsupportedValue = { type: "unsupported" } as any;

      // The error is caught by safeOperation and returns fallback
      const result = animator.interpolate(
        "width",
        unsupportedValue,
        unsupportedValue,
        0.5
      );
      expect(result).toEqual(unsupportedValue); // Should return fallback value
    });
  });

  describe("batching and performance", () => {
    it("schedules updates only once per frame", () => {
      const value1 = createValue.numeric(200, "px");
      const value2 = createValue.numeric(300, "px");

      animator.applyAnimatedPropertyValue("width", value1);
      expect((animator as any).updateScheduled).toBe(true);

      animator.applyAnimatedPropertyValue("height", value2);
      expect((animator as any).updateScheduled).toBe(true); // Still true, not double-scheduled
    });

    it("flushes all batched updates at once", () => {
      const spy = vi.spyOn(element.style, "setProperty");

      const value1 = createValue.numeric(200, "px");
      const value2 = createValue.numeric(300, "px");
      const value3 = createValue.numeric(0.5, "");

      animator.applyAnimatedPropertyValue("width", value1);
      animator.applyAnimatedPropertyValue("height", value2);
      animator.applyAnimatedPropertyValue("opacity", value3);

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(spy).toHaveBeenCalledTimes(3);
          expect(spy).toHaveBeenCalledWith("width", "200px");
          expect(spy).toHaveBeenCalledWith("height", "300px");
          expect(spy).toHaveBeenCalledWith("opacity", "0.5");
          resolve();
        });
      });
    });

    it("handles setProperty errors during flush", () => {
      const mockSetProperty = vi
        .fn()
        .mockImplementationOnce(() => {
          throw new Error("Test error");
        })
        .mockImplementation(() => {});

      element.style.setProperty = mockSetProperty;

      const value1 = createValue.numeric(200, "px");
      const value2 = createValue.numeric(300, "px");

      animator.applyAnimatedPropertyValue("width", value1);
      animator.applyAnimatedPropertyValue("height", value2);

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          // Should not throw, and second property should still be applied
          expect(mockSetProperty).toHaveBeenCalledTimes(2);
          resolve();
        });
      });
    });
  });

  describe("color space handling", () => {
    it("works with RGB color space", () => {
      const rgbAnimator = new StyleAnimator(element, { colorSpace: "rgb" });
      const value = rgbAnimator.getCurrentAnimatedValue("backgroundColor");
      expect(value.type).toBe("color");
      expect((value as any).space).toBe("rgb");
    });

    it("works with HSL color space", () => {
      const hslAnimator = new StyleAnimator(element, { colorSpace: "hsl" });
      const value = hslAnimator.getCurrentAnimatedValue("backgroundColor");
      expect(value.type).toBe("color");
      expect((value as any).space).toBe("hsl");
    });

    it("handles color space normalization", () => {
      const hslAnimator = new StyleAnimator(element, { colorSpace: "hsl" });
      const rgbColor = createValue.rgb(255, 0, 0, 1);
      const hslColor = createValue.hsl(120, 100, 50, 1);

      // When colors are already in target space, should return as-is
      const normalizedHsl = (hslAnimator as any).normalizeColorSpace(hslColor);
      expect(normalizedHsl).toEqual(hslColor);

      // When colors need conversion (currently returns as-is with TODO comment)
      const normalizedRgb = (hslAnimator as any).normalizeColorSpace(rgbColor);
      expect(normalizedRgb).toEqual(rgbColor);
    });
  });

  describe("default property values", () => {
    it("provides correct default values for common properties", () => {
      const defaults = (animator as any).getDefaultPropertyValue;

      expect(defaults("opacity")).toBe("1");
      expect(defaults("width")).toBe("0px");
      expect(defaults("height")).toBe("0px");
      expect(defaults("backgroundColor")).toBe("transparent");
      expect(defaults("color")).toBe("rgb(0, 0, 0)");
      expect(defaults("borderWidth")).toBe("0px");
      expect(defaults("borderRadius")).toBe("0px");
      expect(defaults("fontSize")).toBe("16px");
      expect(defaults("lineHeight")).toBe("normal");
      expect(defaults("margin")).toBe("0px");
      expect(defaults("padding")).toBe("0px");
    });

    it("provides fallback default for unknown properties", () => {
      const defaultValue = (animator as any).getDefaultPropertyValue(
        "unknownProperty"
      );
      expect(defaultValue).toBe("0");
    });
  });

  describe("conversion context", () => {
    it("creates conversion context with parent dimensions", () => {
      const context = (animator as any).conversionContext;

      expect(context.parentSize.width).toBe(500);
      expect(context.parentSize.height).toBe(300);
      expect(context.fontSize).toBe(16);
      expect(context.viewportSize.width).toBe(window.innerWidth);
      expect(context.viewportSize.height).toBe(window.innerHeight);
    });

    it("handles missing parent element in conversion context", () => {
      const orphanElement = document.createElement("div");
      const orphanAnimator = new StyleAnimator(orphanElement);
      const context = (orphanAnimator as any).conversionContext;

      expect(context.parentSize.width).toBe(0);
      expect(context.parentSize.height).toBe(0);
    });
  });

  describe("property validation", () => {
    it("validates animatable properties correctly", () => {
      const isValid = (animator as any).isValidProperty;

      // These should be valid
      expect(isValid("opacity")).toBe(true);
      expect(isValid("width")).toBe(true);
      expect(isValid("height")).toBe(true);
      expect(isValid("backgroundColor")).toBe(true);
      expect(isValid("color")).toBe(true);

      // This should be invalid
      expect(isValid("display")).toBe(false);
      expect(isValid("position")).toBe(false);
    });
  });

  describe("CSS string conversion", () => {
    it("converts numeric values to CSS strings correctly", () => {
      const pxValue = createValue.numeric(100, "px");
      const result1 = (animator as any).convertAnimationValueToCssString(
        "width",
        pxValue
      );
      expect(result1).toBe("100px");

      const emValue = createValue.numeric(1.5, "em");
      const result2 = (animator as any).convertAnimationValueToCssString(
        "fontSize",
        emValue
      );
      expect(result2).toBe("1.5em");

      const noUnitValue = createValue.numeric(0.5, "");
      const result3 = (animator as any).convertAnimationValueToCssString(
        "opacity",
        noUnitValue
      );
      expect(result3).toBe("0.5");
    });

    it("converts color values to CSS strings correctly", () => {
      const rgbValue = createValue.rgb(255, 128, 0, 1);
      const rgbString = (animator as any).convertAnimationValueToCssString(
        "color",
        rgbValue
      );
      expect(rgbString).toContain("rgb");

      const hslValue = createValue.hsl(120, 100, 50, 0.5);
      const hslString = (animator as any).convertAnimationValueToCssString(
        "backgroundColor",
        hslValue
      );
      expect(hslString).toBeTruthy();
    });

    it("throws error for unsupported value types in conversion", () => {
      const unsupportedValue = { type: "unsupported" } as any;

      expect(() =>
        (animator as any).convertAnimationValueToCssString(
          "width",
          unsupportedValue
        )
      ).toThrow("Unsupported value type");
    });
  });
});
