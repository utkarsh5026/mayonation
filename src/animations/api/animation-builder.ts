import type { AnimationConfig, AnimationProperties, EasingType } from "./types";
import { AnimationValidator } from "./animation-validator";
import { type ElementLike, ElementResolver } from "@/utils/dom";
import { MayoAnimation } from "./animation";

export class AnimationBuilder {
  private config: AnimationConfig = {};
  private _id: string;

  constructor() {
    this._id = `anim_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;
  }

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

  public to(properties: AnimationProperties): AnimationBuilder {
    this.validateAnimationProperties(properties);
    this.config.to = { ...this.config.to, ...properties };
    return this;
  }

  public from(properties: AnimationProperties): AnimationBuilder {
    this.validateAnimationProperties(properties);
    this.config.from = { ...this.config.from, ...properties };
    return this;
  }

  public ease(easing: EasingType): AnimationBuilder {
    this.config.ease = easing;
    return this;
  }

  public duration(ms: number): AnimationBuilder {
    AnimationValidator.validateDuration(ms);
    this.config.duration = ms;
    return this;
  }

  public stagger(ms: number): AnimationBuilder {
    AnimationValidator.validateStagger(ms);
    this.config.stagger = ms;
    return this;
  }

  public repeat(times: number | "infinite"): AnimationBuilder {
    AnimationValidator.validateRepeat(times);
    this.config.repeat = times;
    return this;
  }

  public yoyo(enabled: boolean = true): AnimationBuilder {
    this.config.yoyo = Boolean(enabled);
    return this;
  }

  public get configuration(): AnimationConfig {
    return { ...this.config };
  }

  public onStart(callback: () => void): AnimationBuilder {
    this.validateFunction(callback, "onStart");
    this.config.onStart = callback;
    return this;
  }

  public onUpdate(
    callback: (progress: number, info?: any) => void
  ): AnimationBuilder {
    this.validateFunction(callback, "onUpdate");
    this.config.onUpdate = callback;
    return this;
  }

  public onComplete(callback: () => void): AnimationBuilder {
    this.validateFunction(callback, "onComplete");
    this.config.onComplete = callback;
    return this;
  }

  public onPause(callback: () => void): AnimationBuilder {
    this.validateFunction(callback, "onPause");
    this.config.onPause = callback;
    return this;
  }

  play(): MayoAnimation {
    this.validateConfiguration();
    return new MayoAnimation(this.config, this._id);
  }

  private validateAnimationProperties(properties: AnimationProperties) {
    if (!properties || typeof properties !== "object") {
      throw new Error("Properties must be an object");
    }
  }

  private validateFunction(callback: Function, name: string) {
    if (typeof callback !== "function") {
      throw new Error(`${name} callback must be a function`);
    }
  }

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
