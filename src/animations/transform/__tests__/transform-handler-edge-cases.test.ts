/// @vitest-environment jsdom

import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  afterEach,
  beforeAll,
} from "vitest";
import { TransformHandler } from "../../transform/handler";
import { createValue } from "../../../core/animation-val";

// Mock DOMMatrix for testing environment
class MockDOMMatrix {
  public m11 = 1;
  public m12 = 0;
  public m13 = 0;
  public m14 = 0;
  public m21 = 0;
  public m22 = 1;
  public m23 = 0;
  public m24 = 0;
  public m31 = 0;
  public m32 = 0;
  public m33 = 1;
  public m34 = 0;
  public m41 = 0;
  public m42 = 0;
  public m43 = 0;
  public m44 = 1;

  public e = 0; // translateX (m41)
  public f = 0; // translateY (m42)

  constructor(
    m11 = 1,
    m12 = 0,
    m13 = 0,
    m14 = 0,
    m21 = 0,
    m22 = 1,
    m23 = 0,
    m24 = 0,
    m31 = 0,
    m32 = 0,
    m33 = 1,
    m34 = 0,
    m41 = 0,
    m42 = 0,
    m43 = 0,
    m44 = 1
  ) {
    this.m11 = m11;
    this.m12 = m12;
    this.m13 = m13;
    this.m14 = m14;
    this.m21 = m21;
    this.m22 = m22;
    this.m23 = m23;
    this.m24 = m24;
    this.m31 = m31;
    this.m32 = m32;
    this.m33 = m33;
    this.m34 = m34;
    this.m41 = m41;
    this.m42 = m42;
    this.m43 = m43;
    this.m44 = m44;

    this.e = m41;
    this.f = m42;
  }

  translate(x: number, y: number, z = 0) {
    const result = new MockDOMMatrix(
      this.m11,
      this.m12,
      this.m13,
      this.m14,
      this.m21,
      this.m22,
      this.m23,
      this.m24,
      this.m31,
      this.m32,
      this.m33,
      this.m34,
      this.m41 + x,
      this.m42 + y,
      this.m43 + z,
      this.m44
    );
    result.e = result.m41;
    result.f = result.m42;
    return result;
  }

  scale(x: number, y = x, z = 1) {
    return new MockDOMMatrix(
      this.m11 * x,
      this.m12 * x,
      this.m13 * x,
      this.m14,
      this.m21 * y,
      this.m22 * y,
      this.m23 * y,
      this.m24,
      this.m31 * z,
      this.m32 * z,
      this.m33 * z,
      this.m34,
      this.m41,
      this.m42,
      this.m43,
      this.m44
    );
  }

