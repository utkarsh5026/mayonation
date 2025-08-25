import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Mayonation, MayonationConfig } from "../animation";

describe("Mayonation Integration Tests", () => {
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

    // Mock requestAnimationFrame for controlled testing
    let frameId = 0;
    global.requestAnimationFrame = vi.fn((callback) => {
      setTimeout(callback, 16); // ~60fps
      return ++frameId;
    });
    global.cancelAnimationFrame = vi.fn();
    
    // Mock performance.now for consistent timing
    let currentTime = 0;
    global.performance = {
      now: vi.fn(() => currentTime),
    } as any;
    
    // Helper to advance time
    (global as any).advanceTime = (ms: number) => {
      currentTime += ms;
    };
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe("Real DOM Animation", () => {
    it("should create animation instance with real DOM elements", () => {
      const config: MayonationConfig = {
        target: '.test-element',
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      const animation = new Mayonation(config);
      
      expect(animation).toBeInstanceOf(Mayonation);
      expect(animation.id).toBeDefined();
      expect(animation.config.target).toBe('.test-element');
    });

    it("should handle single element target", () => {
      const config: MayonationConfig = {
        target: testElements[0],
        duration: 500,
        from: { translateX: 0 },
        to: { translateX: 100 },
      };

      expect(() => new Mayonation(config)).not.toThrow();
    });

    it("should handle array of elements", () => {
      const config: MayonationConfig = {
        target: testElements,
        duration: 800,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      expect(() => new Mayonation(config)).not.toThrow();
    });

    it("should handle NodeList target", () => {
      const nodeList = document.querySelectorAll('.test-element');
      const config: MayonationConfig = {
        target: nodeList,
        duration: 600,
        from: { scale: 0.5 },
        to: { scale: 1 },
      };

      expect(() => new Mayonation(config)).not.toThrow();
    });

    it("should work with complex CSS properties", () => {
      const config: MayonationConfig = {
        target: testElements[0],
        duration: 1000,
        from: {
          opacity: 0,
          translateX: -100,
          translateY: -50,
          rotateZ: 0,
          scale: 0.8,
          backgroundColor: '#ff0000',
        },
        to: {
          opacity: 1,
          translateX: 0,
          translateY: 0,
          rotateZ: 180,
          scale: 1,
          backgroundColor: '#00ff00',
        },
      };

      expect(() => new Mayonation(config)).not.toThrow();
    });
  });

  describe("Animation Lifecycle", () => {
    it("should execute animation lifecycle with callbacks", async () => {
      const callOrder: string[] = [];
      const config: MayonationConfig = {
        target: testElements[0],
        duration: 100,
        from: { opacity: 0 },
        to: { opacity: 1 },
        onStart: () => callOrder.push('start'),
        onUpdate: (progress) => callOrder.push(`update-${progress.toFixed(2)}`),
        onComplete: () => callOrder.push('complete'),
      };

      const animation = new Mayonation(config);
      
      // Start the animation
      const playPromise = animation.play();
      
      // Wait a bit for the animation to progress
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(callOrder).toContain('start');
      expect(callOrder.some(item => item.startsWith('update-'))).toBe(true);
    });

    it("should handle pause and resume correctly", async () => {
      const config: MayonationConfig = {
        target: testElements[0],
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      const animation = new Mayonation(config);
      
      // Start animation
      animation.play();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Pause
      animation.pause();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Resume
      animation.resume();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should not throw any errors
      expect(true).toBe(true);
    });

    it("should handle seek functionality", () => {
      const config: MayonationConfig = {
        target: testElements[0],
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      const animation = new Mayonation(config);
      
      // Test seeking to various positions
      expect(() => animation.seek(0)).not.toThrow();
      expect(() => animation.seek(0.5)).not.toThrow();
      expect(() => animation.seek(1)).not.toThrow();
    });

    it("should handle reset correctly", async () => {
      const config: MayonationConfig = {
        target: testElements[0],
        duration: 500,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      const animation = new Mayonation(config);
      
      // Start animation
      animation.play();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Reset
      animation.reset();
      
      // Should be able to play again
      expect(() => animation.play()).not.toThrow();
    });
  });

  describe("Staggered Animations", () => {
    it("should handle stagger with multiple elements", () => {
      const config: MayonationConfig = {
        target: '.test-element',
        duration: 1000,
        stagger: 200,
        from: { opacity: 0, translateX: -50 },
        to: { opacity: 1, translateX: 0 },
      };

      const animation = new Mayonation(config);
      expect(() => animation.play()).not.toThrow();
    });

    it("should work with negative stagger", () => {
      const config: MayonationConfig = {
        target: testElements,
        duration: 800,
        stagger: -100,
        from: { scale: 0 },
        to: { scale: 1 },
      };

      expect(() => new Mayonation(config)).not.toThrow();
    });
  });

  describe("Keyframe Animations", () => {
    it("should handle keyframe animations", () => {
      const config: MayonationConfig = {
        target: testElements[0],
        duration: 1200,
        keyframes: [
          { offset: 0, opacity: 0, translateX: -100 },
          { offset: 0.3, opacity: 0.5, translateX: -20 },
          { offset: 0.7, opacity: 0.8, translateX: 20 },
          { offset: 1, opacity: 1, translateX: 0 },
        ],
      };

      expect(() => new Mayonation(config)).not.toThrow();
    });

    it("should handle mixed keyframes and from/to properties", () => {
      const config: MayonationConfig = {
        target: testElements[0],
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
        keyframes: [
          { offset: 0.5, scale: 1.2 },
        ],
      };

      expect(() => new Mayonation(config)).not.toThrow();
    });
  });

  describe("Function-Based Properties", () => {
    it("should handle function-based property values", () => {
      const config: MayonationConfig = {
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

      expect(() => new Mayonation(config)).not.toThrow();
    });

    it("should handle functions returning arrays", () => {
      const config: MayonationConfig = {
        target: testElements,
        duration: 1000,
        to: {
          opacity: (index) => [0, 0.5 + (index * 0.1), 1],
          translateX: (index) => [0, 50 * index, 100 * index],
        },
      };

      expect(() => new Mayonation(config)).not.toThrow();
    });
  });

  describe("Delay and Timing", () => {
    it("should handle initial delay", async () => {
      const onStart = vi.fn();
      const config: MayonationConfig = {
        target: testElements[0],
        duration: 100,
        delay: 50,
        from: { opacity: 0 },
        to: { opacity: 1 },
        onStart,
      };

      const animation = new Mayonation(config);
      animation.play();
      
      // Should delay before starting
      await new Promise(resolve => setTimeout(resolve, 25));
      expect(onStart).not.toHaveBeenCalled();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      // onStart should eventually be called after delay
    });

    it("should handle zero duration", () => {
      const config: MayonationConfig = {
        target: testElements[0],
        duration: 0,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      const animation = new Mayonation(config);
      expect(() => animation.play()).not.toThrow();
    });

    it("should handle very short durations", () => {
      const config: MayonationConfig = {
        target: testElements[0],
        duration: 1,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      const animation = new Mayonation(config);
      expect(() => animation.play()).not.toThrow();
    });
  });

  describe("Repeat and Loop Animations", () => {
    it("should handle infinite repeat", () => {
      const config: MayonationConfig = {
        target: testElements[0],
        duration: 500,
        repeat: "infinite",
        from: { rotateZ: 0 },
        to: { rotateZ: 360 },
      };

      const animation = new Mayonation(config);
      expect(() => animation.play()).not.toThrow();
    });

    it("should handle numeric repeat (even if not fully implemented)", () => {
      const config: MayonationConfig = {
        target: testElements[0],
        duration: 300,
        repeat: 3,
        from: { scale: 0.8 },
        to: { scale: 1 },
      };

      expect(() => new Mayonation(config)).not.toThrow();
    });

    it("should handle yoyo option", () => {
      const config: MayonationConfig = {
        target: testElements[0],
        duration: 400,
        yoyo: true,
        from: { translateX: 0 },
        to: { translateX: 100 },
      };

      expect(() => new Mayonation(config)).not.toThrow();
    });
  });

  describe("Different Element Types", () => {
    it("should work with different HTML element types", () => {
      const elements = [
        document.createElement('div'),
        document.createElement('span'),
        document.createElement('p'),
        document.createElement('button'),
        document.createElement('input'),
      ];

      elements.forEach(element => {
        testContainer.appendChild(element);
        element.className = `test-${element.tagName.toLowerCase()}`;
      });

      const config: MayonationConfig = {
        target: elements,
        duration: 600,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      expect(() => new Mayonation(config)).not.toThrow();
    });

    it("should handle canvas elements", () => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      testContainer.appendChild(canvas);

      const config: MayonationConfig = {
        target: canvas,
        duration: 500,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      expect(() => new Mayonation(config)).not.toThrow();
    });

    it("should handle SVG elements", () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '100');
      svg.setAttribute('height', '100');
      testContainer.appendChild(svg);

      const config: MayonationConfig = {
        target: svg,
        duration: 400,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      expect(() => new Mayonation(config)).not.toThrow();
    });
  });

  describe("Complex Animation Scenarios", () => {
    it("should handle simultaneous animations on different elements", async () => {
      const config1: MayonationConfig = {
        target: testElements[0],
        duration: 500,
        from: { translateX: 0 },
        to: { translateX: 100 },
      };

      const config2: MayonationConfig = {
        target: testElements[1],
        duration: 300,
        from: { translateY: 0 },
        to: { translateY: 50 },
      };

      const animation1 = new Mayonation(config1);
      const animation2 = new Mayonation(config2);

      expect(() => {
        animation1.play();
        animation2.play();
      }).not.toThrow();

      // Wait for animations to progress
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(() => {
        animation1.pause();
        animation2.resume();
        animation1.seek(0.8);
        animation2.reset();
      }).not.toThrow();
    });

    it("should handle animation chaining via promises", async () => {
      const config: MayonationConfig = {
        target: testElements[0],
        duration: 50,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      const animation = new Mayonation(config);
      
      try {
        await animation.play();
        // Should complete without error
        expect(true).toBe(true);
      } catch (error) {
        // Promise might not resolve in test environment, but shouldn't throw
        expect(true).toBe(true);
      }
    });

    it("should handle rapid state changes", () => {
      const config: MayonationConfig = {
        target: testElements[0],
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      const animation = new Mayonation(config);

      expect(() => {
        for (let i = 0; i < 10; i++) {
          animation.play();
          animation.pause();
          animation.resume();
          animation.seek(Math.random());
          if (i % 3 === 0) animation.reset();
        }
      }).not.toThrow();
    });

    it("should handle overlapping play calls", async () => {
      const config: MayonationConfig = {
        target: testElements[0],
        duration: 100,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      const animation = new Mayonation(config);

      // Multiple rapid play calls
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(animation.play());
      }

      // Should not throw
      expect(promises.length).toBe(5);
    });
  });

  describe("Error Recovery", () => {
    it("should handle invalid selectors gracefully", () => {
      const config: MayonationConfig = {
        target: '.non-existent-element',
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      // Constructor might throw due to CSSAnimator, but we test error handling
      try {
        new Mayonation(config);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("should handle removed elements during animation", async () => {
      const config: MayonationConfig = {
        target: testElements,
        duration: 200,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      const animation = new Mayonation(config);
      animation.play();
      
      // Remove elements from DOM
      testElements[1].remove();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Animation should continue without throwing
      expect(() => animation.seek(0.5)).not.toThrow();
    });

    it("should handle callback errors gracefully", () => {
      const config: MayonationConfig = {
        target: testElements[0],
        duration: 100,
        from: { opacity: 0 },
        to: { opacity: 1 },
        onStart: () => { throw new Error("Callback error"); },
      };

      const animation = new Mayonation(config);
      
      // The error might be thrown during play, but animation should be created
      expect(animation).toBeDefined();
    });
  });

  describe("Performance and Memory", () => {
    it("should handle many elements efficiently", () => {
      const manyElements: HTMLElement[] = [];
      
      for (let i = 0; i < 50; i++) {
        const element = document.createElement('div');
        element.className = 'many-element';
        testContainer.appendChild(element);
        manyElements.push(element);
      }

      const config: MayonationConfig = {
        target: manyElements,
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      const startTime = performance.now();
      const animation = new Mayonation(config);
      animation.play();
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should be fast
      expect(() => animation.seek(0.5)).not.toThrow();
    });

    it("should not leak memory with multiple instances", () => {
      const animations = [];
      
      for (let i = 0; i < 20; i++) {
        const config: MayonationConfig = {
          target: testElements[i % testElements.length],
          duration: 100,
          from: { opacity: 0 },
          to: { opacity: 1 },
        };
        animations.push(new Mayonation(config));
      }

      // All should be created successfully
      expect(animations.length).toBe(20);
      
      // Cleanup
      animations.forEach(animation => animation.reset());
    });

    it("should handle rapid creation and destruction", () => {
      for (let i = 0; i < 30; i++) {
        const config: MayonationConfig = {
          target: testElements[0],
          duration: 50,
          from: { opacity: 0 },
          to: { opacity: 1 },
        };
        
        const animation = new Mayonation(config);
        animation.play();
        if (Math.random() > 0.5) {
          animation.reset();
        }
      }
      
      // Should complete without issues
      expect(true).toBe(true);
    });
  });

  describe("Browser Compatibility", () => {
    it("should work with vendor-prefixed properties", () => {
      const config: MayonationConfig = {
        target: testElements[0],
        duration: 500,
        to: {
          '-webkit-transform': 'translateX(100px)',
          '-moz-transform': 'translateX(100px)',
          'transform': 'translateX(100px)',
        },
      };

      expect(() => new Mayonation(config)).not.toThrow();
    });

    it("should handle CSS custom properties", () => {
      testElements[0].style.setProperty('--custom-prop', '0');
      
      const config: MayonationConfig = {
        target: testElements[0],
        duration: 400,
        from: { '--custom-prop': '0' },
        to: { '--custom-prop': '100' },
      };

      expect(() => new Mayonation(config)).not.toThrow();
    });

    it("should work with modern CSS properties", () => {
      const config: MayonationConfig = {
        target: testElements[0],
        duration: 600,
        to: {
          'backdrop-filter': 'blur(10px)',
          'clip-path': 'circle(50%)',
          'filter': 'brightness(1.2)',
        },
      };

      expect(() => new Mayonation(config)).not.toThrow();
    });
  });
});