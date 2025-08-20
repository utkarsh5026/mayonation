/**
 * Core mathematical utilities for animation calculations
 */

type Coordinate = {
  x: number;
  y: number;
};

/**
 * Linearly interpolates between start and end values based on a progress factor
 * The progress factor t should be between 0 and 1
 */
export function lerp(start: number, end: number, t: number) {
  return start + (end - start) * t;
}

/**
 * Normalizes a value from one range to another
 * Useful when converting between different units or coordinate systems
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
export function distance(a: Coordinate, b: Coordinate): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Clamps a value between a minimum and maximum
 * Essential for keeping animations within bounds
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Normalizes an angle to be within 0-360 degrees
 * Useful for angle-based animations and calculations
 */
export function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

/**
 * Calculates the dot product of two vectors
 * Useful for angle-based calculations and projections
 */
export function dotProduct(a: Coordinate, b: Coordinate): number {
  return a.x * b.x + a.y * b.y;
}
