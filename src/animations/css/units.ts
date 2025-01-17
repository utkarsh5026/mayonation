import type { AnimationUnit } from "../../utils/unit";

// Map of CSS properties to their valid units
export const cssPropertyUnits = new Map<CSSPropertyName, AnimationUnit[]>([
  ["width", ["px", "%", "em", "rem", "vh", "vw"]],
  ["height", ["px", "%", "em", "rem", "vh", "vw"]],
  ["opacity", [""]],
  ["borderRadius", ["px", "%", "em", "rem"]],
  ["borderWidth", ["px", "em", "rem"]],
]);

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
  | "color" // Text color
  | "outlineColor" // Outline color
  | "textDecorationColor" // Text decoration color
  | "textEmphasisColor"; // Text emphasis color

/**
 * Configuration type for CSS properties that can be animated.
 */
export type CssPropertyConfig = Partial<{
  /** Opacity value between 0 and 1 */
  opacity: number;

  /** CSS color value for background (hex, rgb, rgba, etc) */
  backgroundColor: string;

  /** Element width in px, %, em, rem or other valid CSS units */
  width: number | string;

  /** Element height in px, %, em, rem or other valid CSS units */
  height: number | string;

  /** Border radius in px, %, em, rem or other valid CSS units */
  borderRadius: number | string;

  /** Complete border shorthand value (e.g. "1px solid black") */
  border: string;

  /** Border color value (hex, rgb, rgba, etc) */
  borderColor: string;

  /** Border style (solid, dashed, dotted, etc) */
  borderStyle: string;

  /** Width of the border  */
  borderWidth: number | string;

  /** Text color value (hex, rgb, rgba, etc) */
  color: string;

  /** Outline color value (hex, rgb, rgba, etc) */
  outlineColor: string;

  /** Text decoration color value (hex, rgb, rgba, etc) */
  textDecorationColor: string;

  /** Text emphasis color value (hex, rgb, rgba, etc) */
  textEmphasisColor: string;
}>;
