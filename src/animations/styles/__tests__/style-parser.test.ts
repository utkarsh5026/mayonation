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

    it("handles zero values correctly", () => {
      expect(parserRgb.parsePropertyValue("width" as any, "0px")).toEqual(
        createValue.numeric(0, "px")
      );
      expect(parserRgb.parsePropertyValue("opacity" as any, "0")).toEqual(
        createValue.numeric(0, "")
      );
      expect(parserRgb.parsePropertyValue("borderRadius" as any, "0em")).toEqual(
        createValue.numeric(0, "em")
      );
    });

    it("handles negative values where allowed", () => {
      // Negative values allowed for some properties
      expect(parserRgb.parsePropertyValue("width" as any, "-10px")).toEqual(
        createValue.numeric(-10, "px")
      );
      expect(parserRgb.parsePropertyValue("lineHeight" as any, "-1.5")).toEqual(
        createValue.numeric(-1.5, "")
      );
      
      // Negative values not allowed for opacity
      expect(parserRgb.parsePropertyValue("opacity" as any, "-0.5")).toEqual(
        createValue.numeric(0, "px")
      );
    });

    it("handles decimal values", () => {
      expect(parserRgb.parsePropertyValue("opacity" as any, "0.5")).toEqual(
        createValue.numeric(0.5, "")
      );
      expect(parserRgb.parsePropertyValue("width" as any, "10.5px")).toEqual(
        createValue.numeric(10.5, "px")
      );
      expect(parserRgb.parsePropertyValue("borderRadius" as any, "1.25em")).toEqual(
        createValue.numeric(1.25, "em")
      );
    });

    it("handles very large and small numbers", () => {
      expect(parserRgb.parsePropertyValue("width" as any, "9999px")).toEqual(
        createValue.numeric(9999, "px")
      );
      expect(parserRgb.parsePropertyValue("opacity" as any, "0.001")).toEqual(
        createValue.numeric(0.001, "")
      );
      expect(parserRgb.parsePropertyValue("lineHeight" as any, "0.1")).toEqual(
        createValue.numeric(0.1, "")
      );
    });

    it("handles whitespace and formatting variations", () => {
      expect(parserRgb.parsePropertyValue("width" as any, " 100px ")).toEqual(
        createValue.numeric(100, "px")
      );
      expect(parserRgb.parsePropertyValue("lineHeight" as any, "  1.5  ")).toEqual(
        createValue.numeric(1.5, "")
      );
    });

    it("validates unit restrictions correctly", () => {
      // borderRadius allows px, %, em, rem but not vh
      expect(parserRgb.parsePropertyValue("borderRadius" as any, "10vh")).toEqual(
        createValue.numeric(0, "px")
      );
      
      // borderWidth allows px, em, rem but not %
      expect(parserRgb.parsePropertyValue("borderWidth" as any, "10%")).toEqual(
        createValue.numeric(0, "px")
      );
      
      // width allows all tested units
      expect(parserRgb.parsePropertyValue("width" as any, "10vw")).toEqual(
        createValue.numeric(10, "vw")
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

    it("parses different hex color formats", () => {
      const prop = pickColorProp();

      // 6-digit hex
      expect(parserRgb.parsePropertyValue(prop, "#ff0000")).toEqual(
        createValue.rgb(255, 0, 0, 1)
      );
      expect(parserRgb.parsePropertyValue(prop, "#00ff00")).toEqual(
        createValue.rgb(0, 255, 0, 1)
      );
      expect(parserRgb.parsePropertyValue(prop, "#0000ff")).toEqual(
        createValue.rgb(0, 0, 255, 1)
      );

      // 3-digit hex (shorthand)
      expect(parserRgb.parsePropertyValue(prop, "#f00")).toEqual(
        createValue.rgb(255, 0, 0, 1)
      );
      expect(parserRgb.parsePropertyValue(prop, "#0f0")).toEqual(
        createValue.rgb(0, 255, 0, 1)
      );
      expect(parserRgb.parsePropertyValue(prop, "#00f")).toEqual(
        createValue.rgb(0, 0, 255, 1)
      );

      // Mixed case
      expect(parserRgb.parsePropertyValue(prop, "#FfA500")).toEqual(
        createValue.rgb(255, 165, 0, 1)
      );
    });

    it("parses various RGB formats", () => {
      const prop = pickColorProp();

      // rgb() without alpha
      expect(parserRgb.parsePropertyValue(prop, "rgb(255, 0, 0)")).toEqual(
        createValue.rgb(255, 0, 0, 1)
      );

      // rgba() with alpha
      expect(parserRgb.parsePropertyValue(prop, "rgba(255, 0, 0, 1)")).toEqual(
        createValue.rgb(255, 0, 0, 1)
      );
      expect(parserRgb.parsePropertyValue(prop, "rgba(255, 0, 0, 0)")).toEqual(
        createValue.rgb(255, 0, 0, 0)
      );
      expect(parserRgb.parsePropertyValue(prop, "rgba(128, 64, 32, 0.75)")).toEqual(
        createValue.rgb(128, 64, 32, 0.75)
      );

      // With spaces
      expect(parserRgb.parsePropertyValue(prop, "rgb( 255 , 128 , 64 )")).toEqual(
        createValue.rgb(255, 128, 64, 1)
      );
    });

    it("parses HSL colors and converts to target space", () => {
      const prop = pickColorProp();

      // HSL in HSL parser
      expect(parserHsl.parsePropertyValue(prop, "hsl(0, 100%, 50%)")).toEqual(
        createValue.hsl(0, 100, 50, 1)
      );
      expect(parserHsl.parsePropertyValue(prop, "hsl(120, 100%, 50%)")).toEqual(
        createValue.hsl(120, 100, 50, 1)
      );
      expect(parserHsl.parsePropertyValue(prop, "hsl(240, 100%, 50%)")).toEqual(
        createValue.hsl(240, 100, 50, 1)
      );

      // RGB colors converted to HSL space
      expect(parserHsl.parsePropertyValue(prop, "#ff0000")).toEqual(
        createValue.hsl(0, 100, 50, 1)
      );
    });

    it("handles edge case color values", () => {
      const prop = pickColorProp();

      // Malformed hex
      expect(parserRgb.parsePropertyValue(prop, "#gg0000")).toEqual(
        createValue.rgb(0, 0, 0, 0)
      );
      expect(parserRgb.parsePropertyValue(prop, "#ff")).toEqual(
        createValue.rgb(0, 0, 0, 0)
      );

      // Malformed RGB
      expect(parserRgb.parsePropertyValue(prop, "rgb(300, 300, 300)")).toEqual(
        createValue.rgb(300, 300, 300, 1)
      ); // Parser allows out-of-range values

      // Empty color
      expect(parserRgb.parsePropertyValue(prop, "")).toEqual(
        createValue.rgb(0, 0, 0, 0)
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

    it("handles all multi-value properties correctly", () => {
      // boxShadow
      expect(parserRgb.parsePropertyValue("boxShadow" as any, "2px 2px 4px black")).toEqual(
        createValue.numeric(0, "px")
      );
      expect(parserRgb.parsePropertyValue("boxShadow" as any, "inset 0 0 10px red")).toEqual(
        createValue.numeric(0, "px")
      );

      // textShadow
      expect(parserRgb.parsePropertyValue("textShadow" as any, "1px 1px 2px black")).toEqual(
        createValue.numeric(0, "px")
      );

      // filter
      expect(parserRgb.parsePropertyValue("filter" as any, "blur(5px) brightness(0.8)")).toEqual(
        createValue.numeric(0, "px")
      );

      // backdropFilter
      expect(parserRgb.parsePropertyValue("backdropFilter" as any, "blur(10px)")).toEqual(
        createValue.numeric(0, "px")
      );
    });

    it("multi-value properties work with both parsers", () => {
      // Should return same stub regardless of color space
      expect(parserRgb.parsePropertyValue("boxShadow" as any, "complex value")).toEqual(
        createValue.numeric(0, "px")
      );
      expect(parserHsl.parsePropertyValue("boxShadow" as any, "complex value")).toEqual(
        createValue.numeric(0, "px")
      );
    });
  });

  describe("property categorization", () => {
    it("correctly categorizes color properties", () => {
      // These should be treated as colors
      expect(COLOR_PROPERTIES.has("color")).toBe(true);
      expect(COLOR_PROPERTIES.has("backgroundColor")).toBe(true);
      expect(COLOR_PROPERTIES.has("borderColor")).toBe(true);
    });

    it("correctly categorizes multi-value properties", () => {
      // These should be treated as multi-value
      expect(MULTI_VALUE_PROPERTIES.has("boxShadow")).toBe(true);
      expect(MULTI_VALUE_PROPERTIES.has("textShadow")).toBe(true);
      expect(MULTI_VALUE_PROPERTIES.has("filter")).toBe(true);
    });

    it("ensures no conflicts between categories", () => {
      // boxShadow should only be in MULTI_VALUE_PROPERTIES, not COLOR_PROPERTIES
      expect(COLOR_PROPERTIES.has("boxShadow")).toBe(false);
      expect(MULTI_VALUE_PROPERTIES.has("boxShadow")).toBe(true);
      
      // textShadow should also only be in MULTI_VALUE_PROPERTIES
      expect(COLOR_PROPERTIES.has("textShadow")).toBe(false);
      expect(MULTI_VALUE_PROPERTIES.has("textShadow")).toBe(true);
    });
  });

  describe("parser error handling", () => {
    it("handles empty values gracefully", () => {
      // Empty opacity gets default
      expect(parserRgb.parsePropertyValue("opacity" as any, "")).toEqual(
        createValue.numeric(1, "")
      );
      
      // Empty color gets fallback
      expect(parserRgb.parsePropertyValue("color" as any, "")).toEqual(
        createValue.rgb(0, 0, 0, 0)
      );
      
      // Empty generic numeric gets fallback
      expect(parserRgb.parsePropertyValue("lineHeight" as any, "")).toEqual(
        createValue.numeric(0, "px")
      );
    });

    it("handles malformed values with safeOperation fallback", () => {
      // Completely invalid values should fall back
      expect(parserRgb.parsePropertyValue("width" as any, "not-a-number")).toEqual(
        createValue.numeric(0, "px")
      );
      expect(parserRgb.parsePropertyValue("color" as any, "not-a-color")).toEqual(
        createValue.rgb(0, 0, 0, 0)
      );
    });
  });
});
