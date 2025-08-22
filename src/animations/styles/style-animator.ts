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

/**
 * CSS property animation handler with comprehensive support
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

  constructor(targetElement: HTMLElement, options: CSSHandlerOptions = {}) {
    this.targetElement = targetElement;
    this.elementComputedStyles = window.getComputedStyle(targetElement);
    this.config = {
      colorSpace: options.colorSpace ?? "hsl",
      precision: options.precision ?? 3,
      useGPUAcceleration: options.useGPUAcceleration ?? true,
    };
    this.parser = new StyleParser(this.config.colorSpace);
    this.conversionContext = this.createConversionContext();
  }

  /**
   * Enhanced interpolation with support for complex values
   */
  interpolate(
    property: CSSPropertyName,
    from: AnimationValue,
    to: AnimationValue,
    progress: number
  ): AnimationValue {
    throwIf(
      progress < 0 || progress > 1,
      `Invalid progress value: ${progress}. Must be between 0 and 1.`
    );

    throwIf(
      from.type !== to.type,
      `Cannot interpolate between different value types for ${property}`
    );

    return safeOperation(
      () => {
        if (isColorValue(from) && isColorValue(to)) {
          return this.interpolateColor(from, to, progress);
        }

        if (isNumericValue(from) && isNumericValue(to)) {
          return this.interpolateNumeric(from, to, progress);
        }

        throw new Error(`Unsupported value type for property: ${property}`);
      },
      `Interpolation failed for ${property}:`,
      progress < 0.5 ? from : to
    );
  }

  /**
   * Enhanced property value getter with caching
   */
  getCurrentAnimatedValue(cssProperty: CSSPropertyName): AnimationValue {
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
   * Enhanced property value parsing with better error handling
   */
  parseCSSValueToAnimationValue(
    cssProperty: CSSPropertyName,
    cssValue: string
  ): AnimationValue {
    if (!this.isValidProperty(cssProperty)) {
      throw new Error(`Unsupported CSS property: ${cssProperty}`);
    }

    return this.parser.parsePropertyValue(cssProperty, cssValue);
  }

  /**
   * Enhanced property application with batching
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

  private scheduleBatchedUpdate(): void {
    if (this.updateScheduled) return;

    this.updateScheduled = true;
    requestAnimationFrame(() => {
      this.flushBatchedUpdates();
      this.updateScheduled = false;
    });
  }

  /**
   * Apply all batched updates at once
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
   * Enhanced reset with proper cleanup
   */
  restoreOriginalPropertyValues(): void {
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
   * Enhanced color interpolation with better handling
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
   * Enhanced numeric interpolation
   */
  private interpolateNumeric(
    from: NumericValue,
    to: NumericValue,
    progress: number
  ): NumericValue {
    const value = linear.interpolate(from.value, to.value, progress);
    const roundedValue = this.roundToPrecision(value);
    return createValue.numeric(roundedValue, from.unit);
  }

  /**
   * Round value to specified precision
   */
  private roundToPrecision(value: number): number {
    const factor = Math.pow(10, this.config.precision);
    return Math.round(value * factor) / factor;
  }

  /**
   * Normalize color to target color space
   */
  private normalizeColorSpace(colorValue: ColorValue): ColorValue {
    if (colorValue.space === this.config.colorSpace) {
      return colorValue;
    }

    // TODO: We will Convert between color spaces if needed
    return colorValue;
  }

  /**
   * Get computed property value with fallbacks
   */
  private getComputedPropertyValue(property: CSSPropertyName): string {
    let value = this.getComputedVal(property);

    if (!value || value === "auto" || value === "none") {
      value = this.getDefaultPropertyValue(property);
    }

    return value;
  }

  private getComputedVal(property: CSSPropertyName): string {
    return this.elementComputedStyles.getPropertyValue(camelToDash(property));
  }

  /**
   * Get default values for properties
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
   * Create conversion context for unit calculations
   */
  private createConversionContext(): ConversionContext {
    const parentElement = this.targetElement.parentElement;
    const parentRect = parentElement?.getBoundingClientRect() ?? {
      width: 0,
      height: 0,
    };

    return {
      parentSize: {
        width: parentRect.width,
        height: parentRect.height,
      },
      fontSize: parseFloat(this.elementComputedStyles.fontSize) || 16,
      viewportSize: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    };
  }

  private setTargetProp(prop: string, val: string) {
    const dashedProperty = camelToDash(prop);
    this.targetElement.style.setProperty(dashedProperty, val);
  }

  /**
   * Enhanced value to CSS string conversion
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

  private getCached(property: CSSPropertyName) {
    const cached = this.propertyCache.get(property);
    return cached;
  }

  /**
   * Check if property is valid and animatable
   */
  private isValidProperty(property: string): property is CSSPropertyName {
    return (
      EXTENDED_ANIMATABLE_PROPERTIES.has(property) ||
      COLOR_PROPERTIES.has(property)
    );
  }
}
