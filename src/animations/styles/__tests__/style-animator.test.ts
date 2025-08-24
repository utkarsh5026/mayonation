/// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { StyleAnimator } from "../style-animator";
import { createValue } from "../../../core/animation-val";
import { CSSHandlerOptions, CSSPropertyName } from "../type";

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

    // Restore original getComputedStyle if it was modified
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
      configurable: true,
    });
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
      expect((result as any).space).toBe("rgb");
    });

    it("interpolates between color values in HSL space", () => {
      const hslAnimator = new StyleAnimator(element, { colorSpace: "hsl" });
      const from = createValue.hsl(0, 100, 50, 1);
      const to = createValue.hsl(120, 100, 50, 1);

      const result = hslAnimator.interpolate("color", from, to, 0.5);
      expect(result.type).toBe("color");
      expect((result as any).space).toBe("hsl");
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

    it("clamps progress values to valid range [0, 1]", () => {
      const from = createValue.numeric(0, "px");
      const to = createValue.numeric(100, "px");

      // Progress values outside [0, 1] should be clamped, not throw errors
      const clampedLow = animator.interpolate("width", from, to, -0.1);
      expect((clampedLow as any).value).toBe(0); // Clamped to 0

      const clampedHigh = animator.interpolate("width", from, to, 1.1);
      expect((clampedHigh as any).value).toBe(100); // Clamped to 1
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

      const result = animator.interpolate("fontSize" as any, from, to, 0.5);
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

  describe("currentValue method", () => {
    it("gets current value and caches it", () => {
      const value = animator.currentValue("opacity");
      expect(value).toEqual(createValue.numeric(1, ""));

      // Second call should use cache
      const cachedValue = animator.currentValue("opacity");
      expect(cachedValue).toEqual(value);
    });

    it("gets current width value correctly", () => {
      const value = animator.currentValue("width");
      expect(value).toEqual(createValue.numeric(100, "px"));
    });

    it("gets current color value correctly", () => {
      const value = animator.currentValue("backgroundColor");
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
      const value = newAnimator.currentValue("width");
      expect(value).toEqual(createValue.numeric(0, "px")); // Should use default
    });

    it("invalidates cache when property is marked dirty", () => {
      const value1 = animator.currentValue("opacity");

      // Modify cache to be dirty
      const cache = (animator as any).propertyCache.get("opacity");
      cache.isDirty = true;

      const value2 = animator.currentValue("opacity");
      expect(value2).toEqual(value1); // Should re-parse but get same result
    });
  });

  describe("parse method", () => {
    it("parses valid CSS numeric value", () => {
      const result = animator.parse("width", "150px");
      expect(result).toEqual(createValue.numeric(150, "px"));
    });

    it("parses valid CSS color value", () => {
      const result = animator.parse("color", "#ff0000");
      expect(result.type).toBe("color");
    });

    it("throws error for unsupported property", () => {
      expect(() => animator.parse("unsupported" as any, "10px")).toThrow(
        "Unsupported CSS property"
      );
    });

    it("handles opacity values correctly", () => {
      const result = animator.parse("opacity", "0.75");
      expect(result).toEqual(createValue.numeric(0.75, ""));
    });

    it("handles percentage values correctly", () => {
      const result = animator.parse("width", "50%");
      expect(result).toEqual(createValue.numeric(50, "%"));
    });

    it("handles em values correctly", () => {
      const result = animator.parse("fontSize" as any, "1.5em");
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
      animator.currentValue("width");

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

  describe("reset method", () => {
    it("restores all cached original values", () => {
      // First get values to create cache with original values
      animator.currentValue("width");
      animator.currentValue("opacity");

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
          animator.reset();

          // Cache should be cleared
          expect((animator as any).propertyCache.size).toBe(0);
          resolve();
        });
      });
    });

    it("clears property cache after restore", () => {
      animator.currentValue("width"); // Create cache
      expect((animator as any).propertyCache.size).toBeGreaterThan(0);

      animator.reset();
      expect((animator as any).propertyCache.size).toBe(0);
    });

    it("clears batched updates on restore", () => {
      const value = createValue.numeric(200, "px");
      animator.applyAnimatedPropertyValue("width", value);

      expect((animator as any).batchedUpdates.size).toBeGreaterThan(0);
      animator.reset();
      expect((animator as any).batchedUpdates.size).toBe(0);
    });

    it("handles restore errors gracefully", () => {
      // Create a spy that throws on setProperty
      const mockSetProperty = vi.fn(() => {
        throw new Error("Test error");
      });
      element.style.setProperty = mockSetProperty;

      // This should not throw
      expect(() => animator.reset()).not.toThrow();
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
      const value = newAnimator.currentValue("width");
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
      const value = rgbAnimator.currentValue("backgroundColor");
      expect(value.type).toBe("color");
      expect((value as any).space).toBe("rgb");
    });

    it("works with HSL color space", () => {
      const hslAnimator = new StyleAnimator(element, { colorSpace: "hsl" });
      const value = hslAnimator.currentValue("backgroundColor");
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
      expect(isValid("borderWidth")).toBe(true);
      expect(isValid("borderRadius")).toBe(true);
      expect(isValid("borderColor")).toBe(true);
      expect(isValid("fontSize")).toBe(true);
      expect(isValid("lineHeight")).toBe(true);
      expect(isValid("margin")).toBe(true);
      expect(isValid("padding")).toBe(true);
      expect(isValid("boxShadow")).toBe(true);
      expect(isValid("textShadow")).toBe(true);

      // This should be invalid
      expect(isValid("display")).toBe(false);
      expect(isValid("position")).toBe(false);
      expect(isValid("zIndex")).toBe(false);
      expect(isValid("cursor")).toBe(false);
    });

    it("validates static method correctly", () => {
      expect(StyleAnimator.isAnimatableProperty("opacity")).toBe(true);
      expect(StyleAnimator.isAnimatableProperty("backgroundColor")).toBe(true);
      expect(StyleAnimator.isAnimatableProperty("display")).toBe(false);
      expect(StyleAnimator.isAnimatableProperty("position")).toBe(false);
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

  describe("StyleParser integration", () => {
    it("handles complex CSS values through parser", () => {
      const complexColor = "hsla(240, 100%, 50%, 0.8)";
      const result = animator.parse("backgroundColor", complexColor);
      expect(result.type).toBe("color");
    });

    it("handles parser fallbacks for invalid values", () => {
      const invalidValue = "invalid-css-value";
      const result = animator.parse("width", invalidValue);
      expect(result).toEqual(createValue.numeric(0, "px"));
    });

    it("correctly parses computed styles through parser", () => {
      // Test that currentValue uses parser correctly
      const value = animator.currentValue("backgroundColor");
      expect(value.type).toBe("color");
      expect((value as any).space).toBe("rgb"); // Default color space changed to RGB
    });

    it("handles parser color space switching", () => {
      const rgbAnimator = new StyleAnimator(element, { colorSpace: "rgb" });
      const hslAnimator = new StyleAnimator(element, { colorSpace: "hsl" });

      const rgbValue = rgbAnimator.currentValue("backgroundColor");
      const hslValue = hslAnimator.currentValue("backgroundColor");

      expect((rgbValue as any).space).toBe("rgb");
      expect((hslValue as any).space).toBe("hsl");
    });

    it("handles property-specific parsing rules", () => {
      // Test opacity range validation
      const validOpacity = animator.parse("opacity", "0.5");
      expect(validOpacity).toEqual(createValue.numeric(0.5, ""));

      // Test border-radius unit restrictions
      const validRadius = animator.parse("borderRadius", "10px");
      expect(validRadius).toEqual(createValue.numeric(10, "px"));
    });

    it("handles transparent color keyword", () => {
      const transparent = animator.parse("backgroundColor", "transparent");
      expect(transparent.type).toBe("color");
      expect((transparent as any).value.a).toBe(0);
    });

    it("handles hex color values", () => {
      const hexColor = animator.parse("color", "#ff0000");
      expect(hexColor.type).toBe("color");
    });

    it("handles rgb color values", () => {
      const rgbColor = animator.parse("color", "rgb(255, 0, 0)");
      expect(rgbColor.type).toBe("color");
    });

    it("handles rgba color values", () => {
      const rgbaColor = animator.parse("color", "rgba(255, 0, 0, 0.5)");
      expect(rgbaColor.type).toBe("color");
      expect((rgbaColor as any).value.a).toBe(0.5);
    });

    it("handles hsl color values", () => {
      const hslColor = animator.parse("color", "hsl(120, 100%, 50%)");
      expect(hslColor.type).toBe("color");
    });

    it("handles hsla color values", () => {
      const hslaColor = animator.parse("color", "hsla(120, 100%, 50%, 0.8)");
      expect(hslaColor.type).toBe("color");
      expect((hslaColor as any).value.a).toBe(0.8);
    });
  });

  describe("complex property combinations", () => {
    it("handles multiple property animations simultaneously", () => {
      const properties = ["width", "height", "opacity", "backgroundColor"];
      const values = [
        createValue.numeric(200, "px"),
        createValue.numeric(300, "px"),
        createValue.numeric(0.8, ""),
        createValue.rgb(255, 128, 0, 1),
      ];

      properties.forEach((prop, i) => {
        animator.applyAnimatedPropertyValue(prop as any, values[i]);
      });

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(element.style.width).toBe("200px");
          expect(element.style.height).toBe("300px");
          expect(element.style.opacity).toBe("0.8");
          expect(element.style.backgroundColor).toContain("rgb");
          resolve();
        });
      });
    });

    it("handles transform properties correctly", () => {
      // Note: transform isn't in EXTENDED_ANIMATABLE_PROPERTIES but test the pattern
      expect(() =>
        animator.parse("transform" as any, "translateX(10px)")
      ).toThrow("Unsupported CSS property");
    });

    it("handles complex multi-property scenarios", () => {
      // Test a complex card animation scenario
      const properties: CSSPropertyName[] = [
        "width",
        "height",
        "borderRadius",
        "opacity",
        "backgroundColor",
      ];
      const values = [
        createValue.numeric(250, "px"),
        createValue.numeric(150, "px"),
        createValue.numeric(20, "px"),
        createValue.numeric(0.9, ""),
        createValue.rgb(0, 100, 200, 1),
      ];

      properties.forEach((prop, index) => {
        animator.applyAnimatedPropertyValue(prop, values[index]);
      });

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(element.style.width).toBe("250px");
          expect(element.style.height).toBe("150px");
          expect(element.style.borderRadius).toBe("20px");
          expect(element.style.opacity).toBe("0.9");
          expect(element.style.backgroundColor).toContain("rgb");
          resolve();
        });
      });
    });

    it("handles color transitions correctly", () => {
      const startColor = animator.currentValue("backgroundColor");
      const endColor = createValue.rgb(0, 255, 128, 1);

      const steps = 5;
      const results = [];

      for (let i = 0; i <= steps; i++) {
        const progress = i / steps;
        const interpolated = animator.interpolate(
          "backgroundColor",
          startColor,
          endColor,
          progress
        );
        results.push(interpolated);
        animator.applyAnimatedPropertyValue("backgroundColor", interpolated);
      }

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          // Should end with the target color
          expect(element.style.backgroundColor).toContain("rgb");
          resolve();
        });
      });
    });

    it("handles shorthand vs longhand properties", () => {
      const borderWidth = animator.parse("borderWidth", "2px");
      expect(borderWidth).toEqual(createValue.numeric(2, "px"));

      // Test that we handle camelCase correctly
      const borderRadius = animator.parse("borderRadius", "5px");
      expect(borderRadius).toEqual(createValue.numeric(5, "px"));
    });

    it("handles property interdependencies", () => {
      // Apply multiple related properties
      animator.applyAnimatedPropertyValue(
        "width",
        createValue.numeric(100, "px")
      );
      animator.applyAnimatedPropertyValue(
        "height",
        createValue.numeric(100, "px")
      );
      animator.applyAnimatedPropertyValue(
        "borderRadius",
        createValue.numeric(50, "%")
      );

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(element.style.width).toBe("100px");
          expect(element.style.height).toBe("100px");
          expect(element.style.borderRadius).toBe("50%");
          resolve();
        });
      });
    });
  });

  describe("performance and memory", () => {
    it("handles large numbers of property updates efficiently", () => {
      const startTime = performance.now();

      // Apply many property updates
      for (let i = 0; i < 100; i++) {
        animator.applyAnimatedPropertyValue(
          "width",
          createValue.numeric(i, "px")
        );
      }

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // Should be very fast due to batching
    });

    it("properly cleans up cache on restore", () => {
      // Create many cache entries
      const properties = [
        "width",
        "height",
        "opacity",
        "fontSize",
        "borderWidth",
      ];
      properties.forEach((prop) => {
        animator.currentValue(prop as any);
      });

      expect((animator as any).propertyCache.size).toBe(properties.length);

      animator.reset();
      expect((animator as any).propertyCache.size).toBe(0);
    });

    it("handles rapid successive interpolations", () => {
      const from = createValue.numeric(0, "px");
      const to = createValue.numeric(1000, "px");

      // Perform many interpolations
      for (let i = 0; i <= 100; i++) {
        const result = animator.interpolate("width", from, to, i / 100);
        expect((result as any).value).toBeCloseTo(i * 10, 0);
      }
    });

    it("handles cache efficiency under load", () => {
      const startTime = performance.now();

      // Create many cache entries
      const properties: CSSPropertyName[] = [
        "width",
        "height",
        "opacity",
        "borderRadius",
        "borderWidth",
      ];

      // Access each property multiple times to test cache efficiency
      for (let round = 0; round < 10; round++) {
        properties.forEach((prop) => {
          animator.currentValue(prop);
        });
      }

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(50); // Should be very fast due to caching
    });

    it("handles concurrent property updates and reads", () => {
      const operations: any[] = [];

      // Create interleaved operations
      for (let i = 0; i < 20; i++) {
        operations.push(() => {
          animator.applyAnimatedPropertyValue(
            "width",
            createValue.numeric(100 + i, "px")
          );
        });
        operations.push(() => {
          return animator.currentValue("width");
        });
        operations.push(() => {
          return animator.interpolate(
            "width",
            createValue.numeric(0, "px"),
            createValue.numeric(200, "px"),
            0.5
          );
        });
      }

      expect(() => {
        operations.forEach((op) => op());
      }).not.toThrow();
    });

    it("handles memory cleanup for removed elements", () => {
      // Create cache entries
      animator.currentValue("width");
      animator.currentValue("height");

      // Simulate element removal
      element.remove();

      // Operations should still work but might use defaults
      expect(() => {
        animator.reset();
      }).not.toThrow();
    });

    it("handles large batch operations efficiently", () => {
      const startTime = performance.now();

      // Apply many property updates in rapid succession
      const properties: CSSPropertyName[] = [
        "width",
        "height",
        "opacity",
        "borderRadius",
      ];

      for (let i = 0; i < 100; i++) {
        properties.forEach((prop, index) => {
          const value =
            prop === "opacity"
              ? createValue.numeric(Math.random(), "")
              : createValue.numeric(50 + i + index * 10, "px");
          animator.applyAnimatedPropertyValue(prop, value);
        });
      }

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // Should handle efficiently
    });

    it("handles memory cleanup on frequent resets", () => {
      // Create cache entries
      const properties: CSSPropertyName[] = [
        "width",
        "height",
        "opacity",
        "backgroundColor",
        "borderRadius",
      ];

      for (let cycle = 0; cycle < 10; cycle++) {
        // Create cache entries
        properties.forEach((prop) => {
          animator.currentValue(prop);
          animator.applyAnimatedPropertyValue(
            prop,
            prop === "opacity"
              ? createValue.numeric(0.5, "")
              : prop === "backgroundColor"
              ? createValue.rgb(255, 0, 0, 1)
              : createValue.numeric(100, "px")
          );
        });

        // Reset and verify cleanup
        animator.reset();
        expect((animator as any).propertyCache.size).toBe(0);
        expect((animator as any).batchedUpdates.size).toBe(0);
      }
    });
  });

  describe("DOM manipulation edge cases", () => {
    it("handles element style changes during animation", () => {
      // Apply animated value
      animator.applyAnimatedPropertyValue(
        "width",
        createValue.numeric(200, "px")
      );

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          // Manually change style
          element.style.width = "300px";

          // Apply another animated value
          animator.applyAnimatedPropertyValue(
            "width",
            createValue.numeric(400, "px")
          );

          requestAnimationFrame(() => {
            expect(element.style.width).toBe("400px");
            resolve();
          });
        });
      });
    });

    it("handles computed style changes", () => {
      // First get a cached value
      const initialValue = animator.currentValue("width");
      expect(initialValue).toEqual(createValue.numeric(100, "px"));

      // Create new animator with different computed styles
      Object.defineProperty(window, "getComputedStyle", {
        value: () => ({
          getPropertyValue: () => "150px",
          fontSize: "16px",
        }),
        configurable: true,
      });

      const newAnimator = new StyleAnimator(element);
      const newValue = newAnimator.currentValue("width");
      expect(newValue).toEqual(createValue.numeric(150, "px"));
    });

    it("handles parent element changes", () => {
      // Create new parent with different dimensions
      document.body.innerHTML =
        '<div id="new-parent"><div id="new-target"></div></div>';
      const newParent = document.getElementById("new-parent") as HTMLElement;
      const newElement = document.getElementById("new-target") as HTMLElement;

      Object.defineProperty(newParent, "getBoundingClientRect", {
        value: () => ({ width: 800, height: 600 }),
      });

      // Create new animator to pick up new context
      const newAnimator = new StyleAnimator(newElement);
      const context = (newAnimator as any).conversionContext;

      expect(context.parentSize.width).toBe(800);
      expect(context.parentSize.height).toBe(600);
    });

    it("handles CSS class changes affecting computed styles", () => {
      // Add CSS class that might change computed styles
      element.className = "test-class";

      // Should not affect cached values until marked dirty
      const cachedValue = animator.currentValue("width");
      expect(cachedValue).toEqual(createValue.numeric(100, "px"));
    });
  });

  describe("concurrent operations", () => {
    it("handles multiple animators on same element", () => {
      const animator2 = new StyleAnimator(element, { colorSpace: "rgb" });

      // Apply different properties with different animators
      animator.applyAnimatedPropertyValue(
        "width",
        createValue.numeric(200, "px")
      );
      animator2.applyAnimatedPropertyValue(
        "height",
        createValue.numeric(300, "px")
      );

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(element.style.width).toBe("200px");
          expect(element.style.height).toBe("300px");
          resolve();
        });
      });
    });

    it("handles conflicting property updates", () => {
      const animator2 = new StyleAnimator(element);

      // Both animators update same property
      animator.applyAnimatedPropertyValue(
        "width",
        createValue.numeric(200, "px")
      );
      animator2.applyAnimatedPropertyValue(
        "width",
        createValue.numeric(300, "px")
      );

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          // Last update should win
          expect(element.style.width).toBe("300px");
          resolve();
        });
      });
    });

    it("handles rapid property changes", () => {
      const values = [100, 150, 200, 250, 300];

      // Apply values rapidly
      values.forEach((val) => {
        animator.applyAnimatedPropertyValue(
          "width",
          createValue.numeric(val, "px")
        );
      });

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          // Should have final value
          expect(element.style.width).toBe("300px");
          resolve();
        });
      });
    });

    it("handles interleaved gets and sets", () => {
      // Interleave getting and setting values
      const value1 = animator.currentValue("width");
      animator.applyAnimatedPropertyValue(
        "height",
        createValue.numeric(200, "px")
      );
      const value2 = animator.currentValue("opacity");
      animator.applyAnimatedPropertyValue(
        "width",
        createValue.numeric(300, "px")
      );

      expect(value1).toEqual(createValue.numeric(100, "px"));
      expect(value2).toEqual(createValue.numeric(1, ""));

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(element.style.width).toBe("300px");
          expect(element.style.height).toBe("200px");
          resolve();
        });
      });
    });
  });

  describe("browser compatibility scenarios", () => {
    it("handles missing requestAnimationFrame", () => {
      const originalRAF = window.requestAnimationFrame;

      // Mock missing requestAnimationFrame with a fallback
      (window as any).requestAnimationFrame = (
        callback: FrameRequestCallback
      ) => {
        setTimeout(callback, 16); // Fallback to setTimeout
        return 1;
      };

      // Should handle gracefully
      expect(() => {
        animator.applyAnimatedPropertyValue(
          "width",
          createValue.numeric(200, "px")
        );
      }).not.toThrow();

      // Restore
      window.requestAnimationFrame = originalRAF;
    });

    it("handles different computed style formats", () => {
      // Test various CSS color formats that browsers might return
      Object.defineProperty(window, "getComputedStyle", {
        value: () => ({
          getPropertyValue: (prop: string) => {
            if (prop === "background-color") return "rgba(255, 0, 0, 1)";
            if (prop === "color") return "#00ff00";
            return "auto";
          },
          fontSize: "16px",
        }),
      });

      const newAnimator = new StyleAnimator(element);
      const bgColor = newAnimator.currentValue("backgroundColor");
      const textColor = newAnimator.currentValue("color");

      expect(bgColor.type).toBe("color");
      expect(textColor.type).toBe("color");
    });

    it("handles vendor prefixed properties", () => {
      // Test that we handle standard properties (vendor prefixes would be in prop-names)
      expect((animator as any).isValidProperty("borderRadius")).toBe(true);
      expect((animator as any).isValidProperty("-webkit-border-radius")).toBe(
        false
      );
    });

    it("handles CSS custom properties (variables)", () => {
      // CSS custom properties aren't in our animatable list
      expect((animator as any).isValidProperty("--custom-property")).toBe(
        false
      );
    });

    it("handles browser-specific quirks", () => {
      // Test handling of different computed style return values
      Object.defineProperty(window, "getComputedStyle", {
        value: () => ({
          getPropertyValue: (prop: string) => {
            // Simulate different browser behaviors
            if (prop === "width") return "100px";
            if (prop === "background-color") return "rgb(255, 0, 0)";
            if (prop === "opacity") return "1";
            return "initial"; // Some browsers return 'initial' for unset properties
          },
          fontSize: "16px",
        }),
      });

      const browserAnimator = new StyleAnimator(element);

      expect(() => {
        browserAnimator.currentValue("width");
        browserAnimator.currentValue("backgroundColor");
        browserAnimator.currentValue("opacity");
      }).not.toThrow();
    });

    it("handles different CSS syntax variations", () => {
      // Test various valid CSS value formats
      const testCases = [
        { prop: "width" as CSSPropertyName, value: "100px" },
        { prop: "width" as CSSPropertyName, value: "50%" },
        { prop: "width" as CSSPropertyName, value: "10em" },
        { prop: "width" as CSSPropertyName, value: "5rem" },
        { prop: "width" as CSSPropertyName, value: "20vw" },
        { prop: "width" as CSSPropertyName, value: "15vh" },
        { prop: "opacity" as CSSPropertyName, value: "0" },
        { prop: "opacity" as CSSPropertyName, value: "1" },
        { prop: "opacity" as CSSPropertyName, value: "0.5" },
        { prop: "borderRadius" as CSSPropertyName, value: "10px" },
        { prop: "borderRadius" as CSSPropertyName, value: "50%" },
      ];

      testCases.forEach(({ prop, value }) => {
        expect(() => {
          animator.parse(prop, value);
        }).not.toThrow();
      });
    });
  });

  describe("advanced interpolation scenarios", () => {
    it("handles color interpolation edge cases", () => {
      const blackColor = createValue.rgb(0, 0, 0, 1);
      const whiteColor = createValue.rgb(255, 255, 255, 1);

      const midpoint = animator.interpolate(
        "color",
        blackColor,
        whiteColor,
        0.5
      );
      expect(midpoint.type).toBe("color");
      const midpointColor = (midpoint as any).value;
      // Midpoint between 0 and 255 might be 127.5 or 128 due to floating point math
      expect(midpointColor.r).toBeGreaterThanOrEqual(127);
      expect(midpointColor.r).toBeLessThanOrEqual(128);
      expect(midpointColor.g).toBeGreaterThanOrEqual(127);
      expect(midpointColor.g).toBeLessThanOrEqual(128);
      expect(midpointColor.b).toBeGreaterThanOrEqual(127);
      expect(midpointColor.b).toBeLessThanOrEqual(128);
    });

    it("handles HSL color interpolation", () => {
      const hslAnimator = new StyleAnimator(element, { colorSpace: "hsl" });
      const redHsl = createValue.hsl(0, 100, 50, 1);
      const blueHsl = createValue.hsl(240, 100, 50, 1);

      const result = hslAnimator.interpolate("color", redHsl, blueHsl, 0.5);
      expect(result.type).toBe("color");
      expect((result as any).space).toBe("hsl");
    });

    it("handles alpha channel interpolation", () => {
      const opaqueColor = createValue.rgb(255, 0, 0, 1);
      const transparentColor = createValue.rgb(255, 0, 0, 0);

      const semiTransparent = animator.interpolate(
        "color",
        opaqueColor,
        transparentColor,
        0.5
      );
      expect((semiTransparent as any).value.a).toBeCloseTo(0.5, 3);
    });

    it("handles unit-less numeric interpolation", () => {
      const from = createValue.numeric(0, "");
      const to = createValue.numeric(1, "");

      const result = animator.interpolate("opacity", from, to, 0.3);
      expect(result).toEqual(createValue.numeric(0.3, ""));
    });

    it("handles percentage values interpolation", () => {
      const from = createValue.numeric(0, "%");
      const to = createValue.numeric(100, "%");

      const result = animator.interpolate("width", from, to, 0.25);
      expect(result).toEqual(createValue.numeric(25, "%"));
    });

    it("handles em unit interpolation", () => {
      const from = createValue.numeric(1, "em");
      const to = createValue.numeric(3, "em");

      const result = animator.interpolate("fontSize" as any, from, to, 0.5);
      expect(result).toEqual(createValue.numeric(2, "em"));
    });

    it("handles rem unit interpolation", () => {
      const from = createValue.numeric(1, "rem");
      const to = createValue.numeric(2, "rem");

      const result = animator.interpolate("fontSize" as any, from, to, 0.75);
      expect(result).toEqual(createValue.numeric(1.75, "rem"));
    });

    it("handles viewport unit interpolation", () => {
      const from = createValue.numeric(10, "vw");
      const to = createValue.numeric(50, "vw");

      const result = animator.interpolate("width", from, to, 0.5);
      expect(result).toEqual(createValue.numeric(30, "vw"));
    });
  });

  describe("property-specific behaviors", () => {
    it("handles opacity bounds correctly", () => {
      const validOpacity = animator.parse("opacity", "0.5");
      expect(validOpacity).toEqual(createValue.numeric(0.5, ""));

      // Invalid opacity values should fallback to default (0px) due to safeOperation
      const invalidHigh = animator.parse("opacity", "1.5");
      expect(invalidHigh).toEqual(createValue.numeric(0, "px"));
      
      const invalidLow = animator.parse("opacity", "-0.1");
      expect(invalidLow).toEqual(createValue.numeric(0, "px"));
    });

    it("handles border properties correctly", () => {
      const borderWidth = animator.parse("borderWidth", "2px");
      expect(borderWidth).toEqual(createValue.numeric(2, "px"));

      const borderRadius = animator.parse("borderRadius", "10%");
      expect(borderRadius).toEqual(createValue.numeric(10, "%"));
    });

    it("handles dimension properties with various units", () => {
      const widthPx = animator.parse("width", "200px");
      expect(widthPx).toEqual(createValue.numeric(200, "px"));

      const heightPercent = animator.parse("height", "50%");
      expect(heightPercent).toEqual(createValue.numeric(50, "%"));

      const widthVw = animator.parse("width", "25vw");
      expect(widthVw).toEqual(createValue.numeric(25, "vw"));
    });

    it("handles font-related properties", () => {
      const fontSize = animator.parse("fontSize" as any, "18px");
      expect(fontSize).toEqual(createValue.numeric(18, "px"));

      const lineHeight = animator.parse("lineHeight" as any, "1.4");
      expect(lineHeight).toEqual(createValue.numeric(1.4, ""));
    });
  });

  describe("integration scenarios", () => {
    it("handles complete animation cycle", () => {
      // Simulate a complete animation cycle
      const startValue = animator.currentValue("width");
      const endValue = createValue.numeric(300, "px");

      // Interpolate through animation
      const frames = [];
      for (let i = 0; i <= 10; i++) {
        const progress = i / 10;
        const interpolated = animator.interpolate(
          "width",
          startValue,
          endValue,
          progress
        );
        frames.push(interpolated);
        animator.applyAnimatedPropertyValue("width", interpolated);
      }

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(element.style.width).toBe("300px");

          // Restore to original
          animator.reset();
          resolve();
        });
      });
    });

    it("handles error recovery during animation", () => {
      // Start with valid operation
      animator.applyAnimatedPropertyValue(
        "width",
        createValue.numeric(200, "px")
      );

      // Cause an error in setProperty
      const originalSetProperty = element.style.setProperty;
      let errorCount = 0;
      element.style.setProperty = vi.fn((prop, value) => {
        errorCount++;
        if (errorCount === 1) throw new Error("Simulated error");
        return originalSetProperty.call(element.style, prop, value);
      });

      // Should handle error and continue
      animator.applyAnimatedPropertyValue(
        "height",
        createValue.numeric(300, "px")
      );

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          // First property should have failed, second should succeed
          expect(element.style.height).toBe("300px");

          // Restore
          element.style.setProperty = originalSetProperty;
          resolve();
        });
      });
    });

    it("handles precision edge cases in real animations", () => {
      const preciseAnimator = new StyleAnimator(element, { precision: 4 });

      // Test very small incremental changes
      const start = createValue.numeric(0, "px");
      const end = createValue.numeric(1, "px");

      const smallIncrement = preciseAnimator.interpolate(
        "width",
        start,
        end,
        0.00001
      );
      expect((smallIncrement as any).value).toBeCloseTo(0.00001, 4);
    });

    it("handles multi-property animations", () => {
      const properties: CSSPropertyName[] = [
        "width",
        "height",
        "opacity",
        "borderRadius",
      ];
      const startValues = properties.map((prop) => animator.currentValue(prop));
      const endValues = [
        createValue.numeric(300, "px"),
        createValue.numeric(200, "px"),
        createValue.numeric(0.5, ""),
        createValue.numeric(15, "px"),
      ];

      // Animate all properties simultaneously
      const progress = 0.7;
      properties.forEach((prop, index) => {
        const interpolated = animator.interpolate(
          prop,
          startValues[index],
          endValues[index],
          progress
        );
        animator.applyAnimatedPropertyValue(prop, interpolated);
      });

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(element.style.width).toBe("240px"); // 100 + (300-100)*0.7
          expect(element.style.height).toBe("200px"); // 200 + (200-200)*0.7
          expect(element.style.opacity).toBe("0.65"); // 1 + (0.5-1)*0.7
          expect(element.style.borderRadius).toBe("12px"); // 5 + (15-5)*0.7
          resolve();
        });
      });
    });
  });

  describe("advanced color handling", () => {
    it("handles color space conversions during interpolation", () => {
      const rgbAnimator = new StyleAnimator(element, { colorSpace: "rgb" });
      const hslAnimator = new StyleAnimator(element, { colorSpace: "hsl" });

      const color1 = createValue.rgb(255, 0, 0, 1);
      const color2 = createValue.rgb(0, 255, 0, 1);

      const rgbResult = rgbAnimator.interpolate("color", color1, color2, 0.5);
      const hslResult = hslAnimator.interpolate("color", color1, color2, 0.5);

      expect(rgbResult.type).toBe("color");
      expect(hslResult.type).toBe("color");
    });

    it("handles transparent to opaque color transitions", () => {
      const transparent = createValue.rgb(255, 0, 0, 0);
      const opaque = createValue.rgb(255, 0, 0, 1);

      const result = animator.interpolate(
        "backgroundColor",
        transparent,
        opaque,
        0.7
      );
      expect((result as any).value.a).toBeCloseTo(0.7, 3);
    });

    it("handles color interpolation with different RGB values and alpha", () => {
      const color1 = createValue.rgb(255, 100, 50, 0.3);
      const color2 = createValue.rgb(100, 200, 150, 0.8);

      const result = animator.interpolate("color", color1, color2, 0.5);
      const colorValue = (result as any).value;

      // Midpoint between 255,100,50 and 100,200,150 - allow for floating point variations
      expect(colorValue.r).toBeGreaterThanOrEqual(177);
      expect(colorValue.r).toBeLessThanOrEqual(178);
      expect(colorValue.g).toBe(150); // Exact midpoint
      expect(colorValue.b).toBe(100); // Exact midpoint
      expect(colorValue.a).toBeCloseTo(0.55, 2);
    });

    it("handles HSL hue wraparound correctly", () => {
      const hslAnimator = new StyleAnimator(element, { colorSpace: "hsl" });
      const color1 = createValue.hsl(350, 100, 50, 1); // Red-ish
      const color2 = createValue.hsl(10, 100, 50, 1); // Red-ish (across 0)

      const result = hslAnimator.interpolate("color", color1, color2, 0.5);
      expect(result.type).toBe("color");
    });

    it("handles edge case color values", () => {
      // Test with extreme color values
      const black = createValue.rgb(0, 0, 0, 1);
      const white = createValue.rgb(255, 255, 255, 1);

      // Test at boundaries
      const atStart = animator.interpolate("color", black, white, 0);
      const atEnd = animator.interpolate("color", black, white, 1);

      expect((atStart as any).value.r).toBe(0);
      expect((atEnd as any).value.r).toBe(255);
    });
  });

  describe("real-world animation patterns", () => {
    it("simulates a fade-in animation", () => {
      const steps = 10;
      const fadeFrames = [];

      for (let i = 0; i <= steps; i++) {
        const progress = i / steps;
        const opacity = animator.interpolate(
          "opacity",
          createValue.numeric(0, ""),
          createValue.numeric(1, ""),
          progress
        );
        fadeFrames.push(opacity);
        animator.applyAnimatedPropertyValue("opacity", opacity);
      }

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(element.style.opacity).toBe("1");
          expect(fadeFrames.length).toBe(steps + 1);
          resolve();
        });
      });
    });

    it("simulates a scale animation using width/height", () => {
      const startWidth = createValue.numeric(100, "px");
      const startHeight = createValue.numeric(100, "px");
      const endWidth = createValue.numeric(200, "px");
      const endHeight = createValue.numeric(200, "px");

      const progress = 0.75;

      const newWidth = animator.interpolate(
        "width",
        startWidth,
        endWidth,
        progress
      );
      const newHeight = animator.interpolate(
        "height",
        startHeight,
        endHeight,
        progress
      );

      animator.applyAnimatedPropertyValue("width", newWidth);
      animator.applyAnimatedPropertyValue("height", newHeight);

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(element.style.width).toBe("175px"); // 100 + (200-100)*0.75
          expect(element.style.height).toBe("175px");
          resolve();
        });
      });
    });

    it("simulates a color transition animation", () => {
      const startColor = createValue.rgb(255, 0, 0, 1); // Red
      const endColor = createValue.rgb(0, 0, 255, 1); // Blue

      const frames = [];
      const steps = 5;

      for (let i = 0; i <= steps; i++) {
        const progress = i / steps;
        const currentColor = animator.interpolate(
          "backgroundColor",
          startColor,
          endColor,
          progress
        );
        frames.push(currentColor);
        animator.applyAnimatedPropertyValue("backgroundColor", currentColor);
      }

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(element.style.backgroundColor).toContain("rgb");
          expect(frames.length).toBe(steps + 1);
          resolve();
        });
      });
    });

    it("simulates a complex card hover animation", () => {
      // Simulate multiple properties changing together
      const animations = {
        width: {
          from: createValue.numeric(200, "px"),
          to: createValue.numeric(220, "px"),
        },
        height: {
          from: createValue.numeric(150, "px"),
          to: createValue.numeric(165, "px"),
        },
        borderRadius: {
          from: createValue.numeric(8, "px"),
          to: createValue.numeric(12, "px"),
        },
        opacity: {
          from: createValue.numeric(0.9, ""),
          to: createValue.numeric(1, ""),
        },
        backgroundColor: {
          from: createValue.rgb(240, 240, 240, 1),
          to: createValue.rgb(255, 255, 255, 1),
        },
      };

      const progress = 0.6;

      Object.entries(animations).forEach(([prop, { from, to }]) => {
        const interpolated = animator.interpolate(
          prop as CSSPropertyName,
          from,
          to,
          progress
        );
        animator.applyAnimatedPropertyValue(
          prop as CSSPropertyName,
          interpolated
        );
      });

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(element.style.width).toBe("212px"); // 200 + (220-200)*0.6
          expect(element.style.height).toBe("159px"); // 150 + (165-150)*0.6
          expect(element.style.borderRadius).toBe("10.4px"); // 8 + (12-8)*0.6
          expect(element.style.opacity).toBe("0.96"); // 0.9 + (1-0.9)*0.6
          expect(element.style.backgroundColor).toContain("rgb");
          resolve();
        });
      });
    });
  });
});
