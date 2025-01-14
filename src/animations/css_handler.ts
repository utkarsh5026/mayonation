import { AnmimationValue, NumericUnit } from "../types";
import { lerp } from "../utils/math";
import { camelToDash } from "../utils/string";

// Map of CSS properties to their valid units
const cssPropertyUnits = new Map<CSSPropertyName, NumericUnit[]>([
  ["width", ["px", "%", "em", "rem", "vh", "vw"]],
  ["height", ["px", "%", "em", "rem", "vh", "vw"]],
  ["opacity", [""]],
  ["borderRadius", ["px", "%", "em", "rem"]],
  ["borderWidth", ["px", "em", "rem"]],
]);

const colorProperties = new Set<CSSPropertyName>([
  "backgroundColor",
  "borderColor",
  "color",
]);

export class CSSHandler {
  private el: HTMLElement;
  private readonly computedStyles: CSSStyleDeclaration;
  private currentValues: Map<CSSPropertyName, AnmimationValue>;

  constructor(el: HTMLElement) {
    this.el = el;
    this.computedStyles = window.getComputedStyle(el);
    this.currentValues = new Map();
  }

  private parseInitialStyles() {
    cssPropertyUnits.forEach((_, property) => {
      const computedValue = this.computedStyles.getPropertyValue(
        camelToDash(property)
      );

      if (computedValue) {
      }
    });
  }

  /**
   * Interpolates between two numeric values with units.
   */
  private interpolateNumeric(
    from: AnmimationValue,
    to: AnmimationValue,
    progress: number
  ) {
    return {
      value: lerp(from.value, to.value, progress),
      unit: to.unit,
    };
  }

  private interpolateColor(
    from: AnmimationValue,
    to: AnmimationValue,
    progress: number
  ) {}

  /**
   * Validates if a property can be animated.
   */
  public static isAnimatableProperty(property: string): boolean {
    return (
      cssPropertyUnits.has(property as CSSPropertyName) ||
      colorProperties.has(property as CSSPropertyName)
    );
  }

  /**
   * Interpolates between two CSS values based on progress.
   * Handles different types of CSS properties appropriately.
   */
  public interpolate(
    property: CSSPropertyName,
    from: AnmimationValue,
    to: AnmimationValue,
    progress: number
  ) {
    if (colorProperties.has(property)) {
      return this.interpolateColor(from, to, progress);
    }

    return this.interpolateNumeric(from, to, progress);
  }

  public reset() {
    this.currentValues.clear();
  }
}

/**
 * CSS properties that can be animated besides transforms.
 * Includes visual properties like opacity, dimensions, and borders.
 */
export type CSSPropertyName =
  | "opacity" // Element transparency
  | "backgroundColor" // Background color
  | "width" // Element width
  | "height" // Element height
  | "borderRadius" // Corner rounding
  | "border" // Border shorthand
  | "borderColor" // Border color
  | "borderStyle" // Border style
  | "borderWidth" // Border thickness
  | "color"; // Text color
