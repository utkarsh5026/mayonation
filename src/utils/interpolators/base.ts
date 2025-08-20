/**
 * Base interface for all interpolators
 * Each interpolator handles a specific type of value (numbers, colors, etc.)
 */
interface Interpolator<T> {
  interpolate(from: T, to: T, progress: number): T;
}
