import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  beforeAll,
  afterEach,
} from "vitest";
import { CSSAnimator } from "../css-animation";
import { ElementManager } from "../internal/element-manager";
import { StaggerManager } from "../internal/stagger-manager";
import { PropertyAnimator } from "../internal/property-animator";
import { ElementResolver } from "@/utils/dom";
import { resolveEaseFn } from "@/core/ease-fns";
import { throwIf } from "@/utils/error";
import type { CSSAnimationConfig, ProcessedKeyframe } from "../types";

// Mock dependencies
vi.mock("../internal/element-manager");
vi.mock("../internal/stagger-manager");
vi.mock("../internal/property-animator");
vi.mock("@/utils/dom");
vi.mock("@/core/ease-fns");
vi.mock("@/utils/error");

const MockedElementManager = vi.mocked(ElementManager);
const MockedStaggerManager = vi.mocked(StaggerManager);
const MockedPropertyAnimator = vi.mocked(PropertyAnimator);
const MockedElementResolver = vi.mocked(ElementResolver);
const mockedResolveEaseFn = vi.mocked(resolveEaseFn);
const mockedThrowIf = vi.mocked(throwIf);

describe("CSSAnimator", () => {
  let mockElements: HTMLElement[];
  let mockElementManager: any;
  let mockStaggerManager: any;
  let mockPropertyAnimator: any;
  let baseConfig: CSSAnimationConfig;

  beforeAll(() => {
    // Set up DOM environment
    global.HTMLElement = class HTMLElement {
      static [Symbol.hasInstance](obj: any) {
        return obj && typeof obj === "object" && obj.tagName;
      }
    } as any;
    global.document = {
      createElement: vi.fn(() => ({
        tagName: "DIV",
        style: {},
        classList: { add: vi.fn(), remove: vi.fn() },
      })),
      querySelectorAll: vi.fn(() => []),
    } as any;
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock elements
    mockElements = [
      {
        tagName: "DIV",
        style: {},
        classList: { add: vi.fn(), remove: vi.fn() },
      } as any,
      {
        tagName: "SPAN",
        style: {},
        classList: { add: vi.fn(), remove: vi.fn() },
      } as any,
      {
        tagName: "P",
        style: {},
        classList: { add: vi.fn(), remove: vi.fn() },
      } as any,
    ];

    // Mock ElementResolver.resolve as static method
    MockedElementResolver.resolve = vi.fn().mockReturnValue(mockElements);

    // Mock element manager
    mockElementManager = {
      updateElement: vi.fn(),
      reset: vi.fn(),
      getAllStates: vi.fn().mockReturnValue([
        { element: mockElements[0], isActive: true },
        { element: mockElements[1], isActive: false },
        { element: mockElements[2], isActive: true },
      ]),
      getPropertyManager: vi.fn().mockReturnValue({
        setProperty: vi.fn(),
        getProperty: vi.fn(),
        reset: vi.fn(),
      }),
    };
    MockedElementManager.mockReturnValue(mockElementManager);

    // Mock stagger manager
    mockStaggerManager = {
      calculateElementProgress: vi.fn().mockReturnValue({
        progress: 0.5,
        isActive: true,
        isComplete: false,
      }),
      getTotalDuration: vi.fn().mockReturnValue(2000),
    };
    MockedStaggerManager.mockReturnValue(mockStaggerManager);

    // Mock property animator
    mockPropertyAnimator = {
      updateElement: vi.fn(),
    };
    MockedPropertyAnimator.mockReturnValue(mockPropertyAnimator);

    // Mock ease function
    mockedResolveEaseFn.mockReturnValue((t: number) => t * t);

    // Mock throwIf
    mockedThrowIf.mockImplementation((condition, message) => {
      if (condition) throw new Error(message);
    });

    // Base configuration
    baseConfig = {
      target: ".test-element",
      duration: 1000,
      from: { opacity: 0, translateX: 0 },
      to: { opacity: 1, translateX: 100 },
    };
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Constructor and Initialization", () => {
    it("should initialize with required config properties", () => {
      const animator = new CSSAnimator(baseConfig);

      expect(animator).toBeInstanceOf(CSSAnimator);
      expect(animator.baseDuration).toBe(1000);
      expect(animator.elementCount).toBe(3);
    });

    it("should set default values for optional config properties", () => {
      const animator = new CSSAnimator(baseConfig);

      expect(animator.delay).toBe(0);
      expect(MockedStaggerManager).toHaveBeenCalledWith(0, 3, 1000);
    });

    it("should use provided optional config values", () => {
      const configWithOptions: CSSAnimationConfig = {
        ...baseConfig,
        delay: 500,
        stagger: 200,
        ease: "linear",
      };

      const animator = new CSSAnimator(configWithOptions);

      expect(animator.delay).toBe(500);
      expect(MockedStaggerManager).toHaveBeenCalledWith(200, 3, 1000);
      expect(mockedResolveEaseFn).toHaveBeenCalledWith("linear");
    });

    it("should resolve target elements", () => {
      new CSSAnimator(baseConfig);

      expect(MockedElementResolver.resolve).toHaveBeenCalledWith(
        ".test-element"
      );
    });

    it("should filter non-HTMLElements", () => {
      const mixedElements = [
        { tagName: "DIV" } as HTMLElement,
        { nodeType: 3 } as any, // Text node
        { tagName: "SPAN" } as HTMLElement,
      ];
      MockedElementResolver.resolve.mockReturnValue(mixedElements);

      // Mock instanceof check
      const originalInstanceof = (global as any).HTMLElement;
      (global as any).HTMLElement = class HTMLElement {
        static [Symbol.hasInstance](obj: any) {
          return obj && obj.tagName;
        }
      };

      new CSSAnimator(baseConfig);

      expect(MockedElementManager).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ tagName: "DIV" }),
          expect.objectContaining({ tagName: "SPAN" }),
        ])
      );

      (global as any).HTMLElement = originalInstanceof;
    });

    it("should throw error if no elements are resolved", () => {
      MockedElementResolver.resolve.mockReturnValue([]);

      expect(() => new CSSAnimator(baseConfig)).toThrow();
      expect(mockedThrowIf).toHaveBeenCalledWith(
        true,
        "Target must resolve to at least one HTMLElement"
      );
    });

    it("should throw error if element resolution fails", () => {
      MockedElementResolver.resolve.mockImplementation(() => {
        throw new Error("Element not found");
      });

      expect(() => new CSSAnimator(baseConfig)).toThrow(
        "Failed to resolve target: Error: Element not found"
      );
    });

    it("should initialize managers correctly", () => {
      new CSSAnimator(baseConfig);

      expect(MockedElementManager).toHaveBeenCalledWith(mockElements);
      expect(MockedStaggerManager).toHaveBeenCalledWith(0, 3, 1000);
    });

    it("should handle callback functions with defaults", () => {
      const config: CSSAnimationConfig = {
        target: ".test",
        duration: 1000,
      };

      const animator = new CSSAnimator(config);

      expect(() => animator.start()).not.toThrow();
      expect(() => animator.complete()).not.toThrow();
    });
  });

  describe("Property and Keyframe Resolution", () => {
    it("should handle simple from/to properties", () => {
      const config: CSSAnimationConfig = {
        target: ".test",
        duration: 1000,
        from: { opacity: 0 },
        to: { opacity: 1 },
      };

      new CSSAnimator(config);

      expect(mockedResolveEaseFn).toHaveBeenCalledWith("easeOut");
    });

    it("should handle array properties as keyframes", () => {
      const config: CSSAnimationConfig = {
        target: ".test",
        duration: 1000,
        to: { opacity: [0, 0.5, 1] },
      };

      new CSSAnimator(config);

      // Should process array properties
      expect(MockedElementManager).toHaveBeenCalled();
    });

    it("should handle function-based properties", () => {
      const config: CSSAnimationConfig = {
        target: ".test",
        duration: 1000,
        to: {
          opacity: (index: number, element: HTMLElement) => index * 0.1,
          translateX: (index: number) => [0, index * 50, index * 100],
        },
      };

      new CSSAnimator(config);

      // Should process function properties
      expect(MockedElementManager).toHaveBeenCalled();
    });

    it("should handle explicit keyframes", () => {
      const config: CSSAnimationConfig = {
        target: ".test",
        duration: 1000,
        keyframes: [
          { offset: 0, opacity: 0, ease: "linear" },
          { offset: 0.5, opacity: 0.5, ease: "easeIn" },
          { offset: 1, opacity: 1, ease: "easeOut" },
        ],
      };

      new CSSAnimator(config);

      expect(mockedResolveEaseFn).toHaveBeenCalledWith("linear");
      expect(mockedResolveEaseFn).toHaveBeenCalledWith("easeIn");
      expect(mockedResolveEaseFn).toHaveBeenCalledWith("easeOut");
    });

    it("should handle mixed property types correctly", () => {
      const config: CSSAnimationConfig = {
        target: ".test",
        duration: 1000,
        from: { opacity: 0, translateX: (i) => i * 10 },
        to: { opacity: [0.5, 1], translateX: 100 },
      };

      new CSSAnimator(config);

      // Should handle mixed array and function properties
      expect(MockedElementManager).toHaveBeenCalled();
    });
  });

  describe("Update Method", () => {
    let animator: CSSAnimator;

    beforeEach(() => {
      animator = new CSSAnimator(baseConfig);
    });

    it("should update all elements with correct progress", () => {
      const globalProgress = 0.5;
      mockStaggerManager.getTotalDuration.mockReturnValue(2000);

      animator.update(globalProgress);

      expect(mockStaggerManager.getElementProgressAtTime).toHaveBeenCalledTimes(
        3
      );
      expect(mockElementManager.updateElement).toHaveBeenCalledTimes(3);

      // Check that each element is updated
      for (let i = 0; i < 3; i++) {
        expect(
          mockStaggerManager.getElementProgressAtTime
        ).toHaveBeenNthCalledWith(i + 1, i, 1000, 1000);
        expect(mockElementManager.updateElement).toHaveBeenNthCalledWith(
          i + 1,
          i,
          0.5,
          true,
          false
        );
      }
    });

    it("should call onUpdate callback with correct parameters", () => {
      const onUpdate = vi.fn();
      const config = { ...baseConfig, onUpdate };
      animator = new CSSAnimator(config);
      mockStaggerManager.getTotalDuration.mockReturnValue(2000);

      animator.update(0.5);

      expect(onUpdate).toHaveBeenCalledWith(0.5, {
        elapsed: 1000,
        remaining: 1000,
        activeElements: 2, // Based on mocked getAllStates
      });
    });

    it("should only update active or complete elements", () => {
      mockStaggerManager.getElementProgressAtTime
        .mockReturnValueOnce({
          progress: 0.3,
          isActive: true,
          isComplete: false,
        })
        .mockReturnValueOnce({
          progress: 0,
          isActive: false,
          isComplete: false,
        })
        .mockReturnValueOnce({
          progress: 1,
          isActive: false,
          isComplete: true,
        });

      animator.update(0.5);

      // Should create PropertyAnimator for active/complete elements only
      expect(MockedPropertyAnimator).toHaveBeenCalledTimes(2);
    });

    it("should handle progress at boundaries", () => {
      animator.update(0);
      animator.update(1);

      expect(mockStaggerManager.getElementProgressAtTime).toHaveBeenCalledWith(
        expect.any(Number),
        0,
        1000
      );
      expect(mockStaggerManager.getElementProgressAtTime).toHaveBeenCalledWith(
        expect.any(Number),
        2000,
        1000
      );
    });

    it("should handle extreme progress values", () => {
      animator.update(-0.5);
      animator.update(2.0);

      expect(mockStaggerManager.getElementProgressAtTime).toHaveBeenCalledWith(
        expect.any(Number),
        -1000,
        1000
      );
      expect(mockStaggerManager.getElementProgressAtTime).toHaveBeenCalledWith(
        expect.any(Number),
        4000,
        1000
      );
    });
  });

  describe("Lifecycle Methods", () => {
    let animator: CSSAnimator;
    let onStart: ReturnType<typeof vi.fn>;
    let onComplete: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      onStart = vi.fn();
      onComplete = vi.fn();
      const config = { ...baseConfig, onStart, onComplete };
      animator = new CSSAnimator(config);
    });

    it("should call start callback", () => {
      animator.start();
      expect(onStart).toHaveBeenCalledTimes(1);
    });

    it("should call complete callback and update to final state", () => {
      animator.complete();

      expect(onComplete).toHaveBeenCalledTimes(1);
      // Should update with progress = 1
      expect(mockStaggerManager.getElementProgressAtTime).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        1000
      );
    });

    it("should reset animation state", () => {
      animator.reset();
      expect(mockElementManager.reset).toHaveBeenCalledTimes(1);
    });
  });

  describe("Getters", () => {
    let animator: CSSAnimator;

    beforeEach(() => {
      animator = new CSSAnimator(baseConfig);
    });

    it("should return correct total duration", () => {
      mockStaggerManager.getTotalDuration.mockReturnValue(3000);
      expect(animator.totalDuration).toBe(3000);
    });

    it("should return correct base duration", () => {
      expect(animator.baseDuration).toBe(1000);
    });

    it("should return correct delay", () => {
      const config = { ...baseConfig, delay: 500 };
      animator = new CSSAnimator(config);
      expect(animator.delay).toBe(500);
    });

    it("should return correct element count", () => {
      expect(animator.elementCount).toBe(3);
    });
  });

  describe("Edge Cases", () => {
    it("should handle single element", () => {
      MockedElementResolver.resolve.mockReturnValue([mockElements[0]]);

      const animator = new CSSAnimator(baseConfig);

      expect(animator.elementCount).toBe(1);
      expect(MockedElementManager).toHaveBeenCalledWith([mockElements[0]]);
      expect(MockedStaggerManager).toHaveBeenCalledWith(0, 1, 1000);
    });

    it("should handle empty properties", () => {
      const config: CSSAnimationConfig = {
        target: ".test",
        duration: 1000,
      };

      expect(() => new CSSAnimator(config)).not.toThrow();
    });

    it("should handle undefined animation values", () => {
      const config: CSSAnimationConfig = {
        target: ".test",
        duration: 1000,
        from: { opacity: undefined },
        to: { opacity: 1 },
      };

      expect(() => new CSSAnimator(config)).not.toThrow();
    });

    it("should handle zero duration", () => {
      const config = { ...baseConfig, duration: 0 };
      const animator = new CSSAnimator(config);

      expect(animator.baseDuration).toBe(0);
      expect(MockedStaggerManager).toHaveBeenCalledWith(0, 3, 0);
    });

    it("should handle very large duration", () => {
      const config = { ...baseConfig, duration: Number.MAX_SAFE_INTEGER };
      const animator = new CSSAnimator(config);

      expect(animator.baseDuration).toBe(Number.MAX_SAFE_INTEGER);
    });

    it("should handle complex nested arrays", () => {
      const config: CSSAnimationConfig = {
        target: ".test",
        duration: 1000,
        to: {
          opacity: [0, 0.2, 0.4, 0.6, 0.8, 1.0],
          translateX: [0, 20, 40, 60, 80, 100],
        },
      };

      expect(() => new CSSAnimator(config)).not.toThrow();
    });

    it("should handle function returning different types", () => {
      const config: CSSAnimationConfig = {
        target: ".test",
        duration: 1000,
        to: {
          opacity: (index) => (index === 0 ? 0.5 : [0, 1]),
          translateX: () => "100px",
        },
      };

      expect(() => new CSSAnimator(config)).not.toThrow();
    });
  });

  describe("Error Handling", () => {
    it("should throw when element resolution fails with custom error", () => {
      MockedElementResolver.resolve.mockImplementation(() => {
        throw new Error("Custom element error");
      });

      expect(() => new CSSAnimator(baseConfig)).toThrow(
        "Failed to resolve target: Error: Custom element error"
      );
    });

    it("should handle PropertyAnimator creation failure gracefully", () => {
      // This test is about the animator being created successfully, but PropertyAnimator failing during update
      const animator = new CSSAnimator(baseConfig);

      // Mock PropertyAnimator to throw during update
      MockedPropertyAnimator.mockImplementation(() => {
        throw new Error("PropertyAnimator creation failed");
      });

      // The update call will create new PropertyAnimator instances and they might throw
      // but the animator should handle it gracefully
      expect(() => animator.update(0.5)).toThrow(
        "PropertyAnimator creation failed"
      );
    });

    it("should handle invalid target gracefully", () => {
      mockedThrowIf.mockImplementation((condition, message) => {
        if (condition) throw new Error(message);
      });
      MockedElementResolver.resolve.mockReturnValue([]);

      expect(() => new CSSAnimator(baseConfig)).toThrow(
        "Target must resolve to at least one HTMLElement"
      );
    });
  });

  describe("Integration Scenarios", () => {
    it("should work with staggered animations", () => {
      const config = { ...baseConfig, stagger: 100 };
      mockStaggerManager.getElementProgressAtTime
        .mockReturnValueOnce({
          progress: 0.5,
          isActive: true,
          isComplete: false,
        })
        .mockReturnValueOnce({
          progress: 0.2,
          isActive: true,
          isComplete: false,
        })
        .mockReturnValueOnce({
          progress: 0,
          isActive: false,
          isComplete: false,
        });

      const animator = new CSSAnimator(config);
      animator.update(0.5);

      expect(MockedStaggerManager).toHaveBeenCalledWith(100, 3, 1000);
      expect(MockedPropertyAnimator).toHaveBeenCalledTimes(2); // Only active elements
    });

    it("should work with complex keyframe animations", () => {
      const config: CSSAnimationConfig = {
        target: ".test",
        duration: 1000,
        keyframes: [
          { offset: 0, opacity: 0, translateX: 0, ease: "linear" },
          { offset: 0.25, opacity: 0.3, translateX: 25, ease: "easeIn" },
          { offset: 0.75, opacity: 0.8, translateX: 75, ease: "easeOut" },
          { offset: 1, opacity: 1, translateX: 100, ease: "linear" },
        ],
      };

      const animator = new CSSAnimator(config);
      animator.update(0.5);

      expect(mockedResolveEaseFn).toHaveBeenCalledWith("linear");
      expect(mockedResolveEaseFn).toHaveBeenCalledWith("easeIn");
      expect(mockedResolveEaseFn).toHaveBeenCalledWith("easeOut");
    });

    it("should handle mixed function and array properties per element", () => {
      const config: CSSAnimationConfig = {
        target: ".test",
        duration: 1000,
        from: {
          opacity: (index) => index * 0.1,
          translateX: 0,
        },
        to: {
          opacity: [0.5, 0.8, 1],
          translateX: (index) => index * 50,
        },
      };

      expect(() => new CSSAnimator(config)).not.toThrow();
    });

    it("should properly sequence animation lifecycle", () => {
      const callOrder: string[] = [];
      const onStart = vi.fn(() => callOrder.push("start"));
      const onUpdate = vi.fn(() => callOrder.push("update"));
      const onComplete = vi.fn(() => callOrder.push("complete"));

      const config = {
        ...baseConfig,
        onStart,
        onUpdate,
        onComplete,
      };

      const animator = new CSSAnimator(config);

      animator.start();
      animator.update(0.5);
      animator.complete();

      expect(callOrder.indexOf("start")).toBeLessThan(
        callOrder.indexOf("update")
      );
      expect(callOrder.indexOf("update")).toBeLessThan(
        callOrder.indexOf("complete")
      );
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe("Performance and Memory", () => {
    it("should handle large number of elements efficiently", () => {
      const largeElementArray = Array.from(
        { length: 1000 },
        () => ({ tagName: "DIV" } as HTMLElement)
      );
      MockedElementResolver.resolve.mockReturnValue(largeElementArray);

      const animator = new CSSAnimator(baseConfig);

      expect(animator.elementCount).toBe(1000);
      expect(MockedElementManager).toHaveBeenCalledWith(largeElementArray);
      expect(MockedStaggerManager).toHaveBeenCalledWith(0, 1000, 1000);
    });

    it("should not leak memory on multiple updates", () => {
      const animator = new CSSAnimator(baseConfig);

      // Multiple updates should not accumulate state
      for (let i = 0; i < 100; i++) {
        animator.update(i / 100);
      }

      // Each update should use the same number of PropertyAnimator instances
      expect(MockedPropertyAnimator).toHaveBeenCalledTimes(300); // 100 updates * 3 elements
    });

    it("should handle rapid reset cycles", () => {
      const animator = new CSSAnimator(baseConfig);

      for (let i = 0; i < 10; i++) {
        animator.update(0.5);
        animator.reset();
      }

      expect(mockElementManager.reset).toHaveBeenCalledTimes(10);
    });
  });
});
