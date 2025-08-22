import {
  AnimationValue,
  NumericValue,
  ColorValue,
  createValue,
  ColorSpace,
} from "@/core/animation-val";
import { CSSPropertyName } from "./type";
import { COLOR_PROPERTIES, MULTI_VALUE_PROPERTIES } from "./prop-names";
import { parseColor } from "@/utils/color";
import { AnimationUnit } from "@/utils/unit";
import { safeOperation } from "@/utils/error";

export class StyleParser {
  constructor(private colorSpace: ColorSpace) {}
  /**
   * Enhanced property value parsing
   */
  parsePropertyValue(property: CSSPropertyName, value: string): AnimationValue {
    return safeOperation(
      () => {
        if (COLOR_PROPERTIES.has(property)) {
          return this.parseColorValue(value);
        }

        if (MULTI_VALUE_PROPERTIES.has(property)) {
          return this.parseMultiValue(property, value);
        }

        return this.parseStandardValue(property, value);
      },
      `Failed to parse ${property} value "${value}":`,
      createValue.numeric(0, "px") // Fallback
    );
  }

  /**
   * Parse multi-value properties like box-shadow
   */
  private parseMultiValue(
    property: CSSPropertyName,
    value: string
  ): AnimationValue {
    return createValue.numeric(0, "px");
  }

  /**
   * Parse color values with enhanced support
   */
  private parseColorValue(value: string): ColorValue {
    if (value === "transparent") {
      return this.colorSpace === "rgb"
        ? createValue.rgb(0, 0, 0, 0)
        : createValue.hsl(0, 0, 0, 0);
    }

    return this.parseCSSColorToAnimationValue(value);
  }

  /**
   * Parse standard numeric/unit values
   */
  private parseStandardValue(
    prop: CSSPropertyName,
    val: string
  ): AnimationValue {
    switch (prop) {
      case "opacity":
        return this.parseOpacity(val);
      case "width":
        return this.parseWidth(val);
      case "height":
        return this.parseHeight(val);
      case "borderRadius":
        return this.parseBorderRadius(val);
      case "borderWidth":
        return this.parseBorderWidth(val);
      default:
        return this.parseGenericNumericValue(val);
    }
  }

  /**
   * Parses a border radius value from a CSS string
   */
  private parseBorderRadius(value: string): NumericValue {
    return this.parse("borderRadius", value, /^(-?\d+\.?\d*)(px|%|em|rem)$/);
  }

  /**
   * Parses a border width value from a CSS string
   */
  private parseBorderWidth(value: string): NumericValue {
    return this.parse("borderWidth", value, /^(-?\d+\.?\d*)(px|em|rem)$/);
  }

  /**
   * Generic numeric value parser
   */
  private parseGenericNumericValue(value: string): NumericValue {
    const match = /^(-?\d*\.?\d+)(.*)$/.exec(value.trim());
    if (!match) {
      throw new Error(`Cannot parse numeric value: ${value}`);
    }

    const numericValue = parseFloat(match[1]);
    const unit = match[2] || "";

    return createValue.numeric(numericValue, unit as any);
  }

  /**
   * Parses an opacity value from a CSS string
   */
  private parseOpacity(value: string): NumericValue {
    if (value === "") return createValue.numeric(1, "");
    const num = parseFloat(value);
    if (isNaN(num) || num < 0 || num > 1)
      throw new Error(`Invalid opacity value: ${value}`);
    return createValue.numeric(num, "");
  }

  /**
   * Parses a width value from a CSS string
   */
  private parseWidth(value: string): NumericValue {
    return this.parse("width", value, /^(-?\d+\.?\d*)(px|%|em|rem|vh|vw)$/);
  }

  /**
   * Parses a height value from a CSS string
   */
  private parseHeight(value: string): NumericValue {
    return this.parse("height", value, /^(-?\d+\.?\d*)(px|%|em|rem|vh|vw)$/);
  }

  /**
   * Helper function to parse numeric CSS values with units using regex
   */
  private parse(property: CSSPropertyName, value: string, pattern: RegExp) {
    const match = pattern.exec(value);
    if (!match) throw new Error(`Invalid ${property} value: ${value}`);
    return createValue.numeric(parseFloat(match[1]), match[2] as AnimationUnit);
  }

  /**
   * Optimized color parsing
   */
  private parseCSSColorToAnimationValue(cssColorValue: string): ColorValue {
    const cp = this.colorSpace;
    return safeOperation(
      () => {
        switch (cp) {
          case "rgb": {
            const { r, g, b, a } = parseColor(cssColorValue, "rgb");
            return createValue.rgb(r, g, b, a);
          }
          case "hsl": {
            const { h, s, l, a } = parseColor(cssColorValue, "hsl");
            return createValue.hsl(h, s, l, a);
          }
          default:
            throw new Error(`Unsupported color space: ${cp}`);
        }
      },
      `Failed to parse color "${cssColorValue}`,
      cp === "rgb" ? createValue.rgb(0, 0, 0, 0) : createValue.hsl(0, 0, 0, 0)
    );
  }
}
