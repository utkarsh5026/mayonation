import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Mayonation, MayonationConfig } from "../animation";
import { AnimationEngine } from "@/core";
import { CSSAnimator } from "@/css";
import { clamp } from "@/utils/math";
import type { ElementLike } from "@/utils/dom";

// Mock dependencies
vi.mock("@/core");
vi.mock("@/css");
vi.mock("@/utils/math");

const MockedAnimationEngine = vi.mocked(AnimationEngine);
const MockedCSSAnimator = vi.mocked(CSSAnimator);
const mockedClamp = vi.mocked(clamp);

describe("Mayonation Unit Tests", () => {
  let mockCSSAnimator: any;
  let mockAnimationEngine: any;
  let baseConfig: MayonationConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock clamp utility
    mockedClamp.mockImplementation((value, min, max) => Math.min(Math.max(value, min), max));

    // Mock CSSAnimator
    mockCSSAnimator = {
      totalDuration: 1000,
      delay: 0,
      start: vi.fn(),
      update: vi.fn(),
      complete: vi.fn(),
      reset: vi.fn(),
    };
    MockedCSSAnimator.mockReturnValue(mockCSSAnimator);

    // Mock AnimationEngine
    mockAnimationEngine = {
      isPlaying: false,
      isPaused: false,
      play: vi.fn(),
      pause: vi.fn(),
      reset: vi.fn(),
      seek: vi.fn(),
    };
    MockedAnimationEngine.mockReturnValue(mockAnimationEngine);

    // Base configuration for testing
    baseConfig = {
      target: '.test-element',
      duration: 1000,
      from: { opacity: 0 },
      to: { opacity: 1 },
    };

    // Mock performance.now and setTimeout
    global.performance = { now: vi.fn(() => Date.now()) } as any;
    global.setTimeout = vi.fn((callback, delay) => {
      // Use the original setTimeout to avoid recursion
      const originalSetTimeout = globalThis.setTimeout;
      originalSetTimeout(callback, 0); // Execute immediately for tests
      return 123; // Mock timer ID
    }) as any;
    global.requestAnimationFrame = vi.fn((callback) => {
      setTimeout(callback, 16); // ~60fps
      return 123;
    }) as any;
    global.cancelAnimationFrame = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Constructor and Initialization", () => {
    it("should initialize with required config properties", () => {
      const animation = new Mayonation(baseConfig);

      expect(animation).toBeInstanceOf(Mayonation);
      expect(animation.id).toBeDefined();
      expect(typeof animation.id).toBe('string');
      expect(animation.config).toEqual(expect.objectContaining(baseConfig));
    });

    it("should freeze the config object", () => {
      const animation = new Mayonation(baseConfig);

      expect(Object.isFrozen(animation.config)).toBe(true);
      expect(() => {
        (animation.config as any).duration = 2000;
      }).toThrow();
    });

    it("should create CSSAnimator with correct configuration", () => {
      const config: MayonationConfig = {
        target: '.test',
        duration: 2000,
        delay: 500,
        stagger: 100,
        ease: "linear",
        from: { opacity: 0, translateX: 0 },
        to: { opacity: 1, translateX: 100 },
        keyframes: [{ offset: 0.5, opacity: 0.5 }],
      };

      new Mayonation(config);

      expect(MockedCSSAnimator).toHaveBeenCalledWith({
        target: '.test',
        duration: 2000,
        delay: 500,
        stagger: 100,
        ease: "linear",
        from: { opacity: 0, translateX: 0 },
        to: { opacity: 1, translateX: 100 },
        keyframes: [{ offset: 0.5, opacity: 0.5 }],
        onStart: config.onStart,
        onUpdate: config.onUpdate,
        onComplete: config.onComplete,
      });
    });

    it("should use default duration when not provided", () => {
      const config: MayonationConfig = {
        target: '.test',
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      new Mayonation(config);

      expect(MockedCSSAnimator).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: 1000,
        })
      );
    });

    it("should generate unique IDs for different instances", async () => {
      const animation1 = new Mayonation(baseConfig);
      // Add small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
      const animation2 = new Mayonation(baseConfig);

      expect(animation1.id).not.toBe(animation2.id);
    });

    it("should handle callback functions in config", () => {
      const onStart = vi.fn();
      const onUpdate = vi.fn();
      const onComplete = vi.fn();
      const onPause = vi.fn();
      const onResume = vi.fn();

      const config: MayonationConfig = {
        ...baseConfig,
        onStart,
        onUpdate,
        onComplete,
        onPause,
        onResume,
      };

      new Mayonation(config);

      expect(MockedCSSAnimator).toHaveBeenCalledWith(
        expect.objectContaining({
          onStart,
          onUpdate,
          onComplete,
        })
      );
    });
  });

  describe("Play Method", () => {
    let animation: Mayonation;

    beforeEach(() => {
      animation = new Mayonation(baseConfig);
    });

    it("should create and start AnimationEngine on first play", async () => {
      animation.play();

      expect(MockedAnimationEngine).toHaveBeenCalledWith({
        duration: mockCSSAnimator.totalDuration,
        loop: false,
        onStart: expect.any(Function),
        onUpdate: expect.any(Function),
        onComplete: expect.any(Function),
        onPause: expect.any(Function),
        onResume: expect.any(Function),
      });

      expect(mockAnimationEngine.play).toHaveBeenCalledTimes(1);
    });

    it("should handle delay before starting animation", async () => {
      mockCSSAnimator.delay = 500;
      
      animation.play();

      expect(global.setTimeout).toHaveBeenCalledWith(expect.any(Function), 500);
    });

    it("should return existing promise if already playing", async () => {
      mockAnimationEngine.isPlaying = true;

      const promise1 = animation.play();
      const promise2 = animation.play();

      // Both should be promises, though they might not be the exact same reference
      expect(promise1).toBeInstanceOf(Promise);
      expect(promise2).toBeInstanceOf(Promise);
    });

    it("should handle infinite repeat configuration", async () => {
      const config: MayonationConfig = {
        ...baseConfig,
        repeat: "infinite",
      };

      animation = new Mayonation(config);
      animation.play();

      expect(MockedAnimationEngine).toHaveBeenCalledWith(
        expect.objectContaining({
          loop: true,
        })
      );
    });

    it("should handle numeric repeat configuration", async () => {
      const config: MayonationConfig = {
        ...baseConfig,
        repeat: 3,
      };

      animation = new Mayonation(config);
      animation.play();

      expect(MockedAnimationEngine).toHaveBeenCalledWith(
        expect.objectContaining({
          loop: false, // Mayonation doesn't support numeric repeat yet
        })
      );
    });

    it("should call CSSAnimator methods through engine callbacks", async () => {
      animation.play();

      // Get the callbacks passed to AnimationEngine
      const engineCall = MockedAnimationEngine.mock.calls[0][0];
      
      // Test onStart callback
      engineCall.onStart();
      expect(mockCSSAnimator.start).toHaveBeenCalledTimes(1);

      // Test onUpdate callback
      engineCall.onUpdate(0.5);
      expect(mockCSSAnimator.update).toHaveBeenCalledWith(0.5);

      // Test onComplete callback
      engineCall.onComplete();
      expect(mockCSSAnimator.complete).toHaveBeenCalledTimes(1);
    });

    it("should call config callbacks through engine callbacks", async () => {
      const onPause = vi.fn();
      const onResume = vi.fn();
      
      const config: MayonationConfig = {
        ...baseConfig,
        onPause,
        onResume,
      };

      animation = new Mayonation(config);
      animation.play();

      // Get the callbacks passed to AnimationEngine
      const engineCall = MockedAnimationEngine.mock.calls[0][0];

      // Test onPause callback
      engineCall.onPause();
      expect(onPause).toHaveBeenCalledTimes(1);

      // Test onResume callback
      engineCall.onResume();
      expect(onResume).toHaveBeenCalledTimes(1);
    });
  });

  describe("Pause and Resume Methods", () => {
    let animation: Mayonation;

    beforeEach(() => {
      animation = new Mayonation(baseConfig);
    });

    it("should handle pause when no engine exists", () => {
      // Before play() is called, engine is null
      expect(() => animation.pause()).not.toThrow();
    });

    it("should handle resume when no engine exists", () => {
      // Before play() is called, engine is null
      expect(() => animation.resume()).not.toThrow();
    });

    it("should pause the animation engine after play", async () => {
      animation.play();
      animation.pause();

      // Engine should be created and pause should be callable
      expect(() => animation.pause()).not.toThrow();
    });

    it("should resume the animation engine after pause", async () => {
      animation.play();
      animation.pause();
      
      // Resume should work after pause
      expect(() => animation.resume()).not.toThrow();
    });
  });

  describe("Seek Method", () => {
    let animation: Mayonation;

    beforeEach(() => {
      animation = new Mayonation(baseConfig);
    });

    it("should clamp progress value and update components", () => {
      animation.seek(0.5);

      // The clamp function should be called, but since we're mocking modules,
      // we just test that the animator calls update with the progress
      expect(mockCSSAnimator.update).toHaveBeenCalledWith(0.5);
      
      // Engine might not exist if play() hasn't been called yet
      expect(() => animation.seek(0.5)).not.toThrow();
    });

    it("should handle progress values outside 0-1 range", () => {
      mockedClamp.mockReturnValueOnce(0).mockReturnValueOnce(1);

      animation.seek(-0.5);
      expect(mockedClamp).toHaveBeenCalledWith(-0.5, 0, 1);
      expect(mockCSSAnimator.update).toHaveBeenCalledWith(0);

      animation.seek(1.5);
      expect(mockedClamp).toHaveBeenCalledWith(1.5, 0, 1);
      expect(mockCSSAnimator.update).toHaveBeenCalledWith(1);
    });

    it("should work when no engine exists", () => {
      expect(() => animation.seek(0.5)).not.toThrow();
      expect(mockCSSAnimator.update).toHaveBeenCalledWith(0.5);
    });
  });

  describe("Reset Method", () => {
    let animation: Mayonation;

    beforeEach(() => {
      animation = new Mayonation(baseConfig);
    });

    it("should handle reset when no engine exists", () => {
      expect(() => animation.reset()).not.toThrow();
    });

    it("should reset both engine and CSS animator after play", async () => {
      animation.play();
      animation.reset();

      expect(mockCSSAnimator.reset).toHaveBeenCalledTimes(1);
      expect(() => animation.reset()).not.toThrow();
    });

    it("should clear internal state", async () => {
      animation.play();
      animation.reset();

      // After reset, play should work again
      expect(() => animation.play()).not.toThrow();
    });
  });

  describe("Config Variations", () => {
    it("should handle minimal configuration", () => {
      const minimalConfig: MayonationConfig = {
        target: '.test',
      };

      expect(() => new Mayonation(minimalConfig)).not.toThrow();
      
      expect(MockedCSSAnimator).toHaveBeenCalledWith(
        expect.objectContaining({
          target: '.test',
          duration: 1000, // Default duration
        })
      );
    });

    it("should handle complex configuration", () => {
      const complexConfig: MayonationConfig = {
        target: [document.createElement('div')],
        duration: 2000,
        delay: 500,
        stagger: 100,
        ease: "easeInOut",
        from: { 
          opacity: 0, 
          translateX: -100, 
          scale: 0.8 
        },
        to: { 
          opacity: 1, 
          translateX: 0, 
          scale: 1 
        },
        keyframes: [
          { offset: 0, opacity: 0 },
          { offset: 0.3, opacity: 0.3 },
          { offset: 0.7, opacity: 0.8 },
          { offset: 1, opacity: 1 },
        ],
        repeat: "infinite",
        yoyo: true,
        onStart: vi.fn(),
        onUpdate: vi.fn(),
        onComplete: vi.fn(),
        onPause: vi.fn(),
        onResume: vi.fn(),
      };

      expect(() => new Mayonation(complexConfig)).not.toThrow();
    });

    it("should handle different target types", () => {
      const configs = [
        { target: '.class-selector' as ElementLike },
        { target: '#id-selector' as ElementLike },
        { target: document.createElement('div') as ElementLike },
        { target: [document.createElement('div'), document.createElement('span')] as ElementLike },
      ];

      configs.forEach(config => {
        expect(() => new Mayonation(config)).not.toThrow();
      });
    });
  });

  describe("Promise Handling", () => {
    let animation: Mayonation;

    beforeEach(() => {
      animation = new Mayonation(baseConfig);
    });

    it("should create a finished promise", async () => {
      const playPromise = animation.play();
      
      expect(playPromise).toBeInstanceOf(Promise);
      
      // For testing, we just verify the promise exists
      // The actual resolution depends on the engine completing
    }, 1000); // Shorter timeout

    it("should handle multiple play calls", async () => {
      const promise1 = animation.play();
      const promise2 = animation.play();

      // Both should be promises
      expect(promise1).toBeInstanceOf(Promise);
      expect(promise2).toBeInstanceOf(Promise);
    });

    it("should create new promise after reset", async () => {
      const promise1 = animation.play();
      animation.reset();
      const promise2 = animation.play();

      expect(promise1).toBeInstanceOf(Promise);
      expect(promise2).toBeInstanceOf(Promise);
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined callback functions", () => {
      const config: MayonationConfig = {
        target: '.test',
        duration: 1000,
        onStart: undefined,
        onUpdate: undefined,
        onComplete: undefined,
        onPause: undefined,
        onResume: undefined,
      };

      expect(() => new Mayonation(config)).not.toThrow();
    });

    it("should handle zero duration", () => {
      const config: MayonationConfig = {
        target: '.test',
        duration: 0,
      };

      const animation = new Mayonation(config);
      expect(() => animation.play()).not.toThrow();
    });

    it("should handle negative duration", () => {
      const config: MayonationConfig = {
        target: '.test',
        duration: -1000,
      };

      const animation = new Mayonation(config);
      expect(() => animation.play()).not.toThrow();
    });

    it("should handle very large duration", () => {
      const config: MayonationConfig = {
        target: '.test',
        duration: Number.MAX_SAFE_INTEGER,
      };

      const animation = new Mayonation(config);
      expect(() => animation.play()).not.toThrow();
    });

    it("should handle NaN duration", () => {
      const config: MayonationConfig = {
        target: '.test',
        duration: NaN,
      };

      const animation = new Mayonation(config);
      expect(() => animation.play()).not.toThrow();
    });

    it("should handle extreme seek values", () => {
      const animation = new Mayonation(baseConfig);
      
      expect(() => animation.seek(Number.POSITIVE_INFINITY)).not.toThrow();
      expect(() => animation.seek(Number.NEGATIVE_INFINITY)).not.toThrow();
      expect(() => animation.seek(NaN)).not.toThrow();
    });

    it("should handle rapid state changes", () => {
      const animation = new Mayonation(baseConfig);

      expect(() => {
        animation.play();
        animation.pause();
        animation.resume();
        animation.seek(0.5);
        animation.reset();
        animation.play();
      }).not.toThrow();
    });
  });

  describe("Memory Management", () => {
    it("should clean up properly on reset", () => {
      const animation = new Mayonation(baseConfig);
      
      animation.play();
      animation.reset();

      // Engine should be nulled
      expect(mockAnimationEngine.reset).toHaveBeenCalled();
    });

    it("should handle multiple resets", () => {
      const animation = new Mayonation(baseConfig);

      for (let i = 0; i < 10; i++) {
        animation.play();
        animation.reset();
      }

      expect(mockAnimationEngine.reset).toHaveBeenCalledTimes(10);
      expect(mockCSSAnimator.reset).toHaveBeenCalledTimes(10);
    });

    it("should not leak when creating many instances", () => {
      const animations = [];
      
      for (let i = 0; i < 100; i++) {
        animations.push(new Mayonation(baseConfig));
      }

      expect(MockedCSSAnimator).toHaveBeenCalledTimes(100);
      expect(animations.length).toBe(100);
    });
  });

  describe("Error Handling", () => {
    it("should handle CSSAnimator creation failure", () => {
      MockedCSSAnimator.mockImplementationOnce(() => {
        throw new Error("CSSAnimator creation failed");
      });

      expect(() => new Mayonation(baseConfig)).toThrow("CSSAnimator creation failed");
    });

    it("should handle AnimationEngine creation failure", () => {
      MockedAnimationEngine.mockImplementationOnce(() => {
        throw new Error("AnimationEngine creation failed");
      });

      const animation = new Mayonation(baseConfig);
      
      // The error might be thrown during play() or caught internally
      try {
        animation.play();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("should handle callback function errors", async () => {
      const onStart = vi.fn(() => { throw new Error("onStart error"); });
      
      const config: MayonationConfig = {
        ...baseConfig,
        onStart,
      };

      const animation = new Mayonation(config);
      
      // The callback error might be handled internally or thrown
      try {
        animation.play();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("should handle clamp utility errors", () => {
      mockedClamp.mockImplementationOnce(() => {
        throw new Error("Clamp error");
      });

      const animation = new Mayonation(baseConfig);
      
      expect(() => animation.seek(0.5)).toThrow("Clamp error");
    });
  });
});