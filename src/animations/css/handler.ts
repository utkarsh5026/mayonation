import { camelToDash } from "@/utils/string";
import { hsl, linear, rgb } from "@/utils/interpolators";
import {
  type AnimationValue,
  type ColorSpace,
  type ColorValue,
  createValue,
  type HSL,
  isColorValue,
  isNumericValue,
  type RGB,
} from "@/core/animation-val";
import { parseColor, convertColorValueToCssString } from "@/utils/color";
import { type CSSPropertyName, cssPropertyUnits } from "./units";
import { CssParser } from "./css-parser";

type CSSHandlerOptions = {
  colorSpace?: ColorSpace;
};

/**
 * Handles CSS property animations for HTML elements.
 */
export class CSSHandler {
  private readonly targetElement: HTMLElement;
  private readonly elementComputedStyles: CSSStyleDeclaration;
  private readonly animatedPropertyValues: Map<CSSPropertyName, AnimationValue>;
  private readonly originalPropertyValues: Map<string, string>;
  private readonly animationConfiguration: CSSHandlerOptions;

  private static readonly ANIMATABLE_COLOR_PROPERTIES =
    new Set<CSSPropertyName>([
      "backgroundColor",
      "color",
      "borderColor",
      "outlineColor",
      "textDecorationColor",
      "textEmphasisColor",
    ]);

  /**
   * Creates a new CSS animation handler
   */
  constructor(targetElement: HTMLElement, options: CSSHandlerOptions = {}) {
    this.targetElement = targetElement;
    this.elementComputedStyles = window.getComputedStyle(targetElement);
    this.animatedPropertyValues = new Map();
    this.originalPropertyValues = new Map();
    this.animationConfiguration = {
      colorSpace: options.colorSpace ?? "hsl",
    };
  }

  /**
   * Parses a CSS color value string into a normalized ColorValue
   */
  private parseCSSColorToAnimationValue(cssColorValue: string): ColorValue {
    switch (this.animationConfiguration.colorSpace) {
      case "rgb": {
        const { r, g, b, a } = parseColor(cssColorValue, "rgb");
        return createValue.rgb(r, g, b, a);
      }
      case "hsl": {
        const { h, s, l, a } = parseColor(cssColorValue, "hsl");
        return createValue.hsl(h, s, l, a);
      }
      default:
        throw new Error(
          `Unsupported color space: ${this.animationConfiguration.colorSpace}`
        );
    }
  }

  /**
   * Checks if a CSS property can be animated by this handler
   */
  public static isAnimatableProperty(
    property: string
  ): property is CSSPropertyName {
    return (
      cssPropertyUnits.has(property as CSSPropertyName) ||
      CSSHandler.ANIMATABLE_COLOR_PROPERTIES.has(property as CSSPropertyName)
    );
  }

  /**
   * Interpolates between two CSS values based on progress
   * Handles both color and numeric interpolation
   */
  public interpolate(
    property: CSSPropertyName,
    from: AnimationValue,
    to: AnimationValue,
    progress: number
  ) {
    if (from.type !== to.type) {
      throw new Error("Cannot interpolate between different value types");
    }

    if (isColorValue(from) && isColorValue(to)) {
      return this.handleColorInterpolation(from, to, progress);
    }

    if (isNumericValue(from) && isNumericValue(to)) {
      const value = linear.interpolate(from.value, to.value, progress);
      return createValue.numeric(value, from.unit);
    }

    throw new Error(
      `Cannot interpolate between different value types for the property: ${property}`
    );
  }

  /**
   * Updates a CSS property on the element with a new animated value
   */
  public applyAnimatedPropertyValue(
    cssProperty: CSSPropertyName,
    animatedValue: AnimationValue
  ): void {
    this.targetElement.style[cssProperty as any] =
      this.convertAnimationValueToCssString(cssProperty, animatedValue);
    this.animatedPropertyValues.set(cssProperty, animatedValue);
  }

  /**
   * Resets all animated properties to their original values
   */
  public restoreOriginalPropertyValues() {
    this.originalPropertyValues.forEach((originalValue, propertyName) => {
      this.targetElement.style[propertyName as any] = originalValue;
    });
    this.animatedPropertyValues.clear();
  }

  /**
   * Parses a CSS value string into a normalized AnimationValue
   */
  public parseCSSValueToAnimationValue(
    cssProperty: CSSPropertyName,
    cssValue: string
  ): AnimationValue {
    if (CSSHandler.ANIMATABLE_COLOR_PROPERTIES.has(cssProperty)) {
      return this.parseCSSColorToAnimationValue(cssValue);
    }

    switch (cssProperty) {
      case "opacity":
        return CssParser.parseOpacity(cssValue);
      case "width":
        return CssParser.parseWidth(cssValue);
      case "height":
        return CssParser.parseHeight(cssValue);
      case "borderRadius":
        return CssParser.parseBorderRadius(cssValue);
      case "borderWidth":
        return CssParser.parseBorderWidth(cssValue);
      default:
        throw new Error(`Unsupported property: ${cssProperty}`);
    }
  }

  /**
   * Gets the current animated value of a CSS property
   */
  public getCurrentAnimatedValue(cssProperty: CSSPropertyName): AnimationValue {
    if (this.animatedPropertyValues.has(cssProperty))
      return this.animatedPropertyValues.get(cssProperty)!;

    const computedCSSValue = this.elementComputedStyles.getPropertyValue(
      camelToDash(cssProperty)
    );

    if (!this.originalPropertyValues.has(cssProperty)) {
      this.originalPropertyValues.set(cssProperty, computedCSSValue);
    }

    const parsedAnimationValue = this.parseCSSValueToAnimationValue(
      cssProperty,
      computedCSSValue
    );
    this.animatedPropertyValues.set(cssProperty, parsedAnimationValue);
    return parsedAnimationValue;
  }

  /**
   * Converts an AnimationValue back to a CSS string
   */
  private convertAnimationValueToCssString(
    cssProperty: CSSPropertyName,
    animationValue: AnimationValue
  ): string {
    if (isColorValue(animationValue))
      return convertColorValueToCssString(animationValue.value);
    if (isNumericValue(animationValue))
      return `${animationValue.value}${animationValue.unit}`;
    throw new Error(`Unsupported value type: ${animationValue}`);
  }

  private handleColorInterpolation(
    from: AnimationValue,
    to: AnimationValue,
    progress: number
  ): AnimationValue {
    switch (this.animationConfiguration.colorSpace) {
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
          `Unsupported color space: ${this.animationConfiguration.colorSpace}`
        );
    }
  }
}
