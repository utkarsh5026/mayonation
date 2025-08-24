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
import { safeOperation, throwIf } from "@/utils/error";

/**
 * Parses CSS style values into normalized AnimationValue objects.
 * Handles colors (rgb/hsl), numeric values with units, and multi-value props.
 */
export class StyleParser {
  constructor(private colorSpace: ColorSpace) {}

  /**
   * Parse a CSS property string value into an AnimationValue.
   * - Routes color properties to color parsing.
   * - Routes known multi-value properties (e.g., box-shadow) to multi parsers.
   * - Falls back to standard numeric parsing otherwise.
   * If parsing fails, returns a numeric 0px value as a safe default.
   *
   * @param property CSS property name
   * @param value Raw CSS value string (e.g., "12px", "#ff0000", "0.5")
   * @returns Parsed AnimationValue
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
   * Parse color values including keywords like "transparent" and CSS color functions.
   * Respects the configured color space ("rgb" | "hsl").
   *
   * @param value CSS color string ("#rrggbb", "rgb(...)", "hsl(...)", "transparent")
   * @returns Parsed ColorValue
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
   * Parse standard numeric/unit values by property-specific rules.
   * Supports: opacity, width, height, borderRadius, borderWidth.
   * Falls back to generic numeric parsing for others.
   *
   * @param prop CSS property name
   * @param val Raw CSS value string
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
   * Parse a border-radius value (px, %, em, rem).
   *
   * @param value CSS value like "8px", "50%"
   */
  private parseBorderRadius(value: string): NumericValue {
    return this.parse("borderRadius", value, /^(-?\d+\.?\d*)(px|%|em|rem)$/);
  }

  /**
   * Parse a border-width value (px, em, rem).
   *
   * @param value CSS value like "2px", "0.25rem"
   */
  private parseBorderWidth(value: string): NumericValue {
    return this.parse("borderWidth", value, /^(-?\d+\.?\d*)(px|em|rem)$/);
  }

  /**
   * Generic numeric parser that extracts the number and preserves any unit suffix.
   * Example: "12px" -> { value: 12, unit: "px" }, "1.5" -> { value: 1.5, unit: "" }
   *
   * @param value Raw CSS value string
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
   * Parse opacity (0..1). Empty string defaults to 1.
   *
   * @param value CSS opacity string
   */
  private parseOpacity(value: string): NumericValue {
    if (value === "") return createValue.numeric(1, "");
    const num = parseFloat(value);
    throwIf(
      isNaN(num) || num < 0 || num > 1,
      `Invalid opacity value: ${value}`
    );
    return createValue.numeric(num, "");
  }

  /**
   * Parse width with supported units (px, %, em, rem, vh, vw).
   * Throws for unsupported units or unitless values - these will be caught by safeOperation.
   *
   * @param value CSS width string
   */
  private parseWidth(value: string): NumericValue {
    return this.parse("width", value, /^(-?\d+\.?\d*)(px|%|em|rem|vh|vw)$/);
  }

  /**
   * Parse height with supported units (px, %, em, rem, vh, vw).
   * Throws for unsupported units or unitless values - these will be caught by safeOperation.
   *
   * @param value CSS height string
   */
  private parseHeight(value: string): NumericValue {
    return this.parse("height", value, /^(-?\d+\.?\d*)(px|%|em|rem|vh|vw)$/);
  }

  /**
   * Helper to parse numeric CSS values using a regex pattern.
   * Throws if the value does not match the expected format.
   *
   * @param property Property name for error context
   * @param value Raw CSS value string
   * @param pattern Regex to validate and capture value/unit
   */
  private parse(property: CSSPropertyName, value: string, pattern: RegExp) {
    const match = pattern.exec(value.trim());
    if (!match) throw new Error(`Invalid ${property} value: ${value}`);
    return createValue.numeric(parseFloat(match[1]), match[2] as AnimationUnit);
  }

  /**
   * Parse a CSS color string into an AnimationValue in the configured color space.
   * Returns a fully transparent color on failure.
   *
   * @param cssColorValue Raw CSS color string
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
