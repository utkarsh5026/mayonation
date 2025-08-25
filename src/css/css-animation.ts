import type {
  AnimationProperties,
  CSSAnimationConfig,
  ProcessedKeyframe,
  AnimationValue,
} from "./types";
import { ElementManager } from "./internal/element-manager";
import { PropertyAnimator } from "./internal/property-animator";
import { StaggerManager } from "./internal/stagger-manager";
import { ElementLike, ElementResolver } from "@/utils/dom";
import { throwIf } from "@/utils/error";
import { resolveEaseFn } from "@/core/ease-fns";

export class CSSAnimator {
  private readonly config: Required<CSSAnimationConfig>;

  private readonly elementManager: ElementManager;
  private readonly staggerManager: StaggerManager;

  private readonly elements: HTMLElement[];
  private readonly resolvedKeyframes: Map<number, ProcessedKeyframe[]>;

  /**
   * Prepare managers, resolve targets, and precompute keyframes.
   * @param config Animation configuration.
   */
  constructor(config: CSSAnimationConfig) {
    this.resolvedKeyframes = new Map();
    this.config = {
      ...config,
      delay: config.delay ?? 0,
      stagger: config.stagger ?? 0,
      ease: config.ease ?? "easeOut",
      from: config.from ?? {},
      to: config.to ?? {},
      keyframes: config.keyframes ?? [],
      onStart: config.onStart ?? (() => {}),
      onUpdate: config.onUpdate ?? (() => {}),
      onComplete: config.onComplete ?? (() => {}),
    };
    this.elements = this.resolveElements(this.config.target);

    this.elementManager = new ElementManager(this.elements);
    this.staggerManager = new StaggerManager(
      this.config.stagger,
      this.elements.length,
      this.config.duration
    );

    this.resolveAllPropertiesAndKeyframes();
  }

  /**
   * Advance the animation to a normalized progress [0..1] and update all elements.
   * @param globalProgress Global timeline progress.
   */
  public update(globalProgress: number): void {
    const elapsed = globalProgress * this.totalDuration;

    this.elements.forEach((_, i) => {
      const { progress, isActive, isComplete } =
        this.staggerManager.calculateElementProgress(
          i,
          elapsed,
          this.config.duration
        );

      this.elementManager.updateElement(i, progress, isActive, isComplete);

      if (isActive || isComplete) {
        this.updateElement(i, progress);
      }
    });

    this.config.onUpdate(globalProgress, {
      elapsed,
      remaining: this.totalDuration - elapsed,
      activeElements: this.getActiveElementCount(),
    });
  }

  /**
   * Resets the animation state
   */
  public reset(): void {
    this.elementManager.reset();
  }

  /**
   * Total duration including stagger and delay (ms).
   */
  public get totalDuration(): number {
    return this.staggerManager.getTotalDuration();
  }

  /**
   * Base animation duration excluding stagger (ms).
   */
  public get baseDuration(): number {
    return this.config.duration;
  }

  /**
   * Initial delay before starting (ms).
   */
  public get delay(): number {
    return this.config.delay;
  }

  /**
   * Number of target elements.
   */
  public get elementCount(): number {
    return this.elements.length;
  }

  /**
   * Invoke onStart hook.
   */
  public start(): void {
    this.config.onStart();
  }

  /**
   * Jump to end state and invoke onComplete.
   */
  public complete(): void {
    this.update(1);
    this.config.onComplete();
  }

  /**
   * Resolves target elements from various input types (selector, element, array).
   * Filters results to ensure only HTMLElements are included.
   * @param target Selector/element/collection.
   */
  private resolveElements(target: ElementLike): HTMLElement[] {
    try {
      const elements = ElementResolver.resolve(target).filter(
        (el): el is HTMLElement =>
          el instanceof HTMLElement || el instanceof SVGElement
      ) as HTMLElement[];

      throwIf(
        elements.length === 0,
        "Target must resolve to at least one HTMLElement or SVGElement"
      );

      return elements;
    } catch (error) {
      throw new Error(`Failed to resolve target: ${error}`);
    }
  }

  /**
   * Prepare per-element keyframes from from/to, arrays, or explicit keyframes.
   */
  private resolveAllPropertiesAndKeyframes(): void {
    const { from, to } = this.config;

    const handleArrayProperties = (index: number, element: HTMLElement) => {
      const keyframes = this.buildKeyframesForElement(index, element);
      this.resolvedKeyframes.set(index, keyframes);
    };

    const handleSimpleProperties = (index: number, element: HTMLElement) => {
      const fromProps = this.resolvePropertiesForElement(from, index, element);
      const toProps = this.resolvePropertiesForElement(to, index, element);
      const keyframes: ProcessedKeyframe[] = [
        {
          offset: 0,
          properties: fromProps,
          easing: resolveEaseFn(this.config.ease),
        },
        {
          offset: 1,
          properties: toProps,
          easing: resolveEaseFn(this.config.ease),
        },
      ];

      this.resolvedKeyframes.set(index, keyframes);
    };

    this.elements.forEach((element, index) => {
      const hasArrayProps =
        this.hasArrayProperties(to) || this.hasArrayProperties(from);

      if (hasArrayProps || this.config.keyframes.length > 0) {
        handleArrayProperties(index, element);
        return;
      }

      handleSimpleProperties(index, element);
    });
  }

