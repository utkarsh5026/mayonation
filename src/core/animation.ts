import {
  TransformHandler,
  type TransformPropertyName,
} from "../animations/transform_handler";
import { CSSHandler, type CSSPropertyName } from "../animations/css_handler";
import { easeFns, type EaseFn, type EaseFnName } from "./ease_fns";
import { type AnimationValue, isNumericValue } from "./animation-val";

/**
 * Core animation class that handles animating HTML elements.
 *
 * Manages animations by:
 * - Tracking animation targets and their properties
 * - Handling animation timing and progress
 * - Interpolating between start and end values
 * - Applying updates to elements on each frame
 *
 * Supports:
 * - CSS properties (opacity, colors, dimensions etc)
 * - Transform properties (translate, rotate, scale etc)
 * - Multiple animation targets
 * - Easing functions
 * - Animation lifecycle hooks
 *
 * @example
 * ```ts
 * // Create and play a simple animation
 * const animation = new Animation(element, {
 *   translateX: 100,
 *   opacity: 0.5,
 *   duration: 1000,
 *   easing: 'easeInOut'
 * });
 *
 * animation.play();
 * ```
 */
export class Animation {
  /** Active animation targets and their properties */
  private targets: AnimationTarget[] = [];

  /** Animation configuration options */
  private options: AnimationOptions;

  /** Animation start timestamp */
  private startTime: number | null = null;

  /** requestAnimationFrame ID for cancellation */
  private rafID: number | null = null;

  /** Active easing function */
  private easeFn: EaseFn;

  /** Map of elements to their transform/CSS handlers */
  private targetHandlers: Map<
    HTMLElement,
    {
      transform: TransformHandler;
      css: CSSHandler;
    }
  > = new Map();

  /** Whether animation is currently paused */
  private isPaused: boolean = false;

  /**
   * Creates a new animation instance
   * @param targets - Element(s) to animate
   * @param properties - Properties and values to animate to
   * @param options - Animation configuration options
   */
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

  /**
   * Selects the easing function to use
   * @param easing - Named easing or custom function
   * @returns Easing function to use
   */
  private pickEaseFn(easing: EaseFnName | EaseFn | undefined) {
    if (!easing) return easeFns.linear;
    if (typeof easing === "string") {
      return easeFns[easing];
    }
    return easing;
  }

  /**
   * Initializes animation targets and handlers
   * @param elements - Elements to animate
   * @param properties - Properties to animate
   */
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

  /**
   * Separates animation properties into transform and CSS categories
   * @param properties - Properties to categorize
   * @param transformHandler - Handler for transform properties
   * @param cssHandler - Handler for CSS properties
   * @returns Categorized property maps
   */
  private categorizeProperties(
    properties: AnimationConfig,
    transformHandler: TransformHandler,
    cssHandler: CSSHandler
  ) {
    const transforms = new Map<TransformPropertyName, AnimationProperty>();
    const cssProps = new Map<CSSPropertyName, AnimationProperty>();

    for (const [prop, targetValue] of Object.entries(properties)) {
      if (TransformHandler.isTransformProperty(prop)) {
        if (typeof targetValue !== "number") {
          throw new Error(
            `Invalid target value for transform property: ${prop}`
          );
        }

        const currentValue = transformHandler.getCurrentTransform(prop);
        const parsedTargetValue = transformHandler.parseTransformValue(
          prop,
          targetValue
        );
        transforms.set(prop, {
          from: currentValue,
          to: parsedTargetValue,
        });
      } else if (CSSHandler.isAnimatableProperty(prop)) {
        if (
          typeof targetValue !== "string" &&
          typeof targetValue !== "number"
        ) {
          throw new Error(
            `Invalid target value for CSS property: ${prop} with value: ${targetValue} as type: ${typeof targetValue}`
          );
        }
        const currentValue = cssHandler.getCurrentValue(prop);
        const parsedTargetValue = cssHandler.parseValue(
          prop,
          targetValue.toString()
        );
        cssProps.set(prop, {
          from: currentValue,
          to: parsedTargetValue,
        });
      }
    }
    return { transforms, cssProps };
  }

