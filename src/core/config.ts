import type { EaseFn, EaseFnName } from "./ease_fns";
import type { TransformConfig } from "../animations/transform/units";
import type { CssPropertyConfig } from "../animations/css/units";

/**
 * Animation lifecycle callback functions
 */
export type AnimationCallbacks = Partial<{
  /** Called when animation completes successfully */
  onComplete: () => void;
  /** Called on each animation frame with progress (0-1) */
  onProgress: (progress: number) => void;
  /** Called when animation starts */
  onBegin: () => void;
  /** Called if animation is cancelled before completion */
  onAbort: () => void;
}>;

/**
 * Configuration options for animation timing and behavior
 */
export type AnimationOptions = Partial<{
  /** Time offset in milliseconds before animation starts */
  offset: number;
  /** Easing function or name to control animation progression */
  easing: EaseFn | EaseFnName;
  /** Animation duration in milliseconds */
  duration: number;
  /** Delay before animation begins in milliseconds */
  delay: number;
}>;

/**
 * Combined configuration type for animations including:
 * - Transform properties (scale, rotate, translate)
 * - CSS properties (colors, dimensions, borders)
 * - Timing options (duration, delay, easing)
 * - Lifecycle callbacks
 *
 * @example
 * const config: PropertiesConfig = {
 *   translateX: "100px",
 *   opacity: 0.5,
 *   duration: 1000,
 *   easing: "easeInOut",
 *   onComplete: () => console.log("Animation done")
 * };
 */
export type PropertiesConfig = TransformConfig &
  CssPropertyConfig &
  AnimationOptions &
  AnimationCallbacks;
