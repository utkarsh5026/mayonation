import {
  type RGB,
  type HSL,
  type ColorSpace,
  isHSLColor,
  isRGBColor,
} from "@/core/animation-val";

/**
 * Parses a color string into either RGB or HSL format and optionally converts between spaces.
 * Supports hex colors (#RGB or #RRGGBB), rgb(r,g,b), and hsl(h,s,l) formats.
 */
export const parseColor = <T extends ColorSpace>(
  color: string,
  space: T
): T extends "rgb" ? RGB : HSL => {
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
    return hslToRgb(colorResult) as T extends "rgb" ? RGB : HSL;
  }

  if (space === "hsl" && isRGBColor(colorResult)) {
    return rgbToHsl(colorResult) as any as T extends "rgb" ? RGB : HSL;
  }
  return colorResult as T extends "rgb" ? RGB : HSL;
};

/**
 * Converts RGB color values to HSL color space.
 * Uses standard RGB to HSL conversion algorithm.
 */
export const rgbToHsl = ({ r, g, b, a }: RGB): HSL => {
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
    a: a // Preserve the alpha channel
  };
};

/**
 * Converts HSL color values to RGB color space.
 * Uses standard HSL to RGB conversion algorithm.
 */
export const hslToRgb = ({ h, s, l, a }: HSL): RGB => {
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
    a: a // Preserve the alpha channel
  };
};

/**
 * Converts an RGB or HSL color object to a CSS string.
 */
export const convertColorValueToCssString = (color: RGB | HSL): string => {
  if (isRGBColor(color)) {
    const { r, g, b, a } = color;
    return a !== undefined
      ? `rgba(${r}, ${g}, ${b}, ${a})`
      : `rgb(${r}, ${g}, ${b})`;
  }

  if (isHSLColor(color)) {
    const { h, s, l, a } = color;
    return a !== undefined
      ? `hsla(${h}, ${s}%, ${l}%, ${a})`
      : `hsl(${h}, ${s}%, ${l}%)`;
  }

  return "";
};

/**
 * Parses an RGB color string into an RGB object.
 * Accepts format: rgb(r,g,b) or rgba(r,g,b,a) where r,g,b are integers 0-255 and a is 0-1.
 */
const parseRGBString = (color: string): RGB => {
  const values = color.match(/[\d.]+/g)?.map(Number);
  if (!values || values.length < 3) {
    throw new Error(`Invalid RGB color format: ${color}`);
  }
  return { 
    r: values[0], 
    g: values[1], 
    b: values[2],
    a: values.length > 3 ? values[3] : undefined
  };
};

/**
 * Parses a hex color string into an RGB object.
 * Supports both 3-digit (#RGB) and 6-digit (#RRGGBB) hex formats.
 */
const parseHexColor = (hex: string): RGB => {
  hex = hex.replace("#", "");

  // shorthand
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }

  const hexPattern = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;
  const result = hexPattern.exec(hex);
  if (!result) {
    throw new Error(`Invalid hex color format: #${hex}`);
  }

  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
};

/**
 * Parses an HSL color string into an HSL object.
 */
const parseHSLString = (color: string): HSL => {
  // Match both integers and decimals for hsl/hsla values
  const values = color.match(/[\d.]+/g)?.map(Number);
  if (!values || values.length < 3) {
    throw new Error(`Invalid HSL color format: ${color}`);
  }
  return { 
    h: values[0], 
    s: values[1], 
    l: values[2], 
    a: values.length > 3 ? values[3] : 1 
  };
};
