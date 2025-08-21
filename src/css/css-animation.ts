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
import { resolveEaseFn } from "@/core/ease_fns";

export class CSSAnimator {
  private readonly config: Required<CSSAnimationConfig>;

  private readonly elementManager: ElementManager;
  private readonly propertyAnimator: PropertyAnimator;
  private readonly staggerManager: StaggerManager;

  private readonly elements: HTMLElement[];
  private readonly resolvedKeyframes: Map<number, ProcessedKeyframe[]>;

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

    this.propertyAnimator = new PropertyAnimator();
  }

  public update(globalProgress: number): void {
    const elapsed = globalProgress * this.totalDuration;

    for (let i = 0; i < this.elements.length; i++) {
      const elementProgress = this.staggerManager.calculateElementProgress(
        i,
        elapsed,
        this.config.duration
      );

      const { progress, isActive, isComplete } = elementProgress;
      this.elementManager.updateElement(i, progress, isActive, isComplete);

      if (isActive || isComplete) {
        this.updateElement(i, progress);
      }
    }

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

  public get totalDuration(): number {
    return this.staggerManager.getTotalDuration();
  }

  public get baseDuration(): number {
    return this.config.duration;
  }
  public get delay(): number {
    return this.config.delay;
  }
  public get elementCount(): number {
    return this.elements.length;
  }

  public start(): void {
    this.config.onStart();
  }

  public complete(): void {
    this.update(1);
    this.config.onComplete();
  }

  /**
   * Resolves target elements from various input types (selector, element, array).
   * Filters results to ensure only HTMLElements are included.
   */
  private resolveElements(target: ElementLike): HTMLElement[] {
    try {
      const elements = ElementResolver.resolve(target).filter(
        (el): el is HTMLElement => el instanceof HTMLElement
      );

      throwIf(
        elements.length === 0,
        "Target must resolve to at least one HTMLElement"
      );

      return elements;
    } catch (error) {
      throw new Error(`Failed to resolve target: ${error}`);
    }
  }

  /**
   * Resolve properties and convert arrays to proper keyframes
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
   * ✅ CORRECT: Build keyframes from array properties
   */
  private buildKeyframesForElement(
    index: number,
    element: HTMLElement
  ): ProcessedKeyframe[] {
    const { keyframes } = this.config;
    if (keyframes.length > 0) {
      return keyframes.map((kf) => ({
        offset: kf.offset,
        properties: this.resolvePropertiesForElement(kf, index, element),
        easing: resolveEaseFn(kf.ease || this.config.ease),
      }));
    }

    return this.buildKeyframesFromArrayProperties(index, element);
  }

  /**
   * ✅ CORRECT: Convert array properties to keyframes
   */
  private buildKeyframesFromArrayProperties(
    index: number,
    element: HTMLElement
  ): ProcessedKeyframe[] {
    const allProperties = { ...this.config.from, ...this.config.to };

    let maxLength = 2; // Minimum from/to
    Object.values(allProperties).forEach((value) => {
      const resolved = this.resolveAnimationValue(value, index, element);
      if (Array.isArray(resolved)) {
        maxLength = Math.max(maxLength, resolved.length);
      }
    });

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
   * Check if properties contain arrays (keyframes)
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
   * Resolve simple properties (non-array values)
   */
  private resolvePropertiesForElement(
    properties: AnimationProperties,
    index: number,
    element: HTMLElement
  ): Record<string, number | string> {
    const resolved: Record<string, number | string> = {};
    Object.entries(properties).forEach(([property, value]) => {
      if (property === "offset" || property === "easing") return;

      const resolvedValue = this.resolveAnimationValue(value, index, element);
      resolved[property] = Array.isArray(resolvedValue)
        ? resolvedValue[0]
        : resolvedValue;
    });
    return resolved;
  }

  /**
   * Resolve animation value (including array keyframes)
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
   * Update element with resolved keyframes
   */
  private updateElement(elementIndex: number, progress: number): void {
    const propertyManager =
      this.elementManager.getPropertyManager(elementIndex);
    if (!propertyManager) return;

    const keyframes = this.resolvedKeyframes.get(elementIndex);
    if (!keyframes) return;

    const elementPropertyAnimator = new PropertyAnimator(keyframes);
    elementPropertyAnimator.updateElement(
      propertyManager,
      progress,
      this.config.ease
    );
  }

  private getActiveElementCount(): number {
    return this.elementManager.getAllStates().filter((state) => state.isActive)
      .length;
  }
}