  rotate(x: number, y: number, z: number) {
    const rad = (z * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    return new MockDOMMatrix(
      cos,
      sin,
      0,
      0,
      -sin,
      cos,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1
    );
  }
}

beforeAll(() => {
  // @ts-expect-error - Adding DOMMatrix to global for tests
  global.DOMMatrix = MockDOMMatrix;
});

describe("TransformHandler - Edge Cases", () => {
  let element: HTMLElement;
  let handler: TransformHandler;

  beforeEach(() => {
    element = document.createElement("div");
    document.body.appendChild(element);
    handler = new TransformHandler(element);
  });

  afterEach(() => {
    document.body.removeChild(element);
  });

  describe("extreme values", () => {
    it("should handle very large translation values", () => {
      const largeValue = Number.MAX_SAFE_INTEGER;
      handler.updateTransform(
        "translateX",
        createValue.numeric(largeValue, "px")
      );

      const result = handler.currentValue("translateX");
      expect(result.value).toBe(largeValue);
      expect(handler.computeTransform()).toContain(
        `translate3d(${largeValue}px, 0px, 0px)`
      );
    });

    it("should handle very small but positive scale values", () => {
      const tinyValue = Number.MIN_VALUE;
      handler.updateTransform("scaleX", createValue.numeric(tinyValue, ""));

      const result = handler.currentValue("scaleX");
      expect(result.value).toBe(tinyValue);
    });

    it("should handle rotations beyond 360 degrees", () => {
      const largeRotation = 3600; // 10 full rotations
      handler.updateTransform(
        "rotateZ",
        createValue.numeric(largeRotation, "deg")
      );

      const result = handler.currentValue("rotateZ");
      expect(result.value).toBe(largeRotation);
      expect(handler.computeTransform()).toContain(
        `rotateZ(${largeRotation}deg)`
      );
    });

    it("should handle negative rotations", () => {
      const negativeRotation = -720; // -2 full rotations
      handler.updateTransform(
        "rotateY",
        createValue.numeric(negativeRotation, "deg")
      );

      const result = handler.currentValue("rotateY");
      expect(result.value).toBe(negativeRotation);
    });

    it("should handle very large skew values", () => {
      const largeSkew = 1000;
      handler.updateTransform("skewX", createValue.numeric(largeSkew, "deg"));

      const result = handler.currentValue("skewX");
      expect(result.value).toBe(largeSkew);
    });
  });

  describe("precision and floating point", () => {
    it("should maintain precision for small decimal values", () => {
      const preciseValue = 0.123456789;
      handler.updateTransform(
        "translateX",
        createValue.numeric(preciseValue, "px")
      );

      const result = handler.currentValue("translateX");
      expect(result.value).toBeCloseTo(preciseValue, 8);
    });

    it("should handle scientific notation values", () => {
      const scientificValue = 1.23e-5;
      handler.updateTransform(
        "scaleX",
        createValue.numeric(scientificValue, "")
      );

      const result = handler.currentValue("scaleX");
      expect(result.value).toBe(scientificValue);
    });

    it("should handle very close to zero but not zero values", () => {
      const nearZero = 1e-10;
      handler.updateTransform(
        "translateY",
        createValue.numeric(nearZero, "px")
      );

      const result = handler.currentValue("translateY");
      expect(result.value).toBe(nearZero);
      expect(handler.computeTransform()).toContain(
        `translate3d(0px, ${nearZero}px, 0px)`
      );
    });
  });

  describe("boundary conditions", () => {
    it("should handle interpolation at exact boundaries", () => {
      const from = createValue.numeric(0, "px");
      const to = createValue.numeric(100, "px");

      const atStart = handler.interpolate("translateX", from, to, 0);
      const atEnd = handler.interpolate("translateX", from, to, 1);

      expect(atStart.value).toBe(0);
      expect(atEnd.value).toBe(100);
    });

    it("should handle interpolation beyond normal progress range", () => {
      const from = createValue.numeric(0, "px");
      const to = createValue.numeric(100, "px");

      const beforeStart = handler.interpolate("translateX", from, to, -1);
      const afterEnd = handler.interpolate("translateX", from, to, 2);

      // Progress should be clamped to [0, 1]
      expect(beforeStart.value).toBe(0);
      expect(afterEnd.value).toBe(100);
    });

    it("should handle scale interpolation near zero", () => {
      const from = createValue.numeric(0.0001, "");
      const to = createValue.numeric(1, "");

      const result = handler.interpolate("scaleX", from, to, 0.5);
      expect(result.value).toBeGreaterThan(0);
      expect(result.value).toBeLessThan(1);
    });
  });

  describe("error recovery", () => {
    it("should recover from invalid DOM operations", () => {
      // Mock a failing style operation
      const originalStyleSetter = Object.getOwnPropertyDescriptor(
        element.style,
        "transform"
      )?.set;
      Object.defineProperty(element.style, "transform", {
        set: vi.fn(() => {
          throw new Error("Style operation failed");
        }),
        configurable: true,
      });

      // Should not throw when computing transform
      expect(() => {
        handler.updateTransform("translateX", createValue.numeric(100, "px"));
        handler.computeTransform();
      }).not.toThrow();

      // Restore original setter
      if (originalStyleSetter) {
        Object.defineProperty(element.style, "transform", {
          set: originalStyleSetter,
          configurable: true,
        });
      }
    });

    it("should handle corrupted transform state gracefully", () => {
      handler.updateTransform("translateX", createValue.numeric(100, "px"));

      // Directly corrupt the internal state (simulating memory corruption)
      const state = handler.getTransformState();
      (handler as any).transformState.translate.x = NaN;

      // Should handle NaN values gracefully
      const result = handler.computeTransform();
      expect(typeof result).toBe("string");
    });

    it("should handle parsing errors for malformed strings", () => {
      expect(() => {
        handler.parse("translateX", "not-a-number");
      }).toThrow();

      expect(() => {
        handler.parse("rotateZ", "45invalidunit");
      }).toThrow();
    });
  });

  describe("memory and performance", () => {
    it("should handle rapid successive updates efficiently", () => {
      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        handler.updateTransform("translateX", createValue.numeric(i, "px"));
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (1 second for 1000 operations)
      expect(duration).toBeLessThan(1000);

      // Final value should be correct
      const result = handler.currentValue("translateX");
      expect(result.value).toBe(iterations - 1);
    });

    it("should handle large batch updates", () => {
      const batchSize = 100;
      const updates = new Map();

      for (let i = 0; i < batchSize; i++) {
        updates.set("translateX", createValue.numeric(i * 10, "px"));
        updates.set("translateY", createValue.numeric(i * 5, "px"));
        updates.set("rotateZ", createValue.numeric(i * 3.6, "deg"));
      }

      expect(() => {
        handler.updateTransforms(updates);
      }).not.toThrow();

      const result = handler.computeTransform();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should cache effectively under high frequency access", () => {
      handler.updateTransform("translateX", createValue.numeric(100, "px"));

      const computeCount = 1000;
      const results = [];

      for (let i = 0; i < computeCount; i++) {
        results.push(handler.computeTransform());
      }

      // All results should be identical (cached)
      const firstResult = results[0];
      expect(results.every((result) => result === firstResult)).toBe(true);
    });
  });

  describe("concurrent operations", () => {
    it("should handle interleaved updates and reads", () => {
      const operations: any[] = [];

      // Interleave updates and reads
      for (let i = 0; i < 50; i++) {
        operations.push(() => {
          handler.updateTransform("translateX", createValue.numeric(i, "px"));
        });
        operations.push(() => {
          return handler.currentValue("translateX");
        });
        operations.push(() => {
          return handler.computeTransform();
        });
      }

      expect(() => {
        operations.forEach((op) => op());
      }).not.toThrow();
    });

    it("should maintain consistency across multiple property updates", () => {
      const properties = [
        "translateX",
        "translateY",
        "rotateZ",
        "scaleX",
        "scaleY",
      ] as const;
      const values = [100, 50, 45, 2, 1.5];

      // Update all properties
      properties.forEach((prop, index) => {
        const unit = prop.startsWith("translate")
          ? "px"
          : prop.startsWith("rotate")
          ? "deg"
          : "";
        handler.updateTransform(prop, createValue.numeric(values[index], unit));
      });

      // Verify all values are correctly stored
      properties.forEach((prop, index) => {
        const result = handler.currentValue(prop);
        expect(result.value).toBe(values[index]);
      });

      // Verify transform string contains all transforms
      const transformString = handler.computeTransform();
      expect(transformString).toContain("translate3d(100px, 50px, 0px)");
      expect(transformString).toContain("rotateZ(45deg)");
      expect(transformString).toContain("scale3d(2, 1.5, 1)");
    });
  });

  describe("special numeric values", () => {
    it("should handle Infinity values gracefully", () => {
      expect(() => {
        handler.updateTransform(
          "translateX",
          createValue.numeric(Infinity, "px")
        );
      }).not.toThrow();

      const result = handler.currentValue("translateX");
      expect(result.value).toBe(Infinity);
    });

    it("should handle -Infinity values gracefully", () => {
      expect(() => {
        handler.updateTransform(
          "translateY",
          createValue.numeric(-Infinity, "px")
        );
      }).not.toThrow();

      const result = handler.currentValue("translateY");
      expect(result.value).toBe(-Infinity);
    });

    it("should handle NaN values gracefully", () => {
      expect(() => {
        handler.updateTransform("rotateZ", createValue.numeric(NaN, "deg"));
      }).not.toThrow();

      const result = handler.currentValue("rotateZ");
      expect(result.value).toBeNaN();
    });

    it("should generate valid transform string even with special values", () => {
      handler.updateTransform(
        "translateX",
        createValue.numeric(Infinity, "px")
      );
      handler.updateTransform("rotateY", createValue.numeric(NaN, "deg"));

      const transformString = handler.computeTransform();
      expect(typeof transformString).toBe("string");
    });
  });

  describe("element lifecycle", () => {
    it("should handle detached elements", () => {
      const detachedElement = document.createElement("div");
      const detachedHandler = new TransformHandler(detachedElement);

      expect(() => {
        detachedHandler.updateTransform(
          "translateX",
          createValue.numeric(100, "px")
        );
        detachedHandler.computeTransform();
      }).not.toThrow();
    });

    it("should handle elements that get reattached", () => {
      const reattachElement = document.createElement("div");
      document.body.appendChild(reattachElement);

      const reattachHandler = new TransformHandler(reattachElement);
      reattachHandler.updateTransform(
        "translateX",
        createValue.numeric(100, "px")
      );

      // Detach and reattach
      document.body.removeChild(reattachElement);
      document.body.appendChild(reattachElement);

      expect(() => {
        reattachHandler.updateTransform(
          "translateY",
          createValue.numeric(50, "px")
        );
        const result = reattachHandler.computeTransform();
        expect(result).toContain("translate3d(100px, 50px, 0px)");
      }).not.toThrow();

      document.body.removeChild(reattachElement);
    });
  });

  describe("transform combinations edge cases", () => {
    it("should handle all transform types at maximum values", () => {
      const maxValues = {
        translateX: createValue.numeric(1000000, "px"),
        translateY: createValue.numeric(-1000000, "px"),
        translateZ: createValue.numeric(500000, "px"),
        rotateX: createValue.numeric(7200, "deg"), // 20 full rotations
        rotateY: createValue.numeric(-3600, "deg"), // -10 full rotations
        rotateZ: createValue.numeric(1800, "deg"), // 5 full rotations
        scaleX: createValue.numeric(100, ""),
        scaleY: createValue.numeric(0.001, ""),
        scaleZ: createValue.numeric(50, ""),
        skewX: createValue.numeric(89, "deg"), // Near maximum useful skew
        skewY: createValue.numeric(-89, "deg"),
      };

      Object.entries(maxValues).forEach(([prop, value]) => {
        handler.updateTransform(prop as any, value);
      });

      const result = handler.computeTransform();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);

      // Should contain all transform functions
      expect(result).toContain("translate3d");
      expect(result).toContain("rotateZ");
      expect(result).toContain("rotateY");
      expect(result).toContain("rotateX");
      expect(result).toContain("scale3d");
      expect(result).toContain("skew");
    });

    it("should handle transforms that cancel each other out", () => {
      // Set transforms that should result in near-identity
      handler.updateTransform("scaleX", createValue.numeric(2, ""));
      handler.updateTransform("scaleY", createValue.numeric(0.5, ""));
      handler.updateTransform("rotateZ", createValue.numeric(360, "deg")); // Full rotation
      handler.updateTransform("translateX", createValue.numeric(100, "px"));
      handler.updateTransform("translateY", createValue.numeric(-100, "px"));

      const result = handler.computeTransform();
      expect(result).toContain("translate3d(100px, -100px, 0px)");
      expect(result).toContain("rotateZ(360deg)");
      expect(result).toContain("scale3d(2, 0.5, 1)");
    });
  });
});
