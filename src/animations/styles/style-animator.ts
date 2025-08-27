import { CSSHandlerOptions, PropertyCache, CSSPropertyName } from "./type";
import {
  AnimationValue,
  ColorValue,
  NumericValue,
  isColorValue,
  isNumericValue,
  RGB,
  HSL,
  createValue,
} from "@/core/animation-val";
import { throwIf, safeOperation } from "@/utils/error";
import { rgb, hsl, linear } from "@/utils/interpolators";
import { camelToDash } from "@/utils/string";
import { StyleParser } from "./style-parser";
import { convertColorValueToCssString } from "@/utils/color";
import { COLOR_PROPERTIES, EXTENDED_ANIMATABLE_PROPERTIES } from "./prop-names";
import { clampProgress } from "@/utils/progress";

/**
 * StyleAnimator
 *
 * High-level CSS property animation handler focused on:
 * - Parsing CSS values into normalized AnimationValue objects
 * - Interpolating numeric and color values with consistent semantics
 * - Batching and applying DOM style writes efficiently
 * - Caching current values to minimize reads and re-parsing
 */
export class StyleAnimator {
  private readonly targetElement: HTMLElement;
  private readonly elementComputedStyles: CSSStyleDeclaration;

  private readonly propertyCache: Map<string, PropertyCache> = new Map();
  private readonly config: Required<CSSHandlerOptions>;
  private batchedUpdates: Map<string, string> = new Map();
  private updateScheduled: boolean = false;
  private parser: StyleParser;

  /**
   * Creates a new StyleAnimator for a target element.
   *
   * @param targetElement Element whose styles will be read/animated.
   * @param options Optional handler configuration:
   *  - colorSpace: 'rgb' | 'hsl' (default: 'rgb')
   *  - precision: number of digits used when serializing numeric CSS (default: 3)
   *  - useGPUAcceleration: hint for GPU-friendly behavior (delegated; default: true)
   */
  constructor(targetElement: HTMLElement, options: CSSHandlerOptions = {}) {
    this.targetElement = targetElement;
    this.elementComputedStyles = safeOperation(
      () => window.getComputedStyle(targetElement),
      "Failed to get computed styles:",
      {
        getPropertyValue: () => "",
        fontSize: "16px",
      } as any
    );
    this.config = {
      colorSpace: options.colorSpace ?? "rgb",
      precision: options.precision ?? 3,
      useGPUAcceleration: options.useGPUAcceleration ?? true,
    };
    this.parser = new StyleParser(this.config.colorSpace);
  }

  /**
   * Interpolates between two CSS AnimationValues for a property.
   *
   * - Colors: interpolated in the configured color space ('rgb' or 'hsl').
   * - Numbers: interpolated linearly; rounding applied only when serializing to CSS.
   * - Progress is clamped to [0, 1].
   */
  interpolate(
    property: CSSPropertyName,
    from: AnimationValue,
    to: AnimationValue,
    progress: number
  ): AnimationValue {
    const clampedProgress = clampProgress(progress);

    throwIf(
      from.type !== to.type,
      `Cannot interpolate between different value types for ${property}`
    );

    return safeOperation(
      () => {
        if (isColorValue(from) && isColorValue(to)) {
          return this.interpolateColor(from, to, clampedProgress);
        }

        if (isNumericValue(from) && isNumericValue(to)) {
          return this.interpolateNumeric(from, to, clampedProgress);
        }

        throw new Error(`Unsupported value type for property: ${property}`);
      },
      `Interpolation failed for ${property}:`,
      clampedProgress < 0.5 ? from : to
    );
  }

  markPropertyDirty(property: CSSPropertyName): void {
    const state = this.propertyCache.get(property);
    if (state) {
      state.isDirty = true;
    }
  }

  /**
   * Returns the current computed AnimationValue for a CSS property.
   *
   * - Uses a cache to avoid repeated parsing.
   * - Falls back to defaults when computed is empty/auto/none.
   */
  currentValue(prop: CSSPropertyName): AnimationValue {
    const cached = this.propertyCache.get(prop);

    const orignal = cached?.originalValue;
    if (cached && !cached.isDirty) {
      return cached.currentValue;
    }

    const computedValue = this.readCurrentValueFromDOM(prop);

    if (!cached) {
      this.propertyCache.set(prop, {
        originalValue: orignal || this.getRawComputedVal(prop),
        currentValue: computedValue,
        isDirty: false,
      });
      return computedValue;
    }
    cached.currentValue = computedValue;
    cached.isDirty = false;
    return computedValue;
  }

