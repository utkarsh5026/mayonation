import { camelToDash } from "../../utils/string";
import { rgb, hsl, linear } from "../../utils/interpolate";
import {
  type AnimationValue,
  type ColorValue,
  type ColorSpace,
  type RGB,
  type HSL,
  createValue,
  isColorValue,
  isNumericValue,
} from "../../core/animation-val";
import { parseColor, toCSSString } from "../../utils/color";
import { type CSSPropertyName, cssPropertyUnits } from "./units";
import {
  parseBorderRadius,
  parseBorderWidth,
  parseOpacity,
  parseWidth,
  parseHeight,
} from "./parse";

type CssHandlerOptions = {
  colorSpace?: ColorSpace;
};

/**
 * Handles CSS property animations for HTML elements.
 *
 * This class manages the animation of CSS properties by:
 * - Tracking current and initial property values
 * - Parsing CSS values into a normalized format
 * - Interpolating between values during animation
 * - Applying updated values back to the element
 *
 * It supports:
 * - Numeric properties (width, height, opacity etc.)
 * - Color properties in RGB or HSL space
 * - Different units (px, %, em, rem etc.)
 *
 * @example
 * ```ts
 * const handler = new CSSHandler(element, { colorSpace: 'hsl' });
 *
 * // Animate opacity from current value to 0.5
 * const from = handler.getCurrentValue('opacity');
 * const to = createValue.numeric(0.5, '');
 * const interpolated = handler.interpolate('opacity', from, to, 0.5);
 * handler.updateProperty('opacity', interpolated);
 * ```
 */
export class CSSHandler {
  private readonly el: HTMLElement;
  private readonly computedStyles: CSSStyleDeclaration;
  private readonly currentValues: Map<CSSPropertyName, AnimationValue>;
  private readonly initialValues: Map<string, string>;
  private readonly options: CssHandlerOptions;

  /**
   * CSS properties that support color values and color interpolation
   */
  private static readonly colorProperties = new Set<CSSPropertyName>([
    "backgroundColor",
    "color",
    "borderColor",
    "outlineColor",
    "textDecorationColor",
    "textEmphasisColor",
  ]);

  /**
   * Creates a new CSS animation handler
   * @param el - The HTML element to animate
   * @param options - Configuration options
   * @param options.colorSpace - Color space to use for interpolation ('rgb' or 'hsl')
   */
  constructor(el: HTMLElement, options: CssHandlerOptions = {}) {
    this.el = el;
    this.computedStyles = window.getComputedStyle(el);
    this.currentValues = new Map();
    this.initialValues = new Map();
    this.options = {
      colorSpace: options.colorSpace ?? "hsl",
    };
  }

  /**
   * Parses a CSS color value string into a normalized ColorValue
   * Handles various color formats and converts to RGB
   * @param value - CSS color string (hex, rgb, rgba, etc)
   * @returns Normalized ColorValue object
   */
  private parseColorValue(value: string): ColorValue {
    switch (this.options.colorSpace) {
      case "rgb": {
        const { r, g, b, a } = parseColor(value, "rgb");
        return createValue.rgb(r, g, b, a);
      }
      case "hsl": {
        const { h, s, l, a } = parseColor(value, "hsl");
        return createValue.hsl(h, s, l, a);
      }
      default:
        throw new Error(`Unsupported color space: ${this.options.colorSpace}`);
    }
  }

  /**
   * Converts an AnimationValue back to a CSS string
   * @param property - The CSS property being converted
   * @param value - The AnimationValue to convert
   * @returns CSS-formatted string value
   */
  private convertToCSS(
    property: CSSPropertyName,
    value: AnimationValue
  ): string {
    if (isColorValue(value)) return toCSSString(value.value);
    if (isNumericValue(value)) return `${value.value}${value.unit}`;
    throw new Error(`Unsupported value type: ${value}`);
  }

