import { createValue, type NumericValue } from "@/core/animation-val";
import type { AnimationUnit } from "@/utils/unit";
import type { CSSPropertyName } from "./units";

/**
 * Parses an opacity value from a CSS string
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
 */
export const parseWidth = (value: string): NumericValue =>
  parse("width", value, /^(-?\d+\.?\d*)(px|%|em|rem|vh|vw)$/);

/**
 * Parses a height value from a CSS string
 */
export const parseHeight = (value: string): NumericValue =>
  parse("height", value, /^(-?\d+\.?\d*)(px|%|em|rem|vh|vw)$/);

/**
 * Parses a border radius value from a CSS string
 */
export const parseBorderRadius = (value: string): NumericValue =>
  parse("borderRadius", value, /^(-?\d+\.?\d*)(px|%|em|rem)$/);

/**
 * Parses a border width value from a CSS string
 */
export const parseBorderWidth = (value: string): NumericValue =>
  parse("borderWidth", value, /^(-?\d+\.?\d*)(px|em|rem)$/);

/**
 * Helper function to parse numeric CSS values with units using regex
 */
const parse = (property: CSSPropertyName, value: string, pattern: RegExp) => {
  const match = pattern.exec(value);
  if (!match) throw new Error(`Invalid ${property} value: ${value}`);
  return createValue.numeric(parseFloat(match[1]), match[2] as AnimationUnit);
};
