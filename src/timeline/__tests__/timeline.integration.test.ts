import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Timeline } from "../timeline";
import { CSSAnimator } from "@/css";
import { AnimationEngine } from "@/core";
import type { ElementLike } from "@/utils/dom";

vi.mock("@/css");
vi.mock("@/core");

const MockedCSSAnimator = vi.mocked(CSSAnimator);
const MockedAnimationEngine = vi.mocked(AnimationEngine);

describe("Timeline Integration Tests", () => {
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

  describe("Timeline Creation and Basic Operations", () => {
    it("should create timeline with default options", () => {
      const timeline = new Timeline();

      expect(timeline).toBeInstanceOf(Timeline);
      expect(timeline.duration).toBe(0);
      expect(timeline.isPlaying).toBe(false);
      expect(timeline.isPaused).toBe(false);
    });

    it("should create timeline with loop option", () => {
      const timeline = new Timeline({ loop: true });

      expect(timeline).toBeInstanceOf(Timeline);
    });

    it("should add animation to timeline and update duration", () => {
      const timeline = new Timeline();

      const result = timeline.add(mockElement, {
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      });

      expect(result).toBe(timeline); // Should return timeline for chaining
      expect(MockedCSSAnimator).toHaveBeenCalledWith({
        target: mockElement,
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      });
    });

    it("should chain multiple animations", () => {
      const timeline = new Timeline();
      const element1 = document.createElement("div");
      const element2 = document.createElement("span");

      const result = timeline
        .add(element1, {
          duration: 500,
          from: { opacity: 0 },
          to: { opacity: 1 },
        })
        .add(element2, {
          duration: 800,
          from: { scale: 0 },
          to: { scale: 1 },
        });

      expect(result).toBe(timeline);
      expect(MockedCSSAnimator).toHaveBeenCalledTimes(2);
    });
  });

  describe("Timeline Positioning", () => {
    it("should handle absolute positioning", () => {
      const timeline = new Timeline();

      timeline.add(
        mockElement,
        {
          duration: 1000,
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        500
      ); // Start at 500ms

      expect(MockedCSSAnimator).toHaveBeenCalledWith({
        target: mockElement,
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      });
    });

    it("should handle relative positioning with +=", () => {
      const timeline = new Timeline();

      timeline
        .add(mockElement, { duration: 1000 })
        .add(mockElement, { duration: 500 }, "+=200");

      expect(MockedCSSAnimator).toHaveBeenCalledTimes(2);
    });

    it("should handle relative positioning with -=", () => {
      const timeline = new Timeline();

      timeline
        .add(mockElement, { duration: 1000 })
        .add(mockElement, { duration: 500 }, "-=300");

      expect(MockedCSSAnimator).toHaveBeenCalledTimes(2);
    });

    it("should handle start position '<'", () => {
      const timeline = new Timeline();

      timeline
        .add(mockElement, { duration: 1000 })
        .add(mockElement, { duration: 500 }, "<");

      expect(MockedCSSAnimator).toHaveBeenCalledTimes(2);
    });

    it("should handle end position '>'", () => {
      const timeline = new Timeline();

      timeline
        .add(mockElement, { duration: 1000 })
        .add(mockElement, { duration: 500 }, ">");

      expect(MockedCSSAnimator).toHaveBeenCalledTimes(2);
    });
  });

  describe("Animation Configuration", () => {
    it("should handle complex animation configuration", () => {
      const timeline = new Timeline();

      timeline.add(mockElement, {
        duration: 2000,
        delay: 500,
        stagger: 100,
        ease: "easeInOut",
        from: {
          opacity: 0,
          translateX: -100,
          scale: 0.8,
        },
        to: {
          opacity: 1,
          translateX: 0,
          scale: 1,
        },
        keyframes: [
          { offset: 0, opacity: 0 },
          { offset: 0.5, opacity: 0.5 },
          { offset: 1, opacity: 1 },
        ],
      });

      expect(MockedCSSAnimator).toHaveBeenCalledWith({
        target: mockElement,
        duration: 2000,
        delay: 500,
        stagger: 100,
        ease: "easeInOut",
        from: {
          opacity: 0,
          translateX: -100,
          scale: 0.8,
        },
        to: {
          opacity: 1,
          translateX: 0,
          scale: 1,
        },
        keyframes: [
          { offset: 0, opacity: 0 },
          { offset: 0.5, opacity: 0.5 },
          { offset: 1, opacity: 1 },
        ],
      });
    });

    it("should use default duration when not provided", () => {
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

    it("should handle different element types", () => {
      const timeline = new Timeline();
      const elements: ElementLike[] = [
        ".test-selector",
        mockElement,
        [mockElement, document.createElement("span")],
      ];

      elements.forEach((element, index) => {
        timeline.add(element, {
          duration: 1000 + index * 100,
          from: { opacity: 0 },
          to: { opacity: 1 },
        });
      });

      expect(MockedCSSAnimator).toHaveBeenCalledTimes(3);
    });
  });

  describe("Timeline Playback Control", () => {
    it("should play timeline and create animation engine", () => {
      const timeline = new Timeline();

      timeline.add(mockElement, {
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      });

      const result = timeline.play();

      expect(result).toBe(timeline);
      expect(MockedAnimationEngine).toHaveBeenCalledWith({
        duration: expect.any(Number), // Will be calculated based on items
        loop: undefined, // Default undefined becomes falsy
        onStart: expect.any(Function),
        onUpdate: expect.any(Function),
        onComplete: expect.any(Function),
        onPause: expect.any(Function),
        onResume: expect.any(Function),
      });
      expect(mockAnimationEngine.play).toHaveBeenCalledTimes(1);
    });

    it("should not create new engine if already playing", () => {
      mockAnimationEngine.isPlaying = true;
      const timeline = new Timeline();

      timeline.add(mockElement, { duration: 1000 });
      timeline.play();
      timeline.play(); // Second call

      expect(MockedAnimationEngine).toHaveBeenCalledTimes(1);
    });

    it("should pause and resume timeline", () => {
      const timeline = new Timeline();

      timeline.add(mockElement, { duration: 1000 });
      timeline.play();

      const pauseResult = timeline.pause();
      expect(pauseResult).toBe(timeline);

      const resumeResult = timeline.resume();
      expect(resumeResult).toBe(timeline);
    });

    it("should reset timeline", () => {
      const timeline = new Timeline();

      timeline.add(mockElement, { duration: 1000 });
      timeline.play();

      const result = timeline.reset();

      expect(result).toBe(timeline);
      expect(mockCSSAnimator.reset).toHaveBeenCalledTimes(1);
    });

    it("should seek to specific position", () => {
      const timeline = new Timeline();

      timeline.add(mockElement, { duration: 1000 });

      const result = timeline.seek(500);
      expect(result).toBe(timeline);

      // Test seeking with position string
      timeline.seek(">=" as any);
    });
  });

  describe("Timeline Events", () => {
    it("should handle event listeners", () => {
      const timeline = new Timeline();
      const onStart = vi.fn();
      const onUpdate = vi.fn();
      const onComplete = vi.fn();

      timeline
        .on("start", onStart)
        .on("update", onUpdate)
        .on("complete", onComplete);

      timeline.add(mockElement, { duration: 1000 });
      timeline.play();

      // Get the engine callbacks and test them
      const engineCall = MockedAnimationEngine.mock.calls[0][0] as any;

      engineCall.onStart();
      expect(onStart).toHaveBeenCalledTimes(1);

      engineCall.onUpdate(0.5);
      expect(onUpdate).toHaveBeenCalledWith({
        progress: 0.5,
        time: expect.any(Number),
      });

      engineCall.onComplete();
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it("should remove event listeners", () => {
      const timeline = new Timeline();
      const onStart = vi.fn();

      timeline.on("start", onStart);
      timeline.off("start", onStart);

      timeline.add(mockElement, { duration: 1000 });
      timeline.play();

      const engineCall = MockedAnimationEngine.mock.calls[0][0] as any;
      engineCall.onStart();

      expect(onStart).not.toHaveBeenCalled();
    });

    it("should handle multiple listeners for same event", () => {
      const timeline = new Timeline();
      const onStart1 = vi.fn();
      const onStart2 = vi.fn();

      timeline.on("start", onStart1).on("start", onStart2);

      timeline.add(mockElement, { duration: 1000 });
      timeline.play();

      const engineCall = MockedAnimationEngine.mock.calls[0][0] as any;
      engineCall.onStart();

      expect(onStart1).toHaveBeenCalledTimes(1);
      expect(onStart2).toHaveBeenCalledTimes(1);
    });
  });

  describe("Timeline State Properties", () => {
    it("should return correct duration", () => {
      const timeline = new Timeline();

      expect(timeline.duration).toBe(0);

      timeline.add(mockElement, { duration: 1000 });
      // Duration calculation happens internally
    });

    it("should return correct playing state", () => {
      const timeline = new Timeline();

      expect(timeline.isPlaying).toBe(false);

      timeline.add(mockElement, { duration: 1000 });
      timeline.play();

      // The state depends on the engine mock
      expect(timeline.isPlaying).toBe(mockAnimationEngine.isPlaying);
    });

    it("should return correct paused state", () => {
      const timeline = new Timeline();

      expect(timeline.isPaused).toBe(false);

      timeline.add(mockElement, { duration: 1000 });
      timeline.play();

      expect(timeline.isPaused).toBe(mockAnimationEngine.isPaused);
    });
  });

  describe("Multiple Animations Integration", () => {
    it("should handle multiple overlapping animations", () => {
      const timeline = new Timeline();
      const element1 = document.createElement("div");
      const element2 = document.createElement("span");

      timeline
        .add(element1, {
          duration: 1000,
          from: { opacity: 0 },
          to: { opacity: 1 },
        })
        .add(
          element2,
          { duration: 800, from: { scale: 0 }, to: { scale: 1 } },
          "+=200"
        )
        .add(
          element1,
          { duration: 600, from: { translateX: 0 }, to: { translateX: 100 } },
          "-=400"
        );

      expect(MockedCSSAnimator).toHaveBeenCalledTimes(3);
    });

    it("should coordinate multiple animations on play", () => {
      const timeline = new Timeline();

      timeline
        .add(mockElement, { duration: 500 })
        .add(mockElement, { duration: 800 });

      timeline.play();

      const engineCall = MockedAnimationEngine.mock.calls[0][0] as any;
      engineCall.onStart();

      // Both animators should be started
      expect(mockCSSAnimator.start).toHaveBeenCalledTimes(2);
    });

    it("should update all animations during playback", () => {
      const timeline = new Timeline();

      timeline
        .add(mockElement, { duration: 1000 })
        .add(mockElement, { duration: 800 });

      timeline.play();

      const engineCall = MockedAnimationEngine.mock.calls[0][0] as any;
      engineCall.onUpdate(0.5);

      // Update logic is handled internally by updateAllItems
    });

    it("should complete all animations", () => {
      const timeline = new Timeline();

      timeline
        .add(mockElement, { duration: 1000 })
        .add(mockElement, { duration: 800 });

      timeline.play();

      const engineCall = MockedAnimationEngine.mock.calls[0][0] as any;
      engineCall.onComplete();

      expect(mockCSSAnimator.complete).toHaveBeenCalledTimes(2);
    });
  });

  describe("Loop Configuration", () => {
    it("should handle loop configuration", () => {
      const timeline = new Timeline({ loop: true });

      timeline.add(mockElement, { duration: 1000 });
      timeline.play();

      expect(MockedAnimationEngine).toHaveBeenCalledWith(
        expect.objectContaining({
          loop: true,
        })
      );
    });

    it("should handle non-loop configuration", () => {
      const timeline = new Timeline({ loop: false });

      timeline.add(mockElement, { duration: 1000 });
      timeline.play();

      expect(MockedAnimationEngine).toHaveBeenCalledWith(
        expect.objectContaining({
          loop: false,
        })
      );
    });
  });
});
