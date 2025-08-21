import type { AnimationConfig, AnimationProperties } from "./types";
import { AnimationValidator } from "./animation-validator";
import { type ElementLike, ElementResolver } from "@/utils/dom";
import { Mayonation } from "./animation";
import type { EaseFunction } from "@/core/ease_fns";

/**
 * A builder class for creating and configuring animations.
 * Provides a chainable API for setting animation properties, targets, and callbacks.
 */
export class AnimationBuilder {
  private config: AnimationConfig = {};
  private _id: string;

  /**
   * Creates a new AnimationBuilder instance with a unique ID.
   */
  constructor() {
    this._id = `anim_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;
  }

  /**
   * Sets the target element(s) for the animation.
   * Accepts CSS selectors, DOM elements, or arrays of elements.
   */
  public target(selector: ElementLike): AnimationBuilder {
    try {
      const elements = ElementResolver.resolve(selector);
      ElementResolver.validateElements(elements);
      this.config.target = selector;
      return this;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Sets the end state properties for the animation.
   * Defines what values the animated properties should reach.
   */
  public to(properties: AnimationProperties): AnimationBuilder {
    this.validateAnimationProperties(properties);
    this.config.to = { ...this.config.to, ...properties };
    return this;
  }

  /**
   * Sets the starting state properties for the animation.
   * Defines the initial values before the animation begins.
   */
  public from(properties: AnimationProperties): AnimationBuilder {
    this.validateAnimationProperties(properties);
    this.config.from = { ...this.config.from, ...properties };
    return this;
  }

  /**
   * Sets the easing function for the animation.
   * Controls the rate of change over time.
   */
  public ease(easing: EaseFunction): AnimationBuilder {
    this.config.ease = easing;
    return this;
  }

  /**
   * Sets the duration of the animation in milliseconds.
   */
  public duration(ms: number): AnimationBuilder {
    AnimationValidator.validateDuration(ms);
    this.config.duration = ms;
    return this;
  }

  /**
   * Sets the stagger delay between multiple elements in milliseconds.
   * Each subsequent element will start its animation after this delay.
   */
  public stagger(ms: number): AnimationBuilder {
    AnimationValidator.validateStagger(ms);
    this.config.stagger = ms;
    return this;
  }

  /**
   * Sets how many times the animation should repeat.
   */
  public repeat(times: number | "infinite"): AnimationBuilder {
    AnimationValidator.validateRepeat(times);
    this.config.repeat = times;
    return this;
  }

  /**
   * Enables or disables yoyo mode where the animation reverses on alternate cycles.
   * Only works when repeat is greater than 1.
   * ```
   */
  public yoyo(enabled: boolean = true): AnimationBuilder {
    this.config.yoyo = Boolean(enabled);
    return this;
  }

  /**
   * Gets a copy of the current animation configuration.
   * Useful for debugging or creating multiple similar animations.
   */
  public get configuration(): AnimationConfig {
    return { ...this.config };
  }

  /**
   * Sets a callback function to be called when the animation starts.
   */
  public onStart(callback: () => void): AnimationBuilder {
    this.validateFunction(callback, "onStart");
    this.config.onStart = callback;
    return this;
  }

  /**
   * Sets a callback function to be called on each animation frame.
   * Receives the current progress (0-1) and optional animation info.
   */
  public onUpdate(
    callback: (progress: number, info?: any) => void
  ): AnimationBuilder {
    this.validateFunction(callback, "onUpdate");
    this.config.onUpdate = callback;
    return this;
  }

  /**
   * Sets a callback function to be called when the animation completes.
   */
  public onComplete(callback: () => void): AnimationBuilder {
    this.validateFunction(callback, "onComplete");
    this.config.onComplete = callback;
    return this;
  }

  /**
   * Sets a callback function to be called when the animation is paused.
   */
  public onPause(callback: () => void): AnimationBuilder {
    this.validateFunction(callback, "onPause");
    this.config.onPause = callback;
    return this;
  }

  /**
   * Creates and starts the animation with the current configuration.
   * This method validates the configuration and returns a MayoAnimation instance.
   */
  public play(): Mayonation {
    this.validateConfiguration();
    return new Mayonation(this.config, this._id);
  }

  /**
   * Validates that the provided animation properties are valid.
   * Ensures properties is an object and not null/undefined.
   */
  private validateAnimationProperties(properties: AnimationProperties) {
    if (!properties || typeof properties !== "object") {
      throw new Error("Properties must be an object");
    }
  }

  /**
   * Validates that the provided callback is a function.
   * Used internally to validate event callbacks.
   */
  private validateFunction(callback: Function, name: string) {
    if (typeof callback !== "function") {
      throw new Error(`${name} callback must be a function`);
    }
  }

  /**
   * Validates the complete animation configuration before creating the animation.
   * Ensures required properties are set and applies default values.
   * Warns about conflicting configurations.
   */
  private validateConfiguration(): void {
    if (!this.config.target) {
      throw new Error("Target is required");
    }

    if (!this.config.to && !this.config.keyframes) {
      throw new Error('Either "to" properties or keyframes must be specified');
    }

    if (this.config.to && this.config.keyframes) {
      console.warn(
        'Both "to" properties and keyframes specified. Keyframes will take precedence.'
      );
    }

    // Apply defaults
    this.config.duration = this.config.duration ?? 1000;
    this.config.delay = this.config.delay ?? 0;
    this.config.ease = this.config.ease ?? "easeOut";
  }
}
