import {
  isNumericValue,
  NumericValue,
  type AnimationValue,
  type ColorSpace,
  isRGBColor,
  isHSLColor,
} from "@/core/animation-val";
import { StyleAnimator, CSSPropertyName } from "./styles";
import { TransformHandler, TransformPropertyName } from "./transform";
import { safeOperation, throwIf } from "@/utils/error";

interface PropertyState {
  isDirty: boolean;
  lastValue: AnimationValue;
  hasTransformChanges: boolean;
}

interface PropertyManagerOptions {
  colorSpace?: ColorSpace;
  batchUpdates?: boolean;
  precision?: number;
  useGPUAcceleration?: boolean;
}

/**
 * A property that can be animated like a transform or a CSS property.
 */
export type AnimatableProperty = TransformPropertyName | CSSPropertyName;

/**
 * PropManager serves as a unified interface for handling both transform and CSS properties
 * during animations. It coordinates between TransformHandler and CSSHandler while providing
 * a simpler API for the animation system.
 */
export class PropertyManager {
  private readonly transformHandler: TransformHandler;
  private readonly styleAnimator: StyleAnimator;
  private readonly propertyStates: Map<AnimatableProperty, PropertyState> =
    new Map();
  private readonly pendingTransformUpdates: Map<
    TransformPropertyName,
    NumericValue
  > = new Map();
  private readonly pendingCSSUpdates: Map<CSSPropertyName, AnimationValue> =
    new Map();

  private readonly options: Required<PropertyManagerOptions>;
  private updateScheduled: boolean = false;
  private isDisposed: boolean = false;

  constructor(
    private readonly element: HTMLElement,
    options: PropertyManagerOptions = {}
  ) {
    this.options = {
      colorSpace: options.colorSpace ?? "hsl",
      batchUpdates: options.batchUpdates ?? true,
      precision: options.precision ?? 3,
      useGPUAcceleration: options.useGPUAcceleration ?? true,
    };

    this.transformHandler = new TransformHandler(element);
    this.styleAnimator = new StyleAnimator(element, {
      ...this.options,
    });
  }

  /**
   * Enhanced value parsing with better error handling
   */
  parse(
    property: AnimatableProperty,
    value: string | number
  ): AnimationValue | null {
    this.validateProperty(property);

    return safeOperation(
      () => {
        if (this.isCSSProperty(property)) {
          return this.styleAnimator.parse(property, value.toString());
        }

        if (this.isTransformProperty(property)) {
          return this.transformHandler.parse(property, value);
        }

        return null;
      },
      `Failed to parse value for ${property}:`,
      null
    );
  }

  /**
   * Enhanced reset with proper cleanup
   */
  reset(): void {
    safeOperation(() => {
      this.pendingTransformUpdates.clear();
      this.pendingCSSUpdates.clear();
      this.updateScheduled = false;
      this.transformHandler.reset();
      this.styleAnimator.reset();
      this.propertyStates.clear();
    }, "Error during reset");
  }

  /**
   * Enhanced interpolation with better error handling and validation
   */
  interpolate(
    property: AnimatableProperty,
    from: AnimationValue,
    to: AnimationValue,
    progress: number
  ): AnimationValue {
    this.validateProperty(property);
    this.validateProgress(progress);
    this.validateValueTypes(from, to, property);

    return safeOperation(
      () => {
        if (this.isTransformProperty(property)) {
          throwIf(
            !isNumericValue(from) || !isNumericValue(to),
            `Transform properties require numeric values: ${property}`
          );

          return this.transformHandler.interpolate(
            property,
            from as NumericValue,
            to as NumericValue,
            progress
          );
        }

        if (this.isCSSProperty(property)) {
          return this.styleAnimator.interpolate(property, from, to, progress);
        }

        throw new Error(`Unsupported property type: ${property}`);
      },
      `Interpolation failed for ${property}:`,
      progress < 0.5 ? from : to
    );
  }

  /**
   * Enhanced property value getter with validation and caching
   */
  getCurrentValue(prop: AnimatableProperty): AnimationValue {
    this.validateProperty(prop);
    const state = this.propertyStates.get(prop);
    if (state && !state.isDirty) {
      return state.lastValue;
    }

    try {
      const value = this.getValFromHandlers(prop);
      this.propertyStates.set(prop, {
        isDirty: false,
        lastValue: value,
        hasTransformChanges: this.isTransformProperty(prop),
      });

      return value;
    } catch (error) {
      console.error(`Failed to get current value for ${prop}:`, error);
      throw error;
    }
  }

  /**
   * Enhanced property update with intelligent batching
   */
  updateProperty(prop: AnimatableProperty, val: AnimationValue): void {
    this.validateProperty(prop);
    this.validateValue(val, prop);

    if (this.isDisposed) {
      console.warn("PropertyManager is disposed, ignoring update");
      return;
    }

    try {
      this.update(prop, val);
      this.updatePropertyState(prop, val);

      if (this.options.batchUpdates) {
        this.scheduleBatchUpdate();
      } else {
        this.applyUpdates();
      }
    } catch (error) {
      console.error(`Failed to update property ${prop}:`, error);
    }
  }

  /**
   * Enhanced apply updates method
   */
  applyUpdates(): void {
    if (this.options.batchUpdates) {
      this.flushPendingUpdates();
      return;
    }
    this.applyTransformToDom();
  }

  /**
   * Apply transform changes to DOM
   */
  private applyTransformToDom(): void {
    const hasTransformChanges = Array.from(this.propertyStates.values()).some(
      (state) => state.hasTransformChanges
    );

    if (hasTransformChanges) {
      const transformString = this.transformHandler.computeTransform();
      this.element.style.transform = transformString;
    }
  }

