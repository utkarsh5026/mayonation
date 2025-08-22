/// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { StyleParser } from "../style-parser";
import { createValue } from "../../../core/animation-val";
import { COLOR_PROPERTIES, MULTI_VALUE_PROPERTIES } from "../prop-names";

describe("StyleParser", () => {
  let parserRgb: StyleParser;
  let parserHsl: StyleParser;

  beforeEach(() => {
    parserRgb = new StyleParser("rgb");
    parserHsl = new StyleParser("hsl");
  });

  describe("numeric and unit parsing", () => {
    it("parses opacity with defaults and validates range", () => {
      expect(parserRgb.parsePropertyValue("opacity" as any, "")).toEqual(
        createValue.numeric(1, "")
      );
      // valid
      expect(parserRgb.parsePropertyValue("opacity" as any, "0.5")).toEqual(
        createValue.numeric(0.5, "")
      );
      // invalid (>1) -> outer safeOperation fallback
      expect(parserRgb.parsePropertyValue("opacity" as any, "1.1")).toEqual(
        createValue.numeric(0, "px")
      );
      // invalid (<0) -> fallback
      expect(parserRgb.parsePropertyValue("opacity" as any, "-0.1")).toEqual(
        createValue.numeric(0, "px")
      );
    });

    it("parses width with allowed units and falls back on invalid", () => {
      expect(parserRgb.parsePropertyValue("width" as any, "100px")).toEqual(
        createValue.numeric(100, "px")
      );
      expect(parserRgb.parsePropertyValue("width" as any, "50%")).toEqual(
        createValue.numeric(50, "%")
      );
      expect(parserRgb.parsePropertyValue("width" as any, "-10em")).toEqual(
        createValue.numeric(-10, "em")
      );
      expect(parserRgb.parsePropertyValue("width" as any, "2rem")).toEqual(
        createValue.numeric(2, "rem")
      );
      expect(parserRgb.parsePropertyValue("width" as any, "20vh")).toEqual(
        createValue.numeric(20, "vh")
      );
      expect(parserRgb.parsePropertyValue("width" as any, "30vw")).toEqual(
        createValue.numeric(30, "vw")
      );
      // invalid unit -> fallback
      expect(parserRgb.parsePropertyValue("width" as any, "10pt")).toEqual(
        createValue.numeric(0, "px")
      );
      // missing unit -> fallback
      expect(parserRgb.parsePropertyValue("width" as any, "100")).toEqual(
        createValue.numeric(0, "px")
      );
    });

    it("parses height with allowed units and falls back on invalid", () => {
      expect(parserRgb.parsePropertyValue("height" as any, "50%")).toEqual(
        createValue.numeric(50, "%")
      );
      expect(parserRgb.parsePropertyValue("height" as any, "24vh")).toEqual(
        createValue.numeric(24, "vh")
      );
      expect(parserRgb.parsePropertyValue("height" as any, "12vw")).toEqual(
        createValue.numeric(12, "vw")
      );
      expect(parserRgb.parsePropertyValue("height" as any, "100")).toEqual(
        createValue.numeric(0, "px")
      );
    });

    it("parses borderRadius and borderWidth with allowed units", () => {
      // borderRadius: px|%|em|rem
      expect(
        parserRgb.parsePropertyValue("borderRadius" as any, "8px")
      ).toEqual(createValue.numeric(8, "px"));
      expect(
        parserRgb.parsePropertyValue("borderRadius" as any, "50%")
      ).toEqual(createValue.numeric(50, "%"));
      expect(
        parserRgb.parsePropertyValue("borderRadius" as any, "1.5em")
      ).toEqual(createValue.numeric(1.5, "em"));
      // invalid unit for borderRadius -> fallback
      expect(
        parserRgb.parsePropertyValue("borderRadius" as any, "10vh")
      ).toEqual(createValue.numeric(0, "px"));

      // borderWidth: px|em|rem
      expect(parserRgb.parsePropertyValue("borderWidth" as any, "2px")).toEqual(
        createValue.numeric(2, "px")
      );
      expect(
        parserRgb.parsePropertyValue("borderWidth" as any, "0.25rem")
      ).toEqual(createValue.numeric(0.25, "rem"));
      // invalid unit for borderWidth -> fallback
      expect(parserRgb.parsePropertyValue("borderWidth" as any, "10%")).toEqual(
        createValue.numeric(0, "px")
      );
    });

    it("parses generic numeric values and falls back on invalid", () => {
      // property not explicitly handled, routed to generic parser
      expect(parserRgb.parsePropertyValue("lineHeight" as any, "1.2")).toEqual(
        createValue.numeric(1.2, "")
      );
      expect(parserRgb.parsePropertyValue("lineHeight" as any, "12px")).toEqual(
        createValue.numeric(12, "px")
      );
      // invalid numeric -> fallback
      expect(parserRgb.parsePropertyValue("lineHeight" as any, "abc")).toEqual(
        createValue.numeric(0, "px")
      );
    });
  });

  describe("color parsing", () => {
    const pickColorProp = (): any => {
      const first = COLOR_PROPERTIES.values().next().value;
      // fallback to typical name if set unexpectedly empty
      return first ?? ("color" as any);
    };

    it("parses transparent consistently for rgb and hsl", () => {
      const prop = pickColorProp();

      expect(parserRgb.parsePropertyValue(prop, "transparent")).toEqual(
        createValue.rgb(0, 0, 0, 0)
      );
      expect(parserHsl.parsePropertyValue(prop, "transparent")).toEqual(
        createValue.hsl(0, 0, 0, 0)
      );
    });

    it("parses rgb-like colors in rgb space", () => {
      const prop = pickColorProp();

      expect(parserRgb.parsePropertyValue(prop, "#ff0000")).toEqual(
        createValue.rgb(255, 0, 0, 1)
      );
      expect(
        parserRgb.parsePropertyValue(prop, "rgba(0, 128, 255, 0.5)")
      ).toEqual(createValue.rgb(0, 128, 255, 0.5));
    });

    it("parses hsl-like colors in hsl space", () => {
      const prop = pickColorProp();

      expect(parserHsl.parsePropertyValue(prop, "hsl(120, 100%, 50%)")).toEqual(
        createValue.hsl(120, 100, 50, 1)
      );
    });

    it("falls back on invalid color strings using color-space defaults", () => {
      const prop = pickColorProp();

      // parseCSSColorToAnimationValue uses its own safeOperation fallback
      expect(parserRgb.parsePropertyValue(prop, "not-a-color")).toEqual(
        createValue.rgb(0, 0, 0, 0)
      );
      expect(parserHsl.parsePropertyValue(prop, "not-a-color")).toEqual(
        createValue.hsl(0, 0, 0, 0)
      );
    });
  });

  describe("multi-value properties", () => {
    it("returns stubbed numeric value for multi-value properties", () => {
      const firstMulti =
        MULTI_VALUE_PROPERTIES.values().next().value ?? ("boxShadow" as any);
      const result = parserRgb.parsePropertyValue(
        firstMulti,
        "10px 10px 5px rgba(0,0,0,0.5)"
      );
      expect(result).toEqual(createValue.numeric(0, "px"));
    });
  });
});
