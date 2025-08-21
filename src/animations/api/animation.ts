import type {
  AnimationConfig,
  AnimationProperties,
  AnimationState,
  ProcessedKeyframe,
} from "./types";
import { AnimatableProperty, PropertyManager } from "@/core/property-manager";
import { ElementResolver, type ElementLike } from "@/utils/dom";
import { resolveEaseFn } from "@/core/ease_fns";

/**
 * Core animation class that handles the execution and control of animations.
 * Manages timing, property interpolation, easing, and animation lifecycle.
 */
export class Mayonation {
  readonly id: string;
  readonly config: Readonly<AnimationConfig>;
  readonly elements: HTMLElement[];

  private _state: AnimationState = "idle";
  private _progress: number = 0;
  private _duration: number;
  private _startTime: number = 0;
  private _pausedTime: number = 0;
  private _rafId: number | null = null;
  private _finishedPromise: Promise<void>;
  private _finishedResolve?: () => void;
  private _timeScale: number = 1;
  private _direction: 1 | -1 = 1;
  private _iteration: number = 0;

  private _lastFrameTime: number = 0;
  private _frameCount: number = 0;
  private _fps: number = 60;

  // Use your existing property management system
  private propertyManager: PropertyManager;

  // Processed keyframes for animation
  private processedKeyframes: ProcessedKeyframe[] = [];

  /**
   * Creates a new Mayonation instance.
   * Initializes the animation configuration, resolves target elements,
   * and sets up the property manager for animation execution.
   */
  constructor(config: AnimationConfig, id: string) {
    this.id = id;
    this.config = Object.freeze({ ...config });
    this.elements = this.resolveElements(config.target!);
    this._duration = config.duration || 1000;
    this.propertyManager = new PropertyManager(this.elements[0]);

    this.processAnimationKeyframes();

    this._finishedPromise = new Promise((resolve) => {
      this._finishedResolve = resolve;
    });
  }

  /**
   * Interpolates between two sets of animation properties and applies them to elements.
   */
  public async play(): Promise<void> {
    if (this._state === "running") return this._finishedPromise;

    if (this.config.delay && this._progress === 0) {
      await this.delay(this.config.delay);
    }

    this._state = "running";
    this._startTime = performance.now() - this._pausedTime;
    this._lastFrameTime = this._startTime;

    this.config.onStart?.();
    this.startAnimationLoop();

    return this._finishedPromise;
  }

  /**
   * Starts the animation playback with optional delay handling.
   * Initializes timing, triggers onStart callback, and begins the animation loop.
   */
  private startAnimationLoop(): void {
    const animate = (currentTime: number) => {
      if (this._state !== "running") return;

      this.calculateFPS(currentTime);

      const elapsed =
        (currentTime - this._startTime) * this._timeScale * this._direction;
      let rawProgress = elapsed / this._duration;

      if (this.config.repeat !== undefined) {
        const { progress, iteration, shouldComplete } =
          this.handleRepeat(rawProgress);
        this._progress = progress;
        this._iteration = iteration;

        if (shouldComplete) {
          this.completeAnimation();
          return;
        }
      } else {
        this._progress = Math.max(0, Math.min(1, rawProgress));
        if (this._progress >= 1) {
          this.completeAnimation();
          return;
        }
      }

      this.updateAnimation(this._progress);
      this.config.onUpdate?.(this._progress, {
        elapsed: Math.abs(elapsed),
        remaining: this._duration - Math.abs(elapsed),
        fps: this._fps,
        iteration: this._iteration,
      });

      this._rafId = requestAnimationFrame(animate);
    };

    this._rafId = requestAnimationFrame(animate);
  }

  /**
   * Updates the animation properties for the current frame.
   * Applies easing and determines whether to use keyframes or from/to properties.
   */
  private updateAnimation(progress: number): void {
    const easedProgress = this.applyEasing(progress);
    if (this.processedKeyframes.length > 0) {
      this.updateFromKeyframes(easedProgress);
    } else {
      this.updateFromToProperties(easedProgress);
    }
  }

  /**
   * Updates animation properties using keyframe-based animation.
   * Finds the appropriate keyframe segment and interpolates between keyframes.
   * Supports per-keyframe easing functions.
   */
  private updateFromKeyframes(progress: number): void {
    let fromFrame = this.processedKeyframes[0];
    let toFrame = this.processedKeyframes[this.processedKeyframes.length - 1];

    for (let i = 0; i < this.processedKeyframes.length - 1; i++) {
      if (
        progress >= this.processedKeyframes[i].offset &&
        progress <= this.processedKeyframes[i + 1].offset
      ) {
        fromFrame = this.processedKeyframes[i];
        toFrame = this.processedKeyframes[i + 1];
        break;
      }
    }

    // Calculate local progress between keyframes
    const localProgress =
      fromFrame.offset === toFrame.offset
        ? 0
        : (progress - fromFrame.offset) / (toFrame.offset - fromFrame.offset);

    // Apply keyframe-specific easing
    const easedLocalProgress = resolveEaseFn(fromFrame.easing)(localProgress);

    this.interpolateAndApplyProperties(
      fromFrame.properties,
      toFrame.properties,
      easedLocalProgress
    );
  }

