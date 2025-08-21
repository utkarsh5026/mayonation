import { clamp } from "@/utils/math";

/**
 * Handles all timing-related calculations for animations
 * Responsibility: Time management, progress calculation, repeat logic
 */
export class AnimationTimer {
  private animationStartTimestamp: number = 0;
  private timeWhenPaused: number = 0;
  private animationDuration: number;
  private playbackDirection: 1 | -1 = 1;
  private playbackSpeed: number = 1;
  private currentIterationCount: number = 0;

  constructor(duration: number) {
    this.animationDuration = duration;
  }

  /**
   * Start the timer
   */
  start(): void {
    this.animationStartTimestamp = performance.now() - this.timeWhenPaused;
  }

  /**
   * Pause and store current elapsed time
   */
  pause(): number {
    this.timeWhenPaused = performance.now() - this.animationStartTimestamp;
    return this.timeWhenPaused;
  }

  /**
   * Resume from paused state
   */
  resume(): void {
    this.animationStartTimestamp = performance.now() - this.timeWhenPaused;
  }

  /**
   * Reset timer to initial state
   */
  reset(): void {
    this.animationStartTimestamp = 0;
    this.timeWhenPaused = 0;
    this.currentIterationCount = 0;
    this.playbackDirection = 1;
  }

  /**
   * Reverse animation direction
   */
  reversePlaybackDirection(): void {
    this.playbackDirection *= -1;
    const currentElapsedTime = this.getCurrentElapsedTime();
    this.animationStartTimestamp =
      performance.now() - (this.animationDuration - currentElapsedTime);
  }

  /**
   * Get current elapsed time
   */
  getCurrentElapsedTime(): number {
    return (
      (performance.now() - this.animationStartTimestamp) *
      this.playbackSpeed *
      this.playbackDirection
    );
  }

  /**
   * Seek to specific time position
   */
  seekToProgress(progressRatio: number): void {
    const targetTimePosition = progressRatio * this.animationDuration;
    this.animationStartTimestamp = performance.now() - targetTimePosition;
  }

  get totalDuration(): number {
    return this.animationDuration;
  }

  get iterationNumber(): number {
    return this.currentIterationCount;
  }

  /**
   * Calculate progress with repeat logic
   */
  calculateAnimationProgress(
    repeatCount?: number | "infinite",
    enableYoyoEffect?: boolean
  ): {
    progress: number;
    iteration: number;
    shouldComplete: boolean;
  } {
    const elapsedTime = this.getCurrentElapsedTime();
    const totalProgressRatio = elapsedTime / this.animationDuration;

    if (repeatCount === undefined) {
      return this.handleSinglePlaythrough(totalProgressRatio);
    }

    if (repeatCount === "infinite") {
      return this.handleInfiniteLoop(totalProgressRatio, enableYoyoEffect);
    }

    return this.handleLimitedRepeats(
      totalProgressRatio,
      repeatCount,
      enableYoyoEffect
    );
  }

  /**
   * Handle single iteration (no repeat)
   */
  private handleSinglePlaythrough(totalProgressRatio: number) {
    const clampedProgress = clamp(totalProgressRatio, 0, 1);
    return {
      progress: clampedProgress,
      iteration: 0,
      shouldComplete: clampedProgress >= 1,
    };
  }

  /**
   * Handle infinite repeat iterations
   */
  private handleInfiniteLoop(
    totalProgressRatio: number,
    enableYoyoEffect?: boolean
  ) {
    const completedIterations = Math.floor(Math.abs(totalProgressRatio));
    const currentIterationProgress = this.calculateProgressWithinIteration(
      totalProgressRatio,
      completedIterations,
      enableYoyoEffect
    );

    this.currentIterationCount = completedIterations;
    return {
      progress: currentIterationProgress,
      iteration: completedIterations,
      shouldComplete: false,
    };
  }

  /**
   * Handle finite repeat iterations
   */
  private handleLimitedRepeats(
    totalProgressRatio: number,
    maxRepeats: number,
    enableYoyoEffect?: boolean
  ) {
    if (Math.abs(totalProgressRatio) >= maxRepeats) {
      return { progress: 1, iteration: maxRepeats, shouldComplete: true };
    }

    const completedIterations = Math.floor(Math.abs(totalProgressRatio));
    const currentIterationProgress = this.calculateProgressWithinIteration(
      totalProgressRatio,
      completedIterations,
      enableYoyoEffect
    );

    return {
      progress: currentIterationProgress,
      iteration: completedIterations,
      shouldComplete: false,
    };
  }

  /**
   * Calculate progress for a specific iteration, handling yoyo effect
   */
  private calculateProgressWithinIteration(
    totalProgressRatio: number,
    iterationNumber: number,
    enableYoyoEffect?: boolean
  ): number {
    let progressInCurrentIteration = Math.abs(totalProgressRatio) % 1;

    const isReverseIteration =
      enableYoyoEffect && this.isOddIteration(iterationNumber);
    if (isReverseIteration) {
      progressInCurrentIteration = 1 - progressInCurrentIteration;
    }

    return progressInCurrentIteration;
  }

  /**
   * Check if iteration number is odd (for yoyo effect)
   */
  private isOddIteration(iterationNumber: number): boolean {
    return iterationNumber % 2 === 1;
  }
}
