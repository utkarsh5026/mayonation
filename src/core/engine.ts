import { AnimationCallbacks } from "@/css/types";

interface AnimationEngineOptions extends AnimationCallbacks {
  duration: number;
  loop?: boolean;
}

/**
 * Core animation engine that handles timing, progress calculation, and updates.
 * This is shared between Timeline and standalone Mayonation instances.
 */
export class AnimationEngine {
  private startTime: number | null = null;
  private pauseTime: number | null = null;
  private rafId: number | null = null;
  private state: "idle" | "playing" | "paused" | "completed" = "idle";

  private readonly duration: number;
  private readonly options: AnimationCallbacks & {
    loop?: boolean;
  };

  constructor(options: AnimationEngineOptions) {
    this.duration = options.duration;
    this.options = options;
  }

  /**
   * Starts or resumes the animation.
   *
   * If the animation is already playing, this method does nothing.
   * If the animation was paused, it resumes from where it left off.
   * If the animation is idle, it starts from the beginning.
   */
  play(): void {
    if (this.state === "playing") return;

    if (this.state === "paused" && this.pauseTime !== null) {
      this.startTime = performance.now() - this.pauseTime;
      this.pauseTime = null;
      this.options.onResume?.();
    } else {
      this.startTime = performance.now();
      this.options.onStart?.();
    }

    this.state = "playing";
    this.tick();
  }

  /**
   * Pauses the animation at its current position.
   *
   * The animation can be resumed later using play() and will continue
   * from the exact same position. Does nothing if not currently playing.
   */
  pause(): void {
    if (this.state !== "playing") return;
    this.pauseTime = performance.now() - (this.startTime ?? 0);
    this.state = "paused";
    this.cancelAnimation();
    this.options.onPause?.();
  }

  /**
   * Resets the animation to its initial state.
   *
   * Stops any currently playing animation, clears all timing data,
   * and returns the engine to idle state. The animation can be
   * started fresh using play().
   */
  reset(): void {
    this.state = "idle";
    this.startTime = null;
    this.pauseTime = null;
    this.cancelAnimation();
  }

  /**
   * Seeks to a specific progress point in the animation.
   *
   * Immediately updates the animation to the specified progress value
   * without affecting the current play state. Useful for scrubbing
   * through animations or jumping to specific points.
   */
  seek(progress: number): void {
    const clampedProgress = Math.max(0, Math.min(1, progress));
    this.options.onUpdate?.(clampedProgress);
  }

  get isPlaying(): boolean {
    return this.state === "playing";
  }

  get isPaused(): boolean {
    return this.state === "paused";
  }

  /**
   * Main animation loop that calculates progress and triggers updates.
   *
   * Runs continuously via requestAnimationFrame while the animation is playing.
   * Calculates elapsed time, converts to progress (0-1), handles looping,
   * and triggers the onUpdate callback with current progress.
   *
   * For looping animations, progress cycles between 0 and 1 repeatedly.
   * For non-looping animations, progress is clamped to 1 and triggers completion.
   *
   * @private
   */
  private tick = (): void => {
    if (this.state !== "playing" || !this.startTime) return;

    const elapsed = performance.now() - this.startTime;
    let progress = elapsed / this.duration;

    progress = this.options.loop ? progress % 1 : Math.min(progress, 1);

    this.options.onUpdate?.(progress);

    if (progress >= 1 && !this.options.loop) {
      this.state = "completed";
      this.options.onComplete?.();
      return;
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  /**
   * Cancels any pending requestAnimationFrame call.
   *
   * Used internally when pausing, resetting, or completing animations
   * to ensure no orphaned animation frames continue running.
   *
   * @private
   */
  private cancelAnimation(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
