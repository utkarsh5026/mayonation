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
      this.isNotPositiveNumber(staggerInMs),
      "Stagger must be a positive number"
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

    keyframes.forEach(({ offset }, index) => {
      throwIf(
        this.isNotPositiveNumber(offset) || offset > 1,
        `Keyframe ${index} offset must be between 0 and 1`
      );
    });

    keyframes.forEach((_, index) => {
      if (index == 0) return;

      throwIf(
        keyframes[index].offset <= keyframes[index - 1].offset,
        "Keyframe offsets must be in ascending order"
      );
    });
  }

  /**
   * Validates a positive number
   */
  private static isNotPositiveNumber(value: number): boolean {
    return typeof value !== "number" || value < 0;
  }
}