  /**
   * Build processed keyframes for an element from config keyframes or array props.
   * @param index Element index.
   * @param element Target element.
   */
  private buildKeyframesForElement(
    index: number,
    element: HTMLElement
  ): ProcessedKeyframe[] {
    const { keyframes } = this.config;
    if (keyframes.length > 0) {
      // already has keyframes
      return keyframes.map((kf) => ({
        offset: kf.offset,
        properties: this.resolvePropertiesForElement(kf, index, element),
        easing: resolveEaseFn(kf.ease || this.config.ease),
      }));
    }

    return this.buildKeyframesFromArrayProperties(index, element);
  }

  /**
   * Expand array/functional values into evenly spaced keyframes.
   * @param index Element index.
   * @param element Target element.
   */
  private buildKeyframesFromArrayProperties(
    index: number,
    element: HTMLElement
  ): ProcessedKeyframe[] {
    const allProperties = { ...this.config.from, ...this.config.to };
    const maxLength = this.getMaxKeyFrameLengthGiven(
      Object.values(allProperties),
      index,
      element
    );
    const keyframes: ProcessedKeyframe[] = [];

    for (let i = 0; i < maxLength; i++) {
      const offset = i / (maxLength - 1); // 0, 0.5, 1 for 3 keyframes
      const properties: Record<string, any> = {};

      Object.entries(allProperties).forEach(([property, value]) => {
        const resolved = this.resolveAnimationValue(value, index, element);

        if (Array.isArray(resolved)) {
          properties[property] = resolved[Math.min(i, resolved.length - 1)];
          return;
        }

        if (i === 0 && this.config.from?.[property] !== undefined) {
          properties[property] = this.resolveAnimationValue(
            this.config.from[property],
            index,
            element
          );
        } else {
          properties[property] = resolved;
        }
      });

      keyframes.push({
        offset,
        properties,
        easing: resolveEaseFn(this.config.ease),
      });
    }
    return keyframes;
  }

  /**
   * Get the number of frames required based on longest array value (min 2).
   */
  private getMaxKeyFrameLengthGiven(
    propValues: (AnimationValue | undefined)[],
    index: number,
    element: HTMLElement
  ): number {
    let maxLength = 2; // Minimum from/to

    propValues.forEach((value) => {
      const resolved = this.resolveAnimationValue(value, index, element);
      if (Array.isArray(resolved)) {
        maxLength = Math.max(maxLength, resolved.length);
      }
    });

    return maxLength;
  }

  /**
   * Check if any property is an array or function (needs keyframe expansion).
   */
  private hasArrayProperties(properties: AnimationProperties): boolean {
    return Object.values(properties).some((value) => {
      if (typeof value === "function") {
        return true;
      }
      return Array.isArray(value);
    });
  }

  /**
   * Resolve simple per-element values (ignores offset/easing).
   */
  private resolvePropertiesForElement(
    properties: AnimationProperties,
    index: number,
    element: HTMLElement
  ): Record<string, number | string> {
    const resolvedProperties: Record<string, number | string> = {};
    Object.entries(properties).forEach(([prop, val]) => {
      if (prop === "offset" || prop === "easing") return;

      const resolved = this.resolveAnimationValue(val, index, element);
      resolvedProperties[prop] = Array.isArray(resolved)
        ? resolved[0]
        : resolved;
    });
    return resolvedProperties;
  }

  /**
   * Resolve a value for an element (number|string|array|function).
   */
  private resolveAnimationValue(
    value: AnimationValue | undefined,
    index: number,
    element: HTMLElement
  ): number | string | (number | string)[] {
    if (value === undefined) return 0;

    if (typeof value === "number" || typeof value === "string") {
      return value;
    }

    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === "function") {
      return value(index, element);
    }

    return 0;
  }

  /**
   * Apply keyframes to one element at the given progress.
   * @param elementIndex Element index.
   * @param progress Normalized progress [0..1].
   */
  private updateElement(elementIndex: number, progress: number): void {
    const propMgr = this.elementManager.getPropertyManager(elementIndex);
    if (!propMgr) return;

    const keyframes = this.resolvedKeyframes.get(elementIndex);
    if (!keyframes) return;

    const animator = new PropertyAnimator(keyframes);
    animator.updateElement(propMgr, progress, this.config.ease);
  }

  /**
   * Count active elements (for diagnostics).
   */
  private getActiveElementCount(): number {
    return this.elementManager.getAllStates().filter((state) => state.isActive)
      .length;
  }
}
