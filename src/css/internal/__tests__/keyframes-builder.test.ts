import { describe, it, expect, beforeEach, vi } from "vitest";
import { KeyframesBuilder } from "../keyframes-builder";
import { ElementManager } from "../element-manager";
import { ColorValue, NumericValue, resolveEaseFn } from "@/core";
import { PropertyManager } from "@/animations";
import { convertColorValueToCssString } from "@/utils/color";
import { CSSAnimationConfig, AnimationKeyframe } from "../../types";

// Mock dependencies
vi.mock("@/core", () => ({
  resolveEaseFn: vi.fn(() => vi.fn()),
}));

vi.mock("@/utils/color", () => ({
  convertColorValueToCssString: vi.fn(
    (color) => `rgb(${color.r}, ${color.g}, ${color.b})`
  ),
}));

vi.mock("@/animations", () => ({
  PropertyManager: {
    isAnimatable: vi.fn((prop: string) => !["offset", "easing"].includes(prop)),
  },
}));

vi.mock("@/utils/error", () => ({
  throwIf: vi.fn((condition: boolean, message: string) => {
    if (condition) throw new Error(message);
  }),
}));

// Mock PropertyManager instance
class MockPropertyManager {
  getRecommendedFromValue = vi.fn(
    () =>
      ({
        type: "numeric",
        value: 0,
        unit: "px",
      } as NumericValue)
  );
  reset = vi.fn();
  markDirty = vi.fn();
}

// Mock ElementManager
class MockElementManager {
  private propertyManagers = new Map<number, MockPropertyManager>();

  getPropertyManager(index: number): MockPropertyManager | null {
    if (!this.propertyManagers.has(index)) {
      this.propertyManagers.set(index, new MockPropertyManager());
    }
    return this.propertyManagers.get(index) || null;
  }
}

