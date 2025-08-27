import type { AnimationProperties, ProcessedKeyframe } from "../types";
import { EaseFunction, resolveEaseFn } from "@/core/ease-fns";
import { AnimatableProperty, PropertyManager } from "@/animations/prop-manager";
import { AnimationValue } from "@/core";

interface KeyframeSegment {
  fromFrame: ProcessedKeyframe | null;
  toFrame: ProcessedKeyframe | null;
  localProgress: number;
}

/**
 * Handles property interpolation and updates for elements
 * Responsibility: Property animation, keyframe interpolation, easing application
 */
export class PropertyAnimator {
  private processedKeyframes: ProcessedKeyframe[] = [];

  constructor(keyframes?: ProcessedKeyframe[]) {
    this.processedKeyframes = keyframes || [];
  }

  /**
   * Update element properties based on progress
   */
  updateElement(
    propertyManager: PropertyManager,
    progress: number,
    easing?: EaseFunction
  ): void {
    const easedProgress = this.applyEasing(progress, easing);

    if (this.processedKeyframes.length > 0) {
      this.updateFromKeyframes(propertyManager, easedProgress);
    }
  }

  /**
   * Update element using keyframes
   */
  private updateFromKeyframes(
    propertyManager: PropertyManager,
    progress: number
  ): void {
    const { fromFrame, toFrame, localProgress } =
      this.findKeyframeSegment(progress);

    if (!fromFrame || !toFrame) return;

    const easedProgress = this.applyEasing(localProgress, fromFrame.easing);

    this.interpolateAndApply(
      propertyManager,
      fromFrame.properties,
      toFrame.properties,
      easedProgress
    );
  }

  /**
   * Find the keyframe segment for current progress
   */
  private findKeyframeSegment(progress: number): KeyframeSegment {
    if (this.processedKeyframes.length < 2) {
      return { fromFrame: null, toFrame: null, localProgress: 0 };
    }

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

    const localProgress =
      fromFrame.offset === toFrame.offset
        ? 0
        : (progress - fromFrame.offset) / (toFrame.offset - fromFrame.offset);

    return { fromFrame, toFrame, localProgress };
  }

  /**
   * Apply easing function to progress
   */
  private applyEasing(progress: number, easing?: EaseFunction): number {
    if (!easing) return progress;
    const easingFn = resolveEaseFn(easing);
    return easingFn(progress);
  }

  /**
   * Interpolate between properties and apply to element
   */
  private interpolateAndApply(
    propertyManager: PropertyManager,
    fromProps: AnimationProperties,
    toProps: AnimationProperties,
    progress: number
  ): void {
    const allProps = new Set([
      ...Object.keys(fromProps),
      ...Object.keys(toProps),
    ]);

    allProps.forEach((prop) => {
      if (!PropertyManager.isAnimatable(prop)) return;

      try {
        const fromValue = fromProps[prop];
        const toValue = toProps[prop];

        const actualFromValue =
          fromValue !== undefined
            ? fromValue
            : propertyManager.getCurrentValue(prop);

        if (toValue === undefined) return;
        this.updateProperty(
          propertyManager,
          prop,
          actualFromValue as any,
          toValue as any,
          progress
        );
      } catch (error) {
        console.error(`Error animating property "${prop}":`, error);
      }
    });

    propertyManager.applyUpdates();
  }

  private updateProperty(
    propertyManager: PropertyManager,
    prop: AnimatableProperty,
    fromValue: AnimationValue,
    toValue: AnimationValue,
    progress: number
  ): void {
    let fromParsed: any;
    let toParsed: any;

    if (fromValue && typeof fromValue === "object" && fromValue.type) {
      fromParsed = fromValue;
    } else {
      fromParsed = propertyManager.parse(prop as AnimatableProperty, fromValue);
    }

    if (toValue && typeof toValue === "object" && toValue.type) {
      toParsed = toValue;
    } else {
      toParsed = propertyManager.parse(prop as AnimatableProperty, toValue);
    }

    if (fromParsed && toParsed) {
      const interpolated = propertyManager.interpolate(
        prop as AnimatableProperty,
        fromParsed,
        toParsed,
        progress
      );

      console.log(
        "Resolved ",
        prop,
        fromParsed,
        toParsed,
        interpolated,
        progress
      );
      propertyManager.updateProperty(prop as AnimatableProperty, interpolated);
    }
  }
}