  /**
   * Checks if a CSS property can be animated by this handler
   * @param property - CSS property name
   * @returns true if the property can be animated
   */
  public static isAnimatableProperty(
    property: string
  ): property is CSSPropertyName {
    return (
      cssPropertyUnits.has(property as CSSPropertyName) ||
      CSSHandler.colorProperties.has(property as CSSPropertyName)
    );
  }

  /**
   * Interpolates between two CSS values based on progress
   * Handles both color and numeric interpolation
   *
   * @param property - The CSS property being interpolated
   * @param from - Starting value
   * @param to - Ending value
   * @param progress - Animation progress (0 to 1)
   * @returns Interpolated value
   * @throws If values are of different types or interpolation is not supported
   */
  public interpolate(
    property: CSSPropertyName,
    from: AnimationValue,
    to: AnimationValue,
    progress: number
  ) {
    if (from.type !== to.type)
      throw new Error("Cannot interpolate between different value types");

    if (isColorValue(from) && isColorValue(to)) {
      switch (this.options.colorSpace) {
        case "rgb": {
          const { r, g, b, a } = rgb.interpolate(
            from.value as RGB,
            to.value as RGB,
            progress
          );
          return createValue.rgb(r, g, b, a);
        }

        case "hsl": {
          const { h, s, l, a } = hsl.interpolate(
            from.value as HSL,
            to.value as HSL,
            progress
          );
          return createValue.hsl(h, s, l, a);
        }

        default:
          throw new Error(
            `Unsupported color space: ${this.options.colorSpace}`
          );
      }
    }

    if (isNumericValue(from) && isNumericValue(to)) {
      const value = linear.interpolate(from.value, to.value, progress);
      return createValue.numeric(value, from.unit);
    }

    throw new Error("Cannot interpolate between different value types");
  }

  /**
   * Updates a CSS property on the element with a new value
   * Also tracks the current value for future animations
   *
   * @param property - CSS property to update
   * @param value - New value to apply
   */
  public updateProperty(
    property: CSSPropertyName,
    value: AnimationValue
  ): void {
    const cssValue = this.convertToCSS(property, value);
    this.el.style[property as any] = cssValue;
    this.currentValues.set(property, value);
  }

  /**
   * Resets all animated properties to their initial values
   * Clears the current value tracking
   */
  public reset() {
    this.initialValues.forEach((value, property) => {
      this.el.style[property as any] = value;
    });
    this.currentValues.clear();
  }

  /**
   * Parses a CSS value string into a normalized AnimationValue
   * Handles both color and numeric values
   *
   * @param property - CSS property being parsed
   * @param value - CSS value string
   * @returns Normalized AnimationValue
   * @throws If the value type is not supported
   */
  public parseValue(property: CSSPropertyName, value: string): AnimationValue {
    // Handle color properties first
    if (CSSHandler.colorProperties.has(property)) {
      return this.parseColorValue(value);
    }

    // Use specific parsers for each property
    switch (property) {
      case "opacity":
        return parseOpacity(value);
      case "width":
        return parseWidth(value);
      case "height":
        return parseHeight(value);
      case "borderRadius":
        return parseBorderRadius(value);
      case "borderWidth":
        return parseBorderWidth(value);
      default:
        throw new Error(`Unsupported property: ${property}`);
    }
  }

  /**
   * Gets the current value of a CSS property
   * Returns cached value if available, otherwise computes from the element
   *
   * @param property - CSS property to get
   * @returns Current value as normalized AnimationValue
   */
  public getCurrentValue(property: CSSPropertyName): AnimationValue {
    if (this.currentValues.has(property))
      return this.currentValues.get(property)!;

    const cssValue = this.computedStyles.getPropertyValue(
      camelToDash(property)
    );

    console.log("getCurrentValue", property, cssValue, camelToDash(property));

    // Store initial value for reset functionality
    if (!this.initialValues.has(property)) {
      this.initialValues.set(property, cssValue);
    }

    const value = this.parseValue(property, cssValue);
    this.currentValues.set(property, value);
    return value;
  }
}
