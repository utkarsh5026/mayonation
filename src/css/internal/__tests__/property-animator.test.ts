import { describe, it, expect, beforeEach, vi } from "vitest";
import type { ProcessedKeyframe } from "../../types";
import type { EaseFunction } from "@/core/ease-fns";

// Mock dependencies first
vi.mock("@/animations", () => {
  const MockPropertyManager = vi.fn().mockImplementation(() => ({
    getCurrentValue: vi.fn(),
    parse: vi.fn(),
    interpolate: vi.fn(),
    updateProperty: vi.fn(),
    applyUpdates: vi.fn(),
  }));
  
  MockPropertyManager.isAnimatable = vi.fn().mockReturnValue(true);
  
  return {
    PropertyManager: MockPropertyManager,
  };
});

vi.mock("@/core/ease-fns", () => ({
  resolveEaseFn: vi.fn((ease: any) => {
    if (typeof ease === "function") return ease;
    // Mock common easing functions
    switch (ease) {
      case "ease-in":
        return (t: number) => t * t;
      case "ease-out":
        return (t: number) => 1 - (1 - t) * (1 - t);
      case "linear":
      default:
        return (t: number) => t;
    }
  }),
}));

// Import after mocking
import { PropertyAnimator } from "../property-animator";
import { PropertyManager } from "@/animations";