  /**
   * Animation frame handler that updates progress
   * @param currTime - Current timestamp
   */
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

  /**
   * Updates all animation targets with current progress
   * @param progress - Current animation progress (0-1)
   */
  private updateTargets(progress: number) {
    this.targets.forEach((target) => {
      const managers = this.targetHandlers.get(target.element);
      if (!managers) return;

      const { transform: transformHandler, css: cssHandler } = managers;

      // Update all transforms first
      target.transformProperties.forEach((value, prop) => {
        if (isNumericValue(value.from) && isNumericValue(value.to)) {
          const interpolated = transformHandler.interpolate(
            prop,
            value.from,
            value.to,
            progress
          );
          transformHandler.updateTransform(prop, interpolated);
        }
      });

      if (target.transformProperties.size > 0) {
        target.element.style.transform = transformHandler.computeTransform();
      }

      target.cssProperties.forEach((value, prop) => {
        const interpolated = cssHandler.interpolate(
          prop,
          value.from,
          value.to,
          progress
        );
        cssHandler.updateProperty(prop, interpolated);
      });
    });
  }

  /**
   * Handles animation completion
   */
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

  /**
   * Starts or resumes the animation
   * @returns this for chaining
   */
  public play(): this {
    if (this.rafID == null) {
      this.isPaused = false;
      this.rafID = requestAnimationFrame(this.animate.bind(this));
    }
    return this;
  }

  /**
   * Pauses the animation
   * @returns this for chaining
   */
  public pause(): this {
    if (this.rafID != null) {
      this.isPaused = true;
      cancelAnimationFrame(this.rafID);
      this.rafID = null;
    }
    return this;
  }

  /**
   * Resumes a paused animation
   * @returns this for chaining
   */
  public resume(): this {
    if (this.isPaused) {
      this.isPaused = false;
      this.rafID = requestAnimationFrame(this.animate.bind(this));
    }
    return this;
  }

  /**
   * Cleans up animation resources
   */
  public destroy(): void {
    this.pause();
    this.targetHandlers.clear();
    this.targets = [];
  }
}

/**
 * Options for configuring animation behavior.
 * Controls timing, easing and lifecycle callbacks.
 */
export type AnimationOptions = {
  duration: number; // Animation duration in ms
  delay?: number; // Animation delay in ms
  easing?: EaseFnName | EaseFn; // Easing function
  onComplete?: () => void; // Called when animation completes
  onStart?: () => void; // Called when animation starts
  onUpdate?: (progress: number) => void; // Called on each frame
};

/**
 * Groups the properties being animated for a single element.
 */
export type AnimationTarget = {
  element: HTMLElement; // Element being animated
  transformProperties: Map<TransformPropertyName, AnimationProperty>; // Transform animations
  cssProperties: Map<CSSPropertyName, AnimationProperty>; // CSS property animations
};

/**
 * Configuration object for creating animations.
 * Defines the target values and animation behavior.
 */
export type AnimationConfig = {
  translateX?: number; // Target X translation
  translateY?: number; // Target Y translation
  translateZ?: number; // Target Z translation

  rotate?: number; // Target rotation angle
  rotateX?: number; // Target rotation angle on X axis
  rotateY?: number; // Target rotation angle on Y axis
  rotateZ?: number; // Target rotation angle on Z axis

  scale?: number | [number, number]; // Target scale factor(s)
  scaleX?: number; // Target scale factor on X axis
  scaleY?: number; // Target scale factor on Y axis
  scaleZ?: number; // Target scale factor on Z axis

  opacity?: number; // Target opacity
  backgroundColor?: string; // Target background color
  width?: number | string; // Target width
  height?: number | string; // Target height

  duration?: number; // Animation duration in ms
  delay?: number; // Animation delay in ms
  easing?: string | ((t: number) => number); // Easing function

  // Lifecycle callbacks
  onStart?: () => void; // Called when animation starts
  onUpdate?: (progress: number) => void; // Called on each animation frame
  onComplete?: () => void; // Called when animation completes
};

/**
 * Represents a property being animated with a start and end value.
 */
type AnimationProperty = {
  from: AnimationValue;
  to: AnimationValue;
};
