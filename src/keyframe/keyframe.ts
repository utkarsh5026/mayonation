import { EaseFn, EaseFunction } from "../core/ease_fns";

/**
 * Base interface for all keyframe types.
 * Keyframes define the state of an animation at specific points in time.
 *
 * @property offset - Optional. A number between 0 and 1 representing when this keyframe occurs in the animation.
 *                   If not provided, keyframes will be evenly distributed.
 * @property easing - Optional. An easing function that controls the rate of change from this keyframe to the next.
 *                   If not provided, linear easing will be used.
 */
export interface BaseKeyframe {
  offset?: number;
  easing?: EaseFunction;
}

/**
 * Base interface for processed keyframes.
 * After processing, all keyframes will have required properties with default values filled in.
 *
 * @property offset - A number between 0 and 1 representing when this keyframe occurs in the animation.
 * @property easing - The easing function that controls the rate of change from this keyframe to the next.
 */
export interface ProcessedBaseKeyframe {
  offset: number;
  easing: EaseFn;
}

/**
 * Base class for managing keyframe animations.
 * Handles common keyframe operations like validation, offset distribution, and keyframe lookup.
 *
 * @typeParam K - The type of raw keyframes this manager will accept
 * @typeParam P - The type of processed keyframes this manager will use internally
 */
export abstract class BaseKeyframeManager<
  K extends BaseKeyframe,
  P extends ProcessedBaseKeyframe,
  T
> {
  protected readonly keyframes: P[] = [];

  protected abstract updateProps(props: T): void;

  public abstract isCorrectElenmentType(el: object): boolean;

  /**
   * Process raw keyframes into a normalized format.
   * Derived classes must implement this to handle type-specific keyframe processing.
   *
   * @param keyframes - Array of raw keyframes to process
   * @returns Array of processed keyframes
   */
  protected processKeyframes(keyframes: K[]): P[] {
    if (keyframes.length < 2) {
      keyframes = this.handleNoKeyframes();
    }
    this.validateKeyframeSequence(keyframes);
    const distributed = this.distributeOffsets(keyframes);
    return distributed.map((frame) => this.processKeyframe(frame));
  }

  /**
   * Interpolate between two keyframes at a given progress.
   * Derived classes must implement this to handle type-specific interpolation.
   *
   * @param from - Starting keyframe
   * @param to - Ending keyframe
   * @param progress - Current progress between the keyframes (0 to 1)
   * @returns Interpolated value
   */
  protected abstract interpolate(from: P, to: P, progress: number): T;

  protected abstract handleNoKeyframes(): K[];

  protected abstract processKeyframe(frame: K): P;

  /**
   * Update the animation to a specific progress value.
   * Derived classes must implement this to handle type-specific updates.
   *
   * @param progress - Current animation progress (0 to 1)
   */
  public update(progress: number) {
    if (progress < 0 || progress > 1) return;
    const props = this.getPropertiesAtProgress(progress);
    if (props) {
      this.updateProps(props);
    }
  }

  /**
   * Reset the animation to its initial state.
   * Derived classes must implement this to handle type-specific reset logic.
   */
  public abstract reset(): void;

  /**
   * Validate a sequence of keyframes to ensure it meets basic requirements.
   * Throws errors if validation fails.
   *
   * @param frames - Array of keyframes to validate
   * @throws {Error} If there are fewer than 2 keyframes
   * @throws {Error} If some but not all keyframes have offsets
   */
  protected validateKeyframeSequence(frames: K[]): void {
    if (!Array.isArray(frames) || frames.length < 2) {
      throw new Error("Animation must have at least 2 keyframes");
    }

    const hasOffsets = frames.some((frame) => frame.offset !== undefined);
    const allHaveOffsets = frames.every((frame) => frame.offset !== undefined);

    if (hasOffsets && !allHaveOffsets) {
      throw new Error("If any keyframe has an offset, all must have offsets");
    }
  }

  /**
   * Round offset values to prevent floating point precision issues.
   * Values very close to 0 or 1 are snapped to those exact values.
   *
   * @param offset - The offset value to round
   * @returns Rounded offset value
   */
  private roundOffset(offset: number): number {
    if (Math.abs(offset) < Number.EPSILON) return 0;
    if (Math.abs(offset - 1) < Number.EPSILON) return 1;
    return Math.round(offset * 100) / 100;
  }

  /**
   * Find the keyframes that surround a given progress value.
   *
   * @param progress - Current animation progress (0 to 1)
   * @returns Tuple of [fromKeyframe, toKeyframe] or null if no surrounding keyframes found
   */
  protected getSurroundingKeyframes(progress: number): [P, P] | null {
    for (let i = 0; i < this.keyframes.length - 1; i++) {
      const curr = this.keyframes[i];
      const next = this.keyframes[i + 1];

      if (progress >= curr.offset && progress <= next.offset) {
        return [curr, next];
      }
    }
    return null;
  }

  /**
   * Distribute offsets evenly across keyframes that don't have explicit offsets.
   * Also sorts keyframes by offset and rounds offset values.
   *
   * @param keyframes - Array of keyframes to process
   * @returns New array of keyframes with distributed offsets
   */
  protected distributeOffsets(keyframes: K[]): K[] {
    const size = keyframes.length;
    const distributed = keyframes.map((frame, i) => ({
      ...frame,
      offset: frame.offset ?? i / (size - 1),
    }));

    return distributed
      .map((frame) => ({
        ...frame,
        offset: this.roundOffset(frame.offset),
      }))
      .sort((a, b) => a.offset - b.offset);
  }

  /**
   * Retrieves the properties at a specific progress value in the animation.
   * This method finds the two keyframes that surround the given progress value,
   * calculates the local progress between them, applies the easing function,
   * and interpolates the properties based on the eased progress.
   *
   * @param progress - The current animation progress, a value between 0 and 1.
   * @returns The interpolated properties at the given progress, or null if no surrounding keyframes are found.
   */
  protected getPropertiesAtProgress(progress: number): T | null {
    const surrounding = this.getSurroundingKeyframes(progress);

    if (!surrounding) return null;
    const [from, to] = surrounding;
    const localProgress = (progress - from.offset) / (to.offset - from.offset);

    const easedProgress = from.easing(localProgress);
    return this.interpolate(from, to, easedProgress);
  }
}
