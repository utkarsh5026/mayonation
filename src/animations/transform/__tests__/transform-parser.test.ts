import { describe, it, expect, beforeEach } from "vitest";
import { TransformParser } from "../transform-parser";
import type { TransformState } from "../types";

describe("TransformParser", () => {
  let parser: TransformParser;
  let mockTransformState: TransformState;

  beforeEach(() => {
    parser = new TransformParser();
    mockTransformState = {
      translate: { x: 0, y: 0, z: 0 },
      rotate: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      skew: { x: 0, y: 0 },
    };
  });

  describe("parse method", () => {
    const supportProps = new Set([
      "translateX",
      "translateY",
      "translateZ",
      "rotateX",
      "rotateY",
      "rotateZ",
      "scaleX",
      "scaleY",
      "scaleZ",
      "skewX",
      "skewY",
    ]);

    describe("with number values", () => {
      it("should parse translate properties with px unit", () => {
        const result = parser.parse(supportProps, "translateX", 100);
        expect(result.value).toBe(100);
        expect(result.unit).toBe("px");
      });

      it("should parse rotate properties with deg unit", () => {
        const result = parser.parse(supportProps, "rotateZ", 45);
        expect(result.value).toBe(45);
        expect(result.unit).toBe("deg");
      });

      it("should parse skew properties with deg unit", () => {
        const result = parser.parse(supportProps, "skewX", 30);
        expect(result.value).toBe(30);
        expect(result.unit).toBe("deg");
      });

      it("should parse scale properties with empty unit", () => {
        const result = parser.parse(supportProps, "scaleX", 1.5);
        expect(result.value).toBe(1.5);
        expect(result.unit).toBe("");
      });
    });

    describe("with string values", () => {
      it("should parse px values for translate properties", () => {
        const result = parser.parse(supportProps, "translateY", "50px");
        expect(result.value).toBe(50);
        expect(result.unit).toBe("px");
      });

      it("should parse percentage values for translate properties", () => {
        const result = parser.parse(supportProps, "translateX", "25%");
        expect(result.value).toBe(25);
        expect(result.unit).toBe("%");
      });

      it("should parse deg values for rotate properties", () => {
        const result = parser.parse(supportProps, "rotateX", "90deg");
        expect(result.value).toBe(90);
        expect(result.unit).toBe("deg");
      });

      it("should parse rad values for rotate properties", () => {
        const result = parser.parse(supportProps, "rotateY", "1.57rad");
        expect(result.value).toBe(1.57);
        expect(result.unit).toBe("rad");
      });

      it("should parse turn values for rotate properties", () => {
        const result = parser.parse(supportProps, "rotateZ", "0.5turn");
        expect(result.value).toBe(0.5);
        expect(result.unit).toBe("turn");
      });

      it("should parse unitless scale values", () => {
        const result = parser.parse(supportProps, "scaleY", "2.5");
        expect(result.value).toBe(2.5);
        expect(result.unit).toBe("");
      });
    });

    describe("error handling", () => {
      it("should throw error for unsupported property", () => {
        expect(() => parser.parse(supportProps, "invalid" as any, 100)).toThrow(
          "Unsupported property: invalid"
        );
      });

      it("should throw error for invalid string value", () => {
        expect(() =>
          parser.parse(supportProps, "translateX", "invalid")
        ).toThrow('Invalid value "invalid" for property "translateX"');
      });

      it("should throw error for empty string", () => {
        expect(() => parser.parse(supportProps, "rotateZ", "")).toThrow(
          'Invalid value "" for property "rotateZ"'
        );
      });
    });
  });

  describe("applyParsedTransform method", () => {
    describe("translate functions", () => {
      it("should apply translateX", () => {
        parser.applyParsedTransform(mockTransformState, "translateX", ["100"]);
        expect(mockTransformState.translate.x).toBe(100);
        expect(mockTransformState.translate.y).toBe(0);
        expect(mockTransformState.translate.z).toBe(0);
      });

      it("should apply translateY", () => {
        parser.applyParsedTransform(mockTransformState, "translateY", ["50"]);
        expect(mockTransformState.translate.x).toBe(0);
        expect(mockTransformState.translate.y).toBe(50);
        expect(mockTransformState.translate.z).toBe(0);
      });

      it("should apply translateZ", () => {
        parser.applyParsedTransform(mockTransformState, "translateZ", ["25"]);
        expect(mockTransformState.translate.x).toBe(0);
        expect(mockTransformState.translate.y).toBe(0);
        expect(mockTransformState.translate.z).toBe(25);
      });

      it("should apply translate with two values", () => {
        parser.applyParsedTransform(mockTransformState, "translate", [
          "100",
          "50",
        ]);
        expect(mockTransformState.translate.x).toBe(100);
        expect(mockTransformState.translate.y).toBe(50);
      });

      it("should apply translate with one value (y defaults to 0)", () => {
        parser.applyParsedTransform(mockTransformState, "translate", ["75"]);
        expect(mockTransformState.translate.x).toBe(75);
        expect(mockTransformState.translate.y).toBe(0);
      });

      it("should apply translate3d", () => {
        parser.applyParsedTransform(mockTransformState, "translate3d", [
          "100",
          "50",
          "25",
        ]);
        expect(mockTransformState.translate.x).toBe(100);
        expect(mockTransformState.translate.y).toBe(50);
        expect(mockTransformState.translate.z).toBe(25);
      });
    });

    describe("rotate functions", () => {
      it("should apply rotateX", () => {
        parser.applyParsedTransform(mockTransformState, "rotateX", ["45deg"]);
        expect(mockTransformState.rotate.x).toBe(45);
        expect(mockTransformState.rotate.y).toBe(0);
        expect(mockTransformState.rotate.z).toBe(0);
      });

      it("should apply rotateY", () => {
        parser.applyParsedTransform(mockTransformState, "rotateY", ["90deg"]);
        expect(mockTransformState.rotate.x).toBe(0);
        expect(mockTransformState.rotate.y).toBe(90);
        expect(mockTransformState.rotate.z).toBe(0);
      });

      it("should apply rotateZ", () => {
        parser.applyParsedTransform(mockTransformState, "rotateZ", ["135deg"]);
        expect(mockTransformState.rotate.x).toBe(0);
        expect(mockTransformState.rotate.y).toBe(0);
        expect(mockTransformState.rotate.z).toBe(135);
      });

      it("should apply rotate (maps to rotateZ)", () => {
        parser.applyParsedTransform(mockTransformState, "rotate", ["180deg"]);
        expect(mockTransformState.rotate.z).toBe(180);
      });
    });

    describe("scale functions", () => {
      it("should apply scaleX", () => {
        parser.applyParsedTransform(mockTransformState, "scaleX", ["2"]);
        expect(mockTransformState.scale.x).toBe(2);
        expect(mockTransformState.scale.y).toBe(1);
        expect(mockTransformState.scale.z).toBe(1);
      });

      it("should apply scaleY", () => {
        parser.applyParsedTransform(mockTransformState, "scaleY", ["1.5"]);
        expect(mockTransformState.scale.x).toBe(1);
        expect(mockTransformState.scale.y).toBe(1.5);
        expect(mockTransformState.scale.z).toBe(1);
      });

      it("should apply scaleZ", () => {
        parser.applyParsedTransform(mockTransformState, "scaleZ", ["0.5"]);
        expect(mockTransformState.scale.x).toBe(1);
        expect(mockTransformState.scale.y).toBe(1);
        expect(mockTransformState.scale.z).toBe(0.5);
      });

      it("should apply scale with two values", () => {
        parser.applyParsedTransform(mockTransformState, "scale", ["2", "1.5"]);
        expect(mockTransformState.scale.x).toBe(2);
        expect(mockTransformState.scale.y).toBe(1.5);
      });

      it("should apply scale with one value (uniform scaling)", () => {
        parser.applyParsedTransform(mockTransformState, "scale", ["3"]);
        expect(mockTransformState.scale.x).toBe(3);
        expect(mockTransformState.scale.y).toBe(3);
      });
    });

    describe("skew functions", () => {
      it("should apply skewX", () => {
        parser.applyParsedTransform(mockTransformState, "skewX", ["15deg"]);
        expect(mockTransformState.skew.x).toBe(15);
        expect(mockTransformState.skew.y).toBe(0);
      });

      it("should apply skewY", () => {
        parser.applyParsedTransform(mockTransformState, "skewY", ["30deg"]);
        expect(mockTransformState.skew.x).toBe(0);
        expect(mockTransformState.skew.y).toBe(30);
      });
    });

    describe("with negative values", () => {
      it("should handle negative translate values", () => {
        parser.applyParsedTransform(mockTransformState, "translateX", ["-50"]);
        expect(mockTransformState.translate.x).toBe(-50);
      });

      it("should handle negative rotation values", () => {
        parser.applyParsedTransform(mockTransformState, "rotateZ", ["-45deg"]);
        expect(mockTransformState.rotate.z).toBe(-45);
      });

      it("should handle negative scale values", () => {
        parser.applyParsedTransform(mockTransformState, "scaleX", ["-1"]);
        expect(mockTransformState.scale.x).toBe(-1);
      });
    });

    describe("with decimal values", () => {
      it("should handle decimal translate values", () => {
        parser.applyParsedTransform(mockTransformState, "translateY", ["50.5"]);
        expect(mockTransformState.translate.y).toBe(50.5);
      });

      it("should handle decimal rotation values", () => {
        parser.applyParsedTransform(mockTransformState, "rotateX", [
          "45.75deg",
        ]);
        expect(mockTransformState.rotate.x).toBe(45.75);
      });

      it("should handle decimal scale values", () => {
        parser.applyParsedTransform(mockTransformState, "scaleY", ["1.25"]);
        expect(mockTransformState.scale.y).toBe(1.25);
      });
    });
  });

  describe("parseTransformProperty method", () => {
    it("should parse translate property", () => {
      const [transformType, axis] = parser.parseTransformProperty("translate");
      expect(transformType).toBe("translate");
      expect(axis).toBe("x");
    });

    it("should parse translateX property", () => {
      const [transformType, axis] = parser.parseTransformProperty("translateX");
      expect(transformType).toBe("translate");
      expect(axis).toBe("x");
    });

    it("should parse translateY property", () => {
      const [transformType, axis] = parser.parseTransformProperty("translateY");
      expect(transformType).toBe("translate");
      expect(axis).toBe("y");
    });

    it("should parse translateZ property", () => {
      const [transformType, axis] = parser.parseTransformProperty("translateZ");
      expect(transformType).toBe("translate");
      expect(axis).toBe("z");
    });

    it("should parse rotate property (maps to z-axis)", () => {
      const [transformType, axis] = parser.parseTransformProperty("rotate");
      expect(transformType).toBe("rotate");
      expect(axis).toBe("z");
    });

    it("should parse rotateX property", () => {
      const [transformType, axis] = parser.parseTransformProperty("rotateX");
      expect(transformType).toBe("rotate");
      expect(axis).toBe("x");
    });

    it("should parse rotateY property", () => {
      const [transformType, axis] = parser.parseTransformProperty("rotateY");
      expect(transformType).toBe("rotate");
      expect(axis).toBe("y");
    });

    it("should parse rotateZ property", () => {
      const [transformType, axis] = parser.parseTransformProperty("rotateZ");
      expect(transformType).toBe("rotate");
      expect(axis).toBe("z");
    });

    it("should parse scale property", () => {
      const [transformType, axis] = parser.parseTransformProperty("scale");
      expect(transformType).toBe("scale");
      expect(axis).toBe("x");
    });

    it("should parse scaleX property", () => {
      const [transformType, axis] = parser.parseTransformProperty("scaleX");
      expect(transformType).toBe("scale");
      expect(axis).toBe("x");
    });

    it("should parse scaleY property", () => {
      const [transformType, axis] = parser.parseTransformProperty("scaleY");
      expect(transformType).toBe("scale");
      expect(axis).toBe("y");
    });

    it("should parse scaleZ property", () => {
      const [transformType, axis] = parser.parseTransformProperty("scaleZ");
      expect(transformType).toBe("scale");
      expect(axis).toBe("z");
    });

    it("should parse skewX property", () => {
      const [transformType, axis] = parser.parseTransformProperty("skewX");
      expect(transformType).toBe("skew");
      expect(axis).toBe("x");
    });

    it("should parse skewY property", () => {
      const [transformType, axis] = parser.parseTransformProperty("skewY");
      expect(transformType).toBe("skew");
      expect(axis).toBe("y");
    });

    it("should throw error for invalid property", () => {
      expect(() => parser.parseTransformProperty("invalidProp")).toThrow(
        "Invalid transform property: invalidProp"
      );
    });

    it("should throw error for empty string", () => {
      expect(() => parser.parseTransformProperty("")).toThrow(
        "Invalid transform property: "
      );
    });
  });

  describe("parseDegrees method (private)", () => {
    describe("degree values", () => {
      it("should parse degree values", () => {
        parser.applyParsedTransform(mockTransformState, "rotateZ", ["45deg"]);
        expect(mockTransformState.rotate.z).toBe(45);
      });

      it("should parse negative degree values", () => {
        parser.applyParsedTransform(mockTransformState, "rotateZ", ["-90deg"]);
        expect(mockTransformState.rotate.z).toBe(-90);
      });

      it("should parse decimal degree values", () => {
        parser.applyParsedTransform(mockTransformState, "rotateZ", ["45.5deg"]);
        expect(mockTransformState.rotate.z).toBe(45.5);
      });
    });

    describe("radian values", () => {
      it("should convert radians to degrees", () => {
        parser.applyParsedTransform(mockTransformState, "rotateZ", ["1.57rad"]);
        expect(mockTransformState.rotate.z).toBeCloseTo(89.95, 1);
      });

      it("should convert π radians to 180 degrees", () => {
        parser.applyParsedTransform(mockTransformState, "rotateZ", [
          `${Math.PI}rad`,
        ]);
        expect(mockTransformState.rotate.z).toBeCloseTo(180, 1);
      });

      it("should convert negative radians to degrees", () => {
        parser.applyParsedTransform(mockTransformState, "rotateZ", [
          "-1.57rad",
        ]);
        expect(mockTransformState.rotate.z).toBeCloseTo(-89.95, 1);
      });
    });

    describe("turn values", () => {
      it("should convert turns to degrees", () => {
        parser.applyParsedTransform(mockTransformState, "rotateZ", ["0.5turn"]);
        expect(mockTransformState.rotate.z).toBe(180);
      });

      it("should convert full turn to 360 degrees", () => {
        parser.applyParsedTransform(mockTransformState, "rotateZ", ["1turn"]);
        expect(mockTransformState.rotate.z).toBe(360);
      });

      it("should convert quarter turn to 90 degrees", () => {
        parser.applyParsedTransform(mockTransformState, "rotateZ", [
          "0.25turn",
        ]);
        expect(mockTransformState.rotate.z).toBe(90);
      });

      it("should convert negative turns to degrees", () => {
        parser.applyParsedTransform(mockTransformState, "rotateZ", [
          "-0.5turn",
        ]);
        expect(mockTransformState.rotate.z).toBe(-180);
      });
    });

    describe("unitless values", () => {
      it("should assume degrees for unitless values", () => {
        parser.applyParsedTransform(mockTransformState, "rotateZ", ["45"]);
        expect(mockTransformState.rotate.z).toBe(45);
      });

      it("should handle negative unitless values", () => {
        parser.applyParsedTransform(mockTransformState, "rotateZ", ["-90"]);
        expect(mockTransformState.rotate.z).toBe(-90);
      });

      it("should handle decimal unitless values", () => {
        parser.applyParsedTransform(mockTransformState, "rotateZ", ["22.5"]);
        expect(mockTransformState.rotate.z).toBe(22.5);
      });
    });

    describe("edge cases", () => {
      it("should handle zero values", () => {
        parser.applyParsedTransform(mockTransformState, "rotateZ", ["0deg"]);
        expect(mockTransformState.rotate.z).toBe(0);
      });

      it("should handle very small values", () => {
        parser.applyParsedTransform(mockTransformState, "rotateZ", [
          "0.001deg",
        ]);
        expect(mockTransformState.rotate.z).toBe(0.001);
      });

      it("should handle very large values", () => {
        parser.applyParsedTransform(mockTransformState, "rotateZ", ["720deg"]);
        expect(mockTransformState.rotate.z).toBe(720);
      });
    });
  });

  describe("integration tests", () => {
    const supportProps = new Set([
      "translateX",
      "translateY",
      "translateZ",
      "rotateX",
      "rotateY",
      "rotateZ",
      "scaleX",
      "scaleY",
      "scaleZ",
      "skewX",
      "skewY",
    ]);

    it("should handle complex transform sequence", () => {
      parser.applyParsedTransform(mockTransformState, "translateX", ["100"]);
      parser.applyParsedTransform(mockTransformState, "rotateZ", ["45deg"]);
      parser.applyParsedTransform(mockTransformState, "scaleX", ["2"]);
      parser.applyParsedTransform(mockTransformState, "skewY", ["15deg"]);

      expect(mockTransformState.translate.x).toBe(100);
      expect(mockTransformState.rotate.z).toBe(45);
      expect(mockTransformState.scale.x).toBe(2);
      expect(mockTransformState.skew.y).toBe(15);
    });

    it("should combine parse and applyParsedTransform", () => {
      const parsed = parser.parse(supportProps, "translateX", "50px");
      expect(parsed.value).toBe(50);
      expect(parsed.unit).toBe("px");

      parser.applyParsedTransform(mockTransformState, "translateX", ["50"]);
      expect(mockTransformState.translate.x).toBe(50);
    });

    it("should handle property parsing with application", () => {
      const [transformType, axis] = parser.parseTransformProperty("rotateY");
      expect(transformType).toBe("rotate");
      expect(axis).toBe("y");

      parser.applyParsedTransform(mockTransformState, "rotateY", ["90deg"]);
      expect(mockTransformState.rotate.y).toBe(90);
    });
  });

  describe("edge cases and error conditions", () => {
    it("should handle empty values array", () => {
      parser.applyParsedTransform(mockTransformState, "translateX", []);
      expect(mockTransformState.translate.x).toBeNaN();
    });

    it("should handle non-numeric string values in applyParsedTransform", () => {
      parser.applyParsedTransform(mockTransformState, "translateX", [
        "invalid",
      ]);
      expect(mockTransformState.translate.x).toBeNaN();
    });

    it("should handle unknown transform function", () => {
      parser.applyParsedTransform(mockTransformState, "unknownTransform", [
        "100",
      ]);
      expect(mockTransformState.translate.x).toBe(0);
      expect(mockTransformState.rotate.x).toBe(0);
      expect(mockTransformState.scale.x).toBe(1);
      expect(mockTransformState.skew.x).toBe(0);
    });
  });
});
