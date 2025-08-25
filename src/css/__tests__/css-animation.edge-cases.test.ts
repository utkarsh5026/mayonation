import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CSSAnimator } from "../css-animation";
import type { CSSAnimationConfig } from "../types";

describe("CSSAnimator Edge Cases", () => {
  let testContainer: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    testContainer = document.createElement('div');
    document.body.appendChild(testContainer);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe("Extreme Values and Boundary Conditions", () => {
    it("should handle Number.MAX_SAFE_INTEGER duration", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: CSSAnimationConfig = {
        target: element,
        duration: Number.MAX_SAFE_INTEGER,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      expect(() => new CSSAnimator(config)).not.toThrow();
      
      const animator = new CSSAnimator(config);
      expect(animator.baseDuration).toBe(Number.MAX_SAFE_INTEGER);
      expect(() => animator.update(0.5)).not.toThrow();
    });

    it("should handle negative duration", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: CSSAnimationConfig = {
        target: element,
        duration: -1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      const animator = new CSSAnimator(config);
      expect(animator.baseDuration).toBe(-1000);
      expect(() => animator.update(0.5)).not.toThrow();
    });

    it("should handle infinite duration", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: CSSAnimationConfig = {
        target: element,
        duration: Number.POSITIVE_INFINITY,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      const animator = new CSSAnimator(config);
      expect(animator.baseDuration).toBe(Number.POSITIVE_INFINITY);
    });

    it("should handle NaN duration", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: CSSAnimationConfig = {
        target: element,
        duration: NaN,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      const animator = new CSSAnimator(config);
      expect(Number.isNaN(animator.baseDuration)).toBe(true);
    });

    it("should handle extreme stagger values", () => {
      const elements = Array.from({ length: 3 }, () => {
        const el = document.createElement('div');
        testContainer.appendChild(el);
        return el;
      });

      const config: CSSAnimationConfig = {
        target: elements,
        duration: 1000,
        stagger: Number.MAX_SAFE_INTEGER,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      expect(() => new CSSAnimator(config)).not.toThrow();
      
      const animator = new CSSAnimator(config);
      expect(() => animator.update(0.5)).not.toThrow();
    });

    it("should handle extremely large array properties", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const largeArray = Array.from({ length: 10000 }, (_, i) => i / 10000);

      const config: CSSAnimationConfig = {
        target: element,
        duration: 1000,
        to: { opacity: largeArray },
      };

      expect(() => new CSSAnimator(config)).not.toThrow();
      
      const animator = new CSSAnimator(config);
      expect(() => animator.update(0.5)).not.toThrow();
    });

    it("should handle progress values beyond 0-1 range", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: CSSAnimationConfig = {
        target: element,
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      const animator = new CSSAnimator(config);

      // Test extreme progress values
      expect(() => animator.update(-1000)).not.toThrow();
      expect(() => animator.update(1000)).not.toThrow();
      expect(() => animator.update(Number.NEGATIVE_INFINITY)).not.toThrow();
      expect(() => animator.update(Number.POSITIVE_INFINITY)).not.toThrow();
      expect(() => animator.update(NaN)).not.toThrow();
    });
  });

  describe("Malformed and Invalid Inputs", () => {
    it("should handle empty string selectors", () => {
      const config: CSSAnimationConfig = {
        target: "",
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      expect(() => new CSSAnimator(config)).toThrow();
    });

    it("should handle whitespace-only selectors", () => {
      const config: CSSAnimationConfig = {
        target: "   \n\t  ",
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      expect(() => new CSSAnimator(config)).toThrow();
    });

    it("should handle null target", () => {
      const config: CSSAnimationConfig = {
        target: null as any,
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      expect(() => new CSSAnimator(config)).toThrow();
    });

    it("should handle undefined target", () => {
      const config: CSSAnimationConfig = {
        target: undefined as any,
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      expect(() => new CSSAnimator(config)).toThrow();
    });

    it("should handle arrays containing null elements", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: CSSAnimationConfig = {
        target: [element, null, undefined] as any,
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      expect(() => new CSSAnimator(config)).not.toThrow();
      const animator = new CSSAnimator(config);
      expect(animator.elementCount).toBe(1);
    });

    it("should handle empty arrays", () => {
      const config: CSSAnimationConfig = {
        target: [],
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      expect(() => new CSSAnimator(config)).toThrow();
    });

    it("should handle invalid CSS selectors", () => {
      const invalidSelectors = [
        ">>>invalid",
        ".class..",
        "#id#invalid",
        "[attr=unclosed",
        ":::::invalid",
        "element > > child",
      ];

      invalidSelectors.forEach(selector => {
        const config: CSSAnimationConfig = {
          target: selector,
          duration: 1000,
          from: { opacity: 0 },
          to: { opacity: 1 },
        };

        // May throw or return empty results depending on browser
        try {
          const animator = new CSSAnimator(config);
          // If it doesn't throw, it should have 0 elements
          expect(animator.elementCount).toBe(0);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      });
    });
  });

  describe("Complex Property Value Edge Cases", () => {
    it("should handle circular reference in property functions", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      let callCount = 0;
      const circularFunction = (index: number, el: HTMLElement): number => {
        callCount++;
        if (callCount > 100) return 1; // Prevent infinite recursion
        return circularFunction(index, el);
      };

      const config: CSSAnimationConfig = {
        target: element,
        duration: 1000,
        to: { opacity: circularFunction },
      };

      expect(() => new CSSAnimator(config)).not.toThrow();
    });

    it("should handle functions that throw errors", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const throwingFunction = () => {
        throw new Error("Property function error");
      };

      const config: CSSAnimationConfig = {
        target: element,
        duration: 1000,
        to: { opacity: throwingFunction },
      };

      expect(() => new CSSAnimator(config)).toThrow();
    });

    it("should handle mixed data types in arrays", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: CSSAnimationConfig = {
        target: element,
        duration: 1000,
        to: {
          // Mixed types that shouldn't be together
          opacity: [0, "0.5", 1, null, undefined, NaN] as any,
          translateX: ["0px", 50, "100%", true, false] as any,
        },
      };

      expect(() => new CSSAnimator(config)).not.toThrow();
      
      const animator = new CSSAnimator(config);
      expect(() => animator.update(0.5)).not.toThrow();
    });

    it("should handle extremely nested object properties", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const nestedObject: any = {};
      let current = nestedObject;
      
      // Create deep nesting
      for (let i = 0; i < 100; i++) {
        current.nested = { value: i };
        current = current.nested;
      }

      const config: CSSAnimationConfig = {
        target: element,
        duration: 1000,
        to: { opacity: nestedObject as any },
      };

      expect(() => new CSSAnimator(config)).not.toThrow();
    });

    it("should handle property names with special characters", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: CSSAnimationConfig = {
        target: element,
        duration: 1000,
        to: {
          // CSS custom properties with special characters
          '--my-custom-prop': 100,
          '--prop_with_underscore': 200,
          '--prop-123-numbers': 300,
          '--prop.with.dots': 400,
          'data-attribute': 500,
        },
      };

      expect(() => new CSSAnimator(config)).not.toThrow();
      
      const animator = new CSSAnimator(config);
      expect(() => animator.update(0.5)).not.toThrow();
    });
  });

  describe("Keyframe Edge Cases", () => {
    it("should handle keyframes with duplicate offsets", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: CSSAnimationConfig = {
        target: element,
        duration: 1000,
        keyframes: [
          { offset: 0, opacity: 0 },
          { offset: 0.5, opacity: 0.5 },
          { offset: 0.5, opacity: 0.3 }, // Duplicate offset
          { offset: 0.5, opacity: 0.7 }, // Another duplicate
          { offset: 1, opacity: 1 },
        ],
      };

      expect(() => new CSSAnimator(config)).not.toThrow();
      
      const animator = new CSSAnimator(config);
      expect(() => animator.update(0.5)).not.toThrow();
    });

    it("should handle keyframes with out-of-order offsets", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: CSSAnimationConfig = {
        target: element,
        duration: 1000,
        keyframes: [
          { offset: 1, opacity: 1 },     // Out of order
          { offset: 0, opacity: 0 },     // Start
          { offset: 0.7, opacity: 0.7 }, // Out of order
          { offset: 0.3, opacity: 0.3 }, // Out of order
        ],
      };

      expect(() => new CSSAnimator(config)).not.toThrow();
      
      const animator = new CSSAnimator(config);
      expect(() => animator.update(0.5)).not.toThrow();
    });

    it("should handle keyframes with invalid offsets", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: CSSAnimationConfig = {
        target: element,
        duration: 1000,
        keyframes: [
          { offset: -0.5, opacity: 0 },   // Negative
          { offset: 0.5, opacity: 0.5 },
          { offset: 1.5, opacity: 1 },    // Greater than 1
          { offset: NaN, opacity: 0.3 },  // NaN
          { offset: Infinity, opacity: 0.8 }, // Infinity
        ],
      };

      expect(() => new CSSAnimator(config)).not.toThrow();
      
      const animator = new CSSAnimator(config);
      expect(() => animator.update(0.5)).not.toThrow();
    });

    it("should handle empty keyframes array", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: CSSAnimationConfig = {
        target: element,
        duration: 1000,
        keyframes: [],
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      expect(() => new CSSAnimator(config)).not.toThrow();
    });

    it("should handle keyframes with missing properties", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: CSSAnimationConfig = {
        target: element,
        duration: 1000,
        keyframes: [
          { offset: 0 }, // No properties
          { offset: 0.5, opacity: 0.5 },
          { offset: 1 }, // No properties
        ],
      };

      expect(() => new CSSAnimator(config)).not.toThrow();
    });
  });

  describe("Callback Function Edge Cases", () => {
    it("should handle callback functions that throw errors", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config1: CSSAnimationConfig = {
        target: element,
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
        onStart: () => { throw new Error("onStart error"); },
      };

      const config2: CSSAnimationConfig = {
        target: element,
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
        onUpdate: () => { throw new Error("onUpdate error"); },
      };

      const config3: CSSAnimationConfig = {
        target: element,
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
        onComplete: () => { throw new Error("onComplete error"); },
      };

      const animator1 = new CSSAnimator(config1);
      const animator2 = new CSSAnimator(config2);
      const animator3 = new CSSAnimator(config3);

      expect(() => animator1.start()).toThrow("onStart error");
      expect(() => animator2.update(0.5)).toThrow("onUpdate error");
      expect(() => animator3.complete()).toThrow("onComplete error");
    });

    it("should handle callback functions with infinite loops", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      let callCount = 0;
      const infiniteCallback = () => {
        callCount++;
        if (callCount > 1000) return; // Prevent infinite execution
        infiniteCallback();
      };

      const config: CSSAnimationConfig = {
        target: element,
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
        onUpdate: infiniteCallback,
      };

      const animator = new CSSAnimator(config);
      
      // Should eventually return (or timeout in testing environment)
      expect(() => animator.update(0.5)).not.toThrow();
    });

    it("should handle callbacks that modify the DOM", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: CSSAnimationConfig = {
        target: element,
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
        onStart: () => {
          // Remove elements during animation
          element.remove();
        },
        onUpdate: () => {
          // Add new elements during animation
          const newEl = document.createElement('span');
          testContainer.appendChild(newEl);
        },
        onComplete: () => {
          // Clear container
          testContainer.innerHTML = '';
        },
      };

      const animator = new CSSAnimator(config);

      expect(() => {
        animator.start();
        animator.update(0.5);
        animator.complete();
      }).not.toThrow();
    });
  });

  describe("Memory and Performance Edge Cases", () => {
    it("should handle rapid creation and destruction of animators", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: CSSAnimationConfig = {
        target: element,
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      // Create and destroy many animators rapidly
      for (let i = 0; i < 100; i++) {
        const animator = new CSSAnimator(config);
        animator.update(Math.random());
        if (Math.random() > 0.5) {
          animator.complete();
        } else {
          animator.reset();
        }
      }

      expect(true).toBe(true); // Should not crash
    });

    it("should handle animations with thousands of elements", () => {
      const elements: HTMLElement[] = [];
      
      // Create many elements
      for (let i = 0; i < 1000; i++) {
        const element = document.createElement('div');
        element.className = 'test-element';
        testContainer.appendChild(element);
        elements.push(element);
      }

      const config: CSSAnimationConfig = {
        target: '.test-element',
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: (index) => index / 1000 },
      };

      expect(() => new CSSAnimator(config)).not.toThrow();
      
      const animator = new CSSAnimator(config);
      expect(animator.elementCount).toBe(1000);
      
      // Test performance
      const startTime = performance.now();
      animator.update(0.5);
      const endTime = performance.now();
      
      // Should complete within reasonable time (adjust as needed)
      expect(endTime - startTime).toBeLessThan(1000); // 1 second
    });

    it("should handle very high frequency updates", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: CSSAnimationConfig = {
        target: element,
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      const animator = new CSSAnimator(config);

      // Very rapid updates (simulating 1000fps)
      const startTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        animator.update(i / 1000);
      }
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete quickly
    });
  });

  describe("Browser Compatibility Edge Cases", () => {
    it("should handle missing CSS property support", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: CSSAnimationConfig = {
        target: element,
        duration: 1000,
        to: {
          // Properties that might not be supported in all browsers
          'backdrop-filter': 'blur(10px)',
          'clip-path': 'polygon(0 0, 100% 0, 50% 100%)',
          'mask-image': 'linear-gradient(black, transparent)',
          'scroll-snap-type': 'x mandatory',
        },
      };

      expect(() => new CSSAnimator(config)).not.toThrow();
      
      const animator = new CSSAnimator(config);
      expect(() => animator.update(0.5)).not.toThrow();
    });

    it("should handle vendor-prefixed properties", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: CSSAnimationConfig = {
        target: element,
        duration: 1000,
        to: {
          '-webkit-transform': 'translateX(100px)',
          '-moz-transform': 'translateX(100px)',
          '-ms-transform': 'translateX(100px)',
          '-o-transform': 'translateX(100px)',
          'transform': 'translateX(100px)',
        },
      };

      expect(() => new CSSAnimator(config)).not.toThrow();
    });

    it("should handle different element types", () => {
      const elementTypes = [
        'div', 'span', 'p', 'h1', 'section', 'article', 
        'canvas', 'svg', 'img', 'video', 'audio',
        'input', 'button', 'textarea', 'select'
      ];

      elementTypes.forEach(tagName => {
        const element = document.createElement(tagName);
        testContainer.appendChild(element);

        const config: CSSAnimationConfig = {
          target: element,
          duration: 1000,
          from: { opacity: 0 },
          to: { opacity: 1 },
        };

        expect(() => new CSSAnimator(config)).not.toThrow();
        
        const animator = new CSSAnimator(config);
        expect(animator.elementCount).toBe(1);
        expect(() => animator.update(0.5)).not.toThrow();
      });
    });
  });

  describe("Concurrency and Race Conditions", () => {
    it("should handle simultaneous animations on same element", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config1: CSSAnimationConfig = {
        target: element,
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      const config2: CSSAnimationConfig = {
        target: element,
        duration: 800,
        from: { translateX: 0 },
        to: { translateX: 100 },
      };

      const animator1 = new CSSAnimator(config1);
      const animator2 = new CSSAnimator(config2);

      // Run both animations simultaneously
      expect(() => {
        animator1.update(0.3);
        animator2.update(0.6);
        animator1.update(0.7);
        animator2.update(0.9);
        animator1.complete();
        animator2.complete();
      }).not.toThrow();
    });

    it("should handle reset during active animation", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: CSSAnimationConfig = {
        target: element,
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      const animator = new CSSAnimator(config);

      // Start animation, then reset midway
      animator.update(0.5);
      animator.reset();
      animator.update(0.8); // Continue after reset

      expect(() => animator.complete()).not.toThrow();
    });
  });
});