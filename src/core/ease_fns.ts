import type { EaseFn, EaseFnName } from "./types";

/**
 * The linear easing moves at a constant speed from start to finish.
 * While this might seem like the most logical choice, it often feels
 * mechanical and unnatural to users because real-world objects rarely move at perfectly constant speeds.
 */
export function linear(t: number): number {
  return t;
}

/**
 * The animation starts slowly and gradually accelerates, like a car starting from a standstill.
 * This creates a sense of "winding up" or "gathering momentum".
 * The cubic power (³) makes this acceleration quite pronounced.
 */
export function easeIn(t: number): number {
  return Math.pow(t, 3);
}

/**
 * The animation starts quickly and gradually decelerates, like a car slowing down after reaching its destination.
 * This creates a sense of "releasing" or "settling".
 * The cubic power (³) makes this deceleration quite pronounced.
 */
export function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * The animation starts slowly, speeds up, and then slows down again, creating a smooth, natural motion.
 * This is often used for UI elements that need to move smoothly between two points.
 */
export function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * The animation starts slowly and gradually accelerates, like a car starting from a standstill.
 * This creates a sense of "winding up" or "gathering momentum".
 * The quadratic power (²) makes this acceleration quite pronounced.
 */
export function easeInQuad(t: number): number {
  return t * t;
}

/**
 * The animation starts quickly and gradually decelerates, like a car slowing down after reaching its destination.
 * This creates a sense of "releasing" or "settling".
 * The quadratic power (²) makes this deceleration quite pronounced.
 */
export function easeOutQuad(t: number): number {
  return 1 - Math.pow(1 - t, 2);
}

/**
 * The animation starts slowly, speeds up, and then slows down again, creating a smooth, natural motion.
 * This is often used for UI elements that need to move smoothly between two points.
 */
export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * The animation starts slowly and gradually accelerates, like a car starting from a standstill.
 * This creates a sense of "winding up" or "gathering momentum".
 * The cubic power (³) makes this acceleration quite pronounced.
 */
export function easeInCubic(t: number): number {
  return Math.pow(t, 3);
}

/**
 * The animation starts quickly and gradually decelerates, like a car slowing down after reaching its destination.
 * This creates a sense of "releasing" or "settling".
 * The cubic power (³) makes this deceleration quite pronounced.
 */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * The animation starts slowly, speeds up, and then slows down again, creating a smooth, natural motion.
 * This is often used for UI elements that need to move smoothly between two points.
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export const easeFns: Record<EaseFnName, EaseFn> = {
  linear,
  easeIn,
  easeOut,
  easeInOut,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
};
