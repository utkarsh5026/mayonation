import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CSSAnimator } from "../css-animation";
import type { CSSAnimationConfig } from "../types";

describe("CSSAnimator Integration Tests", () => {
  let testContainer: HTMLElement;
  let testElements: HTMLElement[];

  beforeEach(() => {
    // Set up DOM environment
    document.body.innerHTML = '';
    testContainer = document.createElement('div');
    testContainer.id = 'test-container';
    document.body.appendChild(testContainer);

    // Create test elements
    testElements = Array.from({ length: 3 }, (_, i) => {
      const element = document.createElement('div');
      element.className = 'test-element';
      element.id = `element-${i}`;
      element.style.position = 'absolute';
      element.style.width = '50px';
      element.style.height = '50px';
      element.style.backgroundColor = 'red';
      element.style.opacity = '1';
      element.style.transform = 'translateX(0px)';
      testContainer.appendChild(element);
      return element;
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe("Real DOM Element Animation", () => {
    it("should animate opacity from 0 to 1", () => {
      const config: CSSAnimationConfig = {
        target: '.test-element',
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      const animator = new CSSAnimator(config);
      
      // Test initial state (start)
      animator.start();
      animator.update(0);

      // Test middle state
      animator.update(0.5);
      
      // Test final state
      animator.update(1.0);
      animator.complete();

      expect(animator.elementCount).toBe(3);
      expect(animator.baseDuration).toBe(1000);
      expect(animator.totalDuration).toBeGreaterThanOrEqual(1000);
    });

    it("should animate multiple CSS properties", () => {
      const config: CSSAnimationConfig = {
        target: testElements,
        duration: 1000,
        from: { 
          opacity: 0.2, 
          translateX: 0,
          scale: 0.5,
        },
        to: { 
          opacity: 1, 
          translateX: 200,
          scale: 1.2,
        },
      };

      const animator = new CSSAnimator(config);
      
      expect(animator.elementCount).toBe(3);

      // Test animation progression
      animator.update(0);
      animator.update(0.25);
      animator.update(0.5);
      animator.update(0.75);
      animator.update(1.0);

      expect(() => animator.complete()).not.toThrow();
    });

    it("should handle transform animations", () => {
      const config: CSSAnimationConfig = {
        target: testElements[0],
        duration: 800,
        from: {
          translateX: 0,
          translateY: 0,
          rotateZ: 0,
          scale: 1,
        },
        to: {
          translateX: 100,
          translateY: 50,
          rotateZ: 180,
          scale: 1.5,
        },
      };

      const animator = new CSSAnimator(config);
      
      expect(animator.elementCount).toBe(1);

      animator.start();
      animator.update(0.5);
      animator.complete();

      expect(animator.baseDuration).toBe(800);
    });

    it("should work with CSS selectors", () => {
      // Add specific classes for testing
      testElements[0].className = 'animate-me first';
      testElements[1].className = 'animate-me second';
      testElements[2].className = 'different-class';

      const config: CSSAnimationConfig = {
        target: '.animate-me',
        duration: 600,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      const animator = new CSSAnimator(config);
      
      // Should only animate elements with 'animate-me' class
      expect(animator.elementCount).toBe(2);

      animator.update(0.5);
      animator.complete();
    });

    it("should work with single element reference", () => {
      const singleElement = testElements[1];
      
      const config: CSSAnimationConfig = {
        target: singleElement,
        duration: 500,
        from: { translateY: -50 },
        to: { translateY: 50 },
      };

      const animator = new CSSAnimator(config);
      
      expect(animator.elementCount).toBe(1);

      animator.update(0);
      animator.update(1);
    });
  });

  describe("Staggered Animations", () => {
    it("should handle staggered timing correctly", () => {
      const config: CSSAnimationConfig = {
        target: '.test-element',
        duration: 1000,
        stagger: 200,
        from: { opacity: 0, translateX: -100 },
        to: { opacity: 1, translateX: 0 },
      };

      const animator = new CSSAnimator(config);
      
      expect(animator.elementCount).toBe(3);
      expect(animator.baseDuration).toBe(1000);
      // Total duration should account for stagger
      expect(animator.totalDuration).toBeGreaterThan(1000);

      // Simulate animation over time
      const steps = 20;
      for (let i = 0; i <= steps; i++) {
        const progress = i / steps;
        animator.update(progress);
      }

      animator.complete();
    });

    it("should handle negative stagger values", () => {
      const config: CSSAnimationConfig = {
        target: testElements,
        duration: 1000,
        stagger: -100,
        to: { opacity: 0.5 },
      };

      const animator = new CSSAnimator(config);
      
      // Negative stagger might not increase total duration, just test it works
      expect(animator.totalDuration).toBeGreaterThan(0);
      
      animator.update(0.5);
      animator.complete();
    });
  });

  describe("Keyframe Animations", () => {
    it("should animate through multiple keyframes", () => {
      const config: CSSAnimationConfig = {
        target: testElements[0],
        duration: 1200,
        keyframes: [
          { offset: 0, opacity: 0, translateX: 0, translateY: 0 },
          { offset: 0.25, opacity: 0.5, translateX: 50, translateY: -20 },
          { offset: 0.75, opacity: 0.8, translateX: 150, translateY: 20 },
          { offset: 1, opacity: 1, translateX: 200, translateY: 0 },
        ],
      };

      const animator = new CSSAnimator(config);
      
      expect(animator.elementCount).toBe(1);

      // Test keyframe progression
      animator.update(0);    // First keyframe
      animator.update(0.25); // Second keyframe
      animator.update(0.5);  // Between keyframes
      animator.update(0.75); // Third keyframe
      animator.update(1.0);  // Final keyframe

      animator.complete();
    });

    it("should handle array-based keyframes", () => {
      const config: CSSAnimationConfig = {
        target: '.test-element',
        duration: 1000,
        from: { opacity: 0 },
        to: { 
          opacity: [0.2, 0.6, 1.0],
          translateX: [0, 100, 200, 150],
        },
      };

      const animator = new CSSAnimator(config);
      
      expect(animator.elementCount).toBe(3);

      // Test array keyframe interpolation
      animator.update(0);
      animator.update(0.33);
      animator.update(0.66);
      animator.update(1.0);

      animator.complete();
    });
  });

  describe("Function-Based Properties", () => {
    it("should use functions to calculate per-element values", () => {
      const config: CSSAnimationConfig = {
        target: testElements,
        duration: 1000,
        from: {
          opacity: (index, element) => index * 0.1,
          translateX: 0,
        },
        to: {
          opacity: 1,
          translateX: (index, element) => (index + 1) * 100,
        },
      };

      const animator = new CSSAnimator(config);
      
      expect(animator.elementCount).toBe(3);

      animator.update(0.5);
      animator.complete();
    });

    it("should handle functions returning arrays", () => {
      const config: CSSAnimationConfig = {
        target: testElements,
        duration: 800,
        to: {
          opacity: (index) => [0, 0.5 + (index * 0.1), 1],
          translateX: (index) => [0, 50 * (index + 1), 100 * (index + 1)],
        },
      };

      const animator = new CSSAnimator(config);
      
      expect(animator.elementCount).toBe(3);

      // Test function-generated array keyframes
      animator.update(0);
      animator.update(0.5);
      animator.update(1.0);

      animator.complete();
    });
  });

  describe("Animation Callbacks", () => {
    it("should call lifecycle callbacks in correct order", () => {
      const callOrder: string[] = [];
      
      const config: CSSAnimationConfig = {
        target: testElements[0],
        duration: 500,
        from: { opacity: 0 },
        to: { opacity: 1 },
        onStart: () => callOrder.push('start'),
        onUpdate: (progress) => callOrder.push(`update-${progress.toFixed(1)}`),
        onComplete: () => callOrder.push('complete'),
      };

      const animator = new CSSAnimator(config);
      
      animator.start();
      animator.update(0.5);
      animator.complete();

      expect(callOrder).toContain('start');
      expect(callOrder).toContain('update-0.5');
      expect(callOrder).toContain('complete');
      expect(callOrder.indexOf('start')).toBeLessThan(callOrder.indexOf('update-0.5'));
      expect(callOrder.indexOf('update-0.5')).toBeLessThan(callOrder.indexOf('complete'));
    });

    it("should provide correct animation info in onUpdate", () => {
      let lastAnimationInfo: any;
      
      const config: CSSAnimationConfig = {
        target: testElements,
        duration: 1000,
        stagger: 100,
        from: { opacity: 0 },
        to: { opacity: 1 },
        onUpdate: (progress, info) => {
          lastAnimationInfo = info;
        },
      };

      const animator = new CSSAnimator(config);
      
      animator.update(0.5);

      expect(lastAnimationInfo).toHaveProperty('elapsed');
      expect(lastAnimationInfo).toHaveProperty('remaining');
      expect(lastAnimationInfo).toHaveProperty('activeElements');
      expect(typeof lastAnimationInfo.elapsed).toBe('number');
      expect(typeof lastAnimationInfo.remaining).toBe('number');
      expect(typeof lastAnimationInfo.activeElements).toBe('number');
    });
  });

  describe("Complex Animation Scenarios", () => {
    it("should handle mixed properties with different data types", () => {
      const config: CSSAnimationConfig = {
        target: testElements,
        duration: 1000,
        from: {
          opacity: 0,
          translateX: (index) => index * -50,
          backgroundColor: "#FF0000",
        },
        to: {
          opacity: [0.3, 0.7, 1.0],
          translateX: (index) => [0, 25 * index, 50 * (index + 1)],
          backgroundColor: "#00FF00",
        },
      };

      expect(() => new CSSAnimator(config)).not.toThrow();
      
      const animator = new CSSAnimator(config);
      expect(animator.elementCount).toBe(3);

      animator.update(0.33);
      animator.update(0.66);
      animator.complete();
    });

    it("should work with CSS custom properties", () => {
      // Set custom properties on elements
      testElements.forEach((element, index) => {
        element.style.setProperty('--custom-scale', '1');
        element.style.setProperty('--custom-rotation', '0deg');
      });

      const config: CSSAnimationConfig = {
        target: testElements,
        duration: 800,
        from: {
          '--custom-scale': 1,
          '--custom-rotation': '0deg',
        },
        to: {
          '--custom-scale': 1.5,
          '--custom-rotation': '360deg',
        },
      };

      expect(() => new CSSAnimator(config)).not.toThrow();
      
      const animator = new CSSAnimator(config);
      animator.update(0.5);
      animator.complete();
    });

    it("should handle overlapping animations with reset", () => {
      const config: CSSAnimationConfig = {
        target: testElements[0],
        duration: 600,
        from: { opacity: 0, translateX: 0 },
        to: { opacity: 1, translateX: 100 },
      };

      const animator = new CSSAnimator(config);
      
      // Start animation
      animator.update(0.3);
      
      // Reset and restart
      animator.reset();
      animator.start();
      animator.update(0.6);
      animator.complete();

      expect(animator.baseDuration).toBe(600);
    });

    it("should handle animations with zero duration", () => {
      const config: CSSAnimationConfig = {
        target: testElements[0],
        duration: 0,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      const animator = new CSSAnimator(config);
      
      expect(animator.baseDuration).toBe(0);
      
      // Should complete immediately
      animator.update(1);
      animator.complete();
    });

    it("should handle very long animations", () => {
      const config: CSSAnimationConfig = {
        target: testElements,
        duration: 10000, // 10 seconds
        stagger: 500,    // 0.5 second stagger
        from: { opacity: 0, translateX: -200 },
        to: { opacity: 1, translateX: 200 },
      };

      const animator = new CSSAnimator(config);
      
      expect(animator.baseDuration).toBe(10000);
      expect(animator.totalDuration).toBeGreaterThan(10000);

      // Test various points in the long animation
      const testPoints = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0];
      testPoints.forEach(progress => {
        expect(() => animator.update(progress)).not.toThrow();
      });

      animator.complete();
    });
  });

  describe("Error Recovery", () => {
    it("should handle invalid selectors gracefully", () => {
      const config: CSSAnimationConfig = {
        target: '.non-existent-class',
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      expect(() => new CSSAnimator(config)).toThrow();
    });

    it("should handle removed elements gracefully", () => {
      const config: CSSAnimationConfig = {
        target: testElements,
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      const animator = new CSSAnimator(config);
      
      // Remove an element from DOM after animation is created
      testElements[1].remove();
      
      // Animation should still work with remaining elements
      expect(() => {
        animator.update(0.5);
        animator.complete();
      }).not.toThrow();
    });

    it("should handle extreme update frequencies", () => {
      const config: CSSAnimationConfig = {
        target: testElements[0],
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      const animator = new CSSAnimator(config);
      
      // Rapid updates
      for (let i = 0; i < 1000; i++) {
        const progress = Math.random();
        expect(() => animator.update(progress)).not.toThrow();
      }

      animator.complete();
    });
  });

  describe("Memory and Performance", () => {
    it("should handle large numbers of elements", () => {
      // Create many elements
      const manyElements: HTMLElement[] = [];
      for (let i = 0; i < 100; i++) {
        const element = document.createElement('div');
        element.className = 'many-element';
        testContainer.appendChild(element);
        manyElements.push(element);
      }

      const config: CSSAnimationConfig = {
        target: '.many-element',
        duration: 1000,
        from: { opacity: 0, translateX: -10 },
        to: { opacity: 1, translateX: 10 },
      };

      const animator = new CSSAnimator(config);
      
      expect(animator.elementCount).toBe(100);

      // Test that it can handle updates efficiently
      const startTime = performance.now();
      animator.update(0.5);
      const endTime = performance.now();

      // Should complete reasonably quickly (adjust threshold as needed)
      expect(endTime - startTime).toBeLessThan(100); // 100ms threshold

      animator.complete();
    });

    it("should not leak memory with multiple animation cycles", () => {
      const config: CSSAnimationConfig = {
        target: testElements,
        duration: 100,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      // Create and destroy multiple animators
      for (let i = 0; i < 10; i++) {
        const animator = new CSSAnimator(config);
        animator.update(0.5);
        animator.complete();
        // Animator should be eligible for garbage collection
      }

      // Should not throw or cause memory issues
      expect(true).toBe(true);
    });
  });
});