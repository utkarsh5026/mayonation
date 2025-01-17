/// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Timeline } from "../timeline";

describe("Timeline", () => {
  let now = 0;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(performance, "now").mockImplementation(() => now);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("Constructor", () => {
    it("should initialize with default options", () => {
      const timeline = new Timeline({});
      expect(timeline["options"]).toEqual({
        loop: false,
        precision: 0.001,
      });
    });
  });

  it("should override default options", () => {
    const timeline = new Timeline({ loop: true, precision: 0.5 });
    expect(timeline["options"]).toEqual({
      loop: true,
      precision: 0.5,
    });
  });

  describe("add()", () => {
    let timeline: Timeline;
    let element: HTMLElement;

    beforeEach(() => {
      timeline = new Timeline({});
      element = document.createElement("div");
      document.body.appendChild(element);
    });

    afterEach(() => {
      document.body.removeChild(element);
    });

    it("should add animation segment with direct element target", () => {
      timeline.add(element, {
        duration: 1000,
        opacity: 0,
      });
      expect(timeline["segments"].length).toBe(1);
    });

    it("should add animation segment with selector target", () => {
      element.classList.add("test-element");
      timeline.add(".test-element", {
        duration: 1000,
        opacity: 0,
      });
      expect(timeline["segments"].length).toBe(1);
    });

    it("should handle multiple elements", () => {
      const element2 = document.createElement("div");
      document.body.appendChild(element2);
      timeline.add([element, element2], {
        duration: 1000,
        opacity: 0,
      });
      expect(timeline["segments"].length).toBe(2);
      document.body.removeChild(element2);
    });

    it("should handle keyframe array format", () => {
      timeline.add(element, [
        { offset: 0, opacity: 1 },
        { offset: 1, opacity: 0 },
      ]);
      expect(timeline["segments"].length).toBe(1);
    });

    it("should throw error for invalid targets", () => {
      expect(() => timeline.add("", { duration: 1000 })).toThrow(
        "Timeline: targets are required"
      );
    });

    it("should throw error for invalid properties", () => {
      expect(() => timeline.add(element, null as any)).toThrow(
        "Timeline: properties configuration is required"
      );
    });

    it("should warn when no elements found for selector", () => {
      const consoleSpy = vi.spyOn(console, "warn");
      timeline.add(".non-existent", { duration: 1000 });
      expect(consoleSpy).toHaveBeenCalledWith(
        "Timeline: No elements found for the specified targets"
      );
    });
  });

  describe("Playback Controls", () => {
    let timeline: Timeline;
    let element: HTMLElement;

    beforeEach(() => {
      timeline = new Timeline({});
      element = document.createElement("div");
      timeline.add(element, {
        duration: 1000,
        opacity: 0,
      });
    });

    it("should play animation", () => {
      const startSpy = vi.fn();
      timeline.on("start", startSpy);

      timeline.play();
      expect(timeline["state"]).toBe("playing");
      expect(startSpy).toHaveBeenCalledWith({ time: 0 });
    });

    it("should pause animation", () => {
      const pauseSpy = vi.fn();
      timeline.on("pause", pauseSpy);

      timeline.play();
      now += 500;
      timeline.pause();

      expect(timeline["state"]).toBe("paused");
      expect(pauseSpy).toHaveBeenCalledWith({
        time: timeline["currentTime"],
      });
    });

    it("should resume animation", () => {
      const resumeSpy = vi.fn();
      timeline.on("resume", resumeSpy);

      timeline.play();
      now += 500;
      timeline.pause();
      timeline.resume();

      expect(timeline["state"]).toBe("playing");
      expect(resumeSpy).toHaveBeenCalled();
    });

    it("should reset animation", () => {
      timeline.play();
      now += 500;
      timeline.reset();

      expect(timeline["currentTime"]).toBe(0);
      expect(timeline["state"]).toBe("idle");
      expect(timeline["startTime"]).toBeNull();
    });

    it("should seek to position", () => {
      timeline.seek(500);
      expect(timeline["currentTime"]).toBe(500);
    });
  });

  describe("Cleanup", () => {
    it("should properly destroy timeline", () => {
      const timeline = new Timeline({});
      const element = document.createElement("div");
      timeline.add(element, {
        duration: 1000,
        opacity: 0,
      });

      timeline.play();
      timeline.destroy();
      expect(timeline["segments"].length).toBe(0);
      expect(timeline["eventListeners"].size).toBe(0);
      expect(timeline["rafID"]).toBeNull();
    });
  });
});