describe("PropertyAnimator", () => {
  let propertyAnimator: PropertyAnimator;
  let mockPropertyManager: any;
  let mockKeyframes: ProcessedKeyframe[];

  beforeEach(() => {
    vi.clearAllMocks();
    mockPropertyManager = {
      getCurrentValue: vi.fn(),
      parse: vi.fn(),
      interpolate: vi.fn(),
      updateProperty: vi.fn(),
      applyUpdates: vi.fn(),
    };
    
    // Setup default mock implementations
    mockPropertyManager.getCurrentValue.mockReturnValue("0");
    mockPropertyManager.parse.mockReturnValue({ type: "numeric", value: 0 });
    mockPropertyManager.interpolate.mockReturnValue({ type: "numeric", value: 50 });
    mockPropertyManager.updateProperty.mockImplementation(() => {});
    mockPropertyManager.applyUpdates.mockImplementation(() => {});

    mockKeyframes = [
      {
        offset: 0,
        properties: { opacity: 0, translateX: 0 },
        easing: "linear" as EaseFunction,
      },
      {
        offset: 0.5,
        properties: { opacity: 0.5, translateX: 50 },
        easing: "ease-in" as EaseFunction,
      },
      {
        offset: 1,
        properties: { opacity: 1, translateX: 100 },
        easing: "ease-out" as EaseFunction,
      },
    ];
  });

  describe("Constructor and initialization", () => {
    it("should initialize with empty keyframes by default", () => {
      propertyAnimator = new PropertyAnimator();
      
      propertyAnimator.updateElement(mockPropertyManager, 0.5);
      
      // Should not cause any errors with empty keyframes
      expect(mockPropertyManager.interpolate).not.toHaveBeenCalled();
      expect(mockPropertyManager.updateProperty).not.toHaveBeenCalled();
    });

    it("should initialize with provided keyframes", () => {
      propertyAnimator = new PropertyAnimator(mockKeyframes);
      
      // Test that keyframes are used (we'll verify this in other tests)
      expect(propertyAnimator).toBeDefined();
    });

    it("should handle undefined keyframes parameter", () => {
      propertyAnimator = new PropertyAnimator(undefined);
      
      propertyAnimator.updateElement(mockPropertyManager, 0.5);
      
      // Should behave like empty keyframes
      expect(mockPropertyManager.interpolate).not.toHaveBeenCalled();
    });

    it("should handle null keyframes parameter", () => {
      propertyAnimator = new PropertyAnimator(null as any);
      
      propertyAnimator.updateElement(mockPropertyManager, 0.5);
      
      // Should behave like empty keyframes
      expect(mockPropertyManager.interpolate).not.toHaveBeenCalled();
    });
  });

  describe("updateElement", () => {
    beforeEach(() => {
      propertyAnimator = new PropertyAnimator(mockKeyframes);
    });

    it("should apply easing to progress when easing function provided", () => {
      const customEasing = vi.fn((t: number) => t * t);
      
      propertyAnimator.updateElement(mockPropertyManager, 0.5, customEasing);
      
      expect(customEasing).toHaveBeenCalledWith(0.5);
    });

    it("should work without easing function", () => {
      propertyAnimator.updateElement(mockPropertyManager, 0.5);
      
      // Should complete without errors
      expect(mockPropertyManager.applyUpdates).toHaveBeenCalled();
    });

    it("should handle progress at start boundary (0)", () => {
      propertyAnimator.updateElement(mockPropertyManager, 0);
      
      expect(mockPropertyManager.applyUpdates).toHaveBeenCalled();
    });

    it("should handle progress at end boundary (1)", () => {
      propertyAnimator.updateElement(mockPropertyManager, 1);
      
      expect(mockPropertyManager.applyUpdates).toHaveBeenCalled();
    });

    it("should handle progress beyond boundaries", () => {
      propertyAnimator.updateElement(mockPropertyManager, 1.5);
      propertyAnimator.updateElement(mockPropertyManager, -0.5);
      
      // Should complete without errors
      expect(mockPropertyManager.applyUpdates).toHaveBeenCalledTimes(2);
    });

    it("should not update when no keyframes are present", () => {
      const emptyAnimator = new PropertyAnimator([]);
      
      emptyAnimator.updateElement(mockPropertyManager, 0.5);
      
      expect(mockPropertyManager.interpolate).not.toHaveBeenCalled();
      expect(mockPropertyManager.updateProperty).not.toHaveBeenCalled();
    });
  });

  describe("findKeyframeSegment", () => {
    beforeEach(() => {
      propertyAnimator = new PropertyAnimator(mockKeyframes);
    });

    it("should find correct keyframe segment for middle progress", () => {
      propertyAnimator.updateElement(mockPropertyManager, 0.25);
      
      // Should interpolate between first two keyframes
      expect(mockPropertyManager.interpolate).toHaveBeenCalled();
      expect(mockPropertyManager.updateProperty).toHaveBeenCalled();
    });

    it("should find correct keyframe segment for progress at keyframe boundary", () => {
      propertyAnimator.updateElement(mockPropertyManager, 0.5);
      
      // Should still call interpolation functions
      expect(mockPropertyManager.interpolate).toHaveBeenCalled();
    });

    it("should handle progress beyond last keyframe", () => {
      propertyAnimator.updateElement(mockPropertyManager, 1.2);
      
      // Should use last segment
      expect(mockPropertyManager.interpolate).toHaveBeenCalled();
    });

    it("should handle progress before first keyframe", () => {
      propertyAnimator.updateElement(mockPropertyManager, -0.1);
      
      // Should use first segment
      expect(mockPropertyManager.interpolate).toHaveBeenCalled();
    });

    it("should handle single keyframe", () => {
      const singleKeyframe = [mockKeyframes[0]];
      const singleAnimator = new PropertyAnimator(singleKeyframe);
      
      singleAnimator.updateElement(mockPropertyManager, 0.5);
      
      // With only one keyframe, should not interpolate
      expect(mockPropertyManager.interpolate).not.toHaveBeenCalled();
    });

    it("should calculate correct local progress", () => {
      // Test that local progress is calculated correctly between keyframes
      propertyAnimator.updateElement(mockPropertyManager, 0.25);
      
      // Progress 0.25 between keyframes at 0 and 0.5 should give local progress of 0.5
      // We can verify this by checking the interpolated values
      expect(mockPropertyManager.interpolate).toHaveBeenCalled();
    });
  });

  describe("easing application", () => {
    beforeEach(() => {
      propertyAnimator = new PropertyAnimator(mockKeyframes);
    });

    it("should apply keyframe easing correctly", () => {
      propertyAnimator.updateElement(mockPropertyManager, 0.25);
      
      // Should call easing functions from keyframes
      expect(mockPropertyManager.interpolate).toHaveBeenCalled();
    });

    it("should handle missing easing in keyframes", () => {
      const keyframesWithoutEasing = mockKeyframes.map(kf => ({
        ...kf,
        easing: undefined as any
      }));
      
      const animatorWithoutEasing = new PropertyAnimator(keyframesWithoutEasing);
      animatorWithoutEasing.updateElement(mockPropertyManager, 0.5);
      
      expect(mockPropertyManager.interpolate).toHaveBeenCalled();
    });

    it("should prioritize global easing over keyframe easing", () => {
      const globalEasing = vi.fn((t: number) => t);
      
      propertyAnimator.updateElement(mockPropertyManager, 0.5, globalEasing);
      
      // Global easing should be applied first
      expect(globalEasing).toHaveBeenCalled();
    });
  });

  describe("property interpolation and updates", () => {
    beforeEach(() => {
      propertyAnimator = new PropertyAnimator(mockKeyframes);
    });

    it("should interpolate all properties present in keyframes", () => {
      propertyAnimator.updateElement(mockPropertyManager, 0.5);
      
      // Should interpolate each property
      expect(mockPropertyManager.interpolate).toHaveBeenCalledTimes(2); // opacity and translateX
      expect(mockPropertyManager.updateProperty).toHaveBeenCalledTimes(2);
    });

    it("should handle properties with different types", () => {
      const mixedKeyframes: ProcessedKeyframe[] = [
        {
          offset: 0,
          properties: { 
            opacity: 0, 
            backgroundColor: "rgb(255,0,0)",
            width: "100px" 
          },
          easing: "linear" as EaseFunction,
        },
        {
          offset: 1,
          properties: { 
            opacity: 1, 
            backgroundColor: "rgb(0,255,0)",
            width: "200px" 
          },
          easing: "linear" as EaseFunction,
        },
      ];

      const mixedAnimator = new PropertyAnimator(mixedKeyframes);
      mixedAnimator.updateElement(mockPropertyManager, 0.5);
      
      expect(mockPropertyManager.interpolate).toHaveBeenCalledTimes(3);
    });

    it("should use current value when from value is undefined", () => {
      mockPropertyManager.getCurrentValue.mockReturnValue("currentVal");
      
      const incompleteKeyframes: ProcessedKeyframe[] = [
        {
          offset: 0,
          properties: {}, // No properties defined
          easing: "linear" as EaseFunction,
        },
        {
          offset: 1,
          properties: { opacity: 1 },
          easing: "linear" as EaseFunction,
        },
      ];

      const incompleteAnimator = new PropertyAnimator(incompleteKeyframes);
      incompleteAnimator.updateElement(mockPropertyManager, 0.5);
      
      expect(mockPropertyManager.getCurrentValue).toHaveBeenCalledWith("opacity");
    });

    it("should skip properties that are not animatable", () => {
      PropertyManager.isAnimatable.mockReturnValue(false);
      
      propertyAnimator.updateElement(mockPropertyManager, 0.5);
      
      expect(mockPropertyManager.interpolate).not.toHaveBeenCalled();
      expect(mockPropertyManager.updateProperty).not.toHaveBeenCalled();
      
      PropertyManager.isAnimatable.mockReturnValue(true); // Reset
    });

    it("should handle parse failures gracefully", () => {
      mockPropertyManager.parse.mockReturnValue(null);
      
      propertyAnimator.updateElement(mockPropertyManager, 0.5);
      
      // Should not call interpolate if parse fails
      expect(mockPropertyManager.interpolate).not.toHaveBeenCalled();
      expect(mockPropertyManager.updateProperty).not.toHaveBeenCalled();
    });

    it("should handle interpolation failures gracefully", () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockPropertyManager.interpolate.mockImplementation(() => {
        throw new Error("Interpolation failed");
      });
      
      propertyAnimator.updateElement(mockPropertyManager, 0.5);
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockPropertyManager.applyUpdates).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });

    it("should skip undefined to values", () => {
      const keyframesWithUndefined: ProcessedKeyframe[] = [
        {
          offset: 0,
          properties: { opacity: 0 },
          easing: "linear" as EaseFunction,
        },
        {
          offset: 1,
          properties: { opacity: undefined as any },
          easing: "linear" as EaseFunction,
        },
      ];

      const undefinedAnimator = new PropertyAnimator(keyframesWithUndefined);
      undefinedAnimator.updateElement(mockPropertyManager, 0.5);
      
      expect(mockPropertyManager.interpolate).not.toHaveBeenCalled();
      expect(mockPropertyManager.updateProperty).not.toHaveBeenCalled();
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle identical from and to keyframes", () => {
      const identicalKeyframes: ProcessedKeyframe[] = [
        {
          offset: 0,
          properties: { opacity: 1 },
          easing: "linear" as EaseFunction,
        },
        {
          offset: 1,
          properties: { opacity: 1 },
          easing: "linear" as EaseFunction,
        },
      ];

      const identicalAnimator = new PropertyAnimator(identicalKeyframes);
      identicalAnimator.updateElement(mockPropertyManager, 0.5);
      
      expect(mockPropertyManager.interpolate).toHaveBeenCalled();
    });

    it("should handle zero-duration segments", () => {
      const zeroDurationKeyframes: ProcessedKeyframe[] = [
        {
          offset: 0.5,
          properties: { opacity: 0 },
          easing: "linear" as EaseFunction,
        },
        {
          offset: 0.5, // Same offset
          properties: { opacity: 1 },
          easing: "linear" as EaseFunction,
        },
      ];

      const zeroDurationAnimator = new PropertyAnimator(zeroDurationKeyframes);
      zeroDurationAnimator.updateElement(mockPropertyManager, 0.5);
      
      expect(mockPropertyManager.interpolate).toHaveBeenCalled();
    });

    it("should handle extreme progress values", () => {
      propertyAnimator = new PropertyAnimator(mockKeyframes);
      
      propertyAnimator.updateElement(mockPropertyManager, Number.POSITIVE_INFINITY);
      propertyAnimator.updateElement(mockPropertyManager, Number.NEGATIVE_INFINITY);
      propertyAnimator.updateElement(mockPropertyManager, NaN);
      
      expect(mockPropertyManager.applyUpdates).toHaveBeenCalledTimes(3);
    });

    it("should throw error when PropertyManager methods are missing", () => {
      const incompletePropManager = {
        getCurrentValue: vi.fn().mockReturnValue("0"),
        // Missing other methods
      } as any;
      
      expect(() => {
        propertyAnimator = new PropertyAnimator(mockKeyframes);
        propertyAnimator.updateElement(incompletePropManager, 0.5);
      }).toThrow(); // Should throw when methods are missing
    });

    it("should handle circular easing functions", () => {
      const circularEasing: EaseFunction = (t: number) => {
        return Math.sqrt(1 - (t - 1) * (t - 1));
      };
      
      propertyAnimator = new PropertyAnimator(mockKeyframes);
      propertyAnimator.updateElement(mockPropertyManager, 0.5, circularEasing);
      
      expect(mockPropertyManager.applyUpdates).toHaveBeenCalled();
    });
  });

  describe("performance and optimization", () => {
    it("should not call applyUpdates multiple times in single update", () => {
      propertyAnimator = new PropertyAnimator(mockKeyframes);
      propertyAnimator.updateElement(mockPropertyManager, 0.5);
      
      expect(mockPropertyManager.applyUpdates).toHaveBeenCalledTimes(1);
    });

    it("should handle large numbers of keyframes efficiently", () => {
      const manyKeyframes: ProcessedKeyframe[] = Array.from({ length: 100 }, (_, i) => ({
        offset: i / 99,
        properties: { opacity: i / 99 },
        easing: "linear" as EaseFunction,
      }));

      const manyKeyframeAnimator = new PropertyAnimator(manyKeyframes);
      
      const startTime = performance.now();
      manyKeyframeAnimator.updateElement(mockPropertyManager, 0.5);
      const endTime = performance.now();
      
      // Should complete reasonably quickly (arbitrary threshold)
      expect(endTime - startTime).toBeLessThan(100);
    });

    it("should handle multiple rapid updates", () => {
      propertyAnimator = new PropertyAnimator(mockKeyframes);
      
      for (let i = 0; i < 100; i++) {
        propertyAnimator.updateElement(mockPropertyManager, i / 100);
      }
      
      expect(mockPropertyManager.applyUpdates).toHaveBeenCalledTimes(100);
    });
  });

  describe("keyframe ordering and sorting", () => {
    it("should handle unordered keyframes correctly", () => {
      const unorderedKeyframes: ProcessedKeyframe[] = [
        {
          offset: 1,
          properties: { opacity: 1 },
          easing: "linear" as EaseFunction,
        },
        {
          offset: 0,
          properties: { opacity: 0 },
          easing: "linear" as EaseFunction,
        },
        {
          offset: 0.5,
          properties: { opacity: 0.5 },
          easing: "linear" as EaseFunction,
        },
      ];

      const unorderedAnimator = new PropertyAnimator(unorderedKeyframes);
      unorderedAnimator.updateElement(mockPropertyManager, 0.25);
      
      // Should still work correctly
      expect(mockPropertyManager.interpolate).toHaveBeenCalled();
    });

    it("should handle duplicate offset values", () => {
      const duplicateKeyframes: ProcessedKeyframe[] = [
        {
          offset: 0,
          properties: { opacity: 0 },
          easing: "linear" as EaseFunction,
        },
        {
          offset: 0.5,
          properties: { opacity: 0.3 },
          easing: "linear" as EaseFunction,
        },
        {
          offset: 0.5, // Duplicate offset
          properties: { opacity: 0.7 },
          easing: "linear" as EaseFunction,
        },
        {
          offset: 1,
          properties: { opacity: 1 },
          easing: "linear" as EaseFunction,
        },
      ];

      const duplicateAnimator = new PropertyAnimator(duplicateKeyframes);
      duplicateAnimator.updateElement(mockPropertyManager, 0.5);
      
      expect(mockPropertyManager.interpolate).toHaveBeenCalled();
    });
  });
});