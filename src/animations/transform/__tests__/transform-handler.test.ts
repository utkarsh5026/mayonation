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
import type { TransformPropertyName } from "../types";
import { TransformHandler } from "../handler";
import { createValue, NumericValue } from "../../../core/animation-val";

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
    m11OrTransformString?: number | string,
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
    // Handle matrix string parsing
    if (typeof m11OrTransformString === "string") {
      this.parseMatrixString(m11OrTransformString);
    } else {
      this.m11 = m11OrTransformString ?? 1;
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
  }

  private parseMatrixString(transformString: string) {
    // Parse 2D matrix: matrix(a, b, c, d, tx, ty)
    const matrixMatch = transformString.match(/matrix\(([^)]+)\)/);
    if (matrixMatch) {
      const values = matrixMatch[1].split(",").map((v) => parseFloat(v.trim()));
      if (values.length === 6) {
        this.m11 = values[0]; // a
        this.m12 = values[1]; // b
        this.m13 = 0;
        this.m14 = 0;
        this.m21 = values[2]; // c
        this.m22 = values[3]; // d
        this.m23 = 0;
        this.m24 = 0;
        this.m31 = 0;
        this.m32 = 0;
        this.m33 = 1;
        this.m34 = 0;
        this.m41 = values[4]; // tx
        this.m42 = values[5]; // ty
        this.m43 = 0;
        this.m44 = 1;

        this.e = this.m41;
        this.f = this.m42;
        return;
      }
    }

    // Default to identity matrix if parsing fails
    this.m11 = 1;
    this.m12 = 0;
    this.m13 = 0;
    this.m14 = 0;
    this.m21 = 0;
    this.m22 = 1;
    this.m23 = 0;
    this.m24 = 0;
    this.m31 = 0;
    this.m32 = 0;
    this.m33 = 1;
    this.m34 = 0;
    this.m41 = 0;
    this.m42 = 0;
    this.m43 = 0;
    this.m44 = 1;
    this.e = 0;
    this.f = 0;
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

  // Mock getComputedStyle to return element's actual transform
  const originalGetComputedStyle = window.getComputedStyle;
  window.getComputedStyle = (element: Element) => {
    const htmlElement = element as HTMLElement;
    return {
      ...originalGetComputedStyle(element),
      transform: htmlElement.style.transform || "none",
    } as CSSStyleDeclaration;
  };
});