describe("KeyframesBuilder", () => {
  let elements: HTMLElement[];
  let elementManager: MockElementManager;
  let builder: KeyframesBuilder;

  const createBasicConfig = (overrides = {}) => ({
    from: { opacity: 0, translateX: 0 },
    to: { opacity: 1, translateX: 100 },
    ease: "linear" as const,
    keyframes: [] as AnimationKeyframe[],
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    elements = [document.createElement("div"), document.createElement("span")];

    elementManager = new MockElementManager();

    const config = createBasicConfig();
    builder = new KeyframesBuilder(elements, elementManager as any, config);
  });

  describe("Constructor", () => {
    it("should initialize with elements and config", () => {
      expect(builder).toBeInstanceOf(KeyframesBuilder);
      expect(builder.getFinalKeyframes()).toBeInstanceOf(Map);
    });
  });

  describe("prepareAllKeyframes", () => {
    it("should prepare keyframes for simple from/to animation", () => {
      const config = createBasicConfig();
      builder = new KeyframesBuilder(elements, elementManager as any, config);

      builder.prepareAllKeyframes();

      const keyframes = builder.getFinalKeyframes();
      expect(keyframes.size).toBe(2); // One for each element
    });

    it("should prepare keyframes for array properties", () => {
      const config = createBasicConfig({
        to: { opacity: [0, 0.5, 1], translateX: [0, 50, 100] },
      });
      builder = new KeyframesBuilder(elements, elementManager as any, config);

      builder.prepareAllKeyframes();

      const keyframes = builder.getFinalKeyframes();
      expect(keyframes.size).toBe(2); // One for each element

      const element0Keyframes = keyframes.get(0);
      expect(element0Keyframes).toHaveLength(3); // 3 keyframes from array
      expect(element0Keyframes?.[0].offset).toBe(0);
      expect(element0Keyframes?.[1].offset).toBe(0.5);
      expect(element0Keyframes?.[2].offset).toBe(1);
    });

    it("should prepare keyframes for function properties", () => {
      const opacityFn = vi.fn((index: number) => index * 0.5);
      const config = createBasicConfig({
        to: { opacity: opacityFn, translateX: 100 },
      });
      builder = new KeyframesBuilder(elements, elementManager as any, config);

      builder.prepareAllKeyframes();

      expect(opacityFn).toHaveBeenCalledWith(0, elements[0]);
      expect(opacityFn).toHaveBeenCalledWith(1, elements[1]);
    });

    it("should handle explicit keyframes", () => {
      const keyframes: AnimationKeyframe[] = [
        { offset: 0, opacity: 0, translateX: 0 },
        { offset: 0.5, opacity: 0.5, translateX: 50, ease: "easeIn" },
        { offset: 1, opacity: 1, translateX: 100 },
      ];
      const config = createBasicConfig({ keyframes });
      builder = new KeyframesBuilder(elements, elementManager as any, config);

      builder.prepareAllKeyframes();

      const result = builder.getFinalKeyframes();
      const element0Keyframes = result.get(0);

      expect(element0Keyframes).toHaveLength(3);
      expect(element0Keyframes?.[0].offset).toBe(0);
      expect(element0Keyframes?.[1].offset).toBe(0.5);
      expect(element0Keyframes?.[2].offset).toBe(1);
      expect(resolveEaseFn).toHaveBeenCalledWith("easeIn");
    });
  });

  describe("hasArrayProperties", () => {
    it("should detect array properties", () => {
      const config = createBasicConfig({
        to: { opacity: [0, 1], translateX: 100 },
      });
      builder = new KeyframesBuilder(elements, elementManager as any, config);

      builder.prepareAllKeyframes();

      // Should use array keyframes logic
      const keyframes = builder.getFinalKeyframes();
      const element0Keyframes = keyframes.get(0);
      expect(element0Keyframes).toHaveLength(2); // 2 keyframes from array
    });

    it("should detect function properties", () => {
      const opacityFn = vi.fn(() => 1);
      const config = createBasicConfig({
        to: { opacity: opacityFn },
      });
      builder = new KeyframesBuilder(elements, elementManager as any, config);

      builder.prepareAllKeyframes();

      expect(opacityFn).toHaveBeenCalled();
    });
  });

  describe("resolveValue", () => {
    it("should handle number values", () => {
      const config = createBasicConfig({
        to: { opacity: 0.5, translateX: 100 },
      });
      builder = new KeyframesBuilder(elements, elementManager as any, config);

      builder.prepareAllKeyframes();

      const keyframes = builder.getFinalKeyframes();
      const element0Keyframes = keyframes.get(0);
      expect(element0Keyframes?.[1].properties.opacity).toBe(0.5);
      expect(element0Keyframes?.[1].properties.translateX).toBe(100);
    });

    it("should handle string values", () => {
      const config = createBasicConfig({
        to: { translateX: "100px", backgroundColor: "red" },
      });
      builder = new KeyframesBuilder(elements, elementManager as any, config);

      builder.prepareAllKeyframes();

      const keyframes = builder.getFinalKeyframes();
      const element0Keyframes = keyframes.get(0);
      expect(element0Keyframes?.[1].properties.translateX).toBe("100px");
      expect(element0Keyframes?.[1].properties.backgroundColor).toBe("red");
    });

    it("should handle array values", () => {
      const config = createBasicConfig({
        to: { opacity: [0, 0.5, 1] },
      });
      builder = new KeyframesBuilder(elements, elementManager as any, config);

      builder.prepareAllKeyframes();

      const keyframes = builder.getFinalKeyframes();
      const element0Keyframes = keyframes.get(0);
      expect(element0Keyframes).toHaveLength(3);
      expect(element0Keyframes?.[0].properties.opacity).toBe(0);
      expect(element0Keyframes?.[1].properties.opacity).toBe(0.5);
      expect(element0Keyframes?.[2].properties.opacity).toBe(1);
    });

    it("should handle function values", () => {
      const opacityFn = vi.fn((index: number) => index * 0.3);
      const config = createBasicConfig({
        to: { opacity: opacityFn },
      });
      builder = new KeyframesBuilder(elements, elementManager as any, config);

      builder.prepareAllKeyframes();

      expect(opacityFn).toHaveBeenCalledWith(0, elements[0]);
      expect(opacityFn).toHaveBeenCalledWith(1, elements[1]);
    });

    it("should handle undefined values", () => {
      const config = createBasicConfig({
        to: { opacity: undefined },
      });
      builder = new KeyframesBuilder(elements, elementManager as any, config);

      builder.prepareAllKeyframes();

      const keyframes = builder.getFinalKeyframes();
      const element0Keyframes = keyframes.get(0);
      // In from/to mode, undefined properties won't appear in the keyframes
      expect(element0Keyframes?.[1].properties.opacity).toBeUndefined();
    });
  });

  describe("buildKeyframesArray", () => {
    it("should create evenly spaced keyframes for different array lengths", () => {
      const config = createBasicConfig({
        to: {
          opacity: [0, 0.3, 0.7, 1], // 4 values
          translateX: [0, 100], // 2 values
        },
      });
      builder = new KeyframesBuilder(elements, elementManager as any, config);

      builder.prepareAllKeyframes();

      const keyframes = builder.getFinalKeyframes();
      const element0Keyframes = keyframes.get(0);

      // Should create 4 keyframes (max array length)
      expect(element0Keyframes).toHaveLength(4);

      // Check offset distribution
      expect(element0Keyframes?.[0].offset).toBe(0);
      expect(element0Keyframes?.[1].offset).toBeCloseTo(1 / 3);
      expect(element0Keyframes?.[2].offset).toBeCloseTo(2 / 3);
      expect(element0Keyframes?.[3].offset).toBe(1);

      // Check that shorter arrays are handled correctly
      expect(element0Keyframes?.[2].properties.translateX).toBe(100); // Should clamp to last value
      expect(element0Keyframes?.[3].properties.translateX).toBe(100); // Should clamp to last value
    });

    it("should handle mixed from/to properties in arrays", () => {
      const config = createBasicConfig({
        from: { opacity: 0.2, scale: 0.8 },
        to: { opacity: [0.5, 1], translateX: [50, 100] },
      });
      builder = new KeyframesBuilder(elements, elementManager as any, config);

      builder.prepareAllKeyframes();

      const keyframes = builder.getFinalKeyframes();
      const element0Keyframes = keyframes.get(0);

      expect(element0Keyframes).toHaveLength(2);
      // When to[property] is an array, it overrides from[property] and uses array logic
      expect(element0Keyframes?.[0].properties.opacity).toBe(0.5); // First array value
      expect(element0Keyframes?.[1].properties.opacity).toBe(1); // Second array value

      // But when to[property] is not defined, and from[property] exists, it uses from value for first keyframe
      expect(element0Keyframes?.[0].properties.scale).toBe(0.8); // from value for first keyframe
      expect(element0Keyframes?.[1].properties.scale).toBe(0.8); // same value since no 'to' provided
    });
  });

  describe("serializeAnimationValue", () => {
    it("should serialize numeric values", () => {
      const mockPropertyManager = elementManager.getPropertyManager(0);
      mockPropertyManager?.getRecommendedFromValue.mockReturnValue({
        type: "numeric",
        value: 100,
        unit: "px",
      } as NumericValue);

      const config = createBasicConfig({
        from: {},
        to: { translateX: 100 },
      });
      builder = new KeyframesBuilder(elements, elementManager as any, config);

      builder.prepareAllKeyframes();

      // The serialization is tested indirectly through the keyframe preparation
      expect(mockPropertyManager?.getRecommendedFromValue).toHaveBeenCalled();
    });

    it("should serialize color values", () => {
      const mockPropertyManager = elementManager.getPropertyManager(0);
      mockPropertyManager?.getRecommendedFromValue.mockReturnValue({
        type: "color",
        value: { r: 255, g: 0, b: 0 },
      } as any);

      const config = createBasicConfig({
        from: {},
        to: { backgroundColor: "blue" },
      });
      builder = new KeyframesBuilder(elements, elementManager as any, config);

      builder.prepareAllKeyframes();

      expect(mockPropertyManager?.getRecommendedFromValue).toHaveBeenCalled();
    });
  });

  describe("getMaxKeyframeCount", () => {
    it("should return minimum of 2 for simple values", () => {
      const config = createBasicConfig({
        to: { opacity: 1, translateX: 100 },
      });
      builder = new KeyframesBuilder(elements, elementManager as any, config);

      builder.prepareAllKeyframes();

      const keyframes = builder.getFinalKeyframes();
      const element0Keyframes = keyframes.get(0);
      expect(element0Keyframes).toHaveLength(2); // from/to
    });

    it("should return max array length when arrays are present", () => {
      const config = createBasicConfig({
        to: {
          opacity: [0, 0.5, 1], // length 3
          translateX: [0, 25, 50, 75, 100], // length 5
        },
      });
      builder = new KeyframesBuilder(elements, elementManager as any, config);

      builder.prepareAllKeyframes();

      const keyframes = builder.getFinalKeyframes();
      const element0Keyframes = keyframes.get(0);
      expect(element0Keyframes).toHaveLength(5); // max array length
    });
  });

  describe("Error handling and edge cases", () => {
    it("should handle empty elements array", () => {
      const config = createBasicConfig();
      builder = new KeyframesBuilder([], elementManager as any, config);

      builder.prepareAllKeyframes();

      const keyframes = builder.getFinalKeyframes();
      expect(keyframes.size).toBe(0);
    });

    it("should handle missing property managers", () => {
      const faultyElementManager = {
        getPropertyManager: vi.fn(() => null),
      };

      const config = createBasicConfig();
      builder = new KeyframesBuilder(
        elements,
        faultyElementManager as any,
        config
      );

      expect(() => builder.prepareAllKeyframes()).toThrow(
        "No PropertyManager found for element 0"
      );
    });

    it("should filter out non-animatable properties", () => {
      const config = createBasicConfig({
        to: {
          opacity: 1,
          offset: 0.5, // Should be filtered out
          easing: "ease-in", // Should be filtered out
          translateX: 100,
        },
      });
      builder = new KeyframesBuilder(elements, elementManager as any, config);

      builder.prepareAllKeyframes();

      const keyframes = builder.getFinalKeyframes();
      const element0Keyframes = keyframes.get(0);

      // Should not include offset and easing as animatable properties
      expect(element0Keyframes?.[0].properties.offset).toBeUndefined();
      expect(element0Keyframes?.[0].properties.easing).toBeUndefined();
      expect(element0Keyframes?.[0].properties.opacity).toBeDefined();
      expect(element0Keyframes?.[0].properties.translateX).toBeDefined();
    });

    it("should handle complex function that returns arrays", () => {
      const complexFn = vi.fn((index: number) => [
        index * 10,
        index * 20,
        index * 30,
      ]);
      const config = createBasicConfig({
        to: { translateX: complexFn },
      });
      builder = new KeyframesBuilder(elements, elementManager as any, config);

      builder.prepareAllKeyframes();

      expect(complexFn).toHaveBeenCalledWith(0, elements[0]);
      expect(complexFn).toHaveBeenCalledWith(1, elements[1]);

      const keyframes = builder.getFinalKeyframes();
      const element0Keyframes = keyframes.get(0);
      const element1Keyframes = keyframes.get(1);

      expect(element0Keyframes).toHaveLength(3); // Array length from function
      expect(element1Keyframes).toHaveLength(3);

      // Check that element 0 gets [0, 0, 0] and element 1 gets [10, 20, 30]
      expect(element0Keyframes?.[0].properties.translateX).toBe(0);
      expect(element0Keyframes?.[1].properties.translateX).toBe(0);
      expect(element0Keyframes?.[2].properties.translateX).toBe(0);

      expect(element1Keyframes?.[0].properties.translateX).toBe(10);
      expect(element1Keyframes?.[1].properties.translateX).toBe(20);
      expect(element1Keyframes?.[2].properties.translateX).toBe(30);
    });

    it("should handle large number of elements", () => {
      const manyElements = Array.from({ length: 100 }, () =>
        document.createElement("div")
      );
      const config = createBasicConfig();
      builder = new KeyframesBuilder(
        manyElements,
        elementManager as any,
        config
      );

      builder.prepareAllKeyframes();

      const keyframes = builder.getFinalKeyframes();
      expect(keyframes.size).toBe(100);
    });
  });

  describe("Integration with easing functions", () => {
    it("should apply ease function from config", () => {
      const config = createBasicConfig({ ease: "ease-in-out" });
      builder = new KeyframesBuilder(elements, elementManager as any, config);

      builder.prepareAllKeyframes();

      expect(resolveEaseFn).toHaveBeenCalledWith("ease-in-out");
    });

    it("should apply per-keyframe easing when using explicit keyframes", () => {
      const keyframes: AnimationKeyframe[] = [
        { offset: 0, opacity: 0, ease: "easeIn" },
        { offset: 1, opacity: 1, ease: "easeOut" },
      ];
      const config = createBasicConfig({ keyframes, ease: "linear" });
      builder = new KeyframesBuilder(elements, elementManager as any, config);

      builder.prepareAllKeyframes();

      expect(resolveEaseFn).toHaveBeenCalledWith("easeIn");
      expect(resolveEaseFn).toHaveBeenCalledWith("easeOut");
    });

    it("should fallback to config ease when keyframe ease is not specified", () => {
      const keyframes: AnimationKeyframe[] = [
        { offset: 0, opacity: 0 }, // No ease specified
        { offset: 1, opacity: 1 },
      ];
      const config = createBasicConfig({ keyframes, ease: "bounce" });
      builder = new KeyframesBuilder(elements, elementManager as any, config);

      builder.prepareAllKeyframes();

      expect(resolveEaseFn).toHaveBeenCalledWith("bounce");
    });
  });
});
