/// @vitest-environment jsdom

import { TimelineSegment } from "../timeline";
import { KeyframeManager } from "../keyframe";
import { easeFns } from "../ease_fns";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("TimelineSegment", () => {
  let element: HTMLElement;

  beforeEach(() => {
    element = document.createElement("div");
    document.body.appendChild(element);
  });

  afterEach(() => {
    document.body.removeChild(element);
  });

  describe("Constructor", () => {
    it("should throw error for missing element", () => {
      expect(
        () =>
          new TimelineSegment(null as any, {
            targets: element,
            keyframes: [{ opacity: 0 }, { opacity: 1 }],
            startTime: 0,
            duration: 1000,
          })
      ).toThrow("Element is required");
    });

    it("should throw error for missing keyframes", () => {
      expect(
        () =>
          new TimelineSegment(element, {
            targets: element,
            keyframes: [],
            startTime: 0,
            duration: 1000,
          })
      ).toThrow("Keyframes are required");
    });

    it("should throw error for invalid duration", () => {
      expect(
        () =>
          new TimelineSegment(element, {
            targets: element,
            keyframes: [{ opacity: 0 }, { opacity: 1 }],
            startTime: 0,
            duration: -1000,
          })
      ).toThrow("Duration must be positive");
    });

    it("should throw error for invalid iterations", () => {
      expect(
        () =>
          new TimelineSegment(element, {
            targets: element,
            keyframes: [{ opacity: 0 }, { opacity: 1 }],
            startTime: 0,
            duration: 1000,
            iterations: -2,
          })
      ).toThrow("Iterations must be positive");
    });
  });

  describe("Update Method", () => {
    let segment: TimelineSegment;
    const basicConfig = {
      targets: element,
      keyframes: [{ opacity: 0 }, { opacity: 1 }],
      startTime: 1000,
      duration: 1000,
    };

    beforeEach(() => {
      segment = new TimelineSegment(element, basicConfig);
    });

    it("should handle invalid progress values", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      segment.update(NaN);
      expect(consoleSpy).toHaveBeenCalledWith("Invalid progress value:", NaN);
      consoleSpy.mockRestore();
    });

    it("should not update before start time", () => {
      const spy = vi.spyOn(KeyframeManager.prototype, "update");
      segment.update(500);
      expect(spy).toHaveBeenCalled();
    });

    it("should update at exact start time", () => {
      const spy = vi.spyOn(KeyframeManager.prototype, "update");
      segment.update(1000);
      expect(spy).toHaveBeenCalledWith(0);
    });

    it("should update at midpoint", () => {
      const spy = vi.spyOn(KeyframeManager.prototype, "update");
      segment.update(1500);
      expect(spy).toHaveBeenCalledWith(0.5);
    });

    it("should update at exact end time", () => {
      const spy = vi.spyOn(KeyframeManager.prototype, "update");
      segment.update(2000);
      expect(spy).toHaveBeenCalledWith(1);
    });
  });

  describe("Iteration Handling", () => {
    it("should handle multiple iterations correctly", () => {
      const segment = new TimelineSegment(element, {
        targets: element,
        keyframes: [{ opacity: 0 }, { opacity: 1 }],
        startTime: 0,
        duration: 1000,
        iterations: 2,
      });

      const spy = vi.spyOn(KeyframeManager.prototype, "update");

      segment.update(500);
      expect(spy).toHaveBeenLastCalledWith(0.5);

      segment.update(1500);
      expect(spy).toHaveBeenLastCalledWith(0.5);

      segment.update(2000);
      expect(spy).toHaveBeenLastCalledWith(1);
    });

    it("should handle alternate direction correctly", () => {
      const segment = new TimelineSegment(element, {
        targets: element,
        keyframes: [{ opacity: 0 }, { opacity: 1 }],
        startTime: 0,
        duration: 1000,
        iterations: 2,
        direction: "alternate",
      });

      const spy = vi.spyOn(KeyframeManager.prototype, "update");

      segment.update(500);
      expect(spy).toHaveBeenLastCalledWith(0.5);

      segment.update(1500);
      expect(spy).toHaveBeenLastCalledWith(0.5);
    });
  });

  describe("Direction Handling", () => {
    it("should handle normal direction", () => {
      const segment = new TimelineSegment(element, {
        targets: element,
        keyframes: [{ opacity: 0 }, { opacity: 1 }],
        startTime: 0,
        duration: 1000,
        direction: "normal",
      });

      const spy = vi.spyOn(KeyframeManager.prototype, "update");
      segment.update(500);
      expect(spy).toHaveBeenCalledWith(0.5);
    });

    it("should handle reverse direction", () => {
      const segment = new TimelineSegment(element, {
        targets: element,
        keyframes: [{ opacity: 0 }, { opacity: 1 }],
        startTime: 0,
        duration: 1000,
        direction: "reverse",
      });

      const spy = vi.spyOn(KeyframeManager.prototype, "update");
      segment.update(500);
      expect(spy).toHaveBeenCalledWith(0.5);
    });
  });

  describe("Reset Method", () => {
    it("should reset all internal state", () => {
      const segment = new TimelineSegment(element, {
        targets: element,
        keyframes: [{ opacity: 0 }, { opacity: 1 }],
        startTime: 0,
        duration: 1000,
      });

      const spy = vi.spyOn(KeyframeManager.prototype, "reset");
      segment.update(500);
      segment.reset();
      expect(spy).toHaveBeenCalled();

      const updateSpy = vi.spyOn(KeyframeManager.prototype, "update");
      segment.update(500);
      expect(updateSpy).toHaveBeenCalledWith(0.5);
    });
  });

  describe("Edge Cases", () => {
    it("should handle time jumps backwards smoothly", () => {
      const segment = new TimelineSegment(element, {
        targets: element,
        keyframes: [{ opacity: 0 }, { opacity: 1 }],
        startTime: 0,
        duration: 1000,
      });

      const spy = vi.spyOn(KeyframeManager.prototype, "update");
      segment.update(800); // At 80%
      expect(spy).toHaveBeenLastCalledWith(0.8);

      segment.update(200); // Back to 20%
      expect(spy).toHaveBeenLastCalledWith(0.2);
    });

    it("should handle floating point precision issues", () => {
      const segment = new TimelineSegment(element, {
        targets: element,
        keyframes: [{ opacity: 0 }, { opacity: 1 }],
        startTime: 0,
        duration: 1000,
      });

      const spy = vi.spyOn(KeyframeManager.prototype, "update");
      segment.update(1000.000000001); // Slightly over duration
      expect(spy).toHaveBeenCalledWith(1); // Should clamp to 1
    });
  });
});
