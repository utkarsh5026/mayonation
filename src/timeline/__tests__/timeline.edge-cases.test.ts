import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Timeline } from "../timeline";
import { CSSAnimator } from "@/css";
import { AnimationEngine } from "@/core";
import type { ElementLike } from "@/utils/dom";
import type { TimelinePosition } from "../types";

vi.mock("@/css");
vi.mock("@/core");

const MockedCSSAnimator = vi.mocked(CSSAnimator);
const MockedAnimationEngine = vi.mocked(AnimationEngine);

describe("Timeline Edge Cases Tests", () => {
  let mockElement: HTMLElement;
  let mockCSSAnimator: any;
  let mockAnimationEngine: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock DOM element
    mockElement = document.createElement("div");
    mockElement.id = "test-element";

    // Mock CSSAnimator
    mockCSSAnimator = {
      totalDuration: 1000,
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

    // Mock global functions
    global.performance = { now: vi.fn(() => Date.now()) } as any;
    global.requestAnimationFrame = vi.fn((callback) => {
      setTimeout(callback, 16);
      return 123;
    }) as any;
    global.cancelAnimationFrame = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Invalid Timeline Positions", () => {
    it("should handle invalid position strings", () => {
      const timeline = new Timeline();
      
      // These should fall back to default behavior (lastAddedTime)
      const invalidPositions: TimelinePosition[] = [
        "invalid" as TimelinePosition,
        "+=abc" as TimelinePosition,
        "-=xyz" as TimelinePosition,
        "" as TimelinePosition,
      ];

      invalidPositions.forEach((position) => {
        expect(() => {
          timeline.add(mockElement, { duration: 1000 }, position);
        }).not.toThrow();
      });

      expect(MockedCSSAnimator).toHaveBeenCalledTimes(invalidPositions.length);
    });

    it("should handle extreme numeric positions", () => {
      const timeline = new Timeline();
      
      const extremePositions = [
        Number.MAX_SAFE_INTEGER,
        Number.MIN_SAFE_INTEGER,
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        NaN,
      ];

      extremePositions.forEach((position) => {
        expect(() => {
          timeline.add(mockElement, { duration: 1000 }, position);
        }).not.toThrow();
      });

      expect(MockedCSSAnimator).toHaveBeenCalledTimes(extremePositions.length);
    });

    it("should handle malformed relative positions", () => {
      const timeline = new Timeline();
      
      const malformedPositions = [
        "+=" as TimelinePosition,
        "-=" as TimelinePosition,
        "+=+" as TimelinePosition,
        "-=+" as TimelinePosition,
        "+=--100" as TimelinePosition,
        "-=++200" as TimelinePosition,
      ];

      malformedPositions.forEach((position) => {
        expect(() => {
          timeline.add(mockElement, { duration: 1000 }, position);
        }).not.toThrow();
      });

      expect(MockedCSSAnimator).toHaveBeenCalledTimes(malformedPositions.length);
    });
  });

  describe("Animation Configuration Edge Cases", () => {
    it("should handle zero duration", () => {
      const timeline = new Timeline();
      
      expect(() => {
        timeline.add(mockElement, { duration: 0 });
      }).not.toThrow();

      expect(MockedCSSAnimator).toHaveBeenCalledWith({
        target: mockElement,
        duration: 0,
      });
    });

    it("should handle negative duration", () => {
      const timeline = new Timeline();
      
      expect(() => {
        timeline.add(mockElement, { duration: -1000 });
      }).not.toThrow();

      expect(MockedCSSAnimator).toHaveBeenCalledWith({
        target: mockElement,
        duration: -1000,
      });
    });

    it("should handle NaN and Infinity durations", () => {
      const timeline = new Timeline();
      
      const invalidDurations = [NaN, Infinity, -Infinity];

      invalidDurations.forEach((duration) => {
        expect(() => {
          timeline.add(mockElement, { duration });
        }).not.toThrow();
      });

      expect(MockedCSSAnimator).toHaveBeenCalledTimes(invalidDurations.length);
    });

    it("should handle undefined duration (use default)", () => {
      const timeline = new Timeline();
      
      timeline.add(mockElement, {
        from: { opacity: 0 },
        to: { opacity: 1 },
      });

      expect(MockedCSSAnimator).toHaveBeenCalledWith({
        target: mockElement,
        duration: 1000, // Default duration
        from: { opacity: 0 },
        to: { opacity: 1 },
      });
    });

    it("should handle empty configuration object", () => {
      const timeline = new Timeline();
      
      expect(() => {
        timeline.add(mockElement, {});
      }).not.toThrow();

      expect(MockedCSSAnimator).toHaveBeenCalledWith({
        target: mockElement,
        duration: 1000, // Default duration
      });
    });

    it("should handle invalid ease functions", () => {
      const timeline = new Timeline();
      
      expect(() => {
        timeline.add(mockElement, {
          duration: 1000,
          ease: "invalidEase" as any,
        });
      }).not.toThrow();

      expect(MockedCSSAnimator).toHaveBeenCalledWith({
        target: mockElement,
        duration: 1000,
        ease: "invalidEase",
      });
    });
  });

  describe("CSSAnimator Mock Edge Cases", () => {
    it("should handle CSSAnimator with zero totalDuration", () => {
      mockCSSAnimator.totalDuration = 0;
      const timeline = new Timeline();
      
      timeline.add(mockElement, { duration: 1000 });
      
      expect(() => timeline.play()).not.toThrow();
    });

    it("should handle CSSAnimator with negative totalDuration", () => {
      mockCSSAnimator.totalDuration = -500;
      const timeline = new Timeline();
      
      timeline.add(mockElement, { duration: 1000 });
      
      expect(() => timeline.play()).not.toThrow();
    });

    it("should handle CSSAnimator with NaN totalDuration", () => {
      mockCSSAnimator.totalDuration = NaN;
      const timeline = new Timeline();
      
      timeline.add(mockElement, { duration: 1000 });
      
      expect(() => timeline.play()).not.toThrow();
    });

    it("should handle CSSAnimator throwing errors on method calls", () => {
      mockCSSAnimator.start.mockImplementationOnce(() => {
        throw new Error("Start failed");
      });
      mockCSSAnimator.update.mockImplementationOnce(() => {
        throw new Error("Update failed");
      });
      mockCSSAnimator.complete.mockImplementationOnce(() => {
        throw new Error("Complete failed");
      });

      const timeline = new Timeline();
      timeline.add(mockElement, { duration: 1000 });

      expect(() => timeline.play()).not.toThrow();

      // Test that the timeline continues to work despite animator errors
      const engineCall = MockedAnimationEngine.mock.calls[0][0] as any;
      
      // These should not crash the timeline, errors are caught internally
      engineCall.onStart(); // Will throw but be caught
      engineCall.onUpdate(0.5); // Will throw but be caught  
      engineCall.onComplete(); // Will throw but be caught
      
      expect(mockCSSAnimator.start).toHaveBeenCalled();
      expect(mockCSSAnimator.update).toHaveBeenCalled(); 
      expect(mockCSSAnimator.complete).toHaveBeenCalled();
    });
  });

  describe("Seek Edge Cases", () => {
    it("should handle seeking with invalid positions", () => {
      const timeline = new Timeline();
      timeline.add(mockElement, { duration: 1000 });

      // Test numeric positions that should work
      const numericPositions = [NaN, Infinity, -Infinity];
      numericPositions.forEach((position) => {
        expect(() => timeline.seek(position)).not.toThrow();
      });

      // Test string positions that may be invalid
      const stringPositions = ["invalid", "", "+=", "-="];
      stringPositions.forEach((position) => {
        expect(() => timeline.seek(position as any)).not.toThrow();
      });

      // Test completely invalid types - these will cause type errors
      // but the timeline should handle them gracefully by falling back
      const invalidPositions = [{}, [], null, undefined];
      invalidPositions.forEach((position) => {
        expect(() => timeline.seek(position as any)).not.toThrow();
      });
    });

    it("should handle seeking when no animations added", () => {
      const timeline = new Timeline();
      
      expect(() => timeline.seek(500)).not.toThrow();
      expect(() => timeline.seek(">")).not.toThrow();
      expect(() => timeline.seek("<")).not.toThrow();
    });

    it("should handle seeking with TimelinePosition strings", () => {
      const timeline = new Timeline();
      timeline.add(mockElement, { duration: 1000 });

      const positions: TimelinePosition[] = [
        "<",
        ">",
        "+=100",
        "-=50",
      ];

      positions.forEach((position) => {
        expect(() => timeline.seek(position)).not.toThrow();
      });
    });
  });

  describe("Event Handling Edge Cases", () => {
    it("should handle adding same callback multiple times", () => {
      const timeline = new Timeline();
      const callback = vi.fn();

      timeline
        .on("start", callback)
        .on("start", callback)
        .on("start", callback);

      timeline.add(mockElement, { duration: 1000 });
      timeline.play();

      const engineCall = MockedAnimationEngine.mock.calls[0][0] as any;
      engineCall.onStart();

      // Callback should be called multiple times if added multiple times
      expect(callback).toHaveBeenCalledTimes(3);
    });

    it("should handle removing non-existent callback", () => {
      const timeline = new Timeline();
      const callback = vi.fn();
      const nonExistentCallback = vi.fn();

      timeline.on("start", callback);
      
      expect(() => {
        timeline.off("start", nonExistentCallback);
      }).not.toThrow();

      timeline.add(mockElement, { duration: 1000 });
      timeline.play();

      const engineCall = MockedAnimationEngine.mock.calls[0][0] as any;
      engineCall.onStart();

      expect(callback).toHaveBeenCalledTimes(1);
      expect(nonExistentCallback).not.toHaveBeenCalled();
    });

    it("should handle removing callback from non-existent event", () => {
      const timeline = new Timeline();
      const callback = vi.fn();

      expect(() => {
        timeline.off("nonexistent" as any, callback);
      }).not.toThrow();
    });

    it("should handle callback throwing errors", () => {
      const timeline = new Timeline();
      const throwingCallback = vi.fn(() => {
        throw new Error("Callback error");
      });
      const normalCallback = vi.fn();

      timeline
        .on("start", throwingCallback)
        .on("start", normalCallback);

      timeline.add(mockElement, { duration: 1000 });
      timeline.play();

      const engineCall = MockedAnimationEngine.mock.calls[0][0] as any;
      
      // Timeline should handle callback errors gracefully by catching them
      // The error will be logged but won't crash the timeline
      expect(() => engineCall.onStart()).not.toThrow();
      
      // Normal callback should still be called even if previous one throws
      expect(normalCallback).toHaveBeenCalledTimes(1);
    });

    it("should handle invalid event names", () => {
      const timeline = new Timeline();
      const callback = vi.fn();

      expect(() => {
        timeline.on("invalid" as any, callback);
      }).not.toThrow();

      expect(() => {
        timeline.off("invalid" as any, callback);
      }).not.toThrow();
    });
  });

  describe("State Management Edge Cases", () => {
    it("should handle rapid state changes", () => {
      const timeline = new Timeline();
      timeline.add(mockElement, { duration: 1000 });

      expect(() => {
        timeline.play();
        timeline.pause();
        timeline.resume();
        timeline.seek(500);
        timeline.reset();
        timeline.play();
        timeline.pause();
        timeline.seek(0);
        timeline.resume();
        timeline.reset();
      }).not.toThrow();
    });

    it("should handle operations when no engine exists", () => {
      const timeline = new Timeline();

      expect(() => timeline.pause()).not.toThrow();
      expect(() => timeline.resume()).not.toThrow();
      expect(() => timeline.seek(500)).not.toThrow();
      expect(() => timeline.reset()).not.toThrow();
    });

    it("should handle operations when engine creation fails", () => {
      MockedAnimationEngine.mockImplementationOnce(() => {
        throw new Error("Engine creation failed");
      });

      const timeline = new Timeline();
      timeline.add(mockElement, { duration: 1000 });

      expect(() => timeline.play()).toThrow("Engine creation failed");
    });
  });

  describe("Memory Management Edge Cases", () => {
    it("should handle adding many animations", () => {
      const timeline = new Timeline();
      
      for (let i = 0; i < 1000; i++) {
        timeline.add(mockElement, { 
          duration: 100,
          from: { opacity: 0 },
          to: { opacity: 1 },
        });
      }

      expect(MockedCSSAnimator).toHaveBeenCalledTimes(1000);
      expect(() => timeline.play()).not.toThrow();
    });

    it("should handle multiple timeline instances", () => {
      const timelines = [];
      
      for (let i = 0; i < 100; i++) {
        const timeline = new Timeline();
        timeline.add(mockElement, { duration: 1000 });
        timelines.push(timeline);
      }

      expect(timelines).toHaveLength(100);
      expect(MockedCSSAnimator).toHaveBeenCalledTimes(100);

      timelines.forEach(timeline => {
        expect(() => timeline.play()).not.toThrow();
      });
    });

    it("should handle timeline cleanup after reset", () => {
      const timeline = new Timeline();
      timeline.add(mockElement, { duration: 1000 });

      for (let i = 0; i < 10; i++) {
        timeline.play();
        timeline.reset();
      }

      expect(mockCSSAnimator.reset).toHaveBeenCalledTimes(10);
    });
  });

  describe("Animation Engine Edge Cases", () => {
    it("should handle engine throwing errors", () => {
      mockAnimationEngine.play.mockImplementationOnce(() => {
        throw new Error("Engine play failed");
      });

      const timeline = new Timeline();
      timeline.add(mockElement, { duration: 1000 });

      // The timeline doesn't currently handle engine play errors
      expect(() => timeline.play()).toThrow("Engine play failed");
    });

    it("should handle engine method failures", () => {
      mockAnimationEngine.pause.mockImplementationOnce(() => {
        throw new Error("Pause failed");
      });
      mockAnimationEngine.seek.mockImplementationOnce(() => {
        throw new Error("Seek failed");
      });
      mockAnimationEngine.reset.mockImplementationOnce(() => {
        throw new Error("Reset failed");
      });

      const timeline = new Timeline();
      timeline.add(mockElement, { duration: 1000 });
      timeline.play();

      // Timeline doesn't handle engine method errors currently
      expect(() => timeline.pause()).toThrow("Pause failed");
      expect(() => timeline.seek(500)).toThrow("Seek failed");
      expect(() => timeline.reset()).toThrow("Reset failed");
    });

    it("should handle undefined engine properties", () => {
      mockAnimationEngine.isPlaying = undefined as any;
      mockAnimationEngine.isPaused = undefined as any;

      const timeline = new Timeline();
      timeline.add(mockElement, { duration: 1000 });
      timeline.play();

      expect(timeline.isPlaying).toBe(false); // Should default to false
      expect(timeline.isPaused).toBe(false); // Should default to false
    });
  });

  describe("Complex Animation Scenarios", () => {
    it("should handle overlapping animations with different durations", () => {
      const timeline = new Timeline();
      
      // Create overlapping animations with various durations
      timeline
        .add(mockElement, { duration: 1000 }, 0)
        .add(mockElement, { duration: 500 }, 250)
        .add(mockElement, { duration: 2000 }, 750)
        .add(mockElement, { duration: 100 }, 500);

      expect(() => timeline.play()).not.toThrow();
      expect(MockedCSSAnimator).toHaveBeenCalledTimes(4);
    });

    it("should handle animations with same start times", () => {
      const timeline = new Timeline();
      
      for (let i = 0; i < 5; i++) {
        timeline.add(mockElement, { duration: 1000 }, 0); // All start at time 0
      }

      expect(() => timeline.play()).not.toThrow();
      expect(MockedCSSAnimator).toHaveBeenCalledTimes(5);
    });

    it("should handle mixed positioning strategies", () => {
      const timeline = new Timeline();
      
      timeline
        .add(mockElement, { duration: 1000 }, 0) // Absolute
        .add(mockElement, { duration: 500 }, "+=100") // Relative
        .add(mockElement, { duration: 800 }, "<") // Start
        .add(mockElement, { duration: 600 }, ">") // End
        .add(mockElement, { duration: 400 }, "-=200"); // Relative back

      expect(() => timeline.play()).not.toThrow();
      expect(MockedCSSAnimator).toHaveBeenCalledTimes(5);
    });
  });
});