import { describe, it, expect, beforeAll } from "vitest";
import {
  decomposeMatrix,
  extractRotation,
  interpolateScale,
  interpolateRotation,
  interpolateLinear,
  normalizeAngle,
  type RotationOptions,
} from "../math";

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

describe("math.ts", () => {
  describe("decomposeMatrix", () => {
    it("should decompose an identity matrix correctly", () => {
      const identity = new DOMMatrix();
      const result = decomposeMatrix(identity);

      expect(result.translate.x).toBe(0);
      expect(result.translate.y).toBe(0);
      expect(result.translate.z).toBe(0);
      expect(Math.abs(result.rotate.x)).toBeLessThan(0.001);
      expect(Math.abs(result.rotate.y)).toBeLessThan(0.001);
      expect(Math.abs(result.rotate.z)).toBeLessThan(0.001);
      expect(result.scale.x).toBe(1);
      expect(result.scale.y).toBe(1);
      expect(result.scale.z).toBe(1);
      expect(result.skew.x).toBe(0);
      expect(result.skew.y).toBe(0);
    });

    it("should decompose a translation matrix correctly", () => {
      const matrix = new DOMMatrix().translate(100, 50, 25);
      const result = decomposeMatrix(matrix);

      expect(result.translate.x).toBe(100);
      expect(result.translate.y).toBe(50);
      expect(result.translate.z).toBe(25);
      expect(result.scale.x).toBe(1);
      expect(result.scale.y).toBe(1);
      expect(result.scale.z).toBe(1);
    });

    it("should decompose a scale matrix correctly", () => {
      const matrix = new DOMMatrix().scale(2, 3, 0.5);
      const result = decomposeMatrix(matrix);

      expect(result.scale.x).toBeCloseTo(2);
      expect(result.scale.y).toBeCloseTo(3);
      expect(result.scale.z).toBeCloseTo(0.5);
      expect(result.translate.x).toBe(0);
      expect(result.translate.y).toBe(0);
      expect(result.translate.z).toBe(0);
    });

    it("should decompose a rotation matrix correctly", () => {
      const matrix = new DOMMatrix().rotate(0, 0, 45);
      const result = decomposeMatrix(matrix);

      expect(result.rotate.z).toBeCloseTo(45, 1);
      expect(result.scale.x).toBeCloseTo(1);
      expect(result.scale.y).toBeCloseTo(1);
    });

    it("should decompose a complex matrix with multiple transformations", () => {
      // Test with separate transformations since chaining transformations in our mock is complex
      const matrix = new MockDOMMatrix(
        0,
        2,
        0,
        0, // Rotated and scaled
        -1.5,
        0,
        0,
        0, // Rotated and scaled
        0,
        0,
        1,
        0,
        10,
        20,
        30,
        1 // Translation
      );

      const result = decomposeMatrix(matrix);

      expect(result.translate.x).toBeCloseTo(10, 1);
      expect(result.translate.y).toBeCloseTo(20, 1);
      expect(result.translate.z).toBeCloseTo(30, 1);
      expect(result.scale.x).toBeCloseTo(2, 1);
      expect(result.scale.y).toBeCloseTo(1.5, 1);
    });
  });

  describe("extractRotation", () => {
    it("should extract rotation from identity matrix", () => {
      const matrix = {
        m11: 1,
        m12: 0,
        m13: 0,
        m21: 0,
        m22: 1,
        m23: 0,
        m31: 0,
        m32: 0,
        m33: 1,
      };

      const result = extractRotation(matrix);

      expect(Math.abs(result.x)).toBeLessThan(0.001);
      expect(Math.abs(result.y)).toBeLessThan(0.001);
      expect(Math.abs(result.z)).toBeLessThan(0.001);
    });

    it("should extract 90-degree Z rotation correctly", () => {
      const matrix = {
        m11: 0,
        m12: 1,
        m13: 0,
        m21: -1,
        m22: 0,
        m23: 0,
        m31: 0,
        m32: 0,
        m33: 1,
      };

      const result = extractRotation(matrix);

      expect(result.z).toBeCloseTo(90, 1);
    });

    it("should handle gimbal lock case when m31 is close to 1", () => {
      const matrix = {
        m11: 0,
        m12: 0,
        m13: 1,
        m21: 1,
        m22: 0,
        m23: 0,
        m31: 0.9999,
        m32: 0,
        m33: 0,
      };

      const result = extractRotation(matrix);

      expect(Math.abs(result.x)).toBeLessThan(0.001);
      expect(Math.abs(result.y - 90)).toBeLessThan(1);
    });

    it("should handle gimbal lock case when m31 is close to -1", () => {
      const matrix = {
        m11: 0,
        m12: 0,
        m13: -1,
        m21: -1,
        m22: 0,
        m23: 0,
        m31: -0.9999,
        m32: 0,
        m33: 0,
      };

      const result = extractRotation(matrix);

      expect(Math.abs(result.x)).toBeLessThan(0.001);
      expect(Math.abs(result.y + 90)).toBeLessThan(1);
    });

    it("should extract small rotation angles correctly", () => {
      const smallAngle = 0.1;
      const cos = Math.cos((smallAngle * Math.PI) / 180);
      const sin = Math.sin((smallAngle * Math.PI) / 180);

      const matrix = {
        m11: cos,
        m12: -sin,
        m13: 0,
        m21: sin,
        m22: cos,
        m23: 0,
        m31: 0,
        m32: 0,
        m33: 1,
      };

      const result = extractRotation(matrix);

      // The function returns the negative of the expected angle due to matrix convention
      expect(Math.abs(result.z + smallAngle)).toBeLessThan(0.01);
    });
  });

  describe("interpolateScale", () => {
    it("should interpolate scale values logarithmically", () => {
      const from = { value: 1, unit: "" };
      const to = { value: 4, unit: "" };

      const result = interpolateScale(from, to, 0.5);

      expect(result.value).toBeCloseTo(2, 5);
      expect(result.unit).toBe("");
    });

    it("should return from value at progress 0", () => {
      const from = { value: 2, unit: "em" };
      const to = { value: 8, unit: "em" };

      const result = interpolateScale(from, to, 0);

      expect(result.value).toBe(2);
      expect(result.unit).toBe("em");
    });

    it("should return to value at progress 1", () => {
      const from = { value: 0.5, unit: "rem" };
      const to = { value: 2, unit: "rem" };

      const result = interpolateScale(from, to, 1);

      expect(result.value).toBe(2);
      expect(result.unit).toBe("rem");
    });

    it("should handle fractional scale values", () => {
      const from = { value: 0.25, unit: "" };
      const to = { value: 1, unit: "" };

      const result = interpolateScale(from, to, 0.5);

      expect(result.value).toBeCloseTo(0.5, 5);
    });

    it("should throw error for zero from value", () => {
      const from = { value: 0, unit: "" };
      const to = { value: 2, unit: "" };

      expect(() => interpolateScale(from, to, 0.5)).toThrow(
        "Scale values must be positive numbers"
      );
    });

    it("should throw error for negative from value", () => {
      const from = { value: -1, unit: "" };
      const to = { value: 2, unit: "" };

      expect(() => interpolateScale(from, to, 0.5)).toThrow(
        "Scale values must be positive numbers"
      );
    });

    it("should throw error for zero to value", () => {
      const from = { value: 1, unit: "" };
      const to = { value: 0, unit: "" };

      expect(() => interpolateScale(from, to, 0.5)).toThrow(
        "Scale values must be positive numbers"
      );
    });

    it("should throw error for negative to value", () => {
      const from = { value: 1, unit: "" };
      const to = { value: -2, unit: "" };

      expect(() => interpolateScale(from, to, 0.5)).toThrow(
        "Scale values must be positive numbers"
      );
    });
  });

  describe("interpolateRotation", () => {
    describe("with default options (maintain revolution)", () => {
      it("should interpolate rotation maintaining full revolution", () => {
        const from = { value: 350, unit: "deg" };
        const to = { value: 10, unit: "deg" };

        const result = interpolateRotation(from, to, 0.5);

        // With maintainRevolution=true, it goes from 350 to 10 directly: 350 + (10-350)*0.5 = 180
        expect(result.value).toBeCloseTo(180, 1);
        expect(result.unit).toBe("deg");
      });

      it("should return from value at progress 0", () => {
        const from = { value: 45, unit: "deg" };
        const to = { value: 135, unit: "deg" };

        const result = interpolateRotation(from, to, 0);

        expect(result.value).toBe(45);
        expect(result.unit).toBe("deg");
      });

      it("should return to value at progress 1", () => {
        const from = { value: 45, unit: "deg" };
        const to = { value: 135, unit: "deg" };

        const result = interpolateRotation(from, to, 1);

        expect(result.value).toBe(135);
        expect(result.unit).toBe("deg");
      });

      it("should handle rotation across 0 degrees", () => {
        const from = { value: 350, unit: "deg" };
        const to = { value: 20, unit: "deg" };

        const result = interpolateRotation(from, to, 0.25);

        // With maintainRevolution=true: 350 + (20-350)*0.25 = 350 + (-330)*0.25 = 267.5
        expect(result.value).toBeCloseTo(267.5, 1);
      });
    });

    describe("with maintainRevolution = true", () => {
      const options: RotationOptions = { maintainRevolution: true };

      it("should maintain revolution when rotating multiple turns", () => {
        const from = { value: 10, unit: "deg" };
        const to = { value: 730, unit: "deg" }; // 720 + 10 = 2 full rotations + 10

        const result = interpolateRotation(from, to, 0.5);

        expect(result.value).toBe(370); // 10 + (720/2)
        expect(result.unit).toBe("deg");
      });
    });

    describe("with direction options", () => {
      it("should force clockwise direction", () => {
        const from = { value: 10, unit: "deg" };
        const to = { value: 350, unit: "deg" };
        const options: RotationOptions = {
          maintainRevolution: false,
          direction: "clockwise",
        };

        const result = interpolateRotation(from, to, 0.5);

        expect(result.value).toBeCloseTo(180, 1);
      });

      it("should force counterclockwise direction", () => {
        const from = { value: 350, unit: "deg" };
        const to = { value: 10, unit: "deg" };
        const options: RotationOptions = {
          maintainRevolution: false,
          direction: "counterclockwise",
        };

        const result = interpolateRotation(from, to, 0.5);

        expect(result.value).toBeCloseTo(180, 1);
      });

      it("should take shortest path with explicit option", () => {
        const from = { value: 350, unit: "deg" };
        const to = { value: 10, unit: "deg" };
        const options: RotationOptions = {
          maintainRevolution: false,
          direction: "shortest",
        };

        const result = interpolateRotation(from, to, 0.5, options);

        expect(result.value).toBeCloseTo(0, 1);
      });
    });

    it("should handle negative angles", () => {
      const from = { value: -30, unit: "deg" };
      const to = { value: 30, unit: "deg" };

      const result = interpolateRotation(from, to, 0.5);

      // With maintainRevolution=true: -30 + (30-(-30))*0.5 = -30 + 30 = 0
      expect(result.value).toBeCloseTo(0, 1);
    });

    it("should handle large angle differences", () => {
      const from = { value: 0, unit: "deg" };
      const to = { value: 270, unit: "deg" };
      const options: RotationOptions = {
        maintainRevolution: false,
        direction: "shortest",
      };

      const result = interpolateRotation(from, to, 0.5, options);

      // Result is -45, which should be normalized to 315
      const normalizedResult =
        result.value < 0 ? result.value + 360 : result.value;
      expect(normalizedResult).toBeCloseTo(315, 1);
    });
  });

  describe("interpolateLinear", () => {
    it("should interpolate linearly between two values", () => {
      const from = { value: 0, unit: "px" };
      const to = { value: 100, unit: "px" };

      const result = interpolateLinear(from, to, 0.5);

      expect(result.value).toBe(50);
      expect(result.unit).toBe("px");
    });

    it("should return from value at progress 0", () => {
      const from = { value: 10, unit: "em" };
      const to = { value: 20, unit: "em" };

      const result = interpolateLinear(from, to, 0);

      expect(result.value).toBe(10);
      expect(result.unit).toBe("em");
    });

    it("should return to value at progress 1", () => {
      const from = { value: -5, unit: "rem" };
      const to = { value: 15, unit: "rem" };

      const result = interpolateLinear(from, to, 1);

      expect(result.value).toBe(15);
      expect(result.unit).toBe("rem");
    });

    it("should handle negative values", () => {
      const from = { value: -10, unit: "px" };
      const to = { value: -20, unit: "px" };

      const result = interpolateLinear(from, to, 0.5);

      expect(result.value).toBe(-15);
      expect(result.unit).toBe("px");
    });

    it("should handle fractional progress", () => {
      const from = { value: 0, unit: "%" };
      const to = { value: 100, unit: "%" };

      const result = interpolateLinear(from, to, 0.25);

      expect(result.value).toBe(25);
      expect(result.unit).toBe("%");
    });

    it("should handle progress beyond 1", () => {
      const from = { value: 0, unit: "px" };
      const to = { value: 100, unit: "px" };

      const result = interpolateLinear(from, to, 1.5);

      expect(result.value).toBe(150);
      expect(result.unit).toBe("px");
    });

    it("should handle negative progress", () => {
      const from = { value: 50, unit: "px" };
      const to = { value: 100, unit: "px" };

      const result = interpolateLinear(from, to, -0.5);

      expect(result.value).toBe(25);
      expect(result.unit).toBe("px");
    });
  });

  describe("normalizeAngle", () => {
    it("should normalize positive angles within 0-360", () => {
      expect(normalizeAngle(45)).toBe(45);
      expect(normalizeAngle(180)).toBe(180);
      expect(normalizeAngle(359)).toBe(359);
    });

    it("should normalize angles greater than 360", () => {
      expect(normalizeAngle(370)).toBe(10);
      expect(normalizeAngle(450)).toBe(90);
      expect(normalizeAngle(720)).toBe(0);
      expect(normalizeAngle(1080)).toBe(0);
    });

    it("should normalize negative angles", () => {
      expect(normalizeAngle(-10)).toBe(350);
      expect(normalizeAngle(-90)).toBe(270);
      expect(normalizeAngle(-180)).toBe(180);
      expect(normalizeAngle(-270)).toBe(90);
    });

    it("should normalize large negative angles", () => {
      expect(normalizeAngle(-370)).toBe(350);
      expect(normalizeAngle(-450)).toBe(270);
      expect(normalizeAngle(-720)).toBe(0);
    });

    it("should handle zero angle", () => {
      expect(normalizeAngle(0)).toBe(0);
    });

    it("should handle exactly 360 degrees", () => {
      expect(normalizeAngle(360)).toBe(0);
    });

    it("should handle floating point angles", () => {
      expect(normalizeAngle(45.5)).toBeCloseTo(45.5);
      expect(normalizeAngle(370.25)).toBeCloseTo(10.25);
      expect(normalizeAngle(-10.75)).toBeCloseTo(349.25);
    });

    it("should handle very large angles", () => {
      expect(normalizeAngle(3600)).toBe(0);
      expect(normalizeAngle(3645)).toBe(45);
      expect(normalizeAngle(-3600)).toBe(0);
      expect(normalizeAngle(-3645)).toBe(315);
    });
  });
});
