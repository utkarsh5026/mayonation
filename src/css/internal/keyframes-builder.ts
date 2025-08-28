import {
  AnimationProperties,
  CSSAnimationConfig,
  ProcessedKeyframe,
  ApiAnimationValue,
} from "../types";
import {
  AnimationValue,
  ColorValue,
  NumericValue,
  resolveEaseFn,
} from "@/core";
import { PropertyManager } from "@/animations/prop-manager";
import { convertColorValueToCssString } from "@/utils/color";
import { ElementManager } from "./element-manager";
import { throwIf } from "@/utils/error";

type BuilderConfig = Pick<
  Required<CSSAnimationConfig>,
  "from" | "to" | "ease" | "keyframes"
>;

export class KeyframesBuilder {
  private readonly resolvedKeyframes: Map<number, ProcessedKeyframe[]>;

  private config: BuilderConfig;

  constructor(
    private elements: HTMLElement[],
    private elementManager: ElementManager,
    config: BuilderConfig
  ) {
    this.resolvedKeyframes = new Map();
    this.config = config;
  }

  getFinalKeyframes(): Map<number, ProcessedKeyframe[]> {
    return this.resolvedKeyframes;
  }

  /**
   * Precompute per-element keyframes from:
   * - explicit config.keyframes, or
   * - array/function-based props (expanded to keyframes), or
   * - simple from/to objects.
   */
  prepareAllKeyframes(): void {
    const { from, to } = this.config;
    this.elements.forEach((_, index) => {
      const hasArrayProps =
        this.hasArrayProperties(to) || this.hasArrayProperties(from);

      if (hasArrayProps || this.config.keyframes.length > 0) {
        this.prepareKeyframesForArrayValues(index);
        return;
      }

      this.prepareKeyframesFromFromTo(index);
    });
  }

  /**
   * Check if any property value is an array or a function (needs keyframe expansion).
   * @param properties AnimationProperties
   * @returns boolean
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
   * Resolve keyframes for an element when using array/function props
   * or explicit config.keyframes.
   * @param elementIndex Index of the element
   */
  private prepareKeyframesForArrayValues(elementIndex: number) {
    const element = this.elements[elementIndex];
    const keyframes = this.buildKeyframesForElement(elementIndex, element);
    this.resolvedKeyframes.set(elementIndex, keyframes);
  }

  /**
   * Build processed keyframes for an element from:
   * - explicit config.keyframes, or
   * - array/function-based properties (expanded to keyframes).
   * @param index Element index
   * @param element Target element
   * @returns ProcessedKeyframe[]
   */
  private buildKeyframesForElement(
    index: number,
    element: HTMLElement
  ): ProcessedKeyframe[] {
    const { keyframes } = this.config;
    if (keyframes.length > 0) {
      return keyframes.map((kf) => ({
        offset: kf.offset,
        properties: this.resolveElementProperties(kf, index, element),
        easing: resolveEaseFn(kf.ease || this.config.ease),
      }));
    }

    return this.buildKeyframesArray(index, element);
  }

