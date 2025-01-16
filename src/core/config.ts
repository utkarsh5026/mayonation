import type { AnimatableProperty } from "./prop";
import type { EaseFn, EaseFnName } from "./ease_fns";

export type AnimationCallbacks = Partial<{
  onComplete: () => void;
  onProgress: (progress: number) => void;
  onBegin: () => void;
  onAbort: () => void;
}>;

export type PropertiesConfig = {
  [K in AnimatableProperty]?: string | number;
} & {
  offset?: number;
  easing?: EaseFn | EaseFnName;
  duration?: number;
  delay?: number;
} & AnimationCallbacks;
