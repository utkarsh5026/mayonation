/**
 * A function that takes a time value between 0 and 1 and returns an eased value between 0 and 1.
 * Used to control the rate of change during animations.
 */
export type EaseFn = (t: number) => number;

/**
 * Built-in easing function names that can be used to control animation timing.
 * Each provides a different style of acceleration and deceleration.
 */
export type EaseFnName =
  | "linear" // Constant rate of change
  | "easeIn" // Accelerates from start
  | "easeOut" // Decelerates to end
  | "easeInOut" // Accelerates in middle, decelerates at ends
  | "easeInQuad" // Quadratic acceleration
  | "easeOutQuad" // Quadratic deceleration
  | "easeInOutQuad" // Quadratic acceleration and deceleration
  | "easeInCubic" // Cubic acceleration
  | "easeOutCubic" // Cubic deceleration
  | "easeInOutCubic" // Cubic acceleration and deceleration
  | "easeInQuart" // Quartic acceleration
  | "easeOutQuart" // Quartic deceleration
  | "easeInOutQuart" // Quartic acceleration and deceleration
  | "easeInQuint" // Quintic acceleration
  | "easeOutQuint" // Quintic deceleration
  | "easeInOutQuint" // Quintic acceleration and deceleration
  | "easeInSine" // Sinusoidal acceleration
  | "easeOutSine" // Sinusoidal deceleration
  | "easeInOutSine" // Sinusoidal acceleration and deceleration
  | "easeInExpo" // Exponential acceleration
  | "easeOutExpo" // Exponential deceleration
  | "easeInOutExpo" // Exponential acceleration and deceleration
  | "easeInCirc" // Circular acceleration
  | "easeOutCirc" // Circular deceleration
  | "easeInOutCirc" // Circular acceleration and deceleration
  | "easeInBack" // Back easing with overshoot acceleration
  | "easeOutBack" // Back easing with overshoot deceleration
  | "easeInOutBack" // Back easing with overshoot acceleration and deceleration
  | "easeInElastic" // Elastic easing with spring acceleration
  | "easeOutElastic" // Elastic easing with spring deceleration
  | "easeInOutElastic" // Elastic easing with spring acceleration and deceleration
  | "easeInBounce" // Bouncing acceleration
  | "easeOutBounce" // Bouncing deceleration
  | "easeInOutBounce"; // Bouncing acceleration and deceleration

/**
 * A type that can be either an easing function or a string.
 */
export type EaseFunction = EaseFn | EaseFnName;

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

export function easeInQuart(t: number): number {
  return Math.pow(t, 4);
}

export function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

export function easeInOutQuart(t: number): number {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

export function easeInQuint(t: number): number {
  return Math.pow(t, 5);
}

export function easeOutQuint(t: number): number {
  return 1 - Math.pow(1 - t, 5);
}

export function easeInOutQuint(t: number): number {
  return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
}

export function easeInSine(t: number): number {
  return 1 - Math.cos((t * Math.PI) / 2);
}

export function easeOutSine(t: number): number {
  return Math.sin((t * Math.PI) / 2);
}

export function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

export function easeInExpo(t: number): number {
  return t === 0 ? 0 : Math.pow(2, 10 * (t - 1));
}

export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function easeInOutExpo(t: number): number {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
}

export function easeInCirc(t: number): number {
  return 1 - Math.sqrt(1 - Math.pow(t, 2));
}

export function easeOutCirc(t: number): number {
  return Math.sqrt(1 - Math.pow(t - 1, 2));
}

export function easeInOutCirc(t: number): number {
  return t < 0.5
    ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
    : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2;
}

export function easeInBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return c3 * t * t * t - c1 * t * t;
}

export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function easeInOutBack(t: number): number {
  const c1 = 1.70158;
  const c2 = c1 * 1.525;
  return t < 0.5
    ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
    : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
}

export function easeInElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
}

export function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

export function easeInOutElastic(t: number): number {
  const c5 = (2 * Math.PI) / 4.5;
  return t === 0
    ? 0
    : t === 1
    ? 1
    : t < 0.5
    ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
    : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
}

export function easeInBounce(t: number): number {
  return 1 - easeOutBounce(1 - t);
}

export function easeOutBounce(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;

  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
}

export function easeInOutBounce(t: number): number {
  return t < 0.5
    ? (1 - easeOutBounce(1 - 2 * t)) / 2
    : (1 + easeOutBounce(2 * t - 1)) / 2;
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
  easeInQuart,
  easeOutQuart,
  easeInOutQuart,
  easeInQuint,
  easeOutQuint,
  easeInOutQuint,
  easeInSine,
  easeOutSine,
  easeInOutSine,
  easeInExpo,
  easeOutExpo,
  easeInOutExpo,
  easeInCirc,
  easeOutCirc,
  easeInOutCirc,
  easeInBack,
  easeOutBack,
  easeInOutBack,
  easeInElastic,
  easeOutElastic,
  easeInOutElastic,
  easeInBounce,
  easeOutBounce,
  easeInOutBounce,
};

/**
 * List of all available ease functions.
 */
export const easeFnsList = Object.keys(easeFns) as EaseFnName[];

/**
 * Resolves an easing function from either a function or a string.
 * If the function is not found, it defaults to linear.
 * @param fn - The easing function or name to resolve
 * @returns The resolved easing function
 */
export const resolveEaseFn = (fn?: EaseFunction): EaseFn => {
  if (!fn) return linear;
  if (typeof fn === "function") return fn;

  if (easeFns[fn]) return easeFns[fn];
  else return linear;
};
