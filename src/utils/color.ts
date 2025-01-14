import {
  type RGB,
  type HSL,
  type ColorSpace,
  isHSLColor,
  isRGBColor,
} from "../core/animation-val";

/**
 * Parses a color string into either RGB or HSL format and optionally converts between spaces.
 * Supports hex colors (#RGB or #RRGGBB), rgb(r,g,b), and hsl(h,s,l) formats.
 *
 * @param {string} color - The color string to parse
 * @param {ColorSpace} space - The desired output color space ("rgb" or "hsl")
 * @returns {RGB | HSL} The parsed and potentially converted color
 * @throws {Error} If the color string format is not supported
 *
 * @example
 * // Parse hex color to RGB
 * const rgb = parseColor("#ff0000", "rgb"); // {r: 255, g: 0, b: 0}
 *
 * @example
 * // Parse RGB string to HSL
 * const hsl = parseColor("rgb(255,0,0)", "hsl"); // {h: 0, s: 100, l: 50}
 */
export function parseColor<T extends ColorSpace>(
  color: string,
  space: T
): T extends "rgb" ? RGB : HSL {
  let colorResult: RGB | HSL;
  switch (true) {
    case color.startsWith("#"):
      colorResult = parseHexColor(color);
      break;
    case color.startsWith("rgb"):
      colorResult = parseRGBString(color);
      break;
    case color.startsWith("hsl"):
      colorResult = parseHSLString(color);
      break;
    default:
      throw new Error(`Unsupported color format: ${color}`);
  }

  if (space === "rgb" && isHSLColor(colorResult)) {
    return hslToRgb(colorResult) as any;
  } else if (space === "hsl" && isRGBColor(colorResult)) {
    return rgbToHsl(colorResult) as any as T extends "rgb" ? RGB : HSL;
  }
  return colorResult as T extends "rgb" ? RGB : HSL;
}

/**
 * Converts RGB color values to HSL color space.
 * Uses standard RGB to HSL conversion algorithm.
 *
 * @param {RGB} rgb - RGB color object with values 0-255
 * @returns {HSL} HSL color object with h: 0-360, s: 0-100, l: 0-100
 *
 * @example
 * const hsl = rgbToHsl({r: 255, g: 0, b: 0}); // {h: 0, s: 100, l: 50}
 */
export function rgbToHsl({ r, g, b }: RGB): HSL {
  // Convert RGB values to 0-1 range
  const normalR = r / 255;
  const normalG = g / 255;
  const normalB = b / 255;

  const max = Math.max(normalR, normalG, normalB);
  const min = Math.min(normalR, normalG, normalB);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case normalR:
        h = (normalG - normalB) / d + (normalG < normalB ? 6 : 0);
        break;
      case normalG:
        h = (normalB - normalR) / d + 2;
        break;
      case normalB:
        h = (normalR - normalG) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Converts HSL color values to RGB color space.
 * Uses standard HSL to RGB conversion algorithm.
 *
 * @param {HSL} hsl - HSL color object with h: 0-360, s: 0-100, l: 0-100
 * @returns {RGB} RGB color object with values 0-255
 *
 * @example
 * const rgb = hslToRgb({h: 0, s: 100, l: 50}); // {r: 255, g: 0, b: 0}
 */
export function hslToRgb({ h, s, l }: HSL): RGB {
  // Convert HSL values to 0-1 range
  const normalH = h / 360;
  const normalS = s / 100;
  const normalL = l / 100;

  let r, g, b;

  if (normalS === 0) {
    r = g = b = normalL; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q =
      normalL < 0.5
        ? normalL * (1 + normalS)
        : normalL + normalS - normalL * normalS;
    const p = 2 * normalL - q;

    r = hue2rgb(p, q, normalH + 1 / 3);
    g = hue2rgb(p, q, normalH);
    b = hue2rgb(p, q, normalH - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

/**
 * Converts an RGB or HSL color object to a CSS string.
 *
 * @param {RGB | HSL} color - The color object to convert
 * @returns {string} The CSS string representation of the color
 *
 * @example
 * const cssString = toCSSString({r: 255, g: 0, b: 0}); // "rgb(255, 0, 0)"
 * const cssString2 = toCSSString({h: 0, s: 100, l: 50}); // "hsl(0, 100%, 50%)"
 */
export function toCSSString(color: RGB | HSL): string {
  if (isRGBColor(color)) {
    const { r, g, b, a } = color;
    return a !== undefined
      ? `rgba(${r}, ${g}, ${b}, ${a})`
      : `rgb(${r}, ${g}, ${b})`;
  } else if (isHSLColor(color)) {
    const { h, s, l, a } = color;
    return a !== undefined
      ? `hsla(${h}, ${s}%, ${l}%, ${a})`
      : `hsl(${h}, ${s}%, ${l}%)`;
  }
  return "";
}

/**
 * Parses an RGB color string into an RGB object.
 * Accepts format: rgb(r,g,b) where r,g,b are integers 0-255.
 *
 * @param {string} color - The RGB color string to parse
 * @returns {RGB} The parsed RGB color object
 * @throws {Error} If the RGB string format is invalid
 *
 * @example
 * const rgb = parseRGBString("rgb(255,0,0)"); // {r: 255, g: 0, b: 0}
 */
function parseRGBString(color: string): RGB {
  const values = color.match(/\d+/g)?.map(Number);
  if (!values || values.length < 3) {
    throw new Error(`Invalid RGB color format: ${color}`);
  }
  return { r: values[0], g: values[1], b: values[2] };
}

/**
 * Parses a hex color string into an RGB object.
 * Supports both 3-digit (#RGB) and 6-digit (#RRGGBB) hex formats.
 *
 * @param {string} hex - The hex color string to parse
 * @returns {RGB} The parsed RGB color object
 * @throws {Error} If the hex string format is invalid
 *
 * @example
 * const rgb = parseHexColor("#ff0000"); // {r: 255, g: 0, b: 0}
 * const rgb2 = parseHexColor("#f00"); // {r: 255, g: 0, b: 0}
 */
function parseHexColor(hex: string): RGB {
  hex = hex.replace("#", "");

  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }

  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    throw new Error(`Invalid hex color format: #${hex}`);
  }

  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Parses an HSL color string into an HSL object.
 * Accepts format: hsl(h,s,l) where h is 0-360, s and l are 0-100.
 *
 * @param {string} color - The HSL color string to parse
 * @returns {HSL} The parsed HSL color object
 * @throws {Error} If the HSL string format is invalid
 *
 * @example
 * const hsl = parseHSLString("hsl(0,100,50)"); // {h: 0, s: 100, l: 50}
 */
function parseHSLString(color: string): HSL {
  const values = color.match(/\d+/g)?.map(Number);
  if (!values || values.length < 3) {
    throw new Error(`Invalid HSL color format: ${color}`);
  }
  return { h: values[0], s: values[1], l: values[2] };
}
