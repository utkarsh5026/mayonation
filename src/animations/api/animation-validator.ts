import type { AnimationKeyframe } from "./types";

export class AnimationValidator {
  static validateDuration(duration: number): void {
    if (typeof duration !== "number" || duration < 0) {
      throw new Error("Duration must be a positive number");
    }
    if (duration > 300000) {
      console.warn(
        "Very long animation duration (>5min). This may cause performance issues."
      );
    }
  }

  static validateDelay(delay: number): void {
    if (typeof delay !== "number" || delay < 0) {
      throw new Error("Delay must be a positive number");
    }
  }

  static validateRepeat(repeat: number | "infinite"): void {
    if (repeat !== "infinite" && (typeof repeat !== "number" || repeat < 0)) {
      throw new Error('Repeat must be a positive number or "infinite"');
    }
  }

  static validateStagger(stagger: number): void {
    if (typeof stagger !== "number" || stagger < 0) {
      throw new Error("Stagger must be a positive number");
    }
  }

  static validateProgress(progress: number): void {
    if (typeof progress !== "number" || progress < 0 || progress > 1) {
      throw new Error("Progress must be between 0 and 1");
    }
  }

  static validateKeyframes(keyframes: AnimationKeyframe[]): void {
    if (!Array.isArray(keyframes) || keyframes.length < 2) {
      throw new Error("Keyframes must be an array with at least 2 items");
    }

    keyframes.forEach((frame, index) => {
      if (
        typeof frame.offset !== "number" ||
        frame.offset < 0 ||
        frame.offset > 1
      ) {
        throw new Error(`Keyframe ${index} offset must be between 0 and 1`);
      }
    });

    keyframes.forEach((_, index) => {
      if (index == 0) return;
      if (keyframes[index].offset <= keyframes[index - 1].offset) {
        throw new Error("Keyframe offsets must be in ascending order");
      }
    });
  }
}
