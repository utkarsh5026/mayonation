import type { ElementLike } from "@/utils/dom";
import { clamp } from "@/utils/math";
import { AnimationEngine } from "@/core";
import { CSSAnimator, AnimationKeyframe, AnimationProperties } from "@/css";
import { EaseFunction } from "@/core/ease-fns";
import { AnimationValidator } from "./animation-validator";

export interface MayonationConfig {
  target: ElementLike;
  duration?: number;
  delay?: number;
  stagger?: number;
  ease?: EaseFunction;
  from?: AnimationProperties;
  to?: AnimationProperties;
  keyframes?: AnimationKeyframe[];
  repeat?: number | "infinite";
  yoyo?: boolean;
  onStart?(): void;
  onUpdate?(progress: number, info?: any): void;
  onComplete?(): void;
  onPause?(): void;
  onResume?(): void;
}

export class Mayonation {
  readonly id: string;
  readonly config: Readonly<MayonationConfig>;
  private engine: AnimationEngine | null = null;
  private cssAnimator: CSSAnimator;
  private _finishedPromise: Promise<void> | null = null;
  private _finishedResolve?: () => void;

  /**
   * Creates a new MayoAnimation instance that can handle multiple elements
   */
  constructor(config: MayonationConfig) {
    this.id = `${Date.now()}`;
    this.config = Object.freeze({ ...config });

    // Validate configuration parameters
    const duration = config.duration ?? 1000;
    AnimationValidator.validateDuration(duration);

    if (config.delay !== undefined) {
      AnimationValidator.validateDelay(config.delay);
    }

    if (config.stagger !== undefined) {
      AnimationValidator.validateStagger(config.stagger);
    }

    if (config.repeat !== undefined && config.repeat !== "infinite") {
      AnimationValidator.validateRepeat(config.repeat);
    }

    if (config.keyframes && config.keyframes.length > 0) {
      // Only validate keyframes if they're the primary animation method
      // If from/to are also provided, keyframes can be supplementary
      const hasFromTo = config.from || config.to;
      if (!hasFromTo || config.keyframes.length >= 2) {
        AnimationValidator.validateKeyframes(config.keyframes);
      }
    }

    this.cssAnimator = new CSSAnimator({
      target: config.target,
      duration: config.duration ?? 1000,
      delay: config.delay,
      stagger: config.stagger,
      ease: config.ease,
      from: config.from,
      to: config.to,
      keyframes: config.keyframes,
      onStart: config.onStart,
      onUpdate: config.onUpdate,
      onComplete: config.onComplete,
    });

    this._finishedPromise = new Promise((resolve) => {
      this._finishedResolve = resolve;
    });
  }

  /**
   * Starts the animation for all target elements.
   * If the animation is already running, returns the existing completion promise.
   * Handles initial delay if specified in configuration.
   */
  async play(): Promise<void> {
    if (this.engine?.isPlaying) {
      return this._finishedPromise ?? Promise.resolve();
    }

    const { delay } = this.cssAnimator;
    if (delay && !this.engine) {
      await this.delay(delay);
    }

    return new Promise((resolve) => {
      this._finishedResolve = resolve;
      this._finishedPromise = new Promise((res) => {
        this._finishedResolve = res;
      });

      this.engine = new AnimationEngine({
        duration: this.cssAnimator.totalDuration,
        loop: this.config.repeat === "infinite",
        onStart: () => {
          this.cssAnimator.start();
        },
        onUpdate: (progress: number) => {
          this.cssAnimator.update(progress);
        },
        onComplete: () => {
          this.cssAnimator.complete();
          this._finishedResolve?.();
        },
        onPause: () => {
          this.config.onPause?.();
        },
        onResume: () => {
          this.config.onResume?.();
        },
      });

      this.engine.play();
    });
  }

  /**
   * Pauses all element animations at their current state.
   * Animation can be resumed later from the same position using resume().
   * Does nothing if the animation is not currently running.
   */
  pause(): void {
    this.engine?.pause();
  }

  /**
   * Resumes a paused animation from its current position.
   * Does nothing if the animation is not currently paused.
   * Maintains the same progress and timing as when it was paused.
   */
  resume(): void {
    this.engine?.play();
  }

  /**
   * Seeks to a specific progress point in the animation (0-1) across all elements.
   * Immediately updates all elements to their state at the specified progress.
   * Useful for scrubbing through the animation or jumping to specific points.
   */
  seek(progress: number): void {
    progress = clamp(progress, 0, 1);
    this.cssAnimator.update(progress);
    this.engine?.seek(progress);
  }

  /**
   * Resets all elements to their initial state and stops the animation.
   * Clears any active animation frames and resets internal timers.
   * Elements return to their pre-animation state.
   */
  reset(): void {
    this.engine?.reset();
    this.engine = null;
    this.cssAnimator.reset();
    this._finishedPromise = null;
    this._finishedResolve = undefined;
  }

  /**
   * Creates a delay using setTimeout wrapped in a Promise.
   * Used for handling initial animation delays specified in configuration.
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
