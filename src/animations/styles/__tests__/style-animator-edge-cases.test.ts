/// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { StyleAnimator } from "../style-animator";
import { createValue } from "../../../core/animation-val";
import type { CSSPropertyName } from "../type";

describe("StyleAnimator - Edge Cases", () => {
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

  describe("extreme numeric values", () => {
    it("should handle very large numeric values", () => {
      const largeValue = Number.MAX_SAFE_INTEGER;
      const animValue = createValue.numeric(largeValue, "px");

      expect(() => {
        animator.applyAnimatedPropertyValue("width", animValue);
      }).not.toThrow();

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(element.style.width).toBe(`${largeValue}px`);
          resolve();
        });
      });
    });

    it("should handle very small numeric values", () => {
      const tinyValue = Number.MIN_VALUE;
      const animValue = createValue.numeric(tinyValue, "px");

      expect(() => {
        animator.applyAnimatedPropertyValue("width", animValue);
      }).not.toThrow();

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(element.style.width).toBe(`${tinyValue}px`);
          resolve();
        });
      });
    });

    it("should handle negative numeric values", () => {
      const negativeValue = createValue.numeric(-100, "px");

      expect(() => {
        animator.applyAnimatedPropertyValue("width", negativeValue);
      }).not.toThrow();

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(element.style.width).toBe("-100px");
          resolve();
        });
      });
    });

    it("should handle zero values correctly", () => {
      const zeroValue = createValue.numeric(0, "px");

      animator.applyAnimatedPropertyValue("width", zeroValue);

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(element.style.width).toBe("0px");
          resolve();
        });
      });
    });

    it("should handle decimal precision edge cases", async () => {
      const preciseAnimator = new StyleAnimator(element, { precision: 10 });
      const preciseValue = createValue.numeric(1.123456789012345, "px");

      preciseAnimator.applyAnimatedPropertyValue("width", preciseValue);

      // Wait for batched update to be processed
      await new Promise(resolve => setTimeout(resolve, 50));

      // JavaScript precision limits - check that it has high precision digits
      expect(element.style.width).toMatch(/1\.123456789\d*px/);
    });

    it("should handle scientific notation values", () => {
      const scientificValue = createValue.numeric(1.23e-4, "px");

      animator.applyAnimatedPropertyValue("width", scientificValue);

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(element.style.width).toBe("0.000123px");
          resolve();
        });
      });
    });
  });

  describe("special numeric values", () => {
    it("should handle Infinity values", () => {
      const infinityValue = createValue.numeric(Infinity, "px");

      expect(() => {
        animator.applyAnimatedPropertyValue("width", infinityValue);
      }).not.toThrow();

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          // Browsers reject Infinity as invalid CSS - expect empty string
          expect(element.style.width).toBe("");
          resolve();
        });
      });
    });

    it("should handle -Infinity values", () => {
      const negInfinityValue = createValue.numeric(-Infinity, "px");

      expect(() => {
        animator.applyAnimatedPropertyValue("width", negInfinityValue);
      }).not.toThrow();

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          // Browsers reject -Infinity as invalid CSS - expect empty string
          expect(element.style.width).toBe("");
          resolve();
        });
      });
    });

    it("should handle NaN values", () => {
      const nanValue = createValue.numeric(NaN, "px");

      expect(() => {
        animator.applyAnimatedPropertyValue("width", nanValue);
      }).not.toThrow();

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          // Browsers reject NaN as invalid CSS - expect empty string
          expect(element.style.width).toBe("");
          resolve();
        });
      });
    });

    it("should handle interpolation with special values", () => {
      const normalValue = createValue.numeric(100, "px");
      const infinityValue = createValue.numeric(Infinity, "px");

      // This should be caught by safeOperation and return fallback
      const result = animator.interpolate(
        "width",
        normalValue,
        infinityValue,
        0.5
      );
      expect(result).toEqual(infinityValue); // Fallback should be 'to' value since progress >= 0.5
    });
  });

  describe("boundary interpolation conditions", () => {
    it("should handle interpolation at exact boundaries", () => {
      const from = createValue.numeric(0, "px");
      const to = createValue.numeric(100, "px");

      const atStart = animator.interpolate("width", from, to, 0);
      const atEnd = animator.interpolate("width", from, to, 1);

      expect(atStart).toEqual(from);
      expect(atEnd).toEqual(to);
    });

    it("should handle interpolation beyond normal progress range", () => {
      const from = createValue.numeric(50, "px");
      const to = createValue.numeric(150, "px");

      // Progress is clamped, so these should return boundary values
      const beforeStart = animator.interpolate("width", from, to, -0.5);
      const afterEnd = animator.interpolate("width", from, to, 1.5);

      expect(beforeStart).toEqual(from);
      expect(afterEnd).toEqual(to);
    });

    it("should handle very small progress increments", () => {
      const from = createValue.numeric(0, "px");
      const to = createValue.numeric(1000, "px");

      const tinyProgress = animator.interpolate("width", from, to, 0.000001);
      expect((tinyProgress as any).value).toBeCloseTo(0.001, 3);
    });

    it("should handle progress values very close to 1", () => {
      const from = createValue.numeric(0, "px");
      const to = createValue.numeric(100, "px");

      const nearEnd = animator.interpolate("width", from, to, 0.999999);
      expect((nearEnd as any).value).toBeCloseTo(99.9999, 4);
    });
  });

  describe("color edge cases", () => {
    it("should handle color values with extreme RGB components", () => {
      const extremeColor = createValue.rgb(255, 0, 255, 1);

      expect(() => {
        animator.applyAnimatedPropertyValue("backgroundColor", extremeColor);
      }).not.toThrow();

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(element.style.backgroundColor).toContain("rgb(255, 0, 255)");
          resolve();
        });
      });
    });

    it("should handle color interpolation with zero alpha", () => {
      const transparentRed = createValue.rgb(255, 0, 0, 0);
      const opaqueBlue = createValue.rgb(0, 0, 255, 1);

      const result = animator.interpolate(
        "backgroundColor",
        transparentRed,
        opaqueBlue,
        0.5
      );
      expect(result.type).toBe("color");
      expect((result as any).value.a).toBeCloseTo(0.5, 3);
    });

    it("should handle HSL color edge cases", () => {
      const hslAnimator = new StyleAnimator(element, { colorSpace: "hsl" });

      // Hue at boundary (359 degrees)
      const boundaryHue = createValue.hsl(359, 100, 50, 1);
      const zeroHue = createValue.hsl(0, 100, 50, 1);

      const result = hslAnimator.interpolate(
        "color",
        boundaryHue,
        zeroHue,
        0.5
      );
      expect(result.type).toBe("color");
    });

    it("should handle color interpolation with same colors", () => {
      const color = createValue.rgb(128, 128, 128, 0.5);

      const result = animator.interpolate("backgroundColor", color, color, 0.5);
      expect(result).toEqual(color);
    });

    it("should handle color interpolation with very small alpha differences", () => {
      const color1 = createValue.rgb(255, 0, 0, 0.0001);
      const color2 = createValue.rgb(255, 0, 0, 0.0002);

      const result = animator.interpolate("color", color1, color2, 0.5);
      expect((result as any).value.a).toBeCloseTo(0.00015, 5);
    });
  });

  describe("precision edge cases", () => {
    it("should handle zero precision configuration", () => {
      const zeroAnimator = new StyleAnimator(element, { precision: 0 });
      const value = createValue.numeric(123.456789, "px");

      zeroAnimator.applyAnimatedPropertyValue("width", value);

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(element.style.width).toBe("123px");
          resolve();
        });
      });
    });

    it("should handle negative precision (should not crash)", () => {
      const negativeAnimator = new StyleAnimator(element, { precision: -1 });
      const value = createValue.numeric(123.456, "px");

      expect(() => {
        negativeAnimator.applyAnimatedPropertyValue("width", value);
      }).not.toThrow();
    });

    it("should handle very high precision", () => {
      const highPrecisionAnimator = new StyleAnimator(element, {
        precision: 20,
      });
      const value = createValue.numeric(1.2345678901234567890123456789, "px");

      highPrecisionAnimator.applyAnimatedPropertyValue("width", value);

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          // JavaScript number precision limits will apply
          expect(element.style.width).toContain("1.234567890123456");
          resolve();
        });
      });
    });

    it("should handle precision rounding edge cases", () => {
      const animator2 = new StyleAnimator(element, { precision: 2 });

      // Test rounding at .5 boundary
      const value1 = createValue.numeric(1.235, "px"); // Should round to 1.24
      const value2 = createValue.numeric(1.225, "px"); // Should round to 1.23

      animator2.applyAnimatedPropertyValue("width", value1);

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(element.style.width).toBe("1.24px");

          animator2.applyAnimatedPropertyValue("width", value2);

          requestAnimationFrame(() => {
            expect(element.style.width).toBe("1.23px");
            resolve();
          });
        });
      });
    });
  });

  describe("error recovery and resilience", () => {
    it("should recover from DOM manipulation errors", () => {
      const originalSetProperty = element.style.setProperty;
      let callCount = 0;

      element.style.setProperty = vi.fn((prop, value) => {
        callCount++;
        if (callCount === 1) {
          throw new Error("Simulated DOM error");
        }
        return originalSetProperty.call(element.style, prop, value);
      });

      // First call should fail, second should succeed
      animator.applyAnimatedPropertyValue(
        "width",
        createValue.numeric(100, "px")
      );
      animator.applyAnimatedPropertyValue(
        "height",
        createValue.numeric(200, "px")
      );

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(element.style.height).toBe("200px");
          element.style.setProperty = originalSetProperty;
          resolve();
        });
      });
    });

    it("should handle corrupted computed style values", () => {
      Object.defineProperty(window, "getComputedStyle", {
        value: () => ({
          getPropertyValue: () => {
            throw new Error("Computed style error");
          },
          fontSize: "16px",
        }),
      });

      const errorAnimator = new StyleAnimator(element);

      // Should fall back to defaults without crashing
      expect(() => {
        const value = errorAnimator.currentValue("width");
        expect(value).toEqual(createValue.numeric(0, "px")); // Fallback
      }).not.toThrow();
    });

    it("should handle malformed CSS values gracefully", () => {
      // Mock getComputedStyle to return malformed values
      Object.defineProperty(window, "getComputedStyle", {
        value: () => ({
          getPropertyValue: (prop: string) => {
            if (prop === "width") return "not-a-number";
            if (prop === "background-color") return "invalid-color";
            return "malformed";
          },
          fontSize: "16px",
        }),
      });

      const errorAnimator = new StyleAnimator(element);

      expect(() => {
        const width = errorAnimator.currentValue("width");
        const bgColor = errorAnimator.currentValue("backgroundColor");
        // Should return fallback values
        expect(width).toEqual(createValue.numeric(0, "px"));
        expect(bgColor.type).toBe("color");
      }).not.toThrow();
    });

    it("should handle parser exceptions gracefully", () => {
      // Test with invalid CSS values that cause parser to throw
      expect(() => {
        animator.parse("width", "completely-invalid-css-value");
      }).not.toThrow();

      const result = animator.parse("width", "invalid");
      expect(result).toEqual(createValue.numeric(0, "px")); // Fallback
    });

    it("should handle interpolation failures gracefully", () => {
      // Create mock values that will cause interpolation to fail
      const mockValue1 = { type: "invalid" } as any;
      const mockValue2 = { type: "invalid" } as any;

      const result = animator.interpolate("width", mockValue1, mockValue2, 0.5);
      // Should return fallback value (progress >= 0.5 means return 'to' value)
      expect(result).toEqual(mockValue2);
    });
  });

  describe("memory and performance edge cases", () => {
    it("should handle rapid cache invalidation", () => {
      // Create cache entry
      animator.currentValue("width");

      // Rapidly invalidate and recreate cache
      for (let i = 0; i < 100; i++) {
        const cache = (animator as any).propertyCache.get("width");
        if (cache) {
          cache.isDirty = true;
        }
        animator.currentValue("width");
      }

      expect((animator as any).propertyCache.size).toBeGreaterThan(0);
    });

    it("should handle massive batch updates", () => {
      const properties: CSSPropertyName[] = [
        "width",
        "height",
        "opacity",
        "borderRadius",
      ];
      const batchSize = 1000;

      const startTime = performance.now();

      for (let i = 0; i < batchSize; i++) {
        properties.forEach((prop, index) => {
          const value =
            prop === "opacity"
              ? createValue.numeric(Math.random(), "")
              : createValue.numeric(i + index, "px");
          animator.applyAnimatedPropertyValue(prop, value);
        });
      }

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within reasonable time
    });

    it("should handle memory cleanup under stress", () => {
      const iterations = 50;

      for (let i = 0; i < iterations; i++) {
        // Create cache entries
        animator.currentValue("width");
        animator.currentValue("height");
        animator.currentValue("opacity");

        // Apply values
        animator.applyAnimatedPropertyValue(
          "width",
          createValue.numeric(i, "px")
        );
        animator.applyAnimatedPropertyValue(
          "height",
          createValue.numeric(i, "px")
        );

        // Reset periodically
        if (i % 10 === 0) {
          animator.reset();
          expect((animator as any).propertyCache.size).toBe(0);
          expect((animator as any).batchedUpdates.size).toBe(0);
        }
      }
    });

    it("should handle concurrent operations without race conditions", () => {
      const operations: any[] = [];

      // Create many concurrent operations
      for (let i = 0; i < 100; i++) {
        operations.push(() => {
          animator.applyAnimatedPropertyValue(
            "width",
            createValue.numeric(i, "px")
          );
        });
        operations.push(() => {
          animator.currentValue("width");
        });
        operations.push(() => {
          animator.interpolate(
            "width",
            createValue.numeric(0, "px"),
            createValue.numeric(100, "px"),
            Math.random()
          );
        });
      }

      // Execute all operations rapidly
      expect(() => {
        operations.forEach((op) => op());
      }).not.toThrow();
    });
  });

  describe("browser compatibility edge cases", () => {
    it("should handle missing requestAnimationFrame", () => {
      const originalRAF = window.requestAnimationFrame;

      // Remove requestAnimationFrame
      (window as any).requestAnimationFrame = undefined;

      // Should handle gracefully (likely falls back to setTimeout in real implementation)
      expect(() => {
        animator.applyAnimatedPropertyValue(
          "width",
          createValue.numeric(200, "px")
        );
      }).not.toThrow();

      // Restore
      window.requestAnimationFrame = originalRAF;
    });

    it("should handle different getComputedStyle implementations", () => {
      // Mock different browser behaviors
      Object.defineProperty(window, "getComputedStyle", {
        value: (el: HTMLElement) => {
          // Some browsers return null for detached elements
          if (!el.parentElement) return null;

          return {
            getPropertyValue: (prop: string) => {
              // Different browsers return different default values
              switch (prop) {
                case "width":
                  return "auto";
                case "height":
                  return "0";
                case "opacity":
                  return "";
                default:
                  return "initial";
              }
            },
            fontSize: "16px",
          };
        },
      });

      const compatAnimator = new StyleAnimator(element);

      expect(() => {
        const width = compatAnimator.currentValue("width");
        const height = compatAnimator.currentValue("height");
        const opacity = compatAnimator.currentValue("opacity");

        // Should handle all these gracefully with fallbacks
        expect(width).toEqual(createValue.numeric(0, "px"));
        expect(height).toEqual(createValue.numeric(0, "px"));
        expect(opacity).toEqual(createValue.numeric(1, "")); // Default for opacity
      }).not.toThrow();
    });

    it("should handle detached elements", () => {
      const detachedElement = document.createElement("div");

      expect(() => {
        const detachedAnimator = new StyleAnimator(detachedElement);
        detachedAnimator.applyAnimatedPropertyValue(
          "width",
          createValue.numeric(100, "px")
        );
        detachedAnimator.currentValue("width");
        detachedAnimator.reset();
      }).not.toThrow();
    });

    it("should handle CSS property name variations", () => {
      // Test camelCase to kebab-case conversion edge cases
      const testCases: CSSPropertyName[] = [
        "backgroundColor",
        "borderRadius",
        "borderWidth",
        "borderColor",
      ];

      testCases.forEach((prop) => {
        expect(() => {
          animator.applyAnimatedPropertyValue(
            prop,
            createValue.rgb(255, 0, 0, 1)
          );
        }).not.toThrow();
      });
    });
  });

  describe("unit conversion edge cases", () => {
    it("should handle viewport units in different contexts", () => {
      const vwValue = createValue.numeric(50, "vw");
      const vhValue = createValue.numeric(50, "vh");

      expect(() => {
        animator.applyAnimatedPropertyValue("width", vwValue);
        animator.applyAnimatedPropertyValue("height", vhValue);
      }).not.toThrow();

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(element.style.width).toBe("50vw");
          expect(element.style.height).toBe("50vh");
          resolve();
        });
      });
    });

    it("should handle em and rem units with various font sizes", () => {
      const emValue = createValue.numeric(2.5, "em");
      const remValue = createValue.numeric(1.5, "rem");

      expect(() => {
        animator.applyAnimatedPropertyValue("width", emValue);
        animator.applyAnimatedPropertyValue("height", remValue);
      }).not.toThrow();

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(element.style.width).toBe("2.5em");
          expect(element.style.height).toBe("1.5rem");
          resolve();
        });
      });
    });

    it("should handle percentage values correctly", () => {
      const percentValue = createValue.numeric(75, "%");

      animator.applyAnimatedPropertyValue("width", percentValue);

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(element.style.width).toBe("75%");
          resolve();
        });
      });
    });

    it("should handle unitless properties", () => {
      const unitlessValue = createValue.numeric(0.75, "");

      animator.applyAnimatedPropertyValue("opacity", unitlessValue);

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(element.style.opacity).toBe("0.75");
          resolve();
        });
      });
    });
  });

  describe("color space edge cases", () => {
    it("should handle unsupported color space configuration", () => {
      // This should fall back gracefully
      const invalidAnimator = new StyleAnimator(element, {
        colorSpace: "invalid" as any,
      });

      const color1 = createValue.rgb(255, 0, 0, 1);
      const color2 = createValue.rgb(0, 255, 0, 1);

      // Should use safeOperation fallback
      const result = invalidAnimator.interpolate("color", color1, color2, 0.5);
      expect(result).toEqual(color2); // Fallback should be 'to' value
    });

    it("should handle color space normalization edge cases", () => {
      const hslAnimator = new StyleAnimator(element, { colorSpace: "hsl" });

      // Mix RGB and HSL colors in same operation
      const rgbColor = createValue.rgb(255, 0, 0, 1);
      const hslColor = createValue.hsl(120, 100, 50, 1);

      expect(() => {
        hslAnimator.applyAnimatedPropertyValue("color", rgbColor);
        hslAnimator.applyAnimatedPropertyValue("backgroundColor", hslColor);
      }).not.toThrow();
    });

    it("should handle extreme HSL values", () => {
      const hslAnimator = new StyleAnimator(element, { colorSpace: "hsl" });

      // Test boundary values
      const extremeHsl = createValue.hsl(360, 0, 100, 1);

      expect(() => {
        hslAnimator.applyAnimatedPropertyValue("color", extremeHsl);
      }).not.toThrow();
    });
  });

  describe("animation timing edge cases", () => {
    it("should handle rapid animation frame requests", () => {
      let frameCount = 0;
      const maxFrames = 10;

      const rapidAnimation = () => {
        if (frameCount < maxFrames) {
          frameCount++;
          animator.applyAnimatedPropertyValue(
            "width",
            createValue.numeric(frameCount * 10, "px")
          );
          requestAnimationFrame(rapidAnimation);
        }
      };

      expect(() => {
        rapidAnimation();
      }).not.toThrow();
    });

    it("should handle animation cleanup on element removal", () => {
      animator.applyAnimatedPropertyValue(
        "width",
        createValue.numeric(200, "px")
      );

      // Remove element from DOM
      element.remove();

      expect(() => {
        // Should handle gracefully even though element is detached
        animator.applyAnimatedPropertyValue(
          "height",
          createValue.numeric(300, "px")
        );
        animator.reset();
      }).not.toThrow();
    });

    it("should handle batched updates with timing edge cases", async () => {
      // Apply many updates in quick succession
      for (let i = 0; i < 50; i++) {
        animator.applyAnimatedPropertyValue(
          "width",
          createValue.numeric(i, "px")
        );
        animator.applyAnimatedPropertyValue(
          "height",
          createValue.numeric(i * 2, "px")
        );
      }

      // Should only schedule one animation frame
      expect((animator as any).updateScheduled).toBe(true);

      // Wait for batched updates to be processed
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(element.style.width).toBe("49px"); // Last value
      expect(element.style.height).toBe("98px");
    });
  });
});