  /**
   * Expand array/function values into an evenly spaced set of keyframes.
   * Offset is distributed as i / (N-1).
   * @param index Element index
   * @param element Target element
   * @returns ProcessedKeyframe[]
   */
  private buildKeyframesArray(
    index: number,
    element: HTMLElement
  ): ProcessedKeyframe[] {
    const allProps = { ...this.config.from, ...this.config.to };
    const maxLength = this.getMaxKeyframeCount(
      Object.values(allProps),
      index,
      element
    );
    const keyframes: ProcessedKeyframe[] = [];

    for (let i = 0; i < maxLength; i++) {
      const offset = i / (maxLength - 1); // 0, 0.5, 1 for 3 keyframes
      const properties: Record<string, any> = {};

      Object.entries(allProps).forEach(([property, value]) => {
        const resolved = this.resolveValue(value, index, element);

        if (Array.isArray(resolved)) {
          properties[property] = resolved[Math.min(i, resolved.length - 1)];
          return;
        }

        if (i === 0 && this.config.from?.[property] !== undefined) {
          properties[property] = this.resolveValue(
            this.config.from[property],
            index,
            element
          );
          return;
        }

        properties[property] = resolved;
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
   * Resolve a value for an element (number | string | array | function).
   * - number/string: returned as-is
   * - array: returned as-is (caller decides how to index)
   * - function: invoked with (index, element)
   * - undefined: returns 0
   * @param value ApiAnimationValue | undefined
   * @param index Element index
   * @param element Target element
   * @returns number | string | (number | string)[]
   */
  private resolveValue(
    value: ApiAnimationValue | undefined,
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
   * Resolve keyframes for simple from/to animations for a specific element.
   * If 'from' is missing for a property, reads the element's current computed style.
   * If 'to' is missing for a property, uses current computed style as the end value.
   * @param elementIndex Index of the element
   */
  private prepareKeyframesFromFromTo(elementIndex: number) {
    const propertyManager = this.getPropMgr(elementIndex);
    const { from, to } = this.config;
    const element = this.elements[elementIndex];
    const allAnimatedProps = new Set([
      ...Object.keys(from),
      ...Object.keys(to),
    ]);

    propertyManager.markDirty();
    const fromProps: Record<string, number | string> = {};
    const toProps: Record<string, number | string> = {};

    allAnimatedProps.forEach((prop) => {
      if (
        prop === "offset" ||
        prop === "easing" ||
        !PropertyManager.isAnimatable(prop)
      )
        return;

      const fromVal = from[prop];
      const toVal = to[prop];

      if (fromVal !== undefined) {
        const resolved = this.resolveValue(fromVal, elementIndex, element);
        fromProps[prop] = Array.isArray(resolved) ? resolved[0] : resolved;
      } else if (toVal !== undefined) {
        const currentVal = propertyManager.getRecommendedFromValue(prop);
        fromProps[prop] = this.serializeAnimationValue(currentVal);
      }

      if (toVal !== undefined) {
        const resolved = this.resolveValue(toVal, elementIndex, element);
        toProps[prop] = Array.isArray(resolved) ? resolved[0] : resolved;
      }
    });

    const easing = resolveEaseFn(this.config.ease);
    const keyframes = [
      {
        offset: 0,
        properties: fromProps,
        easing,
      },
      {
        offset: 1,
        properties: toProps,
        easing,
      },
    ];

    this.resolvedKeyframes.set(elementIndex, keyframes);
  }

  private serializeAnimationValue(animValue: AnimationValue): number | string {
    if (animValue.type === "numeric") {
      const numVal = animValue as NumericValue;
      return numVal.unit ? `${numVal.value}${numVal.unit}` : numVal.value;
    }

    if (animValue.type === "color") {
      const colorVal = animValue as ColorValue;
      return convertColorValueToCssString(colorVal.value);
    }

    return 0;
  }

  private getPropMgr(elementIndex: number) {
    const propertyManager =
      this.elementManager.getPropertyManager(elementIndex);

    throwIf(
      !propertyManager,
      `No PropertyManager found for element ${elementIndex}`
    );

    return propertyManager!;
  }

  /**
   * Resolve simple per-element values (ignores offset/easing keys).
   * Expands function or array values to a concrete value for the given element index.
   * @param properties AnimationProperties
   * @param index Element index
   * @param element Target element
   * @returns A flat map of property -> value
   */
  private resolveElementProperties(
    properties: AnimationProperties,
    index: number,
    element: HTMLElement
  ): Record<string, number | string> {
    const resolvedProperties: Record<string, number | string> = {};
    Object.entries(properties).forEach(([prop, val]) => {
      if (prop === "offset" || prop === "easing") return;

      const resolved = this.resolveValue(val, index, element);
      resolvedProperties[prop] = Array.isArray(resolved)
        ? resolved[0]
        : resolved;
    });
    return resolvedProperties;
  }

  /**
   * Determine required keyframe count by the longest array value (min 2).
   */
  private getMaxKeyframeCount(
    propValues: (ApiAnimationValue | undefined)[],
    index: number,
    element: HTMLElement
  ): number {
    let maxLength = 2; // Minimum from/to

    propValues.forEach((value) => {
      const resolved = this.resolveValue(value, index, element);
      if (Array.isArray(resolved)) {
        maxLength = Math.max(maxLength, resolved.length);
      }
    });

    return maxLength;
  }
}
