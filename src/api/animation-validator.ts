import type { AnimationKeyframe } from "@/css";
import { throwIf } from "@/utils/error";
export class AnimationValidator {
  /**
   * Validates animation duration
   */
  static validateDuration(durationInMs: number): void {
    throwIf(
      this.isNotPositiveNumber(durationInMs),
      "Duration must be a positive number"
    );

    if (durationInMs > 300000) {
      console.warn(
        "Very long animation duration (>5min). This may cause performance issues."
      );
    }
  }

  /**
   * Validates animation delay
   */
  static validateDelay(delayInMs: number): void {
    throwIf(
      this.isNotPositiveNumber(delayInMs),
      "Delay must be a positive number"
    );
  }

  /**
   * Validates animation repeat count
   */
  static validateRepeat(repeat: number | "infinite"): void {
    throwIf(
      repeat !== "infinite" && this.isNotPositiveNumber(repeat),
      'Repeat must be a positive number or "infinite"'
    );
  }

  /**
   * Validates stagger timing between elements
   */
  static validateStagger(staggerInMs: number): void {
    throwIf(
      typeof staggerInMs !== "number" || !isFinite(staggerInMs) || isNaN(staggerInMs),
      "Stagger must be a finite number"
    );
  }

  /**
   * Validates animation progress value
   */
  static validateProgress(progress: number): void {
    throwIf(
      this.isNotPositiveNumber(progress) || progress > 1,
      "Progress must be between 0 and 1"
    );
  }

  /**
   * Validates animation keyframes array
   */
  static validateKeyframes(keyframes: AnimationKeyframe[]): void {
    throwIf(
      !Array.isArray(keyframes) || keyframes.length < 2,
      "Keyframes must be an array with at least 2 items"
    );

    // Sanitize keyframe offsets instead of throwing
    keyframes.forEach((keyframe, index) => {
      if (typeof keyframe.offset !== "number" || isNaN(keyframe.offset)) {
        keyframe.offset = index / (keyframes.length - 1); // Distribute evenly
      } else if (!isFinite(keyframe.offset)) {
        keyframe.offset = keyframe.offset > 0 ? 1 : 0; // Clamp infinite values
      } else {
        keyframe.offset = Math.max(0, Math.min(1, keyframe.offset)); // Clamp to 0-1
      }
    });

    // Sort keyframes by offset to handle out-of-order keyframes
    keyframes.sort((a, b) => a.offset - b.offset);
  }

  /**
   * Validates a positive number
   */
  private static isNotPositiveNumber(value: number): boolean {
    return typeof value !== "number" || value < 0 || !isFinite(value) || isNaN(value);
  }
}
