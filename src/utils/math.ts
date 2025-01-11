/**
 * Core mathematical utilities for animation calculations
 */

/**
 * Linearly interpolates between start and end values based on a progress factor
 * The progress factor t should be between 0 and 1
 *
 * This is one of the most fundamental functions in animation - it calculates
 * intermediate values during an animation's progress
 *
 * Parameters:
 * - start: The starting value
 * - end: The ending value
 * - t: The progress factor, typically between 0 and 1
 *
 * Returns:
 * - The interpolated value between start and end based on the progress factor t
 */
export function lerp(start: number, end: number, t: number) {
  return start + (end - start) * t;
}

/**
 * Normalizes a value from one range to another
 * Useful when converting between different units or coordinate systems
 *
 * For example: converting mouse position (in pixels) to animation progress (0-1)
 *
 * Parameters:
 * - value: The value to normalize
 * - min: The minimum value of the source range
 * - max: The maximum value of the source range
 *
 * Returns:
 * - The normalized value between 0 and 1
 */
export function normalize(value: number, min: number, max: number) {
  return (value - min) / (max - min);
}

/**
 * Converts radians to degrees
 * Helpful when working with rotation animations
 */
export function radiansToDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Converts degrees to radians
 * Helpful when working with trigonometric functions
 */
export function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculates the distance between two points
 * Useful for path-based animations and physics calculations
 */
export function distance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Clamps a value between a minimum and maximum
 * Essential for keeping animations within bounds
 *
 * Parameters:
 * - value: The value to clamp
 * - min: The minimum value
 * - max: The maximum value
 *
 * Returns:
 * - The clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Smoothstep provides smooth interpolation with ease-in and ease-out
 * Creates a smooth transition that's differentiable at the endpoints
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const normalized = normalize(x, edge0, edge1);
  const t = clamp(normalized, 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Generates a spring physics calculation
 * Useful for elastic animations
 */
export function springCalcuation(
  current: number,
  target: number,
  velocity: number,
  mass: number = 1,
  stiffness: number = 100,
  damping: number = 10
): {
  position: number;
  velocity: number;
} {
  const force = -stiffness * (current - target) - damping * velocity;
  const acceleration = force / mass;
  const newVelocity = velocity + acceleration;
  const newPosition = current + newVelocity;
  return { position: newPosition, velocity: newVelocity };
}