  private update(prop: AnimatableProperty, val: AnimationValue): void {
    if (this.isTransformProperty(prop)) {
      this.handleTransformUpdate(prop, val);
      return;
    }

    if (this.isCSSProperty(prop)) {
      this.handleCSSUpdate(prop, val);
      return;
    }

    throw new Error(`Unsupported prop type: ${prop}`);
  }

  /**
   * Enhanced batch update scheduling
   */
  private scheduleBatchUpdate(): void {
    if (this.updateScheduled) return;

    this.updateScheduled = true;

    requestAnimationFrame(() => {
      this.flushPendingUpdates();
      this.updateScheduled = false;
    });
  }

  /**
   * Update property state tracking
   */
  private updatePropertyState(
    prop: AnimatableProperty,
    value: AnimationValue
  ): void {
    const isTransform = this.isTransformProperty(prop);

    this.propertyStates.set(prop, {
      isDirty: false,
      lastValue: value,
      hasTransformChanges: isTransform,
    });
  }

  /**
   * Handle transform property updates
   */
  private handleTransformUpdate(
    property: TransformPropertyName,
    value: AnimationValue
  ): void {
    throwIf(
      !isNumericValue(value),
      `Transform property ${property} requires numeric value`
    );

    if (this.options.batchUpdates) {
      this.pendingTransformUpdates.set(property, value as NumericValue);
      return;
    }

    this.transformHandler.updateTransform(property, value as NumericValue);
  }

  private getValFromHandlers(prop: AnimatableProperty) {
    if (this.isTransformProperty(prop)) {
      return this.transformHandler.getCurrentTransform(prop);
    }

    if (this.isCSSProperty(prop)) {
      return this.styleAnimator.currentValue(prop);
    }

    throw new Error(`Unsupported prop type: ${prop}`);
  }

  /**
   * Handle CSS property updates
   */
  private handleCSSUpdate(
    property: CSSPropertyName,
    value: AnimationValue
  ): void {
    if (this.options.batchUpdates) {
      this.pendingCSSUpdates.set(property, value);
      return;
    }
    this.styleAnimator.applyAnimatedPropertyValue(property, value);
  }

  private validateProperty(prop: string): void {
    throwIf(
      !PropertyManager.isAnimatable(prop),
      `Property "${prop}" is not animatable`
    );
  }

  private isTransformProperty(
    property: string | AnimatableProperty
  ): property is TransformPropertyName {
    return TransformHandler.isTransformProperty(property);
  }

  private isCSSProperty(
    property: string | AnimatableProperty
  ): property is CSSPropertyName {
    return StyleAnimator.isAnimatableProperty(property);
  }

  private validateProgress(progress: number): void {
    throwIf(
      typeof progress !== "number" || progress < 0 || progress > 1,
      `Invalid progress value: ${progress}. Must be between 0 and 1.`
    );
  }

  private validateValueTypes(
    from: AnimationValue,
    to: AnimationValue,
    property: string
  ): void {
    throwIf(
      from.type !== to.type,
      `Value type mismatch for ${property}: ${from.type} vs ${to.type}`
    );
  }

  /**
   * Flush all pending updates efficiently
   */
  private flushPendingUpdates(): void {
    try {
      // Apply transform updates as a batch
      if (this.pendingTransformUpdates.size > 0) {
        const transformUpdates = new Map(this.pendingTransformUpdates);
        this.transformHandler.updateTransforms(transformUpdates);
        this.pendingTransformUpdates.clear();
      }

      // Apply CSS updates
      this.pendingCSSUpdates.forEach((value, property) => {
        this.styleAnimator.applyAnimatedPropertyValue(property, value);
      });
      this.pendingCSSUpdates.clear();

      this.applyTransformToDom();
    } catch (error) {
      console.error("Error flushing pending updates:", error);
    }
  }

  /**
   * Enhanced property validation
   */
  public static isAnimatable(property: string): property is AnimatableProperty {
    return (
      TransformHandler.isTransformProperty(property) ||
      StyleAnimator.isAnimatableProperty(property)
    );
  }

  private validateValue(value: AnimationValue, property: string): void {
    throwIf(
      !value || typeof value !== "object",
      `Invalid value for property ${property}`
    );

    throwIf(
      !value.type,
      `Invalid AnimationValue: missing type for property ${property}`
    );

    if (
      value.type === "numeric" &&
      (typeof value.value !== "number" || !isFinite(value.value))
    ) {
      throw new Error(`Invalid numeric value for property ${property}`);
    }

    if (value.type === "color") {
      if (!value.value || typeof value.value !== "object") {
        throw new Error(`Invalid color value for property ${property}`);
      }

      const colorValue = value.value;
      if (isRGBColor(colorValue)) {
        if (
          typeof colorValue.r !== "number" ||
          typeof colorValue.g !== "number" ||
          typeof colorValue.b !== "number" ||
          typeof colorValue.a !== "number"
        ) {
          throw new Error(`Invalid RGB color value for property ${property}`);
        }
      } else if (isHSLColor(colorValue)) {
        if (
          typeof colorValue.h !== "number" ||
          typeof colorValue.s !== "number" ||
          typeof colorValue.l !== "number" ||
          typeof colorValue.a !== "number"
        ) {
          throw new Error(`Invalid HSL color value for property ${property}`);
        }
      }
    }

    if (!["numeric", "color"].includes((value as any).type)) {
      throw new Error(
        `Unknown AnimationValue type: ${
          (value as any).type
        } for property ${property}`
      );
    }

    if (this.isTransformProperty(property) && !isNumericValue(value)) {
      throw new Error(`Transform property ${property} requires numeric value`);
    }
  }
}
