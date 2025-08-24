/// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { StyleAnimator } from "../style-animator";
import { createValue } from "../../../core/animation-val";
import type { CSSPropertyName, CSSHandlerOptions } from "../type";

describe("StyleAnimator - Integration Tests", () => {
  let container: HTMLElement;
  let elements: HTMLElement[];
  let animators: StyleAnimator[];

  beforeEach(() => {
    container = document.createElement("div");
    container.style.cssText = `
      width: 800px;
      height: 600px;
      position: relative;
      background: #f0f0f0;
    `;
    document.body.appendChild(container);

    // Create multiple test elements
    elements = Array.from({ length: 4 }, (_, i) => {
      const element = document.createElement("div");
      element.style.cssText = `
        width: 100px;
        height: 100px;
        background: hsl(${i * 90}, 70%, 50%);
        position: absolute;
        top: ${Math.floor(i / 2) * 120}px;
        left: ${(i % 2) * 120}px;
        border-radius: 8px;
        transition: none;
      `;
      element.textContent = `Element ${i + 1}`;
      container.appendChild(element);
      return element;
    });

    // Mock consistent computed styles
    Object.defineProperty(window, "getComputedStyle", {
      value: (el: HTMLElement) => ({
        getPropertyValue: (prop: string) => {
          const styles: Record<string, string> = {
            opacity: "1",
            width: "100px",
            height: "100px",
            "background-color": "rgb(255, 100, 50)",
            color: "rgb(0, 0, 0)",
            "border-width": "0px",
            "border-radius": "8px",
            "font-size": "16px",
            "line-height": "1.5",
            margin: "0px",
            padding: "0px",
          };
          return styles[prop] || "0";
        },
        fontSize: "16px",
      }),
    });

    // Create animators for each element
    animators = elements.map((el) => new StyleAnimator(el));
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.clearAllMocks();
  });

  describe("multi-element coordination", () => {
    it("should handle independent animations on multiple elements", () => {
      const animations = [
        {
          prop: "width" as CSSPropertyName,
          value: createValue.numeric(150, "px"),
        },
        {
          prop: "height" as CSSPropertyName,
          value: createValue.numeric(120, "px"),
        },
        {
          prop: "opacity" as CSSPropertyName,
          value: createValue.numeric(0.7, ""),
        },
        {
          prop: "borderRadius" as CSSPropertyName,
          value: createValue.numeric(20, "px"),
        },
      ];

      // Apply different animations to each element
      animations.forEach((anim, index) => {
        animators[index].applyAnimatedPropertyValue(anim.prop, anim.value);
      });

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(elements[0].style.width).toBe("150px");
          expect(elements[1].style.height).toBe("120px");
          expect(elements[2].style.opacity).toBe("0.7");
          expect(elements[3].style.borderRadius).toBe("20px");
          resolve();
        });
      });
    });

    it("should handle synchronized animations across elements", () => {
      const syncedValue = createValue.numeric(0.5, "");

      // Apply same opacity to all elements
      animators.forEach((animator) => {
        animator.applyAnimatedPropertyValue("opacity", syncedValue);
      });

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          elements.forEach((element) => {
            expect(element.style.opacity).toBe("0.5");
          });
          resolve();
        });
      });
    });

    it("should handle staggered animation timing", () => {
      const baseDelay = 50;
      const targetWidth = createValue.numeric(200, "px");

      // Apply animations with staggered timing
      animators.forEach((animator, index) => {
        setTimeout(() => {
          animator.applyAnimatedPropertyValue("width", targetWidth);
        }, index * baseDelay);
      });

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // All animations should have applied by now
          elements.forEach((element) => {
            expect(element.style.width).toBe("200px");
          });
          resolve();
        }, animators.length * baseDelay + 100);
      });
    });

    it("should handle cascading property dependencies", () => {
      // Create a chain where each element's animation depends on the previous
      const baseValue = 100;
      const increment = 25;

      animators.forEach((animator, index) => {
        const width = createValue.numeric(baseValue + index * increment, "px");
        const height = createValue.numeric(baseValue + index * increment, "px");

        animator.applyAnimatedPropertyValue("width", width);
        animator.applyAnimatedPropertyValue("height", height);
      });

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          elements.forEach((element, index) => {
            const expectedSize = baseValue + index * increment;
            expect(element.style.width).toBe(`${expectedSize}px`);
            expect(element.style.height).toBe(`${expectedSize}px`);
          });
          resolve();
        });
      });
    });
  });

  describe("complex animation scenarios", () => {
    it("should simulate a complete fade and scale animation", async () => {
      const element = elements[0];
      const animator = animators[0];

      // Simulate animation keyframes
      const keyframes = [
        { opacity: 1, scale: 1 },
        { opacity: 0.8, scale: 1.1 },
        { opacity: 0.6, scale: 1.2 },
        { opacity: 0.4, scale: 1.1 },
        { opacity: 0, scale: 1 },
      ];

      const animationSteps = [];

      // Apply all keyframes sequentially without RAF recursion
      for (let i = 0; i < keyframes.length; i++) {
        const frame = keyframes[i];

        animator.applyAnimatedPropertyValue(
          "opacity",
          createValue.numeric(frame.opacity, "")
        );
        // Simulate scale using width/height
        const scaledSize = 100 * frame.scale;
        animator.applyAnimatedPropertyValue(
          "width",
          createValue.numeric(scaledSize, "px")
        );
        animator.applyAnimatedPropertyValue(
          "height",
          createValue.numeric(scaledSize, "px")
        );

        animationSteps.push({
          frame: i,
          opacity: frame.opacity,
          scale: frame.scale,
        });

        // Small delay between frames
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Wait for all batched updates to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(element.style.opacity).toBe("0");
      expect(element.style.width).toBe("100px");
      expect(element.style.height).toBe("100px");
      expect(animationSteps.length).toBe(keyframes.length);
    });

    it("should handle color transition animations", () => {
      const animator = animators[0];
      const element = elements[0];

      // Create smooth color transition
      const startColor = createValue.rgb(255, 0, 0, 1);
      const endColor = createValue.rgb(0, 255, 0, 1);
      const steps = 10;

      for (let i = 0; i <= steps; i++) {
        setTimeout(() => {
          const progress = i / steps;
          const interpolatedColor = animator.interpolate(
            "backgroundColor",
            startColor,
            endColor,
            progress
          );
          animator.applyAnimatedPropertyValue(
            "backgroundColor",
            interpolatedColor
          );
        }, i * 20);
      }

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(element.style.backgroundColor).toContain("rgb");
          resolve();
        }, (steps + 1) * 20 + 50);
      });
    });

    it("should handle bounce animation simulation", () => {
      const animator = animators[0];
      const element = elements[0];

      // Simulate bounce effect using easing
      const bounceEasing = (t: number): number => {
        if (t < 1 / 2.75) {
          return 7.5625 * t * t;
        } else if (t < 2 / 2.75) {
          return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
        } else if (t < 2.5 / 2.75) {
          return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
        } else {
          return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
        }
      };

      const startHeight = createValue.numeric(100, "px");
      const endHeight = createValue.numeric(150, "px");
      const steps = 20;

      for (let i = 0; i <= steps; i++) {
        setTimeout(() => {
          const linearProgress = i / steps;
          const easedProgress = bounceEasing(linearProgress);
          const interpolated = animator.interpolate(
            "height",
            startHeight,
            endHeight,
            easedProgress
          );
          animator.applyAnimatedPropertyValue("height", interpolated);
        }, i * 30);
      }

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(element.style.height).toBe("150px");
          resolve();
        }, (steps + 1) * 30 + 50);
      });
    });

    it("should handle complex multi-property card animation", () => {
      const animator = animators[0];
      const element = elements[0];

      // Simulate card hover animation
      const animations = {
        width: {
          from: createValue.numeric(100, "px"),
          to: createValue.numeric(110, "px"),
        },
        height: {
          from: createValue.numeric(100, "px"),
          to: createValue.numeric(110, "px"),
        },
        borderRadius: {
          from: createValue.numeric(8, "px"),
          to: createValue.numeric(12, "px"),
        },
        opacity: {
          from: createValue.numeric(1, ""),
          to: createValue.numeric(0.95, ""),
        },
        backgroundColor: {
          from: createValue.rgb(255, 100, 50, 1),
          to: createValue.rgb(255, 120, 70, 1),
        },
      };

      const steps = 15;

      for (let i = 0; i <= steps; i++) {
        setTimeout(() => {
          const progress = i / steps;

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
        }, i * 20);
      }

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(element.style.width).toBe("110px");
          expect(element.style.height).toBe("110px");
          expect(element.style.borderRadius).toBe("12px");
          expect(element.style.opacity).toBe("0.95");
          expect(element.style.backgroundColor).toContain("rgb");
          resolve();
        }, (steps + 1) * 20 + 50);
      });
    });
  });

  describe("performance under load", () => {
    it("should handle many simultaneous animators efficiently", () => {
      const manyElements: HTMLElement[] = [];
      const manyAnimators: StyleAnimator[] = [];
      const elementCount = 20;

      // Create many elements
      for (let i = 0; i < elementCount; i++) {
        const element = document.createElement("div");
        element.style.cssText = `
          width: 20px;
          height: 20px;
          position: absolute;
          top: ${Math.floor(i / 5) * 25}px;
          left: ${(i % 5) * 25}px;
          background: hsl(${i * 18}, 60%, 50%);
        `;

        container.appendChild(element);
        manyElements.push(element);
        manyAnimators.push(new StyleAnimator(element));
      }

      const startTime = performance.now();

      // Animate all elements simultaneously
      manyAnimators.forEach((animator, index) => {
        animator.applyAnimatedPropertyValue(
          "width",
          createValue.numeric(30 + index, "px")
        );
        animator.applyAnimatedPropertyValue(
          "height",
          createValue.numeric(30 + index, "px")
        );
        animator.applyAnimatedPropertyValue(
          "opacity",
          createValue.numeric(0.5 + index * 0.02, "")
        );
      });

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          const endTime = performance.now();
          const duration = endTime - startTime;

          expect(duration).toBeLessThan(100); // Should complete efficiently

          // Verify all animations applied
          manyElements.forEach((element, index) => {
            expect(element.style.width).toBe(`${30 + index}px`);
          });

          // Cleanup
          manyElements.forEach((element) => container.removeChild(element));
          resolve();
        });
      });
    });

    it("should handle rapid property updates across multiple elements", () => {
      const updateCount = 100;
      const startTime = performance.now();

      for (let i = 0; i < updateCount; i++) {
        animators.forEach((animator, elementIndex) => {
          const value = i + elementIndex;
          animator.applyAnimatedPropertyValue(
            "width",
            createValue.numeric(100 + value, "px")
          );
          animator.applyAnimatedPropertyValue(
            "opacity",
            createValue.numeric(0.5 + value * 0.001, "")
          );
        });
      }

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(200); // Should handle efficiently

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          // Verify final values
          elements.forEach((element, index) => {
            const expectedWidth = 100 + updateCount - 1 + index;
            expect(element.style.width).toBe(`${expectedWidth}px`);
          });
          resolve();
        });
      });
    });

    it("should maintain performance with frequent cache access", () => {
      const accessCount = 500;
      const startTime = performance.now();

      for (let i = 0; i < accessCount; i++) {
        animators.forEach((animator) => {
          animator.currentValue("width");
          animator.currentValue("height");
          animator.currentValue("opacity");
        });
      }

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // Cache should make this very fast
    });
  });

  describe("DOM integration scenarios", () => {
    it("should handle dynamic element creation and animation", () => {
      const dynamicElements: HTMLElement[] = [];
      const dynamicAnimators: StyleAnimator[] = [];

      // Create elements dynamically and animate them immediately
      for (let i = 0; i < 5; i++) {
        const element = document.createElement("div");
        element.style.cssText = `
          width: 50px;
          height: 50px;
          background: hsl(${i * 72}, 70%, 50%);
          position: absolute;
          top: ${i * 60}px;
          left: 300px;
        `;

        container.appendChild(element);
        dynamicElements.push(element);

        const animator = new StyleAnimator(element);
        dynamicAnimators.push(animator);

        // Immediately start animating
        animator.applyAnimatedPropertyValue(
          "width",
          createValue.numeric(80, "px")
        );
        animator.applyAnimatedPropertyValue(
          "opacity",
          createValue.numeric(0.8, "")
        );
      }

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          dynamicElements.forEach((element) => {
            expect(element.style.width).toBe("80px");
            expect(element.style.opacity).toBe("0.8");
          });

          // Cleanup
          dynamicElements.forEach((element) => container.removeChild(element));
          resolve();
        });
      });
    });

    it("should handle element hierarchy and inheritance", () => {
      // Create nested structure
      const parentDiv = document.createElement("div");
      const childDiv = document.createElement("div");

      parentDiv.style.cssText = `
        width: 200px;
        height: 200px;
        position: relative;
        background: rgba(255, 0, 0, 0.3);
      `;

      childDiv.style.cssText = `
        width: 100px;
        height: 100px;
        position: absolute;
        top: 50px;
        left: 50px;
        background: rgba(0, 255, 0, 0.3);
      `;

      parentDiv.appendChild(childDiv);
      container.appendChild(parentDiv);

      const parentAnimator = new StyleAnimator(parentDiv);
      const childAnimator = new StyleAnimator(childDiv);

      // Animate both parent and child
      parentAnimator.applyAnimatedPropertyValue(
        "opacity",
        createValue.numeric(0.8, "")
      );
      childAnimator.applyAnimatedPropertyValue(
        "width",
        createValue.numeric(80, "px")
      );
      childAnimator.applyAnimatedPropertyValue(
        "backgroundColor",
        createValue.rgb(0, 0, 255, 0.5)
      );

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(parentDiv.style.opacity).toBe("0.8");
          expect(childDiv.style.width).toBe("80px");
          expect(childDiv.style.backgroundColor).toContain("rgb");

          container.removeChild(parentDiv);
          resolve();
        });
      });
    });

    it("should handle element removal during animation", () => {
      const tempElement = document.createElement("div");
      tempElement.style.cssText =
        "width: 100px; height: 100px; background: red;";
      container.appendChild(tempElement);

      const tempAnimator = new StyleAnimator(tempElement);

      // Start animation
      tempAnimator.applyAnimatedPropertyValue(
        "width",
        createValue.numeric(200, "px")
      );

      // Remove element immediately
      container.removeChild(tempElement);

      // Should handle gracefully
      expect(() => {
        tempAnimator.applyAnimatedPropertyValue(
          "height",
          createValue.numeric(200, "px")
        );
        tempAnimator.reset();
      }).not.toThrow();
    });

    it("should handle CSS class changes affecting computed styles", () => {
      const testElement = elements[0];
      const animator = animators[0];

      // Add CSS class that changes styles
      const style = document.createElement("style");
      style.textContent = `
        .animated { 
          background-color: rgb(100, 200, 300) !important; 
          border: 2px solid black !important;
        }
      `;
      document.head.appendChild(style);

      // Apply class
      testElement.className = "animated";

      // Animate over the new styles
      animator.applyAnimatedPropertyValue(
        "backgroundColor",
        createValue.rgb(255, 255, 0, 1)
      );
      animator.applyAnimatedPropertyValue(
        "borderWidth",
        createValue.numeric(5, "px")
      );

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(testElement.style.backgroundColor).toContain(
            "rgb(255, 255, 0)"
          );
          expect(testElement.style.borderWidth).toBe("5px");

          document.head.removeChild(style);
          resolve();
        });
      });
    });
  });

  describe("error recovery in complex scenarios", () => {
    it("should handle partial failures in multi-element animations", () => {
      // Set up one animator to fail
      const failingElement = elements[0];
      const workingElement = elements[1];

      const originalSetProperty = failingElement.style.setProperty;
      failingElement.style.setProperty = vi.fn(() => {
        throw new Error("Simulated DOM error");
      });

      // Apply animations to both
      animators[0].applyAnimatedPropertyValue(
        "width",
        createValue.numeric(200, "px")
      );
      animators[1].applyAnimatedPropertyValue(
        "width",
        createValue.numeric(200, "px")
      );

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          // Working element should succeed
          expect(workingElement.style.width).toBe("200px");

          // Restore
          failingElement.style.setProperty = originalSetProperty;
          resolve();
        });
      });
    });

    it("should recover from intermittent DOM errors", () => {
      const element = elements[0];
      const animator = animators[0];

      let callCount = 0;
      const originalSetProperty = element.style.setProperty;

      element.style.setProperty = vi.fn((prop, value) => {
        callCount++;
        // Fail every other call
        if (callCount % 2 === 1) {
          throw new Error("Intermittent error");
        }
        return originalSetProperty.call(element.style, prop, value);
      });

      // Apply multiple properties - some should fail, some succeed
      animator.applyAnimatedPropertyValue(
        "width",
        createValue.numeric(150, "px")
      );
      animator.applyAnimatedPropertyValue(
        "height",
        createValue.numeric(150, "px")
      );
      animator.applyAnimatedPropertyValue(
        "opacity",
        createValue.numeric(0.7, "")
      );
      animator.applyAnimatedPropertyValue(
        "borderRadius",
        createValue.numeric(15, "px")
      );

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          // Some properties should have been applied successfully
          expect(callCount).toBeGreaterThan(0);

          element.style.setProperty = originalSetProperty;
          resolve();
        });
      });
    });

    it("should handle animation state corruption gracefully", () => {
      const animator = animators[0];

      // Corrupt internal state
      (animator as any).propertyCache.set("width", {
        originalValue: null,
        currentValue: { type: "invalid" },
        isDirty: true,
      });

      // Should handle gracefully and recover
      expect(() => {
        animator.applyAnimatedPropertyValue(
          "width",
          createValue.numeric(200, "px")
        );
        animator.currentValue("width");
        animator.reset();
      }).not.toThrow();
    });
  });

  describe("real-world animation patterns", () => {
    it("should simulate a loading spinner animation", () => {
      const spinner = elements[0];
      const animator = animators[0];

      // Create circular spinner animation using border-radius and opacity
      const spinFrames = 8;
      let currentFrame = 0;

      const animateSpinner = () => {
        const progress = currentFrame / spinFrames;
        const opacity = 0.3 + (Math.sin(progress * Math.PI * 2) + 1) * 0.35; // Pulsing opacity
        const size = 40 + Math.sin(progress * Math.PI * 2) * 10; // Pulsing size

        animator.applyAnimatedPropertyValue(
          "opacity",
          createValue.numeric(opacity, "")
        );
        animator.applyAnimatedPropertyValue(
          "width",
          createValue.numeric(size, "px")
        );
        animator.applyAnimatedPropertyValue(
          "height",
          createValue.numeric(size, "px")
        );
        animator.applyAnimatedPropertyValue(
          "borderRadius",
          createValue.numeric(size / 2, "px")
        );

        currentFrame = (currentFrame + 1) % spinFrames;

        if (currentFrame < 3) {
          // Run for 3 full cycles
          setTimeout(animateSpinner, 100);
        }
      };

      return new Promise<void>((resolve) => {
        animateSpinner();

        setTimeout(() => {
          // Should have completed animation
          expect(spinner.style.borderRadius).toBeTruthy();
          resolve();
        }, spinFrames * 100 + 50);
      });
    });

    it("should simulate a modal entrance animation", () => {
      const modal = document.createElement("div");
      modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        width: 300px;
        height: 200px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        transform: translate(-50%, -50%);
      `;

      container.appendChild(modal);
      const modalAnimator = new StyleAnimator(modal);

      // Simulate modal entrance: scale up and fade in
      const entranceSteps = [
        { opacity: 0, width: 250, height: 150 },
        { opacity: 0.3, width: 280, height: 180 },
        { opacity: 0.7, width: 310, height: 210 },
        { opacity: 1, width: 300, height: 200 },
      ];

      let stepIndex = 0;

      const animateEntrance = () => {
        if (stepIndex < entranceSteps.length) {
          const step = entranceSteps[stepIndex];

          modalAnimator.applyAnimatedPropertyValue(
            "opacity",
            createValue.numeric(step.opacity, "")
          );
          modalAnimator.applyAnimatedPropertyValue(
            "width",
            createValue.numeric(step.width, "px")
          );
          modalAnimator.applyAnimatedPropertyValue(
            "height",
            createValue.numeric(step.height, "px")
          );

          stepIndex++;

          if (stepIndex < entranceSteps.length) {
            setTimeout(animateEntrance, 80);
          }
        }
      };

      return new Promise<void>((resolve) => {
        animateEntrance();

        setTimeout(() => {
          expect(modal.style.opacity).toBe("1");
          expect(modal.style.width).toBe("300px");
          expect(modal.style.height).toBe("200px");

          container.removeChild(modal);
          resolve();
        }, entranceSteps.length * 80 + 50);
      });
    });

    it("should simulate a parallax scrolling effect", () => {
      const layers = Array.from({ length: 3 }, (_, i) => {
        const layer = document.createElement("div");
        layer.style.cssText = `
          width: 100%;
          height: 100px;
          position: absolute;
          top: 0;
          background: hsla(${i * 120}, 70%, 50%, 0.7);
        `;
        container.appendChild(layer);
        return layer;
      });

      const layerAnimators = layers.map((layer) => new StyleAnimator(layer));

      // Simulate scrolling by moving layers at different speeds
      const scrollPositions = [0, 50, 100, 150, 200];

      scrollPositions.forEach((scrollY, scrollIndex) => {
        setTimeout(() => {
          layerAnimators.forEach((animator, layerIndex) => {
            const speed = 0.2 + layerIndex * 0.3; // Different parallax speeds
            const translateY = -scrollY * speed;

            // We can't animate transform directly, so simulate with top position
            animator.applyAnimatedPropertyValue(
              "opacity",
              createValue.numeric(1 - scrollY * 0.002, "")
            );
          });
        }, scrollIndex * 100);
      });

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // Verify animations completed
          layers.forEach((layer, index) => {
            expect(parseFloat(layer.style.opacity)).toBeLessThan(1);
          });

          // Cleanup
          layers.forEach((layer) => container.removeChild(layer));
          resolve();
        }, scrollPositions.length * 100 + 50);
      });
    });

    it("should simulate a card deck shuffle animation", () => {
      const cards = elements.slice(0, 3); // Use first 3 elements as cards
      const cardAnimators = animators.slice(0, 3);

      // Simulate shuffle by moving cards to random positions
      const shuffleSteps = 5;

      for (let step = 0; step < shuffleSteps; step++) {
        setTimeout(() => {
          cardAnimators.forEach((animator, cardIndex) => {
            const randomX = Math.random() * 200;
            const randomY = Math.random() * 100;
            const randomRotation = (Math.random() - 0.5) * 20; // Simulate rotation with skew

            // Simulate movement and rotation
            animator.applyAnimatedPropertyValue(
              "opacity",
              createValue.numeric(0.7 + Math.random() * 0.3, "")
            );
            animator.applyAnimatedPropertyValue(
              "borderRadius",
              createValue.numeric(8 + Math.random() * 8, "px")
            );

            // Final step - return to positions
            if (step === shuffleSteps - 1) {
              animator.applyAnimatedPropertyValue(
                "opacity",
                createValue.numeric(1, "")
              );
              animator.applyAnimatedPropertyValue(
                "borderRadius",
                createValue.numeric(8, "px")
              );
            }
          });
        }, step * 150);
      }

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          cards.forEach((card) => {
            expect(card.style.opacity).toBe("1");
            expect(card.style.borderRadius).toBe("8px");
          });
          resolve();
        }, shuffleSteps * 150 + 100);
      });
    });
  });

  describe("configuration and customization", () => {
    it("should handle different color spaces across multiple animators", () => {
      const rgbAnimator = new StyleAnimator(elements[0], { colorSpace: "rgb" });
      const hslAnimator = new StyleAnimator(elements[1], { colorSpace: "hsl" });

      const redColor = createValue.rgb(255, 0, 0, 1);
      const blueColor = createValue.hsl(240, 100, 50, 1);

      rgbAnimator.applyAnimatedPropertyValue("backgroundColor", redColor);
      hslAnimator.applyAnimatedPropertyValue("backgroundColor", blueColor);

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(elements[0].style.backgroundColor).toContain("rgb");
          expect(elements[1].style.backgroundColor).toBeTruthy();
          resolve();
        });
      });
    });

    it("should handle different precision settings", () => {
      const lowPrecision = new StyleAnimator(elements[0], { precision: 1 });
      const highPrecision = new StyleAnimator(elements[1], { precision: 5 });

      const preciseValue = createValue.numeric(123.456789, "px");

      lowPrecision.applyAnimatedPropertyValue("width", preciseValue);
      highPrecision.applyAnimatedPropertyValue("width", preciseValue);

      return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          expect(elements[0].style.width).toBe("123.5px"); // Rounded to 1 decimal
          expect(elements[1].style.width).toBe("123.45679px"); // Rounded to 5 decimals
          resolve();
        });
      });
    });

    it("should handle mixed configuration scenarios", async () => {
      const configs: CSSHandlerOptions[] = [
        { colorSpace: "rgb", precision: 1, useGPUAcceleration: true },
        { colorSpace: "hsl", precision: 3, useGPUAcceleration: false },
        { colorSpace: "rgb", precision: 0, useGPUAcceleration: true },
        {}, // Default config
      ];

      const configAnimators = elements.map(
        (element, index) => new StyleAnimator(element, configs[index])
      );

      // Apply same animation to all with different configs
      configAnimators.forEach((animator, index) => {
        animator.applyAnimatedPropertyValue(
          "width",
          createValue.numeric(150.555, "px")
        );
        animator.applyAnimatedPropertyValue(
          "backgroundColor",
          createValue.rgb(128, 64, 192, 1)
        );
      });

      // Wait for batched updates
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Different precision should result in different values
      expect(elements[0].style.width).toBe("150.6px"); // precision: 1
      expect(elements[1].style.width).toBe("150.555px"); // precision: 3
      expect(elements[2].style.width).toBe("151px"); // precision: 0
      expect(elements[3].style.width).toBe("150.555px"); // default precision: 3

      // All should have background colors applied
      elements.forEach((element) => {
        expect(element.style.backgroundColor).toContain("rgb");
      });
    });
  });
});
