import { resolveEaseFn } from "../core/ease_fns";
import type { AnimationOptions } from "../core/config";
import {
  type BaseKeyframe,
  type ProcessedBaseKeyframe,
  BaseKeyframeManager,
} from "../keyframe/keyframe";

export type TimelineSegmentConfig = {
  startTime: number;
  direction?: "normal" | "reverse" | "alternate";
  iterations?: number;
} & Required<AnimationOptions>;

/**
 * Represents a segment of a timeline, managing the animation of a set of keyframes.
 *
 * This class encapsulates the logic for updating the animation state based on progress,
 * handling iterations, direction, and easing of the animation. It also provides methods
 * for resetting the animation state and getting the end time of the segment.
 *
 * @param element The HTML element to animate.
 * @param config The configuration for the timeline segment.
 */
export class TimelineSegment<
  K extends BaseKeyframe,
  P extends ProcessedBaseKeyframe,
  T
> {
  private readonly kfManager: BaseKeyframeManager<K, P, T>;
  private iterationCount: number = 0;
  private currDirection: "forward" | "backward" = "forward";
  private readonly config: Required<TimelineSegmentConfig>;

  /**
   * Initializes a new instance of the TimelineSegment class.
   *
   * @param config The configuration for the timeline segment.
   */
  constructor(
    config: TimelineSegmentConfig,
    kfManager: BaseKeyframeManager<K, P, T>
  ) {
    this.validateConfig(config);
    this.config = {
      ...config,
      iterations: config.iterations ?? 1,
      direction: config.direction ?? "normal",
      easing: resolveEaseFn(config.easing),
    };
    this.kfManager = kfManager;
  }

  /**
   * Updates the animation state based on the given progress.
   *
   * This method calculates the local time within the segment based on the progress,
   * determines the current iteration and direction, and updates the keyframe manager
   * accordingly. It also handles edge cases such as progress before the start time,
   * at the end time, or beyond the end time.
   *
   * @param progress The progress value to update the animation state.
   */
  public update(progress: number) {
    if (typeof progress !== "number" || isNaN(progress)) {
      console.warn("Invalid progress value:", progress);
      return;
    }

    const {
      startTime,
      duration,
      iterations = 1,
      direction = "normal",
    } = this.config;

    const localTime = progress - startTime;
    if (this.handleLocalTime(localTime, progress)) return;

    try {
      const currItr = Math.min(localTime / duration, iterations);
      const newItrCount = Math.floor(currItr);

      if (newItrCount !== this.iterationCount) {
        this.iterationCount = newItrCount;
        this.updateDirection();
      }

      let iterationProgress;
      if (localTime === duration * iterations) {
        iterationProgress = 1;
      } else {
        iterationProgress = currItr % 1;
        iterationProgress = Math.max(0, Math.min(1, iterationProgress));
      }

      if (direction === "reverse" || this.currDirection === "backward") {
        iterationProgress = 1 - iterationProgress;
      }

      this.kfManager.update(iterationProgress);
    } catch (error) {
      console.error("Error updating animation:", error);
      this.reset();
    }
  }

  /**
   * Resets the animation state to its initial state.
   *
   * This method resets the keyframe manager, iteration count, direction, and last progress.
   */
  public reset(): void {
    this.kfManager.reset();
    this.iterationCount = 0;
    this.currDirection = "forward";
  }

  /**
   * Gets the end time of the timeline segment.
   *
   * This method calculates and returns the end time of the segment based on its start time,
   * duration, and number of iterations.
   *
   * @returns The end time of the timeline segment.
   */
  public get endTime(): number {
    const { startTime, duration, iterations = 1 } = this.config;
    return startTime + duration * iterations;
  }

  /**
   * Validates the configuration for the timeline segment.
   *
   * This method checks if the keyframes array is not empty, duration is positive, and
   * iterations are positive if specified.
   *
   * @param config The configuration to validate.
   */
  private validateConfig(config: TimelineSegmentConfig) {
    if (config.duration <= 0) throw new Error("Duration must be positive");
    if (config.iterations !== undefined && config.iterations <= 0) {
      throw new Error("Iterations must be positive");
    }
  }

  /**
   * Updates the direction of the animation based on the current iteration count.
   *
   * This method determines the direction of the animation based on the iteration count
   * and the direction specified in the configuration.
   */
  private updateDirection() {
    const { direction } = this.config;
    if (direction === "alternate") {
      this.currDirection =
        this.iterationCount % 2 === 0 ? "forward" : "backward";
    } else {
      this.currDirection = direction === "normal" ? "forward" : "backward";
    }
  }

  /**
   * Handles edge cases for local time within the segment.
   *
   * This method checks if the local time is before the start time, at the end time, or
   * beyond the end time, and updates the keyframe manager accordingly.
   *
   * @param localTime The local time within the segment.
   * @param progress The progress value.
   * @returns True if the local time is at an edge case, false otherwise.
   */
  private handleLocalTime(localTime: number, progress: number): boolean {
    const { duration, iterations } = this.config;
    if (localTime < 0) {
      this.kfManager.update(this.config.direction === "reverse" ? 1 : 0);
      return true;
    }

    const epsilon = 0.000001;
    const totalDuration = duration * iterations;

    if (localTime > totalDuration + epsilon) {
      this.kfManager.update(this.config.direction === "reverse" ? 0 : 1);
      return true;
    }

    if (Math.abs(localTime - totalDuration) < epsilon) {
      this.kfManager.update(this.config.direction === "reverse" ? 0 : 1);
      return true;
    }

    return false;
  }
}
