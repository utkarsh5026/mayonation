import { ElementLike } from "@/utils/dom";
import { EaseFunction } from "@/core/ease-fns";

/**
 * Animation value types where arrays represent keyframes
 */
export type AnimationValue =
  | number // Simple value: x: 100
  | string // String value: x: "100px"
  | number[] // Keyframes: x: [0, 50, 100]
  | string[] // String keyframes: x: ["0px", "50px", "100px"]
  | ((index: number, element: HTMLElement) => number | string) // Function: x: (i) => i * 50
  | ((index: number, element: HTMLElement) => number[] | string[]); // Function returning keyframes

export type TransformProperties = {
  translateX?: AnimationValue;
  translateY?: AnimationValue;
  translateZ?: AnimationValue;
  rotateX?: AnimationValue;
  rotateY?: AnimationValue;
  rotateZ?: AnimationValue;
  scale?: AnimationValue;
  scaleX?: AnimationValue;
  scaleY?: AnimationValue;
  scaleZ?: AnimationValue;
  skewX?: AnimationValue;
  skewY?: AnimationValue;
};

export type CssProperties = {
  opacity?: AnimationValue;
  width?: AnimationValue;
  height?: AnimationValue;
  backgroundColor?: AnimationValue;
  borderRadius?: AnimationValue;
  color?: AnimationValue;
};

/**
 * Animation properties with fine-grained control
 */
export type AnimationProperties = TransformProperties &
  CssProperties & {
    [key: string]: AnimationValue | undefined;
  };

export interface AnimationKeyframe {
  offset: number; // 0 to 1
  ease?: EaseFunction;
  [property: string]: AnimationValue | number | EaseFunction | undefined;
}

/**
 * Resolved property values after processing functions and arrays
 */
export interface ResolvedPropertyValues {
  from: Record<string, number | string>;
  to: Record<string, number | string>;
}

export type TimePosition =
  | number // Absolute time in ms
  | `${number}ms` // Explicit milliseconds
  | `${number}s` // Seconds
  | `${number}%` // Percentage of timeline
  | `+=${number}` // Relative to previous
  | `-=${number}` // Relative offset
  | `<` // Start of timeline
  | `>` // End of timeline
  | string; // Label name

export interface AnimationCallbacks {
  onStart?: () => void;
  onUpdate?: (progress: number, info?: AnimationInfo) => void;
  onComplete?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onReverse?: () => void;
}

export interface AnimationInfo {
  elapsed: number;
  remaining: number;
  fps: number;
  iteration: number;
}

export interface CSSAnimationConfig {
  target: ElementLike;
  duration: number;
  delay?: number;
  stagger?: number;
  ease?: EaseFunction;

  // ✅ ENHANCED: Now supports values, arrays, and functions
  from?: AnimationProperties;
  to?: AnimationProperties;
  keyframes?: AnimationKeyframe[];

  onStart?(): void;
  onUpdate?(progress: number, info?: any): void;
  onComplete?(): void;
}

export type AnimationState =
  | "idle"
  | "running"
  | "paused"
  | "completed"
  | "cancelled";

export interface ProcessedKeyframe {
  offset: number;
  properties: AnimationProperties;
  easing: EaseFunction;
}
