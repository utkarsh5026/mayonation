import { normalizeAngle } from "../math";
import { Interpolator } from "./base";

/**
 * Interpolates between numeric values using different mathematical spaces.
 */
export class NumericInterpolator implements Interpolator<number> {
  /**
   * Creates a new numeric interpolator
   * @param space - The mathematical space to use for interpolation:
   *   - "linear": Standard linear interpolation (default)
   *   - "logarithmic": Better for values that change by orders of magnitude
   *   - "exponential": Creates accelerating or decelerating transitions
   *   - "angle": Interpolates angles in a circular manner
   */
  constructor(
    private readonly space:
      | "linear"
      | "logarithmic"
      | "exponential"
      | "angle" = "linear"
  ) {}

  /**
   * Interpolates between two numbers
   */
  public interpolate(from: number, to: number, progress: number): number {
    switch (this.space) {
      case "logarithmic":
        return this.logInterpolate(from, to, progress);
      case "exponential":
        return this.expInterpolate(from, to, progress);
      case "linear":
        return this.linearInterpolate(from, to, progress);
      case "angle":
        return this.angleInterpolate(from, to, progress);
      default:
        return this.linearInterpolate(from, to, progress);
    }
  }

  /**
   * Interpolates between two angles using angle space
   * used in path animations
   */
  private angleInterpolate(from: number, to: number, progress: number): number {
    const startAngle = normalizeAngle(from);
    const endAngle = normalizeAngle(to);
    let diff = endAngle - startAngle;

    if (Math.abs(diff) > 180) {
      if (diff > 0) diff -= 360;
      else diff += 360;
    }

    const result = startAngle + progress * diff;
    return normalizeAngle(result);
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
    if (progress === 0) return from;
    if (progress === 1) return to;

    const sign = Math.sign(to - from);
    const delta = Math.abs(to - from);
    return from + sign * delta * Math.pow(progress, 3);
  }
}