  private updateFromToProperties(progress: number): void {
    const fromProps = this.config.from || {};
    const toProps = this.config.to || {};

    this.interpolateAndApplyProperties(fromProps, toProps, progress);
  }

  private completeAnimation(): void {
    this._state = "completed";
    this._progress = 1;

    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    this.config.onComplete?.();
    this._finishedResolve?.();
  }

  private applyEasing(progress: number): number {
    const easing = this.config.ease || "easeOut";

    if (typeof easing === "function") {
      return easing(progress);
    }

    const easingFn = resolveEaseFn(easing);
    return easingFn(progress);
  }

  private resolveElements(target: ElementLike): HTMLElement[] {
    try {
      const els = ElementResolver.resolve(target).filter(
        (el): el is HTMLElement => el instanceof HTMLElement
      );
      if (!els.length) throw new Error("Target must resolve to HTMLElement(s)");
      return els;
    } catch (error) {
      throw new Error(`Failed to resolve target: ${error}`);
    }
  }

  private processAnimationKeyframes(): void {
    if (this.config.keyframes) {
      this.processedKeyframes = this.config.keyframes.map((frame) => ({
        offset: frame.offset,
        properties: { ...frame },
        easing: resolveEaseFn(frame.ease || this.config.ease),
      }));
    }
  }

  private interpolateAndApplyProperties(
    fromProps: AnimationProperties,
    toProps: AnimationProperties,
    progress: number
  ): void {
    // Get all properties to animate
    const allProps = new Set([
      ...Object.keys(fromProps),
      ...Object.keys(toProps),
    ]);

    for (const prop of allProps) {
      if (!PropertyManager.isAnimatable(prop)) {
        console.warn(`Property "${prop}" is not animatable`);
        continue;
      }

      const fromValue = fromProps[prop];
      const toValue = toProps[prop];

      try {
        // Get current value if fromValue is undefined (from current state)
        const actualFromValue =
          fromValue !== undefined
            ? fromValue
            : this.propertyManager.getCurrentValue(prop as AnimatableProperty);

        if (toValue !== undefined) {
          // Parse values using your existing system
          const fromParsed = this.propertyManager.parse(
            prop as AnimatableProperty,
            actualFromValue
          );
          const toParsed = this.propertyManager.parse(
            prop as AnimatableProperty,
            toValue
          );

          if (fromParsed && toParsed) {
            // Interpolate using your existing system
            const interpolated = this.propertyManager.interpolate(
              prop as AnimatableProperty,
              fromParsed,
              toParsed,
              progress
            );

            // Update property using your existing system
            this.propertyManager.updateProperty(
              prop as AnimatableProperty,
              interpolated
            );
          }
        }
      } catch (error) {
        console.error(`Error animating property "${prop}":`, error);
      }
    }

    // Apply all changes using your existing system
    this.propertyManager.applyUpdates();
  }

  private handleRepeat(rawProgress: number): {
    progress: number;
    iteration: number;
    shouldComplete: boolean;
  } {
    const repeat = this.config.repeat!;

    if (repeat === "infinite") {
      const iteration = Math.floor(Math.abs(rawProgress));
      let progress = Math.abs(rawProgress) % 1;

      // Handle yoyo
      if (this.config.yoyo && iteration % 2 === 1) {
        progress = 1 - progress;
      }

      return { progress, iteration, shouldComplete: false };
    }

    if (Math.abs(rawProgress) >= repeat) {
      return { progress: 1, iteration: repeat, shouldComplete: true };
    }

    const iteration = Math.floor(Math.abs(rawProgress));
    let progress = Math.abs(rawProgress) % 1;

    // Handle yoyo
    if (this.config.yoyo && iteration % 2 === 1) {
      progress = 1 - progress;
    }

    return { progress, iteration, shouldComplete: false };
  }

  private calculateFPS(currentTime: number): void {
    if (this._lastFrameTime > 0) {
      const delta = currentTime - this._lastFrameTime;
      this._fps = Math.round(1000 / delta);
    }
    this._lastFrameTime = currentTime;
    this._frameCount++;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
