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
  | "easeInOutCubic"; // Cubic acceleration and deceleration

/**
 * CSS transform properties that can be animated.
 * Includes translation, rotation, scale and skew transformations.
 */
export type TransformPropertyName =
  | "translate" // 2D translation shorthand
  | "translateX" // X-axis translation
  | "translateY" // Y-axis translation
  | "translateZ" // Z-axis translation
  | "rotate" // 2D rotation shorthand
  | "rotateX" // X-axis rotation
  | "rotateY" // Y-axis rotation
  | "rotateZ" // Z-axis rotation
  | "scale" // Uniform scale shorthand
  | "scaleX" // X-axis scale
  | "scaleY" // Y-axis scale
  | "scaleZ" // Z-axis scale
  | "skewX" // X-axis skew
  | "skewY" // Y-axis skew
  | "skew"; // 2D skew shorthand

/**
 * CSS properties that can be animated besides transforms.
 * Includes visual properties like opacity, dimensions, and borders.
 */
export type CSSPropertyName =
  | "opacity" // Element transparency
  | "backgroundColor" // Background color
  | "width" // Element width
  | "height" // Element height
  | "borderRadius" // Corner rounding
  | "border" // Border shorthand
  | "borderColor" // Border color
  | "borderStyle" // Border style
  | "borderWidth"; // Border thickness

/**
 * Configuration object for creating animations.
 * Defines the target values and animation behavior.
 */
export type AnimationConfig = {
  translateX?: number; // Target X translation
  translateY?: number; // Target Y translation
  translateZ?: number; // Target Z translation
  rotate?: number; // Target rotation angle
  scale?: number | [number, number]; // Target scale factor(s)

  opacity?: number; // Target opacity
  backgroundColor?: string; // Target background color
  width?: number | string; // Target width
  height?: number | string; // Target height

  duration?: number; // Animation duration in ms
  delay?: number; // Animation delay in ms
  easing?: string | ((t: number) => number); // Easing function

  // Lifecycle callbacks
  onStart?: () => void; // Called when animation starts
  onUpdate?: (progress: number) => void; // Called on each animation frame
  onComplete?: () => void; // Called when animation completes
};

/**
 * Current state of an animation.
 * Tracks timing and playback status.
 */
export type AnimationState = {
  isPlaying: boolean; // Whether animation is currently playing
  isPaused: boolean; // Whether animation is paused
  currentTime: number; // Current time in animation
  progress: number; // Progress from 0 to 1
};

/**
 * Options for configuring animation behavior.
 * Controls timing, easing and lifecycle callbacks.
 */
export type AnimationOptions = {
  duration: number; // Animation duration in ms
  delay?: number; // Animation delay in ms
  easing?: EaseFnName | EaseFn; // Easing function
  onComplete?: () => void; // Called when animation completes
  onStart?: () => void; // Called when animation starts
  onUpdate?: (progress: number) => void; // Called on each frame
};

/**
 * Represents the start and end values for an animated property.
 */
export type AnimationProperty = {
  from: AnmimationValue; // Starting value and unit
  to: AnmimationValue; // Ending value and unit
};

/**
 * Groups the properties being animated for a single element.
 */
export type AnimationTarget = {
  element: HTMLElement; // Element being animated
  transformProperties: Map<TransformPropertyName, AnimationProperty>; // Transform animations
  cssProperties: Map<CSSPropertyName, AnimationProperty>; // CSS property animations
};

/**
 * Defines the available transform properties that can be animated.
 * Each property is optional and accepts a numeric value.
 */
export type TransformProperties = {
  translateX?: number; // Translation along X axis
  translateY?: number; // Translation along Y axis
  translateZ?: number; // Translation along Z axis
  rotate?: number; // 2D rotation (shorthand for rotateZ)
  rotateX?: number; // Rotation around X axis
  rotateY?: number; // Rotation around Y axis
  rotateZ?: number; // Rotation around Z axis
  scale?: number; // Uniform scaling (shorthand for all axes)
  scaleX?: number; // Scale along X axis
  scaleY?: number; // Scale along Y axis
  scaleZ?: number; // Scale along Z axis
  skew?: number; // 2D skew (shorthand for skewX)
  skewX?: number; // Skew along X axis
  skewY?: number; // Skew along Y axis
};

/**
 * Valid CSS units that can be used for numeric animation values.
 * Includes common length units, percentages, viewport units, degrees and empty string.
 */
export type NumericUnit = "px" | "em" | "rem" | "%" | "vh" | "vw" | "deg" | "";

/**
 * Represents a numeric animation value paired with its unit.
 */
export type AnmimationValue = {
  value: number; // The numeric value
  unit: NumericUnit; // The unit of measurement
};

/**
 * Represents the complete transform state of an element.
 * Tracks all transform properties across translation, rotation, scale and skew.
 */
export type TransformState = {
  translate: {
    x: number; // Translation on X axis
    y: number; // Translation on Y axis
    z: number; // Translation on Z axis
  };
  rotate: {
    x: number; // Rotation around X axis (in degrees)
    y: number; // Rotation around Y axis (in degrees)
    z: number; // Rotation around Z axis (in degrees)
  };
  scale: {
    x: number; // Scale factor on X axis
    y: number; // Scale factor on Y axis
    z: number; // Scale factor on Z axis
  };
  skew: {
    x: number; // Skew angle on X axis (in degrees)
    y: number; // Skew angle on Y axis (in degrees)
  };
};

export type TransformAxis = "x" | "y" | "z";
