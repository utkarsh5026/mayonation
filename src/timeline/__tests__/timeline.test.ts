import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Timeline } from "../timeline";
import { CSSAnimator } from "@/css";
import { AnimationEngine } from "@/core";
import type { ElementLike } from "@/utils/dom";

vi.mock("@/css");
vi.mock("@/core");

const MockedCSSAnimator = vi.mocked(CSSAnimator);
const MockedAnimationEngine = vi.mocked(AnimationEngine);

describe("Timeline Tests", () => {
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
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Basic Timeline Operations", () => {
    it("should create a new timeline", () => {
      const timeline = new Timeline();
      
      expect(timeline).toBeInstanceOf(Timeline);
      expect(timeline.duration).toBe(0);
      expect(timeline.isPlaying).toBe(false);
      expect(timeline.isPaused).toBe(false);
    });

    it("should add animation to timeline", () => {
      const timeline = new Timeline();
      
      const result = timeline.add(mockElement, {
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      });

      expect(result).toBe(timeline);
      expect(MockedCSSAnimator).toHaveBeenCalledWith({
        target: mockElement,
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      });
    });

    it("should play timeline", () => {
      const timeline = new Timeline();
      timeline.add(mockElement, { duration: 1000 });
      
      const result = timeline.play();

      expect(result).toBe(timeline);
      expect(MockedAnimationEngine).toHaveBeenCalled();
      expect(mockAnimationEngine.play).toHaveBeenCalled();
    });

    it("should pause timeline", () => {
      const timeline = new Timeline();
      timeline.add(mockElement, { duration: 1000 });
      timeline.play();
      
      const result = timeline.pause();

      expect(result).toBe(timeline);
    });

    it("should resume timeline", () => {
      const timeline = new Timeline();
      timeline.add(mockElement, { duration: 1000 });
      timeline.play();
      
      const result = timeline.resume();

      expect(result).toBe(timeline);
    });

    it("should reset timeline", () => {
      const timeline = new Timeline();
      timeline.add(mockElement, { duration: 1000 });
      timeline.play();
      
      const result = timeline.reset();

      expect(result).toBe(timeline);
      expect(mockCSSAnimator.reset).toHaveBeenCalled();
    });

    it("should seek timeline", () => {
      const timeline = new Timeline();
      timeline.add(mockElement, { duration: 1000 });
      
      const result = timeline.seek(500);

      expect(result).toBe(timeline);
    });
  });

  describe("Timeline Positioning", () => {
    it("should handle absolute positioning", () => {
      const timeline = new Timeline();
      
      timeline.add(mockElement, { duration: 1000 }, 500);

      expect(MockedCSSAnimator).toHaveBeenCalledWith({
        target: mockElement,
        duration: 1000,
      });
    });

    it("should handle relative positioning", () => {
      const timeline = new Timeline();
      
      timeline
        .add(mockElement, { duration: 1000 })
        .add(mockElement, { duration: 500 }, "+=200");

      expect(MockedCSSAnimator).toHaveBeenCalledTimes(2);
    });

    it("should handle start/end positioning", () => {
      const timeline = new Timeline();
      
      timeline
        .add(mockElement, { duration: 1000 })
        .add(mockElement, { duration: 500 }, "<")
        .add(mockElement, { duration: 300 }, ">");

      expect(MockedCSSAnimator).toHaveBeenCalledTimes(3);
    });
  });

  describe("Event Handling", () => {
    it("should add and trigger event listeners", () => {
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

      // Get engine callbacks and simulate events
      const engineCall = MockedAnimationEngine.mock.calls[0][0] as any;
      
      engineCall.onStart();
      expect(onStart).toHaveBeenCalled();

      engineCall.onUpdate(0.5);
      expect(onUpdate).toHaveBeenCalled();

      engineCall.onComplete();
      expect(onComplete).toHaveBeenCalled();
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
  });

  describe("Multiple Animations", () => {
    it("should handle multiple animations", () => {
      const timeline = new Timeline();
      const element1 = document.createElement("div");
      const element2 = document.createElement("span");

      timeline
        .add(element1, { duration: 1000, from: { opacity: 0 }, to: { opacity: 1 } })
        .add(element2, { duration: 800, from: { scale: 0 }, to: { scale: 1 } });

      expect(MockedCSSAnimator).toHaveBeenCalledTimes(2);
    });

    it("should coordinate animations on play", () => {
      const timeline = new Timeline();
      
      timeline
        .add(mockElement, { duration: 500 })
        .add(mockElement, { duration: 800 });

      timeline.play();

      const engineCall = MockedAnimationEngine.mock.calls[0][0] as any;
      engineCall.onStart();

      expect(mockCSSAnimator.start).toHaveBeenCalledTimes(2);
    });
  });

  describe("Timeline Configuration", () => {
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

    it("should use default duration", () => {
      const timeline = new Timeline();
      
      timeline.add(mockElement, {
        from: { opacity: 0 },
        to: { opacity: 1 },
      });

      expect(MockedCSSAnimator).toHaveBeenCalledWith({
        target: mockElement,
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      });
    });
  });
});