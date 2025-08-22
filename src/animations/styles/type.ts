import { AnimationValue, ColorSpace } from "@/core/animation-val";

export type CSSHandlerOptions = {
  colorSpace?: ColorSpace;
  precision?: number;
  useGPUAcceleration?: boolean;
};

export type PropertyCache = {
  originalValue: string;
  currentValue: AnimationValue;
  isDirty: boolean;
};

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
