/// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { TransformHandler } from "../handler";
import { createValue } from "../../../core/animation-val";
import type { TransformPropertyName } from "../types";

describe("TransformHandler - Integration Tests", () => {
  let container: HTMLElement;
  let elements: HTMLElement[];
  let handlers: TransformHandler[];

  beforeEach(() => {
    container = document.createElement("div");
    container.style.cssText = `
      width: 500px;
      height: 500px;
      position: relative;
      overflow: hidden;
    `;
    document.body.appendChild(container);

    // Create multiple test elements
    elements = Array.from({ length: 3 }, (_, i) => {
      const element = document.createElement("div");
      element.style.cssText = `
        width: 100px;
        height: 100px;
        background: hsl(${i * 120}, 70%, 50%);
        position: absolute;
        top: ${i * 50}px;
        left: ${i * 50}px;
      `;
      element.textContent = `Element ${i + 1}`;
      container.appendChild(element);
      return element;
    });

    handlers = elements.map((el) => new TransformHandler(el));
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe("multi-element coordination", () => {
    it("should handle transforms on multiple elements independently", () => {
      // Apply different transforms to each element
      handlers[0].updateTransform("translateX", createValue.numeric(100, "px"));
      handlers[1].updateTransform("rotateZ", createValue.numeric(45, "deg"));
      handlers[2].updateTransform("scaleX", createValue.numeric(2, ""));

      // Verify each handler maintains its own state
      expect(handlers[0].computeTransform()).toBe(
        "translate3d(100px, 0px, 0px)"
      );
      expect(handlers[1].computeTransform()).toBe("rotateZ(45deg)");
      expect(handlers[2].computeTransform()).toBe("scale3d(2, 1, 1)");

      // Verify other elements are unaffected
      expect(handlers[0].getCurrentTransform("rotateZ").value).toBe(0);
      expect(handlers[1].getCurrentTransform("scaleX").value).toBe(1);
      expect(handlers[2].getCurrentTransform("translateX").value).toBe(0);
    });

    it("should handle synchronized transforms across multiple elements", () => {
      const syncTransforms = new Map<TransformPropertyName, any>([
        ["translateY", createValue.numeric(50, "px")],
        ["rotateZ", createValue.numeric(30, "deg")],
        ["scale", createValue.numeric(1.2, "")],
      ]);

      // Apply same transforms to all elements
      handlers.forEach((handler) => {
        handler.updateTransforms(syncTransforms);
      });

      const expectedTransform =
        "translate3d(0px, 50px, 0px) rotateZ(30deg) scale3d(1.2, 1.2, 1)";

      handlers.forEach((handler) => {
        expect(handler.computeTransform()).toBe(expectedTransform);
      });
    });

    it("should handle cascading transform updates", () => {
      // Create a chain of transforms where each element's transform depends on the previous
      const baseTranslate = 50;
      const baseRotate = 15;
      const baseScale = 1.1;

      handlers.forEach((handler, index) => {
        handler.updateTransform(
          "translateX",
          createValue.numeric(baseTranslate * (index + 1), "px")
        );
        handler.updateTransform(
          "rotateZ",
          createValue.numeric(baseRotate * (index + 1), "deg")
        );
        handler.updateTransform(
          "scale",
          createValue.numeric(baseScale + index * 0.1, "")
        );
      });

      // Verify the cascade
      expect(handlers[0].computeTransform()).toBe(
        "translate3d(50px, 0px, 0px) rotateZ(15deg) scale3d(1.1, 1.1, 1)"
      );
      expect(handlers[1].computeTransform()).toBe(
        "translate3d(100px, 0px, 0px) rotateZ(30deg) scale3d(1.2, 1.2, 1)"
      );
      expect(handlers[2].computeTransform()).toBe(
        "translate3d(150px, 0px, 0px) rotateZ(45deg) scale3d(1.3, 1.3, 1)"
      );
    });
  });

  describe("DOM integration", () => {
    it("should properly apply transforms to DOM elements", () => {
      const testElement = elements[0];
      const handler = handlers[0];

      handler.updateTransform("translateX", createValue.numeric(100, "px"));
      handler.updateTransform("rotateZ", createValue.numeric(45, "deg"));

      // Trigger transform application
      const computedTransform = handler.computeTransform();
      testElement.style.transform = computedTransform;

      // Verify DOM transform is applied
      expect(testElement.style.transform).toBe(
        "translate3d(100px, 0px, 0px) rotateZ(45deg)"
      );

      // Verify computed style (in a real browser this would show the computed matrix)
      const computedStyle = window.getComputedStyle(testElement);
      expect(computedStyle.transform).toBeTruthy();
    });

    it("should handle transform inheritance in nested elements", () => {
      // Create nested structure
      const parentElement = document.createElement("div");
      const childElement = document.createElement("div");

      parentElement.style.cssText =
        "width: 200px; height: 200px; position: relative;";
      childElement.style.cssText =
        "width: 100px; height: 100px; position: absolute;";

      parentElement.appendChild(childElement);
      container.appendChild(parentElement);

      const parentHandler = new TransformHandler(parentElement);
      const childHandler = new TransformHandler(childElement);

      // Apply transforms to both parent and child
      parentHandler.updateTransform("rotateZ", createValue.numeric(45, "deg"));
      childHandler.updateTransform("translateX", createValue.numeric(50, "px"));

      // Apply transforms to DOM
      parentElement.style.transform = parentHandler.computeTransform();
      childElement.style.transform = childHandler.computeTransform();

      expect(parentElement.style.transform).toBe("rotateZ(45deg)");
      expect(childElement.style.transform).toBe("translate3d(50px, 0px, 0px)");

      container.removeChild(parentElement);
    });

    it("should handle dynamic element creation and destruction", () => {
      const dynamicElements: HTMLElement[] = [];
      const dynamicHandlers: TransformHandler[] = [];

      // Create elements dynamically
      for (let i = 0; i < 5; i++) {
        const element = document.createElement("div");
        element.style.cssText = `
          width: 50px;
          height: 50px;
          position: absolute;
          background: hsl(${i * 72}, 60%, 50%);
          top: ${i * 20}px;
          left: ${i * 60}px;
        `;

        container.appendChild(element);
        dynamicElements.push(element);

        const handler = new TransformHandler(element);
        handler.updateTransform("rotateZ", createValue.numeric(i * 30, "deg"));

        element.style.transform = handler.computeTransform();
        dynamicHandlers.push(handler);
      }

      // Verify all elements have correct transforms
      dynamicHandlers.forEach((handler, index) => {
        expect(handler.computeTransform()).toBe(`rotateZ(${index * 30}deg)`);
      });

      // Remove elements
      dynamicElements.forEach((element) => {
        container.removeChild(element);
      });

      // Handlers should still work even after elements are removed
      expect(() => {
        dynamicHandlers.forEach((handler) => {
          handler.computeTransform();
        });
      }).not.toThrow();
    });
  });

  describe("animation simulation", () => {
    it("should simulate smooth animation between keyframes", () => {
      const handler = handlers[0];
      const element = elements[0];

      // Define keyframes
      const keyframes = [
        { translateX: 0, rotateZ: 0, scale: 1 },
        { translateX: 100, rotateZ: 90, scale: 1.5 },
        { translateX: 200, rotateZ: 180, scale: 1 },
        { translateX: 100, rotateZ: 270, scale: 0.8 },
        { translateX: 0, rotateZ: 360, scale: 1 },
      ];

      const animationSteps = 20;
      const transformHistory: string[] = [];

      // Simulate animation steps
      for (let step = 0; step <= animationSteps; step++) {
        const progress = step / animationSteps;
        const keyframeIndex = Math.floor(progress * (keyframes.length - 1));
        const nextKeyframeIndex = Math.min(
          keyframeIndex + 1,
          keyframes.length - 1
        );
        const localProgress = (progress * (keyframes.length - 1)) % 1;

        const currentKeyframe = keyframes[keyframeIndex];
        const nextKeyframe = keyframes[nextKeyframeIndex];

        // Interpolate between keyframes
        const translateX = handler.interpolate(
          "translateX",
          createValue.numeric(currentKeyframe.translateX, "px"),
          createValue.numeric(nextKeyframe.translateX, "px"),
          localProgress
        );

        const rotateZ = handler.interpolate(
          "rotateZ",
          createValue.numeric(currentKeyframe.rotateZ, "deg"),
          createValue.numeric(nextKeyframe.rotateZ, "deg"),
          localProgress
        );

        const scale = handler.interpolate(
          "scale",
          createValue.numeric(currentKeyframe.scale, ""),
          createValue.numeric(nextKeyframe.scale, ""),
          localProgress
        );

        // Update handler
        handler.updateTransform("translateX", translateX);
        handler.updateTransform("rotateZ", rotateZ);
        handler.updateTransform("scale", scale);

        const transform = handler.computeTransform();
        transformHistory.push(transform);

        // Apply to DOM
        element.style.transform = transform;
      }

      // Verify animation progression
      expect(transformHistory.length).toBe(animationSteps + 1);
      expect(transformHistory[0]).toContain("translate3d(0px, 0px, 0px)");
      expect(transformHistory[transformHistory.length - 1]).toContain(
        "scale3d(1, 1, 1)"
      );

      // Verify smooth progression (no identical consecutive frames except at keyframes)
      const uniqueTransforms = new Set(transformHistory);
      expect(uniqueTransforms.size).toBeGreaterThan(animationSteps * 0.8); // Allow some duplicates at keyframes
    });

    it("should handle easing function simulation", () => {
      const handler = handlers[0];

      // Simulate ease-in-out easing
      const easeInOut = (t: number): number => {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      };

      const startValue = createValue.numeric(0, "px");
      const endValue = createValue.numeric(300, "px");
      const steps = 10;

      for (let i = 0; i <= steps; i++) {
        const linearProgress = i / steps;
        const easedProgress = easeInOut(linearProgress);

        const interpolated = handler.interpolate(
          "translateX",
          startValue,
          endValue,
          easedProgress
        );
        handler.updateTransform("translateX", interpolated);

        const transform = handler.computeTransform();

        // Verify easing effect (values should accelerate then decelerate)
        if (i === 0) expect(interpolated.value).toBe(0);
        if (i === steps) expect(interpolated.value).toBe(300);
        if (i === Math.floor(steps / 2)) {
          // Middle value should be close to halfway point due to ease-in-out
          expect(interpolated.value).toBeCloseTo(150, 0);
        }
      }
    });
  });

  describe("performance under load", () => {
    it("should handle many simultaneous transform updates", () => {
      const manyElements: HTMLElement[] = [];
      const manyHandlers: TransformHandler[] = [];

      // Create many elements
      for (let i = 0; i < 50; i++) {
        const element = document.createElement("div");
        element.style.cssText = `
          width: 10px;
          height: 10px;
          position: absolute;
          top: ${Math.random() * 400}px;
          left: ${Math.random() * 400}px;
        `;

        container.appendChild(element);
        manyElements.push(element);
        manyHandlers.push(new TransformHandler(element));
      }

      const startTime = performance.now();

      // Update all handlers simultaneously
      manyHandlers.forEach((handler, index) => {
        handler.updateTransform(
          "translateX",
          createValue.numeric(index * 2, "px")
        );
        handler.updateTransform(
          "rotateZ",
          createValue.numeric(index * 7.2, "deg")
        );
        handler.updateTransform(
          "scale",
          createValue.numeric(0.5 + index * 0.01, "")
        );

        const transform = handler.computeTransform();
        manyElements[index].style.transform = transform;
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(100); // 100ms for 50 elements

      // Cleanup
      manyElements.forEach((element) => container.removeChild(element));
    });

    it("should maintain performance with frequent updates", () => {
      const handler = handlers[0];
      const element = elements[0];
      const updateCount = 1000;

      const startTime = performance.now();

      for (let i = 0; i < updateCount; i++) {
        handler.updateTransform(
          "translateX",
          createValue.numeric(Math.sin(i * 0.1) * 100, "px")
        );
        handler.updateTransform(
          "rotateZ",
          createValue.numeric(i * 0.36, "deg")
        );

        const transform = handler.computeTransform();
        if (i % 10 === 0) {
          // Only apply to DOM occasionally to avoid excessive DOM updates
          element.style.transform = transform;
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should handle 1000 updates efficiently
      expect(duration).toBeLessThan(50); // 50ms for 1000 updates
    });
  });

  describe("browser compatibility simulation", () => {
    it("should handle missing transform support gracefully", () => {
      const testElement = document.createElement("div");
      container.appendChild(testElement);

      // Mock missing transform support
      const originalTransform = Object.getOwnPropertyDescriptor(
        testElement.style,
        "transform"
      );
      Object.defineProperty(testElement.style, "transform", {
        set: () => {}, // No-op
        get: () => "",
        configurable: true,
      });

      const handler = new TransformHandler(testElement);

      expect(() => {
        handler.updateTransform("translateX", createValue.numeric(100, "px"));
        const transform = handler.computeTransform();
        testElement.style.transform = transform;
      }).not.toThrow();

      // Restore original descriptor
      if (originalTransform) {
        Object.defineProperty(
          testElement.style,
          "transform",
          originalTransform
        );
      }

      container.removeChild(testElement);
    });

    it("should work with vendor prefixes simulation", () => {
      const testElement = document.createElement("div");
      container.appendChild(testElement);

      const handler = new TransformHandler(testElement);
      handler.updateTransform("translateX", createValue.numeric(100, "px"));

      const transform = handler.computeTransform();

      // Simulate applying vendor prefixes
      const prefixes = ["", "-webkit-", "-moz-", "-ms-", "-o-"];
      prefixes.forEach((prefix) => {
        const property = `${prefix}transform`;
        if (property in testElement.style) {
          (testElement.style as any)[property] = transform;
        }
      });

      expect(testElement.style.transform).toBeTruthy();

      container.removeChild(testElement);
    });
  });

  describe("real-world usage patterns", () => {
    it("should handle modal/dialog transform patterns", () => {
      const modal = document.createElement("div");
      modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        width: 300px;
        height: 200px;
        background: white;
        border: 1px solid #ccc;
        z-index: 1000;
      `;

      container.appendChild(modal);
      const handler = new TransformHandler(modal);

      // Simulate modal entrance animation
      const entranceSteps = [
        { scale: 0.8, translateX: -150, translateY: -100, opacity: 0 },
        { scale: 0.9, translateX: -150, translateY: -100, opacity: 0.5 },
        { scale: 1, translateX: -150, translateY: -100, opacity: 1 },
      ];

      entranceSteps.forEach((step, index) => {
        handler.updateTransform("scale", createValue.numeric(step.scale, ""));
        handler.updateTransform(
          "translateX",
          createValue.numeric(step.translateX, "px")
        );
        handler.updateTransform(
          "translateY",
          createValue.numeric(step.translateY, "px")
        );

        modal.style.transform = handler.computeTransform();
        modal.style.opacity = step.opacity.toString();
      });

      expect(handler.computeTransform()).toBe(
        "translate3d(-150px, -100px, 0px) scale3d(1, 1, 1)"
      );

      container.removeChild(modal);
    });

    it("should handle card flip animation pattern", () => {
      const card = document.createElement("div");
      const cardFront = document.createElement("div");
      const cardBack = document.createElement("div");

      card.style.cssText = `
        width: 200px;
        height: 150px;
        position: relative;
        perspective: 1000px;
      `;

      [cardFront, cardBack].forEach((face, index) => {
        face.style.cssText = `
          width: 100%;
          height: 100%;
          position: absolute;
          backface-visibility: hidden;
          background: ${index === 0 ? "#3498db" : "#e74c3c"};
        `;
        card.appendChild(face);
      });

      container.appendChild(card);

      const frontHandler = new TransformHandler(cardFront);
      const backHandler = new TransformHandler(cardBack);

      // Initial state - back face is flipped
      backHandler.updateTransform("rotateY", createValue.numeric(180, "deg"));
      cardBack.style.transform = backHandler.computeTransform();

      // Simulate flip animation
      const flipSteps = 10;
      for (let i = 0; i <= flipSteps; i++) {
        const progress = i / flipSteps;
        const angle = progress * 180;

        frontHandler.updateTransform(
          "rotateY",
          createValue.numeric(angle, "deg")
        );
        backHandler.updateTransform(
          "rotateY",
          createValue.numeric(180 - angle, "deg")
        );

        cardFront.style.transform = frontHandler.computeTransform();
        cardBack.style.transform = backHandler.computeTransform();
      }

      // After animation, front should be flipped and back should be normal
      expect(frontHandler.computeTransform()).toBe("rotateY(180deg)");
      expect(backHandler.computeTransform()).toBe("rotateY(0deg)");

      container.removeChild(card);
    });

    it("should handle parallax scrolling pattern", () => {
      const layers = Array.from({ length: 3 }, (_, i) => {
        const layer = document.createElement("div");
        layer.style.cssText = `
          width: 100%;
          height: 200px;
          position: absolute;
          background: hsla(${i * 120}, 70%, 50%, 0.7);
          top: 0;
        `;
        container.appendChild(layer);
        return layer;
      });

      const handlers = layers.map((layer) => new TransformHandler(layer));

      // Simulate scroll-based parallax
      const scrollPositions = [0, 50, 100, 150, 200];

      scrollPositions.forEach((scrollY) => {
        handlers.forEach((handler, layerIndex) => {
          // Different layers move at different speeds (parallax effect)
          const speed = 0.1 + layerIndex * 0.3;
          const translateY = -scrollY * speed;

          handler.updateTransform(
            "translateY",
            createValue.numeric(translateY, "px")
          );
          layers[layerIndex].style.transform = handler.computeTransform();
        });
      });

      // Verify different layers have different final positions
      const finalTransforms = handlers.map((handler) =>
        handler.computeTransform()
      );
      expect(finalTransforms[0]).not.toBe(finalTransforms[1]);
      expect(finalTransforms[1]).not.toBe(finalTransforms[2]);

      layers.forEach((layer) => container.removeChild(layer));
    });
  });
});
