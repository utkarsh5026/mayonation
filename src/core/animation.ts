import type {
  AnimationTarget,
  AnimationOptions,
  AnimationConfig,
  EaseFn,
  EaseFnName,
  TransformPropertyName,
} from "./types";
import TransformHandler from "../animations/transform_handler";
import CSSHandler from "../animations/css_handler";
import { easeFns } from "./ease_fns";

export class Animation {
  private targets: AnimationTarget[] = [];
  private options: AnimationOptions;
  private startTime: number | null = null;
  private rafID: number | null = null;
  private easeFn: EaseFn;
  private targetHandlers: Map<
    HTMLElement,
    {
      transform: TransformHandler;
      css: CSSHandler;
    }
  > = new Map();
  private isPaused: boolean = false;

  constructor(
    targets: HTMLElement | HTMLElement[],
    properties: AnimationConfig,
    options: AnimationOptions
  ) {
    this.options = options;
    this.easeFn = this.pickEaseFn(options.easing);
    const elements = Array.isArray(targets) ? targets : [targets];
    this.init(elements, properties);
  }

  private pickEaseFn(easing: EaseFnName | EaseFn | undefined) {
    if (!easing) return easeFns.linear;
    if (typeof easing === "string") {
      return easeFns[easing];
    }
    return easing;
  }

  private init(elements: HTMLElement[], properties: AnimationConfig) {
    elements.forEach((el) => {
      const transformHandler = new TransformHandler(el);
      const cssHandler = new CSSHandler(el);

      const { transforms, cssProps } = this.categorizeProperties(
        properties,
        transformHandler,
        cssHandler
      );

      this.targets.push({
        element: el,
        transformProperties: transforms,
        cssProperties: cssProps,
      });

      this.targetHandlers.set(el, {
        transform: transformHandler,
        css: cssHandler,
      });
    });
  }

  private categorizeProperties(
    properties: AnimationConfig,
    transformHandler: TransformHandler,
    cssHandler: CSSHandler
  ) {
    const transforms = new Map();
    const cssProps = new Map();

    for (const [prop, targetValue] of Object.entries(properties)) {
      if (TransformHandler.isTransformProperty(prop)) {
        if (typeof targetValue !== "number") {
          throw new Error(
            `Invalid target value for transform property: ${prop}`
          );
        }

        const currentValue = transformHandler.getCurrentTransform(
          prop as TransformPropertyName
        );
        const parsedTargetValue = transformHandler.parseTransformValue(
          prop as TransformPropertyName,
          targetValue
        );
        transforms.set(prop, {
          from: currentValue,
          to: parsedTargetValue,
        });
      } else {
        // TODO: Add CSS property handling
      }
    }

    return { transforms, cssProps };
  }

  private animate(currTime: number) {
    if (!this.startTime) {
      this.startTime = currTime;
    }

    const timeElapsed = currTime - this.startTime;
    const delay = this.options.delay || 0;
    const currProgress = (timeElapsed - delay) / this.options.duration;
    const progress = Math.min(currProgress, 1);

    if (progress < 0) {
      this.rafID = requestAnimationFrame(this.animate.bind(this));
      return;
    }

    const easedProgress = this.easeFn(progress);
    this.updateTargets(easedProgress);

    if (progress < 1) {
      this.rafID = requestAnimationFrame(this.animate.bind(this));
    } else {
      this.complete();
    }
  }

  private updateTargets(progress: number) {
    this.targets.forEach((target) => {
      const managers = this.targetHandlers.get(target.element);
      if (!managers) return;

      const { transform: transformHandler, css: cssHandler } = managers;

      // Update all transforms first
      target.transformProperties.forEach((value, prop) => {
        const interpolated = transformHandler.interpolate(
          prop,
          value.from,
          value.to,
          progress
        );
        transformHandler.updateTransform(prop, interpolated);
      });

      // Apply final transform string - removed nested rAF
      if (target.transformProperties.size > 0) {
        target.element.style.transform = transformHandler.computeTransform();
      }

      // Update CSS properties
      target.cssProperties.forEach((value, prop) => {
        // const interpolated = cssHandler.interpolate(
        //   prop,
        //   value.from,
        //   value.to,
        //   progress
        // );
        // cssHandler.updateCSSValue(prop, interpolated);
      });
    });
  }

  private complete() {
    this.rafID = null;
    this.startTime = null;

    // Reset transform state after animation
    this.targets.forEach((target) => {
      const managers = this.targetHandlers.get(target.element);
      if (!managers) return;

      const { transform: transformHandler } = managers;
      transformHandler.reset();
    });

    this.options.onComplete?.();
  }

  public play(): this {
    if (this.rafID == null) {
      this.isPaused = false;
      this.rafID = requestAnimationFrame(this.animate.bind(this));
    }
    return this;
  }

  public pause(): this {
    if (this.rafID != null) {
      this.isPaused = true;
      cancelAnimationFrame(this.rafID);
      this.rafID = null;
    }
    return this;
  }

  public resume(): this {
    if (this.isPaused) {
      this.isPaused = false;
      this.rafID = requestAnimationFrame(this.animate.bind(this));
    }
    return this;
  }

  public destroy(): void {
    this.pause();
    this.targetHandlers.clear();
    this.targets = [];
  }
}
