import {
  createValue,
  type NumericValue,
  type AnimationUnit,
} from "../../core/animation-val";
import type { CSSPropertyName } from "./units";

/**
 * Parses an opacity value from a CSS string
 * @param value - CSS opacity value (empty string or number between 0-1)
 * @returns Parsed numeric value with no unit
 * @throws Error if value is invalid
 */
export const parseOpacity = (value: string): NumericValue => {
  if (value === "") return createValue.numeric(1, "");
  const num = parseFloat(value);
  if (isNaN(num) || num < 0 || num > 1)
    throw new Error(`Invalid opacity value: ${value}`);
  return createValue.numeric(num, "");
};

/**
 * Parses a width value from a CSS string
 * @param value - CSS width value with unit (px, %, em, rem, vh, vw)
 * @returns Parsed numeric value with unit
 * @throws Error if value format is invalid
 */
export const parseWidth = (value: string): NumericValue =>
  parse("width", value, /^(-?\d+\.?\d*)(px|%|em|rem|vh|vw)$/);

/**
 * Parses a height value from a CSS string
 * @param value - CSS height value with unit (px, %, em, rem, vh, vw)
 * @returns Parsed numeric value with unit
 * @throws Error if value format is invalid
 */
export const parseHeight = (value: string): NumericValue =>
  parse("height", value, /^(-?\d+\.?\d*)(px|%|em|rem|vh|vw)$/);

/**
 * Parses a border radius value from a CSS string
 * @param value - CSS border radius value with unit (px, %, em, rem)
 * @returns Parsed numeric value with unit
 * @throws Error if value format is invalid
 */
export const parseBorderRadius = (value: string): NumericValue =>
  parse("borderRadius", value, /^(-?\d+\.?\d*)(px|%|em|rem)$/);

/**
 * Parses a border width value from a CSS string
 * @param value - CSS border width value with unit (px, em, rem)
 * @returns Parsed numeric value with unit
 * @throws Error if value format is invalid
 */
export const parseBorderWidth = (value: string): NumericValue =>
  parse("borderWidth", value, /^(-?\d+\.?\d*)(px|em|rem)$/);

/**
 * Helper function to parse numeric CSS values with units using regex
 * @param property - CSS property name for error messages
 * @param value - CSS value string to parse
 * @param pattern - Regex pattern to match number and unit
 * @returns Parsed numeric value with unit
 * @throws Error if value doesn't match expected pattern
 */
const parse = (property: CSSPropertyName, value: string, pattern: RegExp) => {
  const match = pattern.exec(value);
  if (!match) throw new Error(`Invalid ${property} value: ${value}`);
  return createValue.numeric(parseFloat(match[1]), match[2] as AnimationUnit);
};
