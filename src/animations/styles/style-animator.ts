import { CSSHandlerOptions, PropertyCache, CSSPropertyName } from "./type";
import { ConversionContext } from "@/utils/unit";
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
 *
 * Typical usage:
 * @example
 * ```ts
 * const el = document.querySelector<HTMLElement>('#box')!;
 * const styles = new StyleAnimator(el, {
 *   colorSpace: 'rgb',       // default
 *   precision: 3,            // default
 *   useGPUAcceleration: true // default (delegated where relevant)
 * });
 *
 * // Parse start/end values
 * const from = styles.parse('opacity', '0');     // => { type: 'numeric', value: 0, unit: '' }
 * const to   = styles.parse('opacity', '1');     // => { type: 'numeric', value: 1, unit: '' }
 *
 * // Interpolate and apply
 * const mid = styles.interpolate('opacity', from, to, 0.5);
 * styles.applyAnimatedPropertyValue('opacity', mid); // batched and flushed on next rAF
 * ```
 *
 * Notes:
 * - Batching: applyAnimatedPropertyValue stores pending style changes and flushes them on the next frame.
 * - Precision: numeric values are rounded when converted to CSS strings, not during interpolation.
 * - Color space: interpolation occurs in the configured color space ('rgb' or 'hsl'); default is 'rgb'.
 */
export class StyleAnimator {
  private readonly targetElement: HTMLElement;
  private readonly elementComputedStyles: CSSStyleDeclaration;

  private readonly propertyCache: Map<string, PropertyCache> = new Map();
  private readonly config: Required<CSSHandlerOptions>;
  private readonly conversionContext: ConversionContext;
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
   *
   * Behavior:
   * - Reads computed styles with safe fallbacks.
   * - Initializes a parser with the desired color space.
   * - Creates a unit conversion context from the element, its parent, and viewport.
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
    this.conversionContext = this.createConversionContext();
  }

  /**
   * Interpolates between two CSS AnimationValues for a property.
   *
   * - Colors: interpolated in the configured color space ('rgb' or 'hsl').
   * - Numbers: interpolated linearly; rounding applied only when serializing to CSS.
   * - Progress is clamped to [0, 1].
   *
   * @param property CSS property name.
   * @param from Start value (must be same type as `to`).
   * @param to End value (must be same type as `from`).
   * @param progress Number in [0, 1].
   * @returns Interpolated AnimationValue.
   *
   * @throws If types differ or value types are unsupported for the property.
   *
   * Fallback: on internal error, returns `from` when progress < 0.5, else `to`.
   *
   * @example
   * ```ts
   * const from = styles.parse('backgroundColor', 'rgb(255 0 0)')!;
   * const to = styles.parse('backgroundColor', '#00f')!;
   * const mid = styles.interpolate('backgroundColor', from, to, 0.5);
   * ```
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

  /**
   * Returns the current computed AnimationValue for a CSS property.
   *
   * - Uses a cache to avoid repeated parsing.
   * - Falls back to defaults when computed is empty/auto/none.
   *
   * @param cssProperty CSS property name.
   * @returns Parsed AnimationValue in normalized form.
   *
   * @example
   * ```ts
   * const current = styles.currentValue('opacity'); // => { type: 'numeric', value: 1, unit: '' }
   * ```
   */
  currentValue(cssProperty: CSSPropertyName): AnimationValue {
    const cacheKey = cssProperty;
    const cached = this.propertyCache.get(cacheKey);

    if (cached && !cached.isDirty) {
      return cached.currentValue;
    }

    const computedValue = this.getComputedPropertyValue(cssProperty);
    const parsedValue = this.parser.parsePropertyValue(
      cssProperty,
      computedValue
    );

    if (!cached) {
      this.propertyCache.set(cacheKey, {
        originalValue: computedValue,
        currentValue: parsedValue,
        isDirty: false,
      });
      return parsedValue;
    }
    cached.currentValue = parsedValue;
    cached.isDirty = false;
    return parsedValue;
  }

  /**
   * Parses a CSS string into a normalized AnimationValue for a property.
   *
   * @param cssProperty CSS property name.
   * @param cssValue Raw CSS string (e.g., '16px', '50%', '#09f', 'hsl(0 100% 50%)').
   * @returns Parsed AnimationValue.
   *
   * @throws If the property is not supported/animatable or parsing fails.
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
   *
   * @param prop CSS property to update.
   * @param val Normalized AnimationValue to apply.
   *
   * @example
   * ```ts
   * const v = styles.parse('opacity', '0.25')!;
   * styles.applyAnimatedPropertyValue('opacity', v); // flushed on next rAF
   * ```
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
  private getComputedPropertyValue(property: CSSPropertyName): string {
    let value = this.getComputedVal(property);

    if (!value || value === "auto" || value === "none") {
      value = this.getDefaultPropertyValue(property);
    }

    return value;
  }

  /**
   * Reads the computed style value for a property in dashed form.
   * Errors are caught and return empty string.
   * @internal
   */
  private getComputedVal(property: CSSPropertyName): string {
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
   * Builds a conversion context for units based on:
   * - Parent element bounding rect
   * - Element font size
   * - Viewport size
   * @internal
   */
  private createConversionContext(): ConversionContext {
    const parentElement = this.targetElement.parentElement;
    const parentRect = safeOperation(
      () => parentElement?.getBoundingClientRect() ?? { width: 0, height: 0 },
      "Failed to get parent bounding rect:",
      { width: 0, height: 0 }
    );

    const fontSize = safeOperation(
      () => parseFloat(this.elementComputedStyles.fontSize) || 16,
      "Failed to get font size:",
      16
    );

    const viewportSize = safeOperation(
      () => ({ width: window.innerWidth, height: window.innerHeight }),
      "Failed to get viewport size:",
      { width: 1024, height: 768 }
    );

    return {
      parentSize: {
        width: parentRect.width,
        height: parentRect.height,
      },
      fontSize,
      viewportSize,
    };
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
