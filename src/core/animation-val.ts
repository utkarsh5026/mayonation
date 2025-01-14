/**
 * Represents the supported color spaces for color parsing and conversion.
 * @type {"rgb" | "hsl"}
 */
export type ColorSpace = "rgb" | "hsl";

/**
 * Represents an RGB color with red, green, and blue components.
 * Each component should be an integer between 0 and 255.
 */
export type RGB = {
  r: number;
  g: number;
  b: number;
  a?: number;
};

/**
 * Represents an HSL color with hue, saturation, and lightness components.
 * Each component should be an integer between 0 and 360 for hue,
 *  0 and 100 for saturation and lightness.
 */
export type HSL = {
  h: number;
  s: number;
  l: number;
  a?: number;
};

/**
 * Represents all possible CSS units for animations
 */
export type AnimationUnit =
  | "px"
  | "pt"
  | "cm"
  | "mm" // Absolute length
  | "em"
  | "rem"
  | "%"
  | "vh"
  | "vw" // Relative length
  | "deg"
  | "rad"
  | "turn" // Angles
  | ""
  | "ms"
  | "s"; // Special

/**
 * Represents a numeric value with its unit
 */
export type NumericValue = {
  type: "numeric";
  value: number;
  unit: AnimationUnit;
};

/**
 * Represents a color value in either RGB or HSL space
 */
export type ColorValue = {
  type: "color";
  space: ColorSpace;
  value: RGB | HSL;
};

export type AnimationValue = NumericValue | ColorValue;

/**
 * Helper functions for creating animation values
 */
export const createValue = {
  numeric: (value: number, unit: AnimationUnit): NumericValue => ({
    type: "numeric",
    value,
    unit,
  }),

  rgb: (r: number, g: number, b: number, a: number = 1): ColorValue => ({
    type: "color",
    space: "rgb",
    value: { r, g, b, a },
  }),

  hsl: (h: number, s: number, l: number, a: number = 1): ColorValue => ({
    type: "color",
    space: "hsl",
    value: { h, s, l, a },
  }),
};

/**
 * Type guards for value type checking
 */
export const isNumericValue = (value: AnimationValue): value is NumericValue =>
  value.type === "numeric";

export const isColorValue = (value: AnimationValue): value is ColorValue =>
  value.type === "color";

export const isRGBColor = (color: RGB | HSL): color is RGB =>
  "r" in color && "g" in color && "b" in color;

export const isHSLColor = (color: RGB | HSL): color is HSL =>
  "h" in color && "s" in color && "l" in color;
