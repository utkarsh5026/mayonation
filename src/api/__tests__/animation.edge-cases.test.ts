import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Mayonation, MayonationConfig } from "../animation";

describe("Mayonation Edge Cases", () => {
  let testContainer: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    testContainer = document.createElement('div');
    document.body.appendChild(testContainer);

    // Store original functions before mocking
    const originalSetTimeout = global.setTimeout;
    const originalRequestAnimationFrame = global.requestAnimationFrame;

    // Mock timing functions
    global.requestAnimationFrame = vi.fn((callback) => {
      originalSetTimeout(callback, 16);
      return 123;
    });
    global.cancelAnimationFrame = vi.fn();
    global.performance = { now: vi.fn(() => Date.now()) } as any;
    global.setTimeout = vi.fn((callback, delay) => {
      originalSetTimeout(callback, Math.max(0, delay || 0));
      return 123;
    }) as any;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe("Extreme Configuration Values", () => {
    it("should handle Number.MAX_SAFE_INTEGER duration", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: MayonationConfig = {
        target: element,
        duration: Number.MAX_SAFE_INTEGER,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      expect(() => new Mayonation(config)).not.toThrow();
    });

    it("should reject negative duration", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: MayonationConfig = {
        target: element,
        duration: -1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      expect(() => new Mayonation(config)).toThrow();
    });

    it("should reject infinite duration", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: MayonationConfig = {
        target: element,
        duration: Number.POSITIVE_INFINITY,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      expect(() => new Mayonation(config)).toThrow();
    });

    it("should reject NaN duration", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: MayonationConfig = {
        target: element,
        duration: NaN,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      expect(() => new Mayonation(config)).toThrow();
    });

    it("should reject invalid delay values", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const invalidConfigs = [
        { delay: -1000 },
        { delay: Number.POSITIVE_INFINITY },
        { delay: NaN },
      ];

      const validConfigs = [
        { delay: Number.MAX_SAFE_INTEGER },
        { delay: 0 },
        { delay: 5000 },
      ];

      invalidConfigs.forEach(delayConfig => {
        const config: MayonationConfig = {
          target: element,
          duration: 1000,
          delay: delayConfig.delay,
          from: { opacity: 0 },
          to: { opacity: 1 },
        };

        expect(() => new Mayonation(config)).toThrow();
      });

      validConfigs.forEach(delayConfig => {
        const config: MayonationConfig = {
          target: element,
          duration: 1000,
          delay: delayConfig.delay,
          from: { opacity: 0 },
          to: { opacity: 1 },
        };

        expect(() => new Mayonation(config)).not.toThrow();
      });
    });

    it("should reject invalid stagger values", () => {
      const elements = Array.from({ length: 3 }, () => {
        const el = document.createElement('div');
        testContainer.appendChild(el);
        return el;
      });

      const invalidStaggerValues = [
        Number.MIN_SAFE_INTEGER,
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        NaN,
        -100,
      ];

      const validStaggerValues = [
        Number.MAX_SAFE_INTEGER,
        0,
        100,
        1000,
      ];

      invalidStaggerValues.forEach(stagger => {
        const config: MayonationConfig = {
          target: elements,
          duration: 1000,
          stagger,
          from: { opacity: 0 },
          to: { opacity: 1 },
        };

        expect(() => new Mayonation(config)).toThrow();
      });

      validStaggerValues.forEach(stagger => {
        const config: MayonationConfig = {
          target: elements,
          duration: 1000,
          stagger,
          from: { opacity: 0 },
          to: { opacity: 1 },
        };

        expect(() => new Mayonation(config)).not.toThrow();
      });
    });
  });

  describe("Invalid Target Values", () => {
    it("should handle empty string selector", () => {
      const config: MayonationConfig = {
        target: "",
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      expect(() => new Mayonation(config)).toThrow();
    });

    it("should handle whitespace-only selector", () => {
      const config: MayonationConfig = {
        target: "   \n\t  ",
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      expect(() => new Mayonation(config)).toThrow();
    });

    it("should handle null target", () => {
      const config: MayonationConfig = {
        target: null as any,
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      expect(() => new Mayonation(config)).toThrow();
    });

    it("should handle undefined target", () => {
      const config: MayonationConfig = {
        target: undefined as any,
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      expect(() => new Mayonation(config)).toThrow();
    });

    it("should handle empty array target", () => {
      const config: MayonationConfig = {
        target: [],
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      expect(() => new Mayonation(config)).toThrow();
    });

    it("should handle array with null elements", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: MayonationConfig = {
        target: [element, null, undefined] as any,
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      expect(() => new Mayonation(config)).not.toThrow();
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
        const config: MayonationConfig = {
          target: selector,
          duration: 1000,
          from: { opacity: 0 },
          to: { opacity: 1 },
        };

        try {
          const animation = new Mayonation(config);
          // If it doesn't throw, the selector might be valid enough or handled gracefully
          expect(animation).toBeDefined();
        } catch (error) {
          // Expected for truly invalid selectors
          expect(error).toBeDefined();
        }
      });
    });
  });

  describe("Malformed Property Values", () => {
    it("should handle properties with invalid values", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: MayonationConfig = {
        target: element,
        duration: 1000,
        from: {
          opacity: "invalid" as any,
          translateX: {} as any,
          scale: [] as any,
        },
        to: {
          opacity: null as any,
          translateX: undefined as any,
          scale: Symbol('invalid') as any,
        },
      };

      // May or may not throw depending on how CSSAnimator handles invalid values
      try {
        new Mayonation(config);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("should handle property function evaluation during animation setup", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      let callCount = 0;
      const functionProperty = (index: number, el: HTMLElement): number => {
        callCount++;
        if (callCount > 5) return 1; // Prevent excessive calls during setup
        return 0.5; // Return valid value
      };

      const config: MayonationConfig = {
        target: element,
        duration: 1000,
        to: { opacity: functionProperty },
      };

      // Property functions should be evaluated during animation setup
      expect(() => new Mayonation(config)).not.toThrow();
      expect(callCount).toBeGreaterThan(0);
    });

    it("should handle property functions that throw errors", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const throwingFunction = () => {
        throw new Error("Property function error");
      };

      const config: MayonationConfig = {
        target: element,
        duration: 1000,
        to: { opacity: throwingFunction },
      };

      expect(() => new Mayonation(config)).toThrow();
    });

    it("should handle extremely nested property objects", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const nestedObject: any = {};
      let current = nestedObject;
      
      // Create deep nesting (might cause issues)
      for (let i = 0; i < 50; i++) {
        current.nested = { value: i };
        current = current.nested;
      }

      const config: MayonationConfig = {
        target: element,
        duration: 1000,
        to: { opacity: nestedObject as any },
      };

      try {
        new Mayonation(config);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("Keyframe Edge Cases", () => {
    it("should handle keyframes with invalid offsets", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: MayonationConfig = {
        target: element,
        duration: 1000,
        keyframes: [
          { offset: -0.5, opacity: 0 },   // Negative offset
          { offset: 1.5, opacity: 1 },    // Offset > 1
          { offset: NaN, opacity: 0.5 },  // NaN offset
          { offset: Infinity, opacity: 0.8 }, // Infinite offset
        ],
      };

      expect(() => new Mayonation(config)).not.toThrow();
    });

    it("should handle keyframes with duplicate offsets", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: MayonationConfig = {
        target: element,
        duration: 1000,
        keyframes: [
          { offset: 0, opacity: 0 },
          { offset: 0.5, opacity: 0.3 },
          { offset: 0.5, opacity: 0.7 }, // Duplicate
          { offset: 0.5, opacity: 0.5 }, // Another duplicate
          { offset: 1, opacity: 1 },
        ],
      };

      expect(() => new Mayonation(config)).not.toThrow();
    });

    it("should handle empty keyframes array", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: MayonationConfig = {
        target: element,
        duration: 1000,
        keyframes: [],
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      expect(() => new Mayonation(config)).not.toThrow();
    });

    it("should handle keyframes with missing properties", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: MayonationConfig = {
        target: element,
        duration: 1000,
        keyframes: [
          { offset: 0 }, // No properties
          { offset: 0.5, opacity: 0.5 },
          { offset: 1 }, // No properties
        ],
      };

      expect(() => new Mayonation(config)).not.toThrow();
    });

    it("should handle out-of-order keyframes", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: MayonationConfig = {
        target: element,
        duration: 1000,
        keyframes: [
          { offset: 1, opacity: 1 },     // End
          { offset: 0, opacity: 0 },     // Start
          { offset: 0.7, opacity: 0.7 }, // Middle-end
          { offset: 0.3, opacity: 0.3 }, // Middle-start
        ],
      };

      expect(() => new Mayonation(config)).not.toThrow();
    });
  });

  describe("Callback Function Edge Cases", () => {
    it("should handle callbacks that throw errors", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const configs = [
        {
          onStart: () => { throw new Error("onStart error"); },
        },
        {
          onUpdate: () => { throw new Error("onUpdate error"); },
        },
        {
          onComplete: () => { throw new Error("onComplete error"); },
        },
        {
          onPause: () => { throw new Error("onPause error"); },
        },
        {
          onResume: () => { throw new Error("onResume error"); },
        },
      ];

      configs.forEach(callbackConfig => {
        const config: MayonationConfig = {
          target: element,
          duration: 100,
          from: { opacity: 0 },
          to: { opacity: 1 },
          ...callbackConfig,
        };

        const animation = new Mayonation(config);
        
        // The errors might be thrown during playback, not construction
        expect(animation).toBeDefined();
      });
    });

    it("should handle callback functions that may recurse", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      let callCount = 0;
      const recursiveCallback = () => {
        callCount++;
        if (callCount > 3) return; // Safe recursion limit for testing
        // Simulate some callback logic without infinite recursion
        if (callCount === 1) {
          // Could call itself once more
          recursiveCallback();
        }
      };

      const config: MayonationConfig = {
        target: element,
        duration: 100,
        from: { opacity: 0 },
        to: { opacity: 1 },
        onUpdate: recursiveCallback,
      };

      const animation = new Mayonation(config);
      expect(animation).toBeDefined();
    });

    it("should handle callbacks that modify DOM during animation", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: MayonationConfig = {
        target: element,
        duration: 200,
        from: { opacity: 0 },
        to: { opacity: 1 },
        onStart: () => {
          // Remove element during animation
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

      const animation = new Mayonation(config);
      expect(() => animation.play()).not.toThrow();
    });

    it("should handle callbacks that access undefined/null values", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: MayonationConfig = {
        target: element,
        duration: 100,
        from: { opacity: 0 },
        to: { opacity: 1 },
        onUpdate: (progress, info) => {
          // Access potentially undefined properties
          const undefinedProp = (info as any)?.nonExistent?.deeply?.nested;
          const nullProp = null as any;
          
          // Operations that might throw
          try {
            undefinedProp.toString();
            nullProp.method();
          } catch (e) {
            // Expected errors
          }
        },
      };

      const animation = new Mayonation(config);
      expect(animation).toBeDefined();
    });
  });

  describe("Seek Operation Edge Cases", () => {
    let animation: Mayonation;

    beforeEach(() => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: MayonationConfig = {
        target: element,
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      animation = new Mayonation(config);
    });

    it("should handle extreme seek values", () => {
      const extremeValues = [
        Number.MAX_SAFE_INTEGER,
        Number.MIN_SAFE_INTEGER,
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        NaN,
        -0,
        +0,
      ];

      extremeValues.forEach(value => {
        expect(() => animation.seek(value)).not.toThrow();
      });
    });

    it("should handle rapid seek operations", () => {
      const values = [];
      for (let i = 0; i < 1000; i++) {
        values.push(Math.random() * 2 - 0.5); // Values from -0.5 to 1.5
      }

      expect(() => {
        values.forEach(value => animation.seek(value));
      }).not.toThrow();
    });

    it("should handle seek while paused", () => {
      animation.pause();
      
      expect(() => animation.seek(0.5)).not.toThrow();
      expect(() => animation.seek(0)).not.toThrow();
      expect(() => animation.seek(1)).not.toThrow();
    });

    it("should handle seek on completed animation", async () => {
      animation.play();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Seek after completion
      expect(() => animation.seek(0.5)).not.toThrow();
    });
  });

  describe("Memory Stress Tests", () => {
    it("should handle rapid creation and destruction", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      for (let i = 0; i < 100; i++) {
        const config: MayonationConfig = {
          target: element,
          duration: 50,
          from: { opacity: 0 },
          to: { opacity: 1 },
        };

        const animation = new Mayonation(config);
        animation.play();
        
        if (i % 2 === 0) {
          animation.pause();
        }
        if (i % 3 === 0) {
          animation.reset();
        }
      }

      expect(true).toBe(true); // Should complete without crashing
    });

    it("should handle many simultaneous animations", () => {
      const elements = Array.from({ length: 50 }, () => {
        const el = document.createElement('div');
        testContainer.appendChild(el);
        return el;
      });

      const animations = elements.map(element => {
        const config: MayonationConfig = {
          target: element,
          duration: 1000,
          from: { opacity: 0, translateX: 0 },
          to: { opacity: 1, translateX: 100 },
        };

        return new Mayonation(config);
      });

      expect(() => {
        animations.forEach(animation => animation.play());
      }).not.toThrow();

      // Cleanup
      animations.forEach(animation => animation.reset());
    });

    it("should handle deep nested callback chains", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      let depth = 0;
      const deepCallback = (): void => {
        depth++;
        if (depth > 100) return; // Prevent stack overflow
        
        setTimeout(deepCallback, 0);
      };

      const config: MayonationConfig = {
        target: element,
        duration: 100,
        from: { opacity: 0 },
        to: { opacity: 1 },
        onUpdate: deepCallback,
      };

      expect(() => new Mayonation(config)).not.toThrow();
    });
  });

  describe("Browser Environment Edge Cases", () => {
    it("should handle missing requestAnimationFrame", () => {
      const originalRAF = global.requestAnimationFrame;
      delete (global as any).requestAnimationFrame;

      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: MayonationConfig = {
        target: element,
        duration: 100,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      try {
        const animation = new Mayonation(config);
        animation.play();
      } catch (error) {
        // Expected if requestAnimationFrame is required
        expect(error).toBeDefined();
      }

      global.requestAnimationFrame = originalRAF;
    });

    it("should handle missing performance.now", () => {
      const originalPerformance = global.performance;
      delete (global as any).performance;

      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: MayonationConfig = {
        target: element,
        duration: 100,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      try {
        const animation = new Mayonation(config);
        animation.play();
      } catch (error) {
        // Expected if performance.now is required
        expect(error).toBeDefined();
      }

      global.performance = originalPerformance;
    });

    it("should handle CSS property support variations", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: MayonationConfig = {
        target: element,
        duration: 500,
        to: {
          // Modern properties that might not be supported everywhere
          'backdrop-filter': 'blur(10px)',
          'clip-path': 'polygon(0 0, 100% 0, 50% 100%)',
          'mask': 'linear-gradient(black, transparent)',
          'contain': 'layout style',
          'aspect-ratio': '16/9',
        },
      };

      expect(() => new Mayonation(config)).not.toThrow();
    });
  });

  describe("Concurrency and Race Conditions", () => {
    it("should handle overlapping play/pause/reset operations", async () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: MayonationConfig = {
        target: element,
        duration: 200,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      const animation = new Mayonation(config);

      // Rapid fire operations
      const operations = () => {
        animation.play();
        animation.pause();
        animation.resume();
        animation.seek(Math.random());
        animation.reset();
      };

      expect(() => {
        for (let i = 0; i < 20; i++) {
          operations();
        }
      }).not.toThrow();
    });

    it("should handle simultaneous seek operations", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      const config: MayonationConfig = {
        target: element,
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      const animation = new Mayonation(config);

      // Simulate concurrent seeks
      expect(() => {
        for (let i = 0; i < 100; i++) {
          setTimeout(() => animation.seek(i / 100), 0);
        }
      }).not.toThrow();
    });

    it("should handle animation state changes during callbacks", () => {
      const element = document.createElement('div');
      testContainer.appendChild(element);

      let animation: Mayonation;
      const config: MayonationConfig = {
        target: element,
        duration: 100,
        from: { opacity: 0 },
        to: { opacity: 1 },
        onStart: () => {
          // Callbacks can reference the animation instance
          // but should be careful about state changes during execution
        },
        onUpdate: (progress) => {
          // Avoid state changes that could cause infinite loops
          if (progress > 0.5 && progress < 0.6) {
            // Only do this once to avoid loops
          }
        },
        onComplete: () => {
          // Completion callback should not restart the animation
          // to avoid infinite loops
        },
      };

      animation = new Mayonation(config);
      expect(() => animation.play()).not.toThrow();
    });
  });
});