describe("TransformHandler", () => {
  let element: HTMLElement;
  let handler: TransformHandler;

  beforeEach(() => {
    element = document.createElement("div");
    document.body.appendChild(element);
    handler = new TransformHandler(element);
  });

  describe("initialization", () => {
    it("should initialize with default transform state", () => {
      expect(handler.computeTransform()).toBe("");
    });
  });

  describe("transform updates", () => {
    it("should handle translation updates", () => {
      handler.updateTransform("translateX", createValue.numeric(100, "px"));
      expect(handler.computeTransform()).toBe("translate3d(100px, 0px, 0px)");
    });

    it("should handle scale updates", () => {
      handler.updateTransform("scale", createValue.numeric(2, ""));
      expect(handler.computeTransform()).toBe("scale3d(2, 2, 1)");
    });

    it("should handle multiple transform updates", () => {
      const updates = new Map<TransformPropertyName, NumericValue>([
        ["translateX", createValue.numeric(100, "px")],
        ["scale", createValue.numeric(2, "")],
        ["rotateX", createValue.numeric(90, "deg")],
      ]);

      handler.updateTransforms(updates);
      expect(handler.computeTransform()).toBe(
        "translate3d(100px, 0px, 0px) rotateX(90deg) scale3d(2, 2, 1)"
      );
    });

    it("should handle negative translations", () => {
      handler.updateTransform("translateX", createValue.numeric(-100, "px"));
      expect(handler.computeTransform()).toBe("translate3d(-100px, 0px, 0px)");
    });

    it("should handle fractional translations", () => {
      handler.updateTransform("translateX", createValue.numeric(10.5, "px"));
      expect(handler.computeTransform()).toBe("translate3d(10.5px, 0px, 0px)");
    });

    it("should handle fractional scale values", () => {
      handler.updateTransform("scale", createValue.numeric(1.5, ""));
      expect(handler.computeTransform()).toBe("scale3d(1.5, 1.5, 1)");
    });

    it("should handle very small scale values", () => {
      handler.updateTransform("scale", createValue.numeric(0.0001, ""));
      expect(handler.computeTransform()).toBe("scale3d(0.0001, 0.0001, 1)");
    });

    it("should handle mixed unit translations", () => {
      handler.updateTransform("translateX", createValue.numeric(50, "px"));
      handler.updateTransform("translateY", createValue.numeric(2, "em"));

      const result = handler.computeTransform();
      expect(result).toBe("translate3d(50px, 2px, 0px)"); // em gets converted to px in numeric value
    });

    it("should handle skew transforms", () => {
      handler.updateTransform("skewX", createValue.numeric(15, "deg"));
      handler.updateTransform("skewY", createValue.numeric(-10, "deg"));

      expect(handler.computeTransform()).toBe("skew(15deg, -10deg)");
    });

    it("should omit zero skew values", () => {
      handler.updateTransform("skewX", createValue.numeric(0, "deg"));
      handler.updateTransform("skewY", createValue.numeric(0, "deg"));

      expect(handler.computeTransform()).toBe("");
    });
  });

  describe("getCurrentTransform", () => {
    it("should return current transform values", () => {
      handler.updateTransform("translateX", createValue.numeric(100, "px"));
      const value = handler.getCurrentTransform("translateX");
      expect(value).toEqual(createValue.numeric(100, "px"));
    });

    it("should return default values for unset properties", () => {
      const translateX = handler.getCurrentTransform("translateX");
      const rotateZ = handler.getCurrentTransform("rotateZ");
      const scaleX = handler.getCurrentTransform("scaleX");

      expect(translateX).toEqual(createValue.numeric(0, "px"));
      expect(rotateZ).toEqual(createValue.numeric(0, "deg"));
      expect(scaleX).toEqual(createValue.numeric(1, ""));
    });

    it("should throw error for invalid property", () => {
      expect(() => {
        handler.getCurrentTransform("invalid" as any);
      }).toThrow("Unsupported property: invalid");
    });

    it("should handle all transform property types", () => {
      const properties: {
        prop: TransformPropertyName;
        value: number;
        unit: string;
      }[] = [
        { prop: "translateX", value: 50, unit: "px" },
        { prop: "translateY", value: -25, unit: "px" },
        { prop: "translateZ", value: 10, unit: "px" },
        { prop: "rotateX", value: 45, unit: "deg" },
        { prop: "rotateY", value: -30, unit: "deg" },
        { prop: "rotateZ", value: 90, unit: "deg" },
        { prop: "scaleX", value: 1.5, unit: "" },
        { prop: "scaleY", value: 0.8, unit: "" },
        { prop: "scaleZ", value: 2, unit: "" },
        { prop: "skewX", value: 15, unit: "deg" },
        { prop: "skewY", value: -10, unit: "deg" },
      ];

      properties.forEach(({ prop, value, unit }) => {
        handler.updateTransform(prop, createValue.numeric(value, unit as any));
        const result = handler.getCurrentTransform(prop);
        expect(result).toEqual(createValue.numeric(value, unit as any));
      });
    });
  });

  describe("interpolation", () => {
    it("should interpolate translation linearly", () => {
      const result = handler.interpolate(
        "translateX",
        createValue.numeric(0, "px"),
        createValue.numeric(100, "px"),
        0.5
      );
      expect(result).toEqual(createValue.numeric(50, "px"));
    });

    it("should interpolate scale logarithmically", () => {
      const result = handler.interpolate(
        "scale",
        createValue.numeric(1, ""),
        createValue.numeric(4, ""),
        0.5
      );
      expect(result.value).toBeCloseTo(2); // Geometric mean of 1 and 4
      expect(result.unit).toBe("");
    });

    it("should handle rotation interpolation beyond 360 degrees", () => {
      const result = handler.interpolate(
        "rotateX",
        createValue.numeric(0, "deg"),
        createValue.numeric(720, "deg"),
        0.5
      );
      expect(result).toEqual(createValue.numeric(360, "deg"));
    });

    it("should handle negative to positive rotation interpolation", () => {
      const result = handler.interpolate(
        "rotateX",
        createValue.numeric(-180, "deg"),
        createValue.numeric(180, "deg"),
        0.5
      );
      expect(result).toEqual(createValue.numeric(0, "deg"));
    });

    it("should handle very small scale interpolation", () => {
      const result = handler.interpolate(
        "scale",
        createValue.numeric(0.0001, ""),
        createValue.numeric(1, ""),
        0.5
      );
      expect(result.value).toBeGreaterThan(0);
      expect(result.unit).toBe("");
    });

    it("should handle rotation direction preferences", () => {
      const result1 = handler.interpolate(
        "rotateZ",
        createValue.numeric(350, "deg"),
        createValue.numeric(10, "deg"),
        0.5
      );

      expect(result1.value).toBeCloseTo(180, 1);
    });

    it("should interpolate 3D rotations", () => {
      const rotateX = handler.interpolate(
        "rotateX",
        createValue.numeric(0, "deg"),
        createValue.numeric(90, "deg"),
        0.5
      );

      const rotateY = handler.interpolate(
        "rotateY",
        createValue.numeric(-45, "deg"),
        createValue.numeric(45, "deg"),
        0.5
      );

      expect(rotateX.value).toBe(45);
      expect(rotateY.value).toBe(0);
    });

    it("should interpolate skew transforms", () => {
      const skewX = handler.interpolate(
        "skewX",
        createValue.numeric(0, "deg"),
        createValue.numeric(30, "deg"),
        0.5
      );

      const skewY = handler.interpolate(
        "skewY",
        createValue.numeric(-15, "deg"),
        createValue.numeric(15, "deg"),
        0.25
      );

      expect(skewX.value).toBe(15);
      expect(skewY.value).toBe(-7.5);
    });

    it("should throw error for invalid scale values", () => {
      expect(() => {
        handler.interpolate(
          "scale",
          createValue.numeric(-1, ""),
          createValue.numeric(1, ""),
          0.5
        );
      }).toThrow("Scale values must be positive numbers");
    });
  });

  describe("reset", () => {
    it("should reset all transforms to initial state", () => {
      handler.updateTransform("translateX", createValue.numeric(100, "px"));
      handler.updateTransform("rotateY", createValue.numeric(90, "deg"));
      handler.reset();
      expect(handler.computeTransform()).toBe("");
    });

    it("should reset all transform properties to defaults", () => {
      const updates = new Map<TransformPropertyName, NumericValue>([
        ["translateX", createValue.numeric(100, "px")],
        ["translateY", createValue.numeric(50, "px")],
        ["translateZ", createValue.numeric(25, "px")],
        ["rotateX", createValue.numeric(45, "deg")],
        ["rotateY", createValue.numeric(30, "deg")],
        ["rotateZ", createValue.numeric(90, "deg")],
        ["scaleX", createValue.numeric(2, "")],
        ["scaleY", createValue.numeric(1.5, "")],
        ["scaleZ", createValue.numeric(0.8, "")],
        ["skewX", createValue.numeric(15, "deg")],
        ["skewY", createValue.numeric(-10, "deg")],
      ]);

      handler.updateTransforms(updates);
      handler.reset();

      expect(handler.getCurrentTransform("translateX").value).toBe(0);
      expect(handler.getCurrentTransform("translateY").value).toBe(0);
      expect(handler.getCurrentTransform("translateZ").value).toBe(0);
      expect(handler.getCurrentTransform("rotateX").value).toBe(0);
      expect(handler.getCurrentTransform("rotateY").value).toBe(0);
      expect(handler.getCurrentTransform("rotateZ").value).toBe(0);
      expect(handler.getCurrentTransform("scaleX").value).toBe(1);
      expect(handler.getCurrentTransform("scaleY").value).toBe(1);
      expect(handler.getCurrentTransform("scaleZ").value).toBe(1);
      expect(handler.getCurrentTransform("skewX").value).toBe(0);
      expect(handler.getCurrentTransform("skewY").value).toBe(0);
    });

    it("should apply reset to DOM element", () => {
      handler.updateTransform("translateX", createValue.numeric(100, "px"));
      handler.reset();

      expect(element.style.transform).toBe("");
    });
  });

  describe("static methods", () => {
    it("should validate transform properties", () => {
      expect(TransformHandler.isTransformProperty("translateX")).toBe(true);
      expect(TransformHandler.isTransformProperty("invalid")).toBe(false);
    });
  });

  describe("transform state management", () => {
    it("should maintain transform order consistency", () => {
      const updates = new Map<TransformPropertyName, NumericValue>([
        ["scale", createValue.numeric(2, "")],
        ["rotateX", createValue.numeric(90, "deg")],
        ["translateX", createValue.numeric(100, "px")],
      ]);

      handler.updateTransforms(updates);
      const transform = handler.computeTransform();
      // Order should be: translate -> rotate -> scale
      expect(transform).toBe(
        "translate3d(100px, 0px, 0px) rotateX(90deg) scale3d(2, 2, 1)"
      );
    });

    it("should handle multiple updates to same property", () => {
      handler.updateTransform("translateX", createValue.numeric(100, "px"));
      handler.updateTransform("translateX", createValue.numeric(200, "px"));
      expect(handler.computeTransform()).toBe("translate3d(200px, 0px, 0px)");
    });

    it("should handle concurrent updates to different axes", () => {
      handler.updateTransform("translateX", createValue.numeric(100, "px"));
      handler.updateTransform("translateY", createValue.numeric(200, "px"));
      expect(handler.computeTransform()).toBe("translate3d(100px, 200px, 0px)");
    });

    it("should handle 3D transforms", () => {
      handler.updateTransform("translateZ", createValue.numeric(50, "px"));
      handler.updateTransform("rotateX", createValue.numeric(30, "deg"));
      handler.updateTransform("rotateY", createValue.numeric(45, "deg"));
      handler.updateTransform("scaleZ", createValue.numeric(1.5, ""));

      const result = handler.computeTransform();
      expect(result).toContain("translate3d(0px, 0px, 50px)");
      expect(result).toContain("rotateY(45deg)");
      expect(result).toContain("rotateX(30deg)");
      expect(result).toContain("scale3d(1, 1, 1.5)");
    });

    it("should handle extreme values", () => {
      handler.updateTransform("translateX", createValue.numeric(999999, "px"));
      handler.updateTransform("rotateZ", createValue.numeric(3600, "deg"));
      handler.updateTransform("scaleX", createValue.numeric(0.00001, ""));

      const result = handler.computeTransform();
      expect(result).toContain("translate3d(999999px, 0px, 0px)");
      expect(result).toContain("rotateZ(3600deg)");
      expect(result).toContain("scale3d(0.00001, 1, 1)");
    });
  });

  describe("parsing", () => {
    it("should parse numeric values with correct units", () => {
      const translateValue = handler.parse("translateX", 100);
      const rotateValue = handler.parse("rotateZ", 45);
      const scaleValue = handler.parse("scaleX", 1.5);
      const skewValue = handler.parse("skewX", 30);

      expect(translateValue).toEqual(createValue.numeric(100, "px"));
      expect(rotateValue).toEqual(createValue.numeric(45, "deg"));
      expect(scaleValue).toEqual(createValue.numeric(1.5, ""));
      expect(skewValue).toEqual(createValue.numeric(30, "deg"));
    });

    it("should parse string values with units", () => {
      const translateValue = handler.parse("translateX", "50px");
      const rotateValue = handler.parse("rotateZ", "90deg");
      const scaleValue = handler.parse("scaleX", "2");

      expect(translateValue).toEqual(createValue.numeric(50, "px"));
      expect(rotateValue).toEqual(createValue.numeric(90, "deg"));
      expect(scaleValue).toEqual(createValue.numeric(2, ""));
    });

    it("should handle alternative units", () => {
      const translateEm = handler.parse("translateX", "2em");
      const rotateRad = handler.parse("rotateZ", "1.57rad");
      const translatePercent = handler.parse("translateY", "50%");

      expect(translateEm.unit).toBe("em");
      expect(rotateRad.unit).toBe("rad");
      expect(translatePercent.unit).toBe("%");
    });

    it("should throw error for unsupported properties", () => {
      expect(() => {
        handler.parse("invalid" as any, 100);
      }).toThrow("Unsupported property: invalid");
    });

    it("should throw error for invalid string values", () => {
      expect(() => {
        handler.parse("translateX", "invalid");
      }).toThrow();
    });
  });

  describe("error handling", () => {
    it("should handle zero values correctly", () => {
      handler.updateTransform("translateX", createValue.numeric(0, "px"));
      handler.updateTransform("rotateX", createValue.numeric(0, "deg"));
      handler.updateTransform("scale", createValue.numeric(1, ""));
      expect(handler.computeTransform()).toBe("");
    });

    it("should handle negative scale values by clamping to 0", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      handler.updateTransform("scaleX", createValue.numeric(-1, ""));
      const result = handler.getCurrentTransform("scaleX");

      expect(result.value).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Negative scale value for scaleX, clamping to 0"
      );

      consoleSpy.mockRestore();
    });

    it("should handle unit mismatches in interpolation", () => {
      expect(() => {
        handler.interpolate(
          "translateX",
          createValue.numeric(100, "px"),
          createValue.numeric(50, "em"),
          0.5
        );
      }).toThrow("Unit mismatch for translateX: px vs em");
    });

    it("should clamp progress values in interpolation", () => {
      const result1 = handler.interpolate(
        "translateX",
        createValue.numeric(0, "px"),
        createValue.numeric(100, "px"),
        -0.5
      );

      const result2 = handler.interpolate(
        "translateX",
        createValue.numeric(0, "px"),
        createValue.numeric(100, "px"),
        1.5
      );

      expect(result1.value).toBe(0);
      expect(result2.value).toBe(100);
    });
  });

  describe("caching behavior", () => {
    it("should cache transform string when unchanged", () => {
      handler.updateTransform("translateX", createValue.numeric(100, "px"));
      const first = handler.computeTransform();
      const second = handler.computeTransform();
      expect(first).toBe(second);
    });

    it("should update cache when transform changes", () => {
      handler.updateTransform("translateX", createValue.numeric(100, "px"));
      const first = handler.computeTransform();
      handler.updateTransform("translateX", createValue.numeric(200, "px"));
      const second = handler.computeTransform();
      expect(first).not.toBe(second);
    });

    it("should invalidate cache after reset", () => {
      handler.updateTransform("translateX", createValue.numeric(100, "px"));
      const beforeReset = handler.computeTransform();
      handler.reset();
      const afterReset = handler.computeTransform();

      expect(beforeReset).toBe("translate3d(100px, 0px, 0px)");
      expect(afterReset).toBe("");
    });

    it("should handle batch updates efficiently", () => {
      const updates = new Map<TransformPropertyName, NumericValue>([
        ["translateX", createValue.numeric(100, "px")],
        ["translateY", createValue.numeric(50, "px")],
        ["rotateZ", createValue.numeric(45, "deg")],
        ["scaleX", createValue.numeric(2, "")],
        ["scaleY", createValue.numeric(1.5, "")],
      ]);

      handler.updateTransforms(updates);
      const result = handler.computeTransform();

      expect(result).toBe(
        "translate3d(100px, 50px, 0px) rotateZ(45deg) scale3d(2, 1.5, 1)"
      );
    });
  });

  describe("initial transform parsing", () => {
    let testElement: HTMLElement;

    beforeEach(() => {
      testElement = document.createElement("div");
      document.body.appendChild(testElement);
    });

    afterEach(() => {
      document.body.removeChild(testElement);
    });

    it("should parse existing matrix transforms", () => {
      testElement.style.transform = "matrix(1, 0, 0, 1, 100, 50)";
      const testHandler = new TransformHandler(testElement);

      const translateX = testHandler.getCurrentTransform("translateX");
      const translateY = testHandler.getCurrentTransform("translateY");

      expect(translateX.value).toBeCloseTo(100, 1);
      expect(translateY.value).toBeCloseTo(50, 1);
    });

    it("should handle transform function strings", () => {
      testElement.style.transform = "translateX(50px) rotateZ(45deg) scale(2)";
      const testHandler = new TransformHandler(testElement);

      const translateX = testHandler.getCurrentTransform("translateX");
      const rotateZ = testHandler.getCurrentTransform("rotateZ");
      const scaleX = testHandler.getCurrentTransform("scaleX");

      expect(translateX.value).toBe(50);
      expect(rotateZ.value).toBe(45);
      expect(scaleX.value).toBe(2);
    });

    it("should handle elements with no initial transform", () => {
      const testHandler = new TransformHandler(testElement);

      expect(testHandler.computeTransform()).toBe("");
    });
  });

  describe("transform string generation", () => {
    it("should generate correct transform strings for complex combinations", () => {
      const testCases = [
        {
          updates: [["translateX", 100, "px"]] as const,
          expected: "translate3d(100px, 0px, 0px)",
        },
        {
          updates: [["rotateZ", 45, "deg"]] as const,
          expected: "rotateZ(45deg)",
        },
        {
          updates: [
            ["scaleX", 2, ""],
            ["scaleY", 1.5, ""],
          ] as const,
          expected: "scale3d(2, 1.5, 1)",
        },
        {
          updates: [
            ["skewX", 15, "deg"],
            ["skewY", -10, "deg"],
          ] as const,
          expected: "skew(15deg, -10deg)",
        },
        {
          updates: [
            ["translateX", 50, "px"],
            ["translateY", 25, "px"],
            ["rotateZ", 30, "deg"],
            ["scaleX", 1.2, ""],
            ["skewX", 5, "deg"],
          ] as const,
          expected:
            "translate3d(50px, 25px, 0px) rotateZ(30deg) scale3d(1.2, 1, 1) skew(5deg, 0deg)",
        },
      ];

      testCases.forEach(({ updates, expected }) => {
        handler.reset();
        updates.forEach(([prop, value, unit]) => {
          handler.updateTransform(prop, createValue.numeric(value, unit));
        });
        expect(handler.computeTransform()).toBe(expected);
      });
    });

    it("should maintain correct transform order", () => {
      handler.updateTransform("scaleX", createValue.numeric(2, ""));
      handler.updateTransform("rotateZ", createValue.numeric(45, "deg"));
      handler.updateTransform("translateX", createValue.numeric(100, "px"));
      handler.updateTransform("skewX", createValue.numeric(10, "deg"));

      const result = handler.computeTransform();

      // Extract transform functions using regex instead of simple split
      const translateMatch = result.match(/translate3d\([^)]+\)/);
      const rotateMatch = result.match(/rotateZ\([^)]+\)/);
      const scaleMatch = result.match(/scale3d\([^)]+\)/);
      const skewMatch = result.match(/skew\([^)]+\)/);

      expect(translateMatch).not.toBeNull();
      expect(rotateMatch).not.toBeNull();
      expect(scaleMatch).not.toBeNull();
      expect(skewMatch).not.toBeNull();

      // Check order by finding index positions
      const translateIndex = result.indexOf(translateMatch![0]);
      const rotateIndex = result.indexOf(rotateMatch![0]);
      const scaleIndex = result.indexOf(scaleMatch![0]);
      const skewIndex = result.indexOf(skewMatch![0]);

      expect(translateIndex).toBeLessThan(rotateIndex);
      expect(rotateIndex).toBeLessThan(scaleIndex);
      expect(scaleIndex).toBeLessThan(skewIndex);
    });
  });

  describe("transform state management", () => {
    it("should provide read-only transform state", () => {
      handler.updateTransform("translateX", createValue.numeric(100, "px"));
      handler.updateTransform("rotateZ", createValue.numeric(45, "deg"));

      const state = handler.getTransformState();

      expect(state.translate.x).toBe(100);
      expect(state.rotate.z).toBe(45);

      // Verify it's a deep clone by modifying the returned state
      state.translate.x = 200;

      const newState = handler.getTransformState();
      expect(newState.translate.x).toBe(100); // Should remain unchanged
    });

    it("should handle shorthand properties correctly", () => {
      handler.updateTransform("scale", createValue.numeric(2, ""));

      const scaleX = handler.getCurrentTransform("scaleX");
      const scaleY = handler.getCurrentTransform("scaleY");

      expect(scaleX.value).toBe(2);
      expect(scaleY.value).toBe(2);
    });
  });

  describe("static methods", () => {
    it("should validate all transform properties", () => {
      const validProperties = [
        "translateX",
        "translateY",
        "translateZ",
        "rotateX",
        "rotateY",
        "rotateZ",
        "scaleX",
        "scaleY",
        "scaleZ",
        "scale",
        "skewX",
        "skewY",
      ];

      const invalidProperties = [
        "invalid",
        "transform",
        "opacity",
        "width",
        "height",
      ];

      validProperties.forEach((prop) => {
        expect(TransformHandler.isTransformProperty(prop)).toBe(true);
      });

      invalidProperties.forEach((prop) => {
        expect(TransformHandler.isTransformProperty(prop)).toBe(false);
      });
    });
  });
});
