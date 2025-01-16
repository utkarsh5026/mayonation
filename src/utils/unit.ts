const BASE_FONT_SIZE_PX = 16;

/**
 * Types of supported CSS units
 */
export type LengthUnit =
  | "px"
  | "%"
  | "em"
  | "rem"
  | "vh"
  | "vw"
  | "vmin"
  | "vmax";
export type AngleUnit = "deg" | "rad" | "turn";
export type ScaleUnit = ""; // Scale is unitless

export type AnimationUnit = LengthUnit | AngleUnit | ScaleUnit;

/**
 * Context needed for unit conversions
 */
export type ConversionContext = {
  parentSize: {
    width: number;
    height: number;
  };
  fontSize: number;
  viewportSize: {
    width: number;
    height: number;
  };
};

/**
 * Default conversion context
 */
const defaultContext: ConversionContext = {
  parentSize: {
    width: 0,
    height: 0,
  },
  fontSize: BASE_FONT_SIZE_PX,
  viewportSize: {
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  },
};

export function parseValue(value: string | number): {
  value: number;
  unit: AnimationUnit;
} {
  if (typeof value === "number")
    return {
      value,
      unit: "",
    };

  const match = RegExp(/^(-?\d*\.?\d+)([a-z%]*)$/).exec(value);
  if (!match) throw new Error(`Invalid value format: "${value}"`);

  return {
    value: parseFloat(match[1]),
    unit: match[2] as AnimationUnit,
  };
}

/**
 * Converts length values to pixels
 */
export function convertLength(
  value: string | number,
  context: ConversionContext = defaultContext
): number {
  const { value: num, unit } = parseValue(value);

  switch (unit as LengthUnit) {
    case "px":
      return num;
    case "%":
      // Assumes percentage of parent width for horizontal properties
      return (num / 100) * context.parentSize.width;
    case "em":
      return num * context.fontSize;
    case "rem":
      return num * BASE_FONT_SIZE_PX;
    case "vh":
      return (num / 100) * context.viewportSize.height;
    case "vw":
      return (num / 100) * context.viewportSize.width;
    case "vmin":
      return (
        (num / 100) *
        Math.min(context.viewportSize.width, context.viewportSize.height)
      );
    case "vmax":
      return (
        (num / 100) *
        Math.max(context.viewportSize.width, context.viewportSize.height)
      );
    default:
      return num; // Assume pixels if no unit specified
  }
}

/**
 * Converts scale values to numbers
 */
export function convertScale(value: string | number): number {
  const { value: num } = parseValue(value);
  return num || 1; // Default to 1 if invalid
}

/**
 * Converts angle values to degrees
 */
export function convertAngle(value: string | number): number {
  const { value: num, unit } = parseValue(value);

  switch (unit) {
    case "rad":
      return num * (180 / Math.PI); // Convert radians to degrees
    case "turn":
      return num * 360;
    case "deg":
    default:
      return num;
  }
}
