import { NumericInterpolator } from "./numeric-interpolator";
import { ColorInterpolator } from "./color-interpolator";

export const rgb = new ColorInterpolator("rgb");
export const hsl = new ColorInterpolator("hsl");
export const linear = new NumericInterpolator("linear");
export const logarithmic = new NumericInterpolator("logarithmic");
export const exponential = new NumericInterpolator("exponential");
export const angle = new NumericInterpolator("angle");

/**
 * Clamps a progress value between 0 and 1.
 */
export const clampProgress = (progress: number): number => {
  return Math.max(0, Math.min(1, progress));
};

export { NumericInterpolator, ColorInterpolator };
