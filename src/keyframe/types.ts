import { EaseFunction } from "@/core/ease_fns";

/**
 * Base interface for all keyframe types.
 * Keyframes define the state of an animation at specific points in time.
 */
export interface BaseKeyframe {
  offset?: number;
  easing?: EaseFunction;
}

/**
 * Base interface for processed keyframes.
 * After processing, all keyframes will have required properties with default values filled in.
 */
export interface ProcessedBaseKeyframe {
  offset: number;
  easing: EaseFunction;
}
