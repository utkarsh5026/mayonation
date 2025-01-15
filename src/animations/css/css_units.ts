import type { AnimationUnit } from "../../core/animation-val";

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
