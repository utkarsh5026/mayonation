/// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PropertyManager } from "../prop-manager/property-manager";
import { createValue } from "../../core/animation-val";
import type { CSSPropertyName } from "../styles/type";
import type { TransformPropertyName } from "../transform/types";

describe("PropertyManager - Integration Tests", () => {
  let container: HTMLElement;
  let elements: HTMLElement[];
  let managers: PropertyManager[];

  beforeEach(() => {
    // Create test container
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
            transform: "matrix(1, 0, 0, 1, 0, 0)",
          };
          return styles[prop] || "0";
        },
        fontSize: "16px",
      }),
      configurable: true,
    });

    // Create managers for each element
    managers = elements.map((el) => new PropertyManager(el));
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
          prop: "backgroundColor" as CSSPropertyName,
          value: createValue.rgb(255, 128, 0, 1),
        },
      ];

      // Apply different animations to each element
      animations.forEach((anim, index) => {
        managers[index].updateProperty(anim.prop, anim.value);
      });

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(elements[0].style.width).toBe("150px");
          expect(elements[1].style.height).toBe("120px");
          expect(elements[2].style.opacity).toBe("0.7");
          expect(elements[3].style.backgroundColor).toContain("rgb");
          resolve();
        }, 100);
      });
    });

    it("should handle synchronized animations across elements", () => {
      const syncedOpacity = createValue.numeric(0.5, "");
      const syncedWidth = createValue.numeric(125, "px");

      // Apply same properties to all elements
      managers.forEach((manager) => {
        manager.updateProperty("opacity", syncedOpacity);
        manager.updateProperty("width", syncedWidth);
      });

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          elements.forEach((element) => {
            expect(element.style.opacity).toBe("0.5");
            expect(element.style.width).toBe("125px");
          });
          resolve();
        }, 100);
      });
    });

    it("should handle mixed CSS and transform properties", () => {
      const transforms: TransformPropertyName[] = [
        "translateX",
        "translateY",
        "scaleX",
        "rotateZ",
      ];
      const cssProps: CSSPropertyName[] = [
        "width",
        "height",
        "opacity",
        "backgroundColor",
      ];

      // Apply transforms to first half, CSS to second half
      managers.slice(0, 2).forEach((manager, index) => {
        const transform = transforms[index];
        const value =
          transform === "scaleX"
            ? createValue.numeric(1.5, "")
            : transform === "rotateZ"
            ? createValue.numeric(45, "deg")
            : createValue.numeric(50 + index * 25, "px");

        manager.updateProperty(transform, value);
      });

      managers.slice(2).forEach((manager, index) => {
        const prop = cssProps[index + 2];
        const value =
          prop === "opacity"
            ? createValue.numeric(0.8, "")
            : prop === "backgroundColor"
            ? createValue.rgb(0, 255, 128, 1)
            : createValue.numeric(150, "px");

        manager.updateProperty(prop, value);
      });

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          managers.forEach((m) => m.applyUpdates());

          setTimeout(() => {
            // Check transforms
            expect(elements[0].style.transform).toContain("50px"); // translateX
            expect(elements[1].style.transform).toContain("75px"); // translateY

            // Check CSS properties
            expect(elements[2].style.opacity).toBe("0.8");
            expect(elements[3].style.backgroundColor).toContain("rgb");
            resolve();
          }, 50);
        }, 10);
      });
    });

    it("should handle cascading property dependencies", () => {
      const baseSize = 100;
      const increment = 25;

      // Create a chain where each element's size depends on the previous
      managers.forEach((manager, index) => {
        const size = baseSize + index * increment;
        manager.updateProperty("width", createValue.numeric(size, "px"));
        manager.updateProperty("height", createValue.numeric(size, "px"));
        manager.updateProperty(
          "borderRadius",
          createValue.numeric(size / 2, "px")
        );
      });

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          managers.forEach((m) => m.applyUpdates());

          setTimeout(() => {
            elements.forEach((element, index) => {
              const expectedSize = baseSize + index * increment;
              expect(element.style.width).toBe(`${expectedSize}px`);
              expect(element.style.height).toBe(`${expectedSize}px`);
              expect(element.style.borderRadius).toBe(`${expectedSize / 2}px`);
            });
            resolve();
          }, 50);
        }, 10);
      });
    });
  });

  describe("StyleAnimator and TransformHandler integration", () => {
    it("should coordinate between StyleAnimator and TransformHandler", () => {
      const manager = managers[0];
      const element = elements[0];

      // Apply both CSS and transform properties
      manager.updateProperty("width", createValue.numeric(200, "px"));
      manager.updateProperty(
        "backgroundColor",
        createValue.rgb(255, 0, 128, 1)
      );
      manager.updateProperty("translateX", createValue.numeric(100, "px"));
      manager.updateProperty("scaleY", createValue.numeric(1.2, ""));

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          manager.applyUpdates();

          setTimeout(() => {
            // Check CSS properties were applied
            expect(element.style.width).toBe("200px");
            expect(element.style.backgroundColor).toContain("rgb");

            // Check transform properties were combined correctly
            expect(element.style.transform).toContain("100px"); // May be translate3d
            expect(element.style.transform).toContain("1.2"); // scaleY value
            resolve();
          }, 50);
        }, 10);
      });
    });

    it("should handle complex transform combinations", () => {
      const manager = managers[0];
      const element = elements[0];

      // Apply multiple transforms
      const transforms = [
        {
          prop: "translateX" as TransformPropertyName,
          value: createValue.numeric(50, "px"),
        },
        {
          prop: "translateY" as TransformPropertyName,
          value: createValue.numeric(-25, "px"),
        },
        {
          prop: "rotateZ" as TransformPropertyName,
          value: createValue.numeric(30, "deg"),
        },
        {
          prop: "scaleX" as TransformPropertyName,
          value: createValue.numeric(1.1, ""),
        },
        {
          prop: "scaleY" as TransformPropertyName,
          value: createValue.numeric(0.9, ""),
        },
      ];

      transforms.forEach(({ prop, value }) => {
        manager.updateProperty(prop, value);
      });

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          manager.applyUpdates();

          setTimeout(() => {
            const transformStyle = element.style.transform;
            expect(transformStyle).toContain("50px"); // translateX
            expect(transformStyle).toContain("-25px"); // translateY
            expect(transformStyle).toContain("30deg"); // rotateZ
            expect(transformStyle).toContain("1.1"); // scaleX
            expect(transformStyle).toContain("0.9"); // scaleY
            resolve();
          }, 50);
        }, 10);
      });
    });

    it("should handle interpolation between different property types", () => {
      const manager = managers[0];

      // Test CSS property interpolation
      const widthFrom = createValue.numeric(100, "px");
      const widthTo = createValue.numeric(200, "px");
      const widthResult = manager.interpolate(
        "width",
        widthFrom,
        widthTo,
        0.75
      );
      expect(widthResult).toEqual(createValue.numeric(175, "px"));

      // Test color interpolation
      const colorFrom = createValue.rgb(255, 0, 0, 1);
      const colorTo = createValue.rgb(0, 255, 0, 1);
      const colorResult = manager.interpolate(
        "backgroundColor",
        colorFrom,
        colorTo,
        0.5
      );
      expect(colorResult.type).toBe("color");

      // Test transform interpolation
      const transformFrom = createValue.numeric(0, "px");
      const transformTo = createValue.numeric(100, "px");
      const transformResult = manager.interpolate(
        "translateX",
        transformFrom,
        transformTo,
        0.25
      );
      expect(transformResult).toEqual(createValue.numeric(25, "px"));
    });
  });

  describe("complex animation scenarios", () => {
    it(
      "should simulate a complete card flip animation",
      { timeout: 10000 },
      () => {
        const manager = managers[0];
        const element = elements[0];

        // Simulate card flip keyframes
        const keyframes = [
          { rotateY: 0, scaleX: 1, opacity: 1 },
          { rotateY: 45, scaleX: 0.8, opacity: 0.9 },
          { rotateY: 90, scaleX: 0.6, opacity: 0.7 },
          { rotateY: 135, scaleX: 0.8, opacity: 0.9 },
          { rotateY: 180, scaleX: 1, opacity: 1 },
        ];

        let frameIndex = 0;
        const animateFrame = () => {
          if (frameIndex < keyframes.length) {
            const frame = keyframes[frameIndex];

            manager.updateProperty(
              "rotateY",
              createValue.numeric(frame.rotateY, "deg")
            );
            manager.updateProperty(
              "scaleX",
              createValue.numeric(frame.scaleX, "")
            );
            manager.updateProperty(
              "opacity",
              createValue.numeric(frame.opacity, "")
            );

            frameIndex++;

            if (frameIndex < keyframes.length) {
              setTimeout(animateFrame, 50);
            }
          }
        };

        return new Promise<void>((resolve) => {
          animateFrame();

          setTimeout(() => {
            manager.applyUpdates();

            setTimeout(() => {
              expect(element.style.transform).toContain("180deg"); // rotateY
              expect(element.style.transform).toContain("1"); // scaleX
              expect(element.style.opacity).toBe("1");
              resolve();
            }, 50);
          }, keyframes.length * 50 + 50);
        });
      }
    );

    it(
      "should handle morphing animation with mixed properties",
      { timeout: 10000 },
      () => {
        const manager = managers[0];
        const element = elements[0];

        // Start state
        const startProps = {
          width: createValue.numeric(100, "px"),
          height: createValue.numeric(100, "px"),
          borderRadius: createValue.numeric(8, "px"),
          backgroundColor: createValue.rgb(255, 100, 50, 1),
          scaleX: createValue.numeric(1, ""),
          scaleY: createValue.numeric(1, ""),
        };

        // End state (circle)
        const endProps = {
          width: createValue.numeric(120, "px"),
          height: createValue.numeric(120, "px"),
          borderRadius: createValue.numeric(60, "px"),
          backgroundColor: createValue.rgb(50, 150, 255, 1),
          scaleX: createValue.numeric(1.2, ""),
          scaleY: createValue.numeric(1.2, ""),
        };

        const steps = 10;
        for (let i = 0; i <= steps; i++) {
          setTimeout(() => {
            const progress = i / steps;

            Object.keys(startProps).forEach((propName) => {
              const prop = propName as keyof typeof startProps;
              const interpolated = manager.interpolate(
                prop as any,
                startProps[prop],
                endProps[prop],
                progress
              );
              manager.updateProperty(prop as any, interpolated);
            });
          }, i * 30);
        }

        return new Promise<void>((resolve) => {
          setTimeout(() => {
            manager.applyUpdates();

            setTimeout(() => {
              expect(element.style.width).toBe("120px");
              expect(element.style.height).toBe("120px");
              expect(element.style.borderRadius).toBe("60px");
              expect(element.style.backgroundColor).toContain("rgb");
              expect(element.style.transform).toContain("1.2"); // scale values
              resolve();
            }, 50);
          }, (steps + 1) * 30 + 50);
        });
      }
    );

    it(
      "should handle staggered multi-element animation",
      { timeout: 15000 },
      () => {
        const staggerDelay = 100;
        const animationDuration = 300;

        const animations = {
          width: {
            from: createValue.numeric(100, "px"),
            to: createValue.numeric(150, "px"),
          },
          height: {
            from: createValue.numeric(100, "px"),
            to: createValue.numeric(80, "px"),
          },
          translateY: {
            from: createValue.numeric(0, "px"),
            to: createValue.numeric(-20, "px"),
          },
          opacity: {
            from: createValue.numeric(1, ""),
            to: createValue.numeric(0.6, ""),
          },
        };

        managers.forEach((manager, index) => {
          setTimeout(() => {
            Object.entries(animations).forEach(([prop, { from, to }]) => {
              const steps = 6;
              for (let step = 0; step <= steps; step++) {
                setTimeout(() => {
                  const progress = step / steps;
                  const interpolated = manager.interpolate(
                    prop as any,
                    from,
                    to,
                    progress
                  );
                  manager.updateProperty(prop as any, interpolated);
                }, (step * animationDuration) / steps);
              }
            });
          }, index * staggerDelay);
        });

        const totalTime =
          (managers.length - 1) * staggerDelay + animationDuration + 100;

        return new Promise<void>((resolve) => {
          setTimeout(() => {
            elements.forEach((element) => {
              expect(element.style.width).toBe("150px");
              expect(element.style.height).toBe("80px");
              expect(element.style.transform).toContain("-20px"); // translateY
              expect(element.style.opacity).toBe("0.6");
            });
            resolve();
          }, totalTime);
        });
      }
    );
  });

  describe("performance and batching integration", () => {
    it("should efficiently handle many simultaneous property updates", () => {
      const startTime = performance.now();

      // Apply many properties to all managers simultaneously
      const properties: Array<CSSPropertyName | TransformPropertyName> = [
        "width",
        "height",
        "opacity",
        "backgroundColor",
        "translateX",
        "translateY",
        "scaleX",
        "rotateZ",
      ];

      managers.forEach((manager, managerIndex) => {
        properties.forEach((prop, propIndex) => {
          let value;
          if (prop === "opacity") {
            value = createValue.numeric(0.5 + managerIndex * 0.1, "");
          } else if (prop === "backgroundColor") {
            value = createValue.rgb(100 + managerIndex * 40, 150, 200, 1);
          } else if (prop === "rotateZ") {
            value = createValue.numeric(managerIndex * 15, "deg");
          } else if (prop.startsWith("scale")) {
            value = createValue.numeric(1 + managerIndex * 0.1, "");
          } else {
            value = createValue.numeric(
              100 + managerIndex * 20 + propIndex * 10,
              prop.includes("translate")
                ? "px"
                : prop.includes("width") || prop.includes("height")
                ? "px"
                : ""
            );
          }

          manager.updateProperty(prop as any, value);
        });
      });

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(50); // Should be very fast due to batching

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // Apply updates manually
          managers.forEach((m) => m.applyUpdates());

          setTimeout(() => {
            // Verify all updates were applied
            elements.forEach((element, index) => {
              expect(element.style.width).toBe(`${100 + index * 20}px`);
              expect(element.style.opacity).toBe(`${0.5 + index * 0.1}`);
              expect(element.style.transform).toContain(
                `${100 + index * 20 + 40}px`
              ); // translateX
            });
            resolve();
          }, 50);
        }, 10);
      });
    });

    it(
      "should handle rapid sequential updates efficiently",
      { timeout: 10000 },
      () => {
        const manager = managers[0];
        const element = elements[0];
        const updateCount = 100;

        // Rapid sequential updates
        for (let i = 0; i < updateCount; i++) {
          manager.updateProperty("width", createValue.numeric(100 + i, "px"));
          manager.updateProperty("translateX", createValue.numeric(i, "px"));
        }

        return new Promise<void>((resolve) => {
          setTimeout(() => {
            manager.applyUpdates();

            setTimeout(() => {
              // Should have the final values
              expect(element.style.width).toBe(`${100 + updateCount - 1}px`);
              expect(element.style.transform).toContain(`${updateCount - 1}px`); // translateX
              resolve();
            }, 50);
          }, 10);
        });
      }
    );

    it(
      "should maintain performance with mixed batched and immediate updates",
      { timeout: 10000 },
      () => {
        const batchedManager = new PropertyManager(elements[0], {
          batchUpdates: true,
        });
        const immediateManager = new PropertyManager(elements[1], {
          batchUpdates: false,
        });

        const startTime = performance.now();

        // Apply updates to both types
        for (let i = 0; i < 50; i++) {
          batchedManager.updateProperty(
            "width",
            createValue.numeric(100 + i, "px")
          );
          immediateManager.updateProperty(
            "width",
            createValue.numeric(100 + i, "px")
          );
        }

        const endTime = performance.now();
        expect(endTime - startTime).toBeLessThan(100);

        return new Promise<void>((resolve) => {
          setTimeout(() => {
            // Apply updates manually
            [batchedManager, immediateManager].forEach((m) => {
              try {
                m.applyUpdates();
              } catch (e) {}
            });

            setTimeout(() => {
              expect(elements[0].style.width).toBe("149px");
              expect(elements[1].style.width).toBe("149px");
              resolve();
            }, 50);
          }, 10);
        });
      }
    );
  });

  describe("state management and caching integration", () => {
    it("should maintain correct state across multiple operations", () => {
      const manager = managers[0];

      // Apply initial values
      manager.updateProperty("width", createValue.numeric(200, "px"));
      manager.updateProperty("translateX", createValue.numeric(50, "px"));

      // Get current values (should use cache)
      const width1 = manager.getCurrentValue("width");
      const transform1 = manager.getCurrentValue("translateX");

      // Update and get again
      manager.updateProperty("width", createValue.numeric(250, "px"));
      const width2 = manager.getCurrentValue("width");

      expect(width1).toEqual(createValue.numeric(200, "px"));
      expect(width2).toEqual(createValue.numeric(250, "px"));
      expect(transform1).toEqual(createValue.numeric(50, "px"));
    });

    it(
      "should handle reset correctly with multiple property types",
      { timeout: 10000 },
      () => {
        const manager = managers[0];
        const element = elements[0];

        // Apply various properties
        manager.updateProperty("width", createValue.numeric(300, "px"));
        manager.updateProperty(
          "backgroundColor",
          createValue.rgb(255, 128, 0, 1)
        );
        manager.updateProperty("translateX", createValue.numeric(100, "px"));
        manager.updateProperty("scaleY", createValue.numeric(1.5, ""));

        return new Promise<void>((resolve) => {
          setTimeout(() => {
            manager.applyUpdates();

            setTimeout(() => {
              // Verify properties were applied
              expect(element.style.width).toBe("300px");
              expect(element.style.backgroundColor).toContain("rgb");
              expect(element.style.transform).toContain("100px"); // translateX
              expect(element.style.transform).toContain("1.5"); // scaleY

              // Reset
              manager.reset();

              // Check internal state is cleared
              expect((manager as any).propertyStates.size).toBe(0);
              expect((manager as any).pendingTransformUpdates.size).toBe(0);
              expect((manager as any).pendingCSSUpdates.size).toBe(0);

              resolve();
            }, 50);
          }, 10);
        });
      }
    );

    it("should coordinate cache invalidation between handlers", () => {
      const manager = managers[0];

      // Get initial values to populate cache
      const initialWidth = manager.getCurrentValue("width");
      const initialTransform = manager.getCurrentValue("translateX");

      expect(initialWidth).toEqual(createValue.numeric(100, "px"));
      expect(initialTransform).toEqual(createValue.numeric(0, "px"));

      // Update values
      manager.updateProperty("width", createValue.numeric(200, "px"));
      manager.updateProperty("translateX", createValue.numeric(75, "px"));

      // Cache should be updated with new values
      const updatedWidth = manager.getCurrentValue("width");
      const updatedTransform = manager.getCurrentValue("translateX");

      expect(updatedWidth).toEqual(createValue.numeric(200, "px"));
      expect(updatedTransform).toEqual(createValue.numeric(75, "px"));
    });
  });

  describe("error handling and recovery integration", () => {
    it(
      "should handle mixed success and failure scenarios",
      { timeout: 10000 },
      () => {
        const workingManager = managers[0];
        const failingManager = managers[1];

        // Setup failing manager
        const originalSetProperty = elements[1].style.setProperty;
        elements[1].style.setProperty = vi.fn(() => {
          throw new Error("DOM error");
        });

        // Apply same operations to both
        const operations = [
          {
            prop: "width" as CSSPropertyName,
            value: createValue.numeric(200, "px"),
          },
          {
            prop: "backgroundColor" as CSSPropertyName,
            value: createValue.rgb(255, 0, 128, 1),
          },
          {
            prop: "translateX" as TransformPropertyName,
            value: createValue.numeric(50, "px"),
          },
        ];

        operations.forEach(({ prop, value }) => {
          expect(() =>
            workingManager.updateProperty(prop, value)
          ).not.toThrow();
          expect(() =>
            failingManager.updateProperty(prop, value)
          ).not.toThrow();
        });

        return new Promise<void>((resolve) => {
          setTimeout(() => {
            workingManager.applyUpdates();

            setTimeout(() => {
              // Working manager should have applied changes
              expect(elements[0].style.width).toBe("200px");
              expect(elements[0].style.backgroundColor).toContain("rgb");
              expect(elements[0].style.transform).toContain("50px"); // translateX

              // Restore
              elements[1].style.setProperty = originalSetProperty;
              resolve();
            }, 50);
          }, 10);
        });
      }
    );

    it(
      "should maintain consistency during partial failures",
      { timeout: 10000 },
      () => {
        const manager = managers[0];
        const element = elements[0];

        let callCount = 0;
        const originalSetProperty = element.style.setProperty;

        // Fail every third call
        element.style.setProperty = vi.fn((prop, value) => {
          callCount++;
          if (callCount % 3 === 0) {
            throw new Error("Intermittent error");
          }
          return originalSetProperty.call(element.style, prop, value);
        });

        // Apply multiple properties
        const properties = [
          "width",
          "height",
          "opacity",
          "borderRadius",
          "backgroundColor",
          "color",
        ];
        properties.forEach((prop, index) => {
          const value =
            prop === "opacity"
              ? createValue.numeric(0.8, "")
              : prop.includes("color")
              ? createValue.rgb(100 + index * 20, 150, 200, 1)
              : createValue.numeric(120 + index * 10, "px");

          expect(() =>
            manager.updateProperty(prop as any, value)
          ).not.toThrow();
        });

        return new Promise<void>((resolve) => {
          setTimeout(() => {
            manager.applyUpdates();

            setTimeout(() => {
              // Some properties should have been applied
              expect(callCount).toBeGreaterThan(0);

              // Restore
              element.style.setProperty = originalSetProperty;
              resolve();
            }, 50);
          }, 10);
        });
      }
    );
  });

  describe("real-world integration patterns", () => {
    it("should simulate a complex dashboard widget animation", () => {
      // Use all 4 elements as different widgets
      const widgets = managers.map((manager, index) => ({
        manager,
        element: elements[index],
        type: ["chart", "metric", "progress", "status"][index],
      }));

      // Animate each widget type differently
      const widgetAnimations = {
        chart: {
          width: {
            from: createValue.numeric(100, "px"),
            to: createValue.numeric(180, "px"),
          },
          height: {
            from: createValue.numeric(100, "px"),
            to: createValue.numeric(120, "px"),
          },
          backgroundColor: {
            from: createValue.rgb(100, 150, 200, 1),
            to: createValue.rgb(120, 180, 220, 1),
          },
          scaleY: {
            from: createValue.numeric(1, ""),
            to: createValue.numeric(1.05, ""),
          },
        },
        metric: {
          opacity: {
            from: createValue.numeric(0.8, ""),
            to: createValue.numeric(1, ""),
          },
          translateY: {
            from: createValue.numeric(0, "px"),
            to: createValue.numeric(-5, "px"),
          },
          borderRadius: {
            from: createValue.numeric(8, "px"),
            to: createValue.numeric(12, "px"),
          },
        },
        progress: {
          width: {
            from: createValue.numeric(100, "px"),
            to: createValue.numeric(160, "px"),
          },
          rotateZ: {
            from: createValue.numeric(0, "deg"),
            to: createValue.numeric(2, "deg"),
          },
          backgroundColor: {
            from: createValue.rgb(255, 200, 100, 1),
            to: createValue.rgb(255, 220, 120, 1),
          },
        },
        status: {
          scaleX: {
            from: createValue.numeric(1, ""),
            to: createValue.numeric(0.95, ""),
          },
          scaleY: {
            from: createValue.numeric(1, ""),
            to: createValue.numeric(1.1, ""),
          },
          opacity: {
            from: createValue.numeric(1, ""),
            to: createValue.numeric(0.9, ""),
          },
        },
      };

      // Apply animations with different timing
      widgets.forEach((widget, widgetIndex) => {
        const animations =
          widgetAnimations[widget.type as keyof typeof widgetAnimations];

        setTimeout(() => {
          const steps = 8;
          for (let step = 0; step <= steps; step++) {
            setTimeout(() => {
              const progress = step / steps;

              Object.entries(animations).forEach(([prop, { from, to }]) => {
                const interpolated = widget.manager.interpolate(
                  prop as any,
                  from,
                  to,
                  progress
                );
                widget.manager.updateProperty(prop as any, interpolated);
              });
            }, step * 40);
          }
        }, widgetIndex * 100);
      });

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // Verify each widget animated correctly
          expect(elements[0].style.width).toBe("180px"); // chart
          expect(elements[1].style.opacity).toBe("1"); // metric
          expect(elements[2].style.width).toBe("160px"); // progress
          expect(elements[3].style.transform).toContain("scale"); // status
          resolve();
        }, widgets.length * 100 + 8 * 40 + 200);
      });
    });

    it(
      "should handle responsive animation adjustments",
      { timeout: 15000 },
      () => {
        const manager = managers[0];
        const element = elements[0];

        // Simulate different viewport sizes
        const viewports = [
          { width: 320, multiplier: 0.5 }, // mobile
          { width: 768, multiplier: 0.8 }, // tablet
          { width: 1200, multiplier: 1.2 }, // desktop
          { width: 1920, multiplier: 1.5 }, // large desktop
        ];

        let currentViewport = 0;
        const animateViewportChange = () => {
          if (currentViewport < viewports.length) {
            const viewport = viewports[currentViewport];

            // Adjust properties based on viewport
            const baseWidth = 100;
            const baseHeight = 100;
            const baseTransform = 20;

            manager.updateProperty(
              "width",
              createValue.numeric(baseWidth * viewport.multiplier, "px")
            );
            manager.updateProperty(
              "height",
              createValue.numeric(baseHeight * viewport.multiplier, "px")
            );
            manager.updateProperty(
              "translateX",
              createValue.numeric(baseTransform * viewport.multiplier, "px")
            );
            manager.updateProperty(
              "scaleX",
              createValue.numeric(viewport.multiplier, "")
            );

            currentViewport++;

            if (currentViewport < viewports.length) {
              setTimeout(animateViewportChange, 150);
            }
          }
        };

        return new Promise<void>((resolve) => {
          animateViewportChange();

          setTimeout(() => {
            manager.applyUpdates();

            setTimeout(() => {
              // Should end with large desktop settings
              expect(element.style.width).toBe("150px"); // 100 * 1.5
              expect(element.style.height).toBe("150px");
              expect(element.style.transform).toContain("30px"); // translateX
              expect(element.style.transform).toContain("1.5"); // scaleX
              resolve();
            }, 50);
          }, viewports.length * 150 + 50);
        });
      }
    );

    it("should simulate a loading sequence with multiple elements", () => {
      // Simplified loading sequence - test basic multi-element coordination
      managers.forEach((manager, index) => {
        // Apply different opacity values to each element
        manager.updateProperty(
          "opacity",
          createValue.numeric(0.7 + index * 0.1, "")
        );
        manager.updateProperty(
          "width",
          createValue.numeric(120 + index * 10, "px")
        );
      });

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          managers.forEach((m) => m.applyUpdates());

          setTimeout(() => {
            // Check that each element has its expected values
            elements.forEach((element, index) => {
              const expectedOpacity = (0.7 + index * 0.1).toFixed(1);
              const expectedWidth = `${120 + index * 10}px`;

              expect(parseFloat(element.style.opacity)).toBeCloseTo(
                parseFloat(expectedOpacity),
                1
              );
              expect(element.style.width).toBe(expectedWidth);
            });
            resolve();
          }, 50);
        }, 10);
      });
    });
  });
});