  getRecommendedFromValue(property: CSSPropertyName): AnimationValue {
    this.markPropertyDirty(property);
    return this.currentValue(property);
  }

  markAllDirty(): void {
    this.propertyCache.forEach((state) => {
      state.isDirty = true;
    });
  }

  /**
   * Parses a CSS string into a normalized AnimationValue for a property.
   */
  parse(cssProperty: CSSPropertyName, cssValue: string): AnimationValue {
    if (!this.isValidProperty(cssProperty)) {
      throw new Error(`Unsupported CSS property: ${cssProperty}`);
    }

    return this.parser.parsePropertyValue(cssProperty, cssValue);
  }

  /**
   * Queues a new animated value for a CSS property and schedules a batched DOM write.
   *
   * - Converts the AnimationValue to a CSS string (with precision rounding for numbers).
   * - Updates internal cache to reflect the new value.
   * - Defers DOM writes to the next animation frame for performance.
   */
  applyAnimatedPropertyValue(prop: CSSPropertyName, val: AnimationValue): void {
    const cssVal = this.convertAnimationValueToCssString(prop, val);
    const dashedProperty = camelToDash(prop);
    this.batchedUpdates.set(dashedProperty, cssVal);

    const cached = this.getCached(prop);
    if (cached) {
      cached.currentValue = val;
      cached.isDirty = false;
    }

    this.scheduleBatchedUpdate();
  }

  /**
   * Schedule a requestAnimationFrame to flush pending style updates.
   * Includes a setTimeout fallback for environments without rAF.
   * @internal
   */
  private scheduleBatchedUpdate(): void {
    if (this.updateScheduled) return;

    this.updateScheduled = true;

    // Use requestAnimationFrame with fallback for environments without it
    const raf =
      typeof requestAnimationFrame !== "undefined"
        ? requestAnimationFrame
        : (callback: FrameRequestCallback) => {
            const id = setTimeout(() => callback(performance.now()), 0);
            return id;
          };

    raf(() => {
      this.flushBatchedUpdates();
      this.updateScheduled = false;
    });
  }

  /**
   * Flushes all queued style updates in one batch write to the DOM.
   * Resets the pending updates queue after application.
   * Robust to individual property set failures.
   * @internal
   */
  private flushBatchedUpdates(): void {
    this.batchedUpdates.forEach((value, property) => {
      safeOperation(
        () => this.targetElement.style.setProperty(property, value),
        `Failed to set ${property} to ${value}:`
      );
    });
    this.batchedUpdates.clear();
  }

  /**
   * Resets internal caches and restores original computed property values.
   *
   * - Clears pending batched updates without applying them.
   * - Restores each cached property's originalValue to the element.
   * - Clears the property cache.
   *
   * Safe to call between animations to reset the element to its initial state.
   */
  reset(): void {
    this.batchedUpdates.clear();

    this.propertyCache.forEach((cache, prop) => {
      safeOperation(
        () => this.setTargetProp(prop, cache.originalValue),
        `Failed to restore ${prop}`
      );
    });

    this.propertyCache.clear();
  }

  /**
   * Returns true if the given property is supported for animation by this handler.
   */
  static isAnimatableProperty(property: string): boolean {
    return (
      EXTENDED_ANIMATABLE_PROPERTIES.has(property) ||
      COLOR_PROPERTIES.has(property)
    );
  }

  /**
   * Interpolates between two colors in the configured color space.
   * @internal
   */
  private interpolateColor(
    from: ColorValue,
    to: ColorValue,
    progress: number
  ): ColorValue {
    const { value: fromColor } = this.normalizeColorSpace(from);
    const { value: toColor } = this.normalizeColorSpace(to);

    const { colorSpace } = this.config;

    if (colorSpace === "rgb") {
      const { r, g, b, a } = rgb.interpolate(
        fromColor as RGB,
        toColor as RGB,
        progress
      );
      return createValue.rgb(r, g, b, a);
    }

    if (colorSpace === "hsl") {
      const { h, s, l, a } = hsl.interpolate(
        fromColor as HSL,
        toColor as HSL,
        progress
      );
      return createValue.hsl(h, s, l, a);
    }

    throw new Error(`Unsupported color space: ${this.config.colorSpace}`);
  }

