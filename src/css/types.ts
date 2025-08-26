import { ElementLike } from "@/utils/dom";
import { EaseFunction } from "@/core/ease-fns";

/**
 * Animation value types where arrays represent keyframes
 */
export type ApiAnimationValue =
  | number // Simple value: x: 100
  | string // String value: x: "100px"
  | number[] // Keyframes: x: [0, 50, 100]
  | string[] // String keyframes: x: ["0px", "50px", "100px"]
  | ((index: number, element: HTMLElement) => number | string) // Function: x: (i) => i * 50
  | ((index: number, element: HTMLElement) => number[] | string[]); // Function returning keyframes

export type TransformProperties = {
  translateX?: ApiAnimationValue;
  translateY?: ApiAnimationValue;
  translateZ?: ApiAnimationValue;
  rotateX?: ApiAnimationValue;
  rotateY?: ApiAnimationValue;
  rotateZ?: ApiAnimationValue;
  scale?: ApiAnimationValue;
  scaleX?: ApiAnimationValue;
  scaleY?: ApiAnimationValue;
  scaleZ?: ApiAnimationValue;
  skewX?: ApiAnimationValue;
  skewY?: ApiAnimationValue;
};

export type CssProperties = {
  opacity?: ApiAnimationValue;
  width?: ApiAnimationValue;
  height?: ApiAnimationValue;
  backgroundColor?: ApiAnimationValue;
  borderRadius?: ApiAnimationValue;
  color?: ApiAnimationValue;
};

/**
 * Animation properties with fine-grained control
 */
export type AnimationProperties = TransformProperties &
  CssProperties & {
    [key: string]: ApiAnimationValue | undefined;
  };

export interface AnimationKeyframe {
  offset: number; // 0 to 1
  ease?: EaseFunction;
  [property: string]: ApiAnimationValue | number | EaseFunction | undefined;
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
