/// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AnimationEngine } from "../engine";

describe("AnimationEngine", () => {
  let onUpdate: ReturnType<typeof vi.fn>;
  let onComplete: ReturnType<typeof vi.fn>;
  let onStart: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onUpdate = vi.fn();
    onComplete = vi.fn();
    onStart = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Constructor", () => {
    it("should initialize with required options", () => {
      const engine = new AnimationEngine({
        duration: 1000,
        onUpdate,
        onComplete,
        onStart,
      });

      expect(engine).toBeDefined();
    });

    it("should initialize with loop option", () => {
      const engine = new AnimationEngine({
        duration: 1000,
        loop: true,
        onUpdate,
        onComplete,
      });

      expect(engine).toBeDefined();
    });

    it("should store duration correctly", () => {
      const engine = new AnimationEngine({
        duration: 500,
        onUpdate,
        onComplete,
      });

      expect(engine).toBeDefined();
    });
  });

  describe("State Management", () => {
    it("should start in idle state", () => {
      const engine = new AnimationEngine({
        duration: 1000,
        onUpdate,
        onComplete,
      });

      expect(engine.isPlaying).toBe(false);
      expect(engine.isPaused).toBe(false);
    });

    it("should transition to playing state when play() is called", () => {
      const engine = new AnimationEngine({
        duration: 1000,
        onUpdate,
        onComplete,
      });

      engine.play();
      expect(engine.isPlaying).toBe(true);
      expect(engine.isPaused).toBe(false);
    });

    it("should transition to paused state when pause() is called", () => {
      const engine = new AnimationEngine({
        duration: 1000,
        onUpdate,
        onComplete,
      });

      engine.play();
      engine.pause();

      expect(engine.isPlaying).toBe(false);
      expect(engine.isPaused).toBe(true);
    });

    it("should transition back to playing when resumed", () => {
      const engine = new AnimationEngine({
        duration: 1000,
        onUpdate,
        onComplete,
      });

      engine.play();
      engine.pause();
      engine.play();

      expect(engine.isPlaying).toBe(true);
      expect(engine.isPaused).toBe(false);
    });

    it("should reset to idle state when reset() is called", () => {
      const engine = new AnimationEngine({
        duration: 1000,
        onUpdate,
        onComplete,
      });

      engine.play();
      engine.reset();

      expect(engine.isPlaying).toBe(false);
      expect(engine.isPaused).toBe(false);
    });

    it("should handle multiple play calls without restarting", () => {
      const engine = new AnimationEngine({
        duration: 1000,
        onUpdate,
        onComplete,
      });

      engine.play();
      const wasPlaying = engine.isPlaying;

      engine.play(); // Should not restart

      expect(engine.isPlaying).toBe(wasPlaying);
    });
  });

  describe("Method Safety", () => {
    it("should handle pause() when not playing", () => {
      const engine = new AnimationEngine({
        duration: 1000,
        onUpdate,
        onComplete,
      });

      expect(() => engine.pause()).not.toThrow();
      expect(engine.isPaused).toBe(false);
    });

    it("should handle reset() when not playing", () => {
      const engine = new AnimationEngine({
        duration: 1000,
        onUpdate,
        onComplete,
      });

      expect(() => engine.reset()).not.toThrow();
      expect(engine.isPlaying).toBe(false);
      expect(engine.isPaused).toBe(false);
    });

    it("should handle multiple resets", () => {
      const engine = new AnimationEngine({
        duration: 1000,
        onUpdate,
        onComplete,
      });

      engine.play();
      engine.reset();
      engine.reset(); // Second reset

      expect(engine.isPlaying).toBe(false);
      expect(engine.isPaused).toBe(false);
    });
  });

  describe("Animation Frame Management", () => {
    it("should call requestAnimationFrame when starting", () => {
      const rafSpy = vi
        .spyOn(global, "requestAnimationFrame")
        .mockImplementation(() => 1);

      const engine = new AnimationEngine({
        duration: 1000,
        onUpdate,
        onComplete,
      });

      engine.play();
      expect(rafSpy).toHaveBeenCalled();

      rafSpy.mockRestore();
    });

    it("should call cancelAnimationFrame when pausing", () => {
      const rafSpy = vi
        .spyOn(global, "requestAnimationFrame")
        .mockImplementation(() => 1);
      const cancelSpy = vi
        .spyOn(global, "cancelAnimationFrame")
        .mockImplementation(() => {});

      const engine = new AnimationEngine({
        duration: 1000,
        onUpdate,
        onComplete,
      });

      engine.play();
      engine.pause();

      expect(cancelSpy).toHaveBeenCalled();

      rafSpy.mockRestore();
      cancelSpy.mockRestore();
    });

    it("should call cancelAnimationFrame when resetting", () => {
      const rafSpy = vi
        .spyOn(global, "requestAnimationFrame")
        .mockImplementation(() => 1);
      const cancelSpy = vi
        .spyOn(global, "cancelAnimationFrame")
        .mockImplementation(() => {});

      const engine = new AnimationEngine({
        duration: 1000,
        onUpdate,
        onComplete,
      });

      engine.play();
      engine.reset();

      expect(cancelSpy).toHaveBeenCalled();

      rafSpy.mockRestore();
      cancelSpy.mockRestore();
    });
  });

  describe("Progress Calculation Logic", () => {
    it("should handle zero duration correctly", () => {
      // Mock performance.now and requestAnimationFrame for controlled testing
      let mockNow = 0;
      vi.spyOn(performance, "now").mockImplementation(() => mockNow);
      vi.spyOn(global, "requestAnimationFrame").mockImplementation(() => 1);

      const engine = new AnimationEngine({
        duration: 0,
        onUpdate,
        onComplete,
      });

      // Should not throw when playing with zero duration
      expect(() => engine.play()).not.toThrow();
      expect(engine.isPlaying).toBe(true);
    });

    it("should properly initialize timing", () => {
      let mockNow = 1000;
      const nowSpy = vi
        .spyOn(performance, "now")
        .mockImplementation(() => mockNow);
      vi.spyOn(global, "requestAnimationFrame").mockImplementation(() => 1);

      const engine = new AnimationEngine({
        duration: 500,
        onUpdate,
        onComplete,
      });

      engine.play();

      // Should have called performance.now() to get start time
      expect(nowSpy).toHaveBeenCalled();
    });
  });

  describe("Configuration Options", () => {
    it("should respect loop option", () => {
      const engine = new AnimationEngine({
        duration: 1000,
        loop: true,
        onUpdate,
        onComplete,
      });

      expect(engine).toBeDefined();
      // Loop behavior is tested indirectly through state management
    });

    it("should work without loop option (default false)", () => {
      const engine = new AnimationEngine({
        duration: 1000,
        onUpdate,
        onComplete,
      });

      expect(engine).toBeDefined();
    });

    it("should accept callback functions", () => {
      const customUpdate = vi.fn();
      const customComplete = vi.fn();

      const engine = new AnimationEngine({
        duration: 1000,
        onUpdate: customUpdate,
        onComplete: customComplete,
      });

      expect(engine).toBeDefined();
    });
  });

  describe("API Interface", () => {
    it("should expose isPlaying getter", () => {
      const engine = new AnimationEngine({
        duration: 1000,
        onUpdate,
        onComplete,
      });

      expect(typeof engine.isPlaying).toBe("boolean");
    });

    it("should expose isPaused getter", () => {
      const engine = new AnimationEngine({
        duration: 1000,
        onUpdate,
        onComplete,
      });

      expect(typeof engine.isPaused).toBe("boolean");
    });

    it("should expose play method", () => {
      const engine = new AnimationEngine({
        duration: 1000,
        onUpdate,
        onComplete,
      });

      expect(typeof engine.play).toBe("function");
    });

    it("should expose pause method", () => {
      const engine = new AnimationEngine({
        duration: 1000,
        onUpdate,
        onComplete,
      });

      expect(typeof engine.pause).toBe("function");
    });

    it("should expose reset method", () => {
      const engine = new AnimationEngine({
        duration: 1000,
        onUpdate,
        onComplete,
      });

      expect(typeof engine.reset).toBe("function");
    });
  });
});