  /**
   * Linearly interpolates two numeric values.
   * Precision rounding is deferred until CSS string conversion.
   * @internal
   */
  private interpolateNumeric(
    from: NumericValue,
    to: NumericValue,
    progress: number
  ): NumericValue {
    const value = linear.interpolate(from.value, to.value, progress);
    // Don't apply precision rounding here - only when converting to CSS string
    return createValue.numeric(value, from.unit);
  }

  /**
   * Rounds a number to the configured precision while preserving extreme/sentinel values.
   * @internal
   */
  private roundToPrecision(value: number): number {
    if (
      !Number.isFinite(value) ||
      Math.abs(value) < Number.MIN_VALUE * 10 ||
      Math.abs(value) > Number.MAX_SAFE_INTEGER
    ) {
      return value;
    }

    const factor = Math.pow(10, this.config.precision);
    const rounded = Math.round(value * factor) / factor;

    if (rounded === 0 && value !== 0) {
      return value;
    }

    return rounded;
  }

  /**
   * Converts a color value to the configured color space if needed.
   * Currently returns the input as-is; hook for future conversion.
   * @internal
   */
  private normalizeColorSpace(colorValue: ColorValue): ColorValue {
    if (colorValue.space === this.config.colorSpace) {
      return colorValue;
    }

    // TODO: Convert between color spaces if needed
    return colorValue;
  }

  /**
   * Resolves a property's computed CSS value with sensible fallbacks.
   * - Replaces empty/auto/none values with defaults for interpolation.
   * @internal
   */
  private readCurrentValueFromDOM(property: CSSPropertyName): AnimationValue {
    let value = this.getRawComputedVal(property);

    if (!value || value === "auto" || value === "none") {
      value = this.getDefaultPropertyValue(property);
    }

    return this.parser.parsePropertyValue(property, value);
  }

  /**
   * Reads the computed style value for a property in dashed form.
   * Errors are caught and return empty string.
   * @internal
   */
  private getRawComputedVal(property: CSSPropertyName): string {
    return safeOperation(
      () => this.elementComputedStyles.getPropertyValue(camelToDash(property)),
      `Failed to get computed value for ${property}:`,
      "" // Fallback to empty string if getPropertyValue fails
    );
  }

  /**
   * Default values used when computed styles are empty/auto/none.
   * @internal
   */
  private getDefaultPropertyValue(property: CSSPropertyName): string {
    const defaults: Record<string, string> = {
      opacity: "1",
      width: "0px",
      height: "0px",
      backgroundColor: "transparent",
      color: "rgb(0, 0, 0)",
      borderWidth: "0px",
      borderRadius: "0px",
      fontSize: "16px",
      lineHeight: "normal",
      margin: "0px",
      padding: "0px",
    };

    return defaults[property] || "0";
  }

  /**
   * Writes a CSS property (in dashed form) to the target element's inline styles.
   * @internal
   */
  private setTargetProp(prop: string, val: string) {
    const dashedProperty = camelToDash(prop);
    this.targetElement.style.setProperty(dashedProperty, val);
  }

  /**
   * Converts an AnimationValue to a CSS string suitable for inline styles.
   * - Colors: serialized to CSS color strings.
   * - Numbers: rounded to configured precision and suffixed with unit.
   * @internal
   */
  private convertAnimationValueToCssString(
    cssProperty: CSSPropertyName,
    animatedValue: AnimationValue
  ): string {
    if (isColorValue(animatedValue)) {
      return convertColorValueToCssString(animatedValue.value);
    }

    if (isNumericValue(animatedValue)) {
      const value = this.roundToPrecision(animatedValue.value);
      return `${value}${animatedValue.unit}`;
    }

    throw new Error(`Unsupported value type for ${cssProperty}`);
  }

  /**
   * Returns the cached state for a property, if any.
   * @internal
   */
  private getCached(property: CSSPropertyName) {
    const cached = this.propertyCache.get(property);
    return cached;
  }

  /**
   * Returns true if the property is recognized as animatable (numeric or color).
   * @internal
   */
  private isValidProperty(property: string): property is CSSPropertyName {
    return (
      EXTENDED_ANIMATABLE_PROPERTIES.has(property) ||
      COLOR_PROPERTIES.has(property)
    );
  }
}
