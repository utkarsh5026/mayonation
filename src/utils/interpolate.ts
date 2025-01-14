import type { RGB, HSL, ColorSpace } from "./color";

/**
 * Base interface for all interpolators
 * Each interpolator handles a specific type of value (numbers, colors, etc.)
 */
interface Interpolator<T> {
  interpolate(from: T, to: T, progress: number): T;
}

/**
 * Interpolates between numeric values using different mathematical spaces.
 * @example
 * const interpolator = new NumericInterpolator("logarithmic");
 * const result = interpolator.interpolate(1, 100, 0.5); // Interpolate halfway between 1 and 100
 */
export class NumericInterpolator implements Interpolator<number> {
  /**
   * Creates a new numeric interpolator
   * @param space - The mathematical space to use for interpolation:
   *   - "linear": Standard linear interpolation (default)
   *   - "logarithmic": Better for values that change by orders of magnitude
   *   - "exponential": Creates accelerating or decelerating transitions
   */
  constructor(
    private readonly space: "linear" | "logarithmic" | "exponential" = "linear"
  ) {}

  /**
   * Interpolates between two numbers
   * @param from - Starting value
   * @param to - Ending value
   * @param progress - A number between 0 and 1 representing interpolation progress
   * @returns The interpolated value
   */
  public interpolate(from: number, to: number, progress: number): number {
    switch (this.space) {
      case "logarithmic":
        return this.logInterpolate(from, to, progress);
      case "exponential":
        return this.expInterpolate(from, to, progress);
      case "linear":
      default:
        return this.linearInterpolate(from, to, progress);
    }
  }

  /**
   * Interpolates between two numbers using logarithmic space
   * used in scale animations
   */
  private logInterpolate(from: number, to: number, progress: number): number {
    const logFrom = Math.log(Math.max(from, Number.EPSILON));
    const logTo = Math.log(Math.max(to, Number.EPSILON));
    return Math.exp(logFrom + (logTo - logFrom) * progress);
  }

  /**
   * Interpolates between two numbers using linear space
   * used in most animations
   */
  private linearInterpolate(
    from: number,
    to: number,
    progress: number
  ): number {
    return from + (to - from) * progress;
  }

  /**
   * Interpolates between two numbers using exponential space
   * used in scale animations
   */
  private expInterpolate(from: number, to: number, progress: number): number {
    const sign = Math.sign(to - from);
    const delta = Math.abs(to - from);
    return from + sign * delta ** progress;
  }
}

/**
 * Interpolates between colors in either RGB or HSL color space.
 * RGB interpolation is simpler but can produce muddy colors.
 * HSL interpolation often produces more visually pleasing transitions.
 * @example
 * const interpolator = new ColorInterpolator("hsl");
 * const result = interpolator.interpolate(
 *   { h: 0, s: 100, l: 50 },   // Red
 *   { h: 240, s: 100, l: 50 }, // Blue
 *   0.5                        // Halfway point (purple)
 * );
 */
export class ColorInterpolator implements Interpolator<RGB | HSL> {
  /**
   * Creates a new color interpolator
   * @param space - The color space to use for interpolation:
   *   - "rgb": Red-Green-Blue color space (default)
   *   - "hsl": Hue-Saturation-Lightness color space
   */
  constructor(private readonly space: ColorSpace = "rgb") {}

  /**
   * Interpolates between two colors
   * @param from - Starting color in either RGB or HSL format
   * @param to - Ending color in either RGB or HSL format
   * @param progress - A number between 0 and 1 representing interpolation progress
   * @returns The interpolated color in the same format as the input
   * @throws Will throw if mixing RGB and HSL color formats
   */
  public interpolate(
    from: RGB | HSL,
    to: RGB | HSL,
    progress: number
  ): RGB | HSL {
    switch (this.space) {
      case "rgb":
        return this.interpolateRGB(from as RGB, to as RGB, progress);
      case "hsl":
        return this.interpolateHSL(from as HSL, to as HSL, progress);
    }
  }

  private interpolateRGB(from: RGB, to: RGB, progress: number): RGB {
    const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

    return {
      r: Math.round(lerp(from.r, to.r, progress)),
      g: Math.round(lerp(from.g, to.g, progress)),
      b: Math.round(lerp(from.b, to.b, progress)),
    };
  }

  private interpolateHSL(from: HSL, to: HSL, progress: number): HSL {
    let hueDiff = to.h - from.h;
    if (Math.abs(hueDiff) > 180) {
      hueDiff = hueDiff > 0 ? hueDiff - 360 : hueDiff + 360;
    }

    return {
      h: (from.h + hueDiff * progress + 360) % 360,
      s: from.s + (to.s - from.s) * progress,
      l: from.l + (to.l - from.l) * progress,
    };
  }
}
