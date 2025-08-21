import type {
  AnimationConfig,
  AnimationState,
  ProcessedKeyframe,
} from "./types";
import { ElementResolver, type ElementLike } from "@/utils/dom";
import { resolveEaseFn } from "@/core/ease_fns";
import {
  EventManager,
  AnimationTimer,
  ElementManager,
  PropertyAnimator,
  StaggerManager,
} from "./_internal";
import { clamp } from "@/utils/math";
import { throwIf } from "@/utils/error";

export class Mayonation {
  readonly id: string;
  readonly config: Readonly<AnimationConfig>;

  private readonly eventManager: EventManager;
  private readonly timer: AnimationTimer;
  private readonly elementManager: ElementManager;
  private readonly propertyAnimator: PropertyAnimator;
  private readonly staggerManager: StaggerManager;

  private _state: AnimationState = "idle";
  private _rafId: number | null = null;
  private _finishedPromise: Promise<void>;
  private _finishedResolve?: () => void;

  private _lastFrameTime: number = 0;
  private _frameCount: number = 0;
  private _fps: number = 60;

  /**
   * Creates a new MayoAnimation instance that can handle multiple elements
   */
  constructor(config: AnimationConfig, id: string) {
    this.id = id;
    this.config = Object.freeze({ ...config });

    const elements = this.resolveElements(config.target!);
    const duration = config.duration || 1000;
    const staggerDelay = config.stagger || 0;

    this.eventManager = EventManager.fromAnimationConfig(config);
    this.timer = new AnimationTimer(duration);
    this.elementManager = new ElementManager(elements);
    this.staggerManager = new StaggerManager(
      staggerDelay,
      elements.length,
      duration
    );
    this.propertyAnimator = new PropertyAnimator(this.processKeyframes());

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
    if (this._state === "running") return this._finishedPromise;

    if (this.config.delay && this.timer.getCurrentElapsedTime() === 0) {
      await this.delay(this.config.delay);
    }

    this._state = "running";
    this.timer.start();
    this.eventManager.onStart();
    this.startAnimationLoop();

    return this._finishedPromise;
  }

  /**
   * Pauses all element animations at their current state.
   * Animation can be resumed later from the same position using resume().
   * Does nothing if the animation is not currently running.
   */
  pause(): void {
    if (this._state !== "running") return;

    this._state = "paused";
    this.timer.pause();

    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    this.eventManager.onPause();
  }

  /**
   * Resumes a paused animation from its current position.
   * Does nothing if the animation is not currently paused.
   * Maintains the same progress and timing as when it was paused.
   */
  resume(): void {
    if (this._state !== "paused") return;

    this.timer.resume();
    this.eventManager.onResume();
    this.play();
  }

  /**
   * Reverses the animation direction.
   * If playing forward, will play backward. If playing backward, will play forward.
   * Can be called at any time during animation playback.
   */
  reverse(): void {
    this.timer.reversePlaybackDirection();
    this.eventManager.onReverse();
  }

  /**
   * Seeks to a specific progress point in the animation (0-1) across all elements.
   * Immediately updates all elements to their state at the specified progress.
   * Useful for scrubbing through the animation or jumping to specific points.
   */
  seek(progress: number): void {
    progress = clamp(progress, 0, 1);
    this.timer.seekToProgress(progress);
    this.updateAllElements();
  }

  /**
   * Resets all elements to their initial state and stops the animation.
   * Clears any active animation frames and resets internal timers.
   * Elements return to their pre-animation state.
   */
  reset(): void {
    this._state = "idle";
    this.timer.reset();
    this.elementManager.reset();

    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  /**
   * Main animation loop that handles rendering for all elements.
   * Calculates animation progress, updates FPS, and manages element updates.
   * Runs continuously via requestAnimationFrame until animation completes.
   */
  private startAnimationLoop(): void {
    const animate = (currentTime: number) => {
      if (this._state !== "running") return;

      this.calculateFPS(currentTime);

      const { progress, iteration, shouldComplete } =
        this.timer.calculateAnimationProgress(
          this.config.repeat,
          this.config.yoyo
        );

      if (shouldComplete) {
        this.completeAnimation();
        return;
      }

      this.updateAllElements();

      this.eventManager.onUpdate(progress, {
        elapsed: this.timer.getCurrentElapsedTime(),
        remaining:
          this.staggerManager.getTotalDuration() -
          this.timer.getCurrentElapsedTime(),
        fps: this._fps,
        iteration,
      });

      this._rafId = requestAnimationFrame(animate);
    };

    this._rafId = requestAnimationFrame(animate);
  }

  /**
   * Updates all elements based on their individual stagger timing.
   * Calculates each element's progress considering stagger delays and
   * applies property updates to elements that are currently active.
   */
  private updateAllElements(): void {
    const elapsed = this.timer.getCurrentElapsedTime();
    const { elementCount } = this.elementManager;

    const duration = this.timer.totalDuration;
    for (let i = 0; i < elementCount; i++) {
      const elementProgress = this.staggerManager.calculateElementProgress(
        i,
        elapsed,
        duration
      );

      const { progress, isActive, isComplete } = elementProgress;
      this.elementManager.updateElement(i, progress, isActive, isComplete);

      if (!isActive && !isComplete) continue;
      this.updateElement(i, progress);
    }
  }

  /**
   * Updates a specific element's properties based on animation progress.
   * Applies property interpolation using the configured easing function
   * and from/to values or keyframes.
   */
  private updateElement(elementIndex: number, progress: number) {
    const propertyManager =
      this.elementManager.getPropertyManager(elementIndex);
    if (!propertyManager) return;

    this.propertyAnimator.updateElement(
      propertyManager,
      progress,
      this.config.from,
      this.config.to,
      this.config.ease
    );
  }

  /**
   * Finalizes the animation by setting all elements to their end state.
   * Cancels any pending animation frames, updates element states,
   * triggers completion events, and resolves the finished promise.
   */
  private completeAnimation(): void {
    this._state = "completed";

    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    const { elementCount } = this.elementManager;
    for (let i = 0; i < elementCount; i++) {
      this.elementManager.updateElement(i, 1, false, true);
      this.updateElement(i, 1);
    }

    this.eventManager.onComplete();
    this._finishedResolve?.();
  }

  /**
   * Resolves target elements from various input types (selector, element, array).
   * Filters results to ensure only HTMLElements are included.
   */
  private resolveElements(target: ElementLike): HTMLElement[] {
    try {
      const els = ElementResolver.resolve(target).filter(
        (el): el is HTMLElement => el instanceof HTMLElement
      );

      throwIf(!els.length, "Target must resolve to HTMLElement(s)");
      return els;
    } catch (error) {
      throw new Error(`Failed to resolve target: ${error}`);
    }
  }

  /**
   * Processes keyframes configuration into internal format with resolved easing functions.
   * Converts keyframe objects into ProcessedKeyframe format for efficient animation.
   */
  private processKeyframes(): ProcessedKeyframe[] | undefined {
    const { keyframes } = this.config;
    if (!keyframes) return;

    return keyframes.map((frame) => ({
      offset: frame.offset,
      properties: { ...frame },
      easing: resolveEaseFn(frame.ease || this.config.ease),
    }));
  }

  /**
   * Calculates current frames per second based on animation frame timing.
   * Updates internal FPS counter for performance monitoring and debugging.
   */
  private calculateFPS(currentTime: number): void {
    if (this._lastFrameTime > 0) {
      const delta = currentTime - this._lastFrameTime;
      this._fps = Math.round(1000 / delta);
    }
    this._lastFrameTime = currentTime;
    this._frameCount++;
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
