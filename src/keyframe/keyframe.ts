import { BaseKeyframe, ProcessedBaseKeyframe } from "./types";
import { resolveEaseFn } from "@/core/ease-fns";

/**
 * Base class for managing keyframe animations.
 * Handles common keyframe operations like validation, offset distribution, and keyframe lookup.
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
   */
  protected abstract interpolate(from: P, to: P, progress: number): T;

  protected abstract handleNoKeyframes(): K[];

  protected abstract processKeyframe(frame: K): P;

  /**
   * Update the animation to a specific progress value.
   * Derived classes must implement this to handle type-specific updates.
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
   */
  private roundOffset(offset: number): number {
    if (Math.abs(offset) < Number.EPSILON) return 0;
    if (Math.abs(offset - 1) < Number.EPSILON) return 1;
    return Math.round(offset * 100) / 100;
  }

  /**
   * Find the keyframes that surround a given progress value.
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
   */
  protected getPropertiesAtProgress(progress: number): T | null {
    const surrounding = this.getSurroundingKeyframes(progress);

    if (!surrounding) return null;
    const [from, to] = surrounding;
    const localProgress = (progress - from.offset) / (to.offset - from.offset);

    const easedProgress = resolveEaseFn(from.easing)(localProgress);
    return this.interpolate(from, to, easedProgress);
  }
}
