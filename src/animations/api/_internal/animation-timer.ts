import { clamp } from "@/utils/math";

/**
 * Handles all timing-related calculations for animations
 * Responsibility: Time management, progress calculation, repeat logic
 */
export class AnimationTimer {
  private startTime: number = 0;
  private pausedTime: number = 0;
  private duration: number;
  private direction: 1 | -1 = 1;
  private timeScale: number = 1;
  private iteration: number = 0;

  constructor(duration: number) {
    this.duration = duration;
  }

  /**
   * Start the timer
   */
  start(): void {
    this.startTime = performance.now() - this.pausedTime;
  }

  /**
   * Pause and store current elapsed time
   */
  pause(): number {
    this.pausedTime = performance.now() - this.startTime;
    return this.pausedTime;
  }

  /**
   * Resume from paused state
   */
  resume(): void {
    this.startTime = performance.now() - this.pausedTime;
  }

  /**
   * Reset timer to initial state
   */
  reset(): void {
    this.startTime = 0;
    this.pausedTime = 0;
    this.iteration = 0;
    this.direction = 1;
  }

  /**
   * Reverse animation direction
   */
  reverse(): void {
    this.direction *= -1;
    const elapsed = this.getElapsed();
    this.startTime = performance.now() - (this.duration - elapsed);
  }

  /**
   * Get current elapsed time
   */
  getElapsed(): number {
    return (
      (performance.now() - this.startTime) * this.timeScale * this.direction
    );
  }

  /**
   * Seek to specific time position
   */
  seekTo(progress: number): void {
    const targetTime = progress * this.duration;
    this.startTime = performance.now() - targetTime;
  }

  get currentDuration(): number {
    return this.duration;
  }

  get currentIteration(): number {
    return this.iteration;
  }

  /**
   * Calculate progress with repeat logic
   */
  calculateProgress(
    repeat?: number | "infinite",
    yoyo?: boolean
  ): {
    progress: number;
    iteration: number;
    shouldComplete: boolean;
  } {
    const elapsed = this.getElapsed();
    const rawProgress = elapsed / this.duration;

    if (repeat === undefined) {
      return this.handleSingleIteration(rawProgress);
    }

    if (repeat === "infinite") {
      return this.handleInfiniteRepeat(rawProgress, yoyo);
    }

    return this.handleFiniteRepeat(rawProgress, repeat, yoyo);
  }

  /**
   * Handle single iteration (no repeat)
   */
  private handleSingleIteration(rawProgress: number) {
    const progress = clamp(rawProgress, 0, 1);
    return {
      progress,
      iteration: 0,
      shouldComplete: progress >= 1,
    };
  }

  /**
   * Handle infinite repeat iterations
   */
  private handleInfiniteRepeat(rawProgress: number, yoyo?: boolean) {
    const iteration = Math.floor(Math.abs(rawProgress));
    const progress = this.calculateIterationProgress(
      rawProgress,
      iteration,
      yoyo
    );

    this.iteration = iteration;
    return { progress, iteration, shouldComplete: false };
  }

  /**
   * Handle finite repeat iterations
   */
  private handleFiniteRepeat(
    rawProgress: number,
    repeat: number,
    yoyo?: boolean
  ) {
    if (Math.abs(rawProgress) >= repeat) {
      return { progress: 1, iteration: repeat, shouldComplete: true };
    }

    const iteration = Math.floor(Math.abs(rawProgress));
    const progress = this.calculateIterationProgress(
      rawProgress,
      iteration,
      yoyo
    );

    return { progress, iteration, shouldComplete: false };
  }

  /**
   * Calculate progress for a specific iteration, handling yoyo effect
   */
  private calculateIterationProgress(
    rawProgress: number,
    iteration: number,
    yoyo?: boolean
  ): number {
    let progress = Math.abs(rawProgress) % 1;

    if (yoyo && iteration % 2 == 1) {
      progress = 1 - progress;
    }

    return progress;
  }
}
