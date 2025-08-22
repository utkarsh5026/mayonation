import { resolveEaseFn } from "@/core/ease-fns";
import type { AnimationOptions } from "@/core/config";
import {
  type BaseKeyframe,
  type ProcessedBaseKeyframe,
  BaseKeyframeManager,
} from "@/keyframe";

export type TimelineSegmentConfig = {
  startTime: number;
  direction?: "normal" | "reverse" | "alternate";
  iterations?: number;
} & Required<AnimationOptions>;

/**
 * Represents a segment of a timeline, managing the animation of a set of keyframes
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
   */
  public updateAnimation(progress: number) {
    if (typeof progress !== "number" || isNaN(progress)) {
      console.warn("Invalid progress value:", progress);
      return;
    }

    const { startTime, duration, iterations } = this.getConfig();

    const localTime = progress - startTime;
    if (this.handleEdgeCaseTimeValues(localTime)) return;

    try {
      const currItr = Math.min(localTime / duration, iterations);
      const newItrCount = Math.floor(currItr);

      if (newItrCount !== this.iterationCount) {
        this.iterationCount = newItrCount;
        this.updateDirection();
      }

      const iterationProgress = this.getIterationProgress(
        localTime,
        duration,
        currItr
      );
      this.kfManager.update(iterationProgress);
    } catch (error) {
      console.error("Error updating animation:", error);
      this.reset();
    }
  }

  /**
   * Resets the animation state to its initial state.
   */
  public reset(): void {
    this.kfManager.reset();
    this.iterationCount = 0;
    this.currDirection = "forward";
  }

  /**
   * Gets the end time of the timeline segment.
   */
  public get segmentEndTime(): number {
    const { startTime, duration, iterations = 1 } = this.config;
    return startTime + duration * iterations;
  }

  /**
   * Validates the configuration for the timeline segment.
   */
  private validateConfig(config: TimelineSegmentConfig) {
    if (config.duration <= 0) throw new Error("Duration must be positive");
    if (config.iterations !== undefined && config.iterations <= 0) {
      throw new Error("Iterations must be positive");
    }
  }

  /**
   * Updates the direction of the animation based on the current iteration count.
   */
  private updateDirection() {
    const { direction } = this.config;

    if (direction === "alternate") {
      this.currDirection =
        this.iterationCount % 2 === 0 ? "forward" : "backward";
      return;
    }

    this.currDirection = direction === "normal" ? "forward" : "backward";
  }

  /**
   * Handles edge cases for local time within the segment.
   */
  private handleEdgeCaseTimeValues(localTime: number): boolean {
    const { duration, iterations } = this.config;
    if (localTime < 0) {
      this.kfManager.update(this.config.direction === "reverse" ? 1 : 0);
      return true;
    }

    const FLOATING_POINT_TOLERANCE = 0.000001;
    const totalDuration = duration * iterations;

    if (localTime > totalDuration + FLOATING_POINT_TOLERANCE) {
      this.kfManager.update(this.config.direction === "reverse" ? 0 : 1);
      return true;
    }

    if (Math.abs(localTime - totalDuration) < FLOATING_POINT_TOLERANCE) {
      this.kfManager.update(this.config.direction === "reverse" ? 0 : 1);
      return true;
    }

    return false;
  }

  /**
   * Calculates the progress within the current iteration, accounting for direction.
   */
  private getIterationProgress(
    localTime: number,
    duration: number,
    currItr: number
  ): number {
    const { direction, iterations } = this.getConfig();
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

    return iterationProgress;
  }

  /**
   * Returns the normalized configuration with default values applied.
   */
  private getConfig(): Required<TimelineSegmentConfig> {
    const currConfig = this.config;
    return {
      ...currConfig,
      direction: currConfig.direction ? currConfig.direction : "normal",
      iterations: currConfig.iterations ? currConfig.iterations : 1,
    };
  }
}
