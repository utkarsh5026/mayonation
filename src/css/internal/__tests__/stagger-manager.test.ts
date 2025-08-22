import { describe, it, expect, beforeEach } from "vitest";
import { StaggerManager } from "../stagger-manager";

describe("StaggerManager", () => {
  describe("Constructor", () => {
    it("should initialize with correct values", () => {
      const manager = new StaggerManager(100, 3, 1000);
      expect(manager.getTotalDuration()).toBe(1200); // (3-1)*100 + 1000
    });

    it("should handle zero stagger delay", () => {
      const manager = new StaggerManager(0, 3, 1000);
      expect(manager.getTotalDuration()).toBe(1000);
    });

    it("should handle single element", () => {
      const manager = new StaggerManager(100, 1, 1000);
      expect(manager.getTotalDuration()).toBe(1000);
    });
  });

  describe("getTotalDuration", () => {
    it("should calculate correct total duration", () => {
      const manager = new StaggerManager(50, 4, 500);
      // Last element starts at (4-1)*50 = 150ms
      // Total duration = 150 + 500 = 650ms
      expect(manager.getTotalDuration()).toBe(650);
    });

    it("should handle large element count", () => {
      const manager = new StaggerManager(10, 100, 200);
      // Last element starts at (100-1)*10 = 990ms
      // Total duration = 990 + 200 = 1190ms
      expect(manager.getTotalDuration()).toBe(1190);
    });
  });

  describe("calculateElementProgress", () => {
    let manager: StaggerManager;

    beforeEach(() => {
      // 3 elements, 100ms stagger, 500ms base duration
      manager = new StaggerManager(100, 3, 500);
    });

    describe("First element (index 0)", () => {
      it("should be inactive before start time", () => {
        const result = manager.calculateElementProgress(0, -50, 500);
        expect(result).toEqual({
          progress: 0,
          isActive: false,
          isComplete: false,
        });
      });

      it("should be active during animation", () => {
        const result = manager.calculateElementProgress(0, 250, 500);
        expect(result).toEqual({
          progress: 0.5, // (250 - 0) / 500
          isActive: true,
          isComplete: false,
        });
      });

      it("should be complete after end time", () => {
        const result = manager.calculateElementProgress(0, 600, 500);
        expect(result).toEqual({
          progress: 1,
          isActive: false,
          isComplete: true,
        });
      });
    });

    describe("Second element (index 1)", () => {
      it("should be inactive before start time", () => {
        const result = manager.calculateElementProgress(1, 50, 500);
        expect(result).toEqual({
          progress: 0,
          isActive: false,
          isComplete: false,
        });
      });

      it("should be active during animation", () => {
        const result = manager.calculateElementProgress(1, 350, 500);
        // Start time: 100ms, elapsed: 350ms, progress: (350-100)/500 = 0.5
        expect(result).toEqual({
          progress: 0.5,
          isActive: true,
          isComplete: false,
        });
      });

      it("should be complete after end time", () => {
        const result = manager.calculateElementProgress(1, 700, 500);
        expect(result).toEqual({
          progress: 1,
          isActive: false,
          isComplete: true,
        });
      });
    });

    describe("Third element (index 2)", () => {
      it("should be inactive before start time", () => {
        const result = manager.calculateElementProgress(2, 150, 500);
        expect(result).toEqual({
          progress: 0,
          isActive: false,
          isComplete: false,
        });
      });

      it("should be active during animation", () => {
        const result = manager.calculateElementProgress(2, 450, 500);
        // Start time: 200ms, elapsed: 450ms, progress: (450-200)/500 = 0.5
        expect(result).toEqual({
          progress: 0.5,
          isActive: true,
          isComplete: false,
        });
      });

      it("should be complete after end time", () => {
        const result = manager.calculateElementProgress(2, 800, 500);
        expect(result).toEqual({
          progress: 1,
          isActive: false,
          isComplete: true,
        });
      });
    });

    describe("Edge cases", () => {
      it("should handle exact start time", () => {
        const result = manager.calculateElementProgress(1, 100, 500);
        expect(result).toEqual({
          progress: 0,
          isActive: true,
          isComplete: false,
        });
      });

      it("should handle exact end time", () => {
        const result = manager.calculateElementProgress(1, 600, 500);
        expect(result).toEqual({
          progress: 1,
          isActive: true,
          isComplete: false,
        });
      });

      it("should clamp progress to [0, 1] range", () => {
        const result = manager.calculateElementProgress(0, 250, 500);
        expect(result.progress).toBeGreaterThanOrEqual(0);
        expect(result.progress).toBeLessThanOrEqual(1);
      });
    });
  });

  describe("Complex scenarios", () => {
    it("should handle fast stagger with long duration", () => {
      const manager = new StaggerManager(10, 5, 1000);
      
      // At 500ms, all elements should be active
      for (let i = 0; i < 5; i++) {
        const result = manager.calculateElementProgress(i, 500, 1000);
        expect(result.isActive).toBe(true);
      }
    });

    it("should handle slow stagger with short duration", () => {
      const manager = new StaggerManager(500, 3, 200);
      
      // At 600ms: first complete, second active, third inactive
      const first = manager.calculateElementProgress(0, 600, 200);
      const second = manager.calculateElementProgress(1, 600, 200);
      const third = manager.calculateElementProgress(2, 600, 200);
      
      expect(first.isComplete).toBe(true);
      expect(second.isActive).toBe(true);
      expect(third.isActive).toBe(false);
    });

    it("should handle zero duration", () => {
      const manager = new StaggerManager(100, 3, 0);
      
      const result = manager.calculateElementProgress(1, 101, 0);
      expect(result).toEqual({
        progress: 1,
        isActive: false,
        isComplete: true,
      });
    });

    it("should handle negative elapsed time", () => {
      const manager = new StaggerManager(100, 3, 500);
      
      const result = manager.calculateElementProgress(0, -50, 500);
      expect(result).toEqual({
        progress: 0,
        isActive: false,
        isComplete: false,
      });
    });
  });

  describe("Performance considerations", () => {
    it("should handle large number of elements efficiently", () => {
      const manager = new StaggerManager(1, 1000, 100);
      
      // Test last element
      const result = manager.calculateElementProgress(999, 1050, 100);
      expect(result.progress).toBeCloseTo(0.51, 2); // (1050 - 999) / 100
      expect(result.isActive).toBe(true);
    });

    it("should handle fractional stagger delays", () => {
      const manager = new StaggerManager(33.33, 3, 500);
      
      const result = manager.calculateElementProgress(2, 100, 500);
      // Start time: 2 * 33.33 = 66.66ms
      // Progress: (100 - 66.66) / 500 ≈ 0.067
      expect(result.progress).toBeCloseTo(0.067, 2);
      expect(result.isActive).toBe(true);
    });
  });

  describe("State transitions", () => {
    it("should transition through all states correctly", () => {
      const manager = new StaggerManager(100, 2, 300);
      
      // Element 1: inactive -> active -> complete
      let result = manager.calculateElementProgress(1, 50, 300);
      expect(result.isActive).toBe(false);
      expect(result.isComplete).toBe(false);
      
      result = manager.calculateElementProgress(1, 250, 300);
      expect(result.isActive).toBe(true);
      expect(result.isComplete).toBe(false);
      
      result = manager.calculateElementProgress(1, 450, 300);
      expect(result.isActive).toBe(false);
      expect(result.isComplete).toBe(true);
    });

    it("should maintain consistent state across multiple calls", () => {
      const manager = new StaggerManager(50, 3, 200);
      
      // Multiple calls with same parameters should return same result
      const result1 = manager.calculateElementProgress(1, 150, 200);
      const result2 = manager.calculateElementProgress(1, 150, 200);
      
      expect(result1).toEqual(result2);
    });
  });
});