import { ElementLike } from "@/utils/dom";

export interface AnimationProperties {
  x?: number | string;
  y?: number | string;
  z?: number | string;
  scale?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number | string;
  rotationX?: number | string;
  rotationY?: number | string;
  rotationZ?: number | string;
  skewX?: number | string;
  skewY?: number | string;

  // CSS properties
  opacity?: number;
  width?: number | string;
  height?: number | string;
  backgroundColor?: string;
  borderRadius?: number | string;
  color?: string;

  // SVG properties
  strokeDashoffset?: number;
  strokeDasharray?: string;
  fill?: string;
  stroke?: string;

  // Custom properties
  [key: string]: any;
}

// Keyframe with offset
export interface AnimationKeyframe extends AnimationProperties {
  offset: number; // 0 to 1
  ease?: EasingType;
}

// Timeline position types
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

// Comprehensive easing types
export type EasingType =
  | "linear"
  | "ease"
  | "easeIn"
  | "easeOut"
  | "easeInOut"
  | "easeInQuad"
  | "easeOutQuad"
  | "easeInOutQuad"
  | "easeInCubic"
  | "easeOutCubic"
  | "easeInOutCubic"
  | "easeInQuart"
  | "easeOutQuart"
  | "easeInOutQuart"
  | "easeInBack"
  | "easeOutBack"
  | "easeInOutBack"
  | "easeInBounce"
  | "easeOutBounce"
  | "easeInOutBounce"
  | "easeInElastic"
  | "easeOutElastic"
  | "easeInOutElastic"
  | `cubic-bezier(${number},${number},${number},${number})`
  | ((t: number) => number);

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

export interface AnimationConfig extends AnimationCallbacks {
  target?: ElementLike;
  to?: AnimationProperties;
  from?: AnimationProperties;
  keyframes?: AnimationKeyframe[];
  duration?: number;
  delay?: number;
  ease?: EasingType;
  repeat?: number | "infinite";
  yoyo?: boolean;
  stagger?: number;
  paused?: boolean;
}
