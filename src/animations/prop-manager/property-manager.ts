import {
  isNumericValue,
  NumericValue,
  type AnimationValue,
  isRGBColor,
  isHSLColor,
} from "@/core";
import { StyleAnimator, CSSPropertyName } from "../styles";
import { TransformHandler, TransformPropertyName } from "../transform";
import { safeOperation, throwIf } from "@/utils/error";
import { PropertyCache } from "./cache";
import type { PropertyManagerOptions, AnimatableProperty } from "./types";
/**
 * PropManager serves as a unified interface for handling both transform and CSS properties
 * during animations. It coordinates between TransformHandler and StyleAnimator while providing
 * a simpler API for the animation system.
 */
export class PropertyManager {
  private readonly transformHandler: TransformHandler;
  private readonly styleAnimator: StyleAnimator;
  private readonly pendingTransformUpdates: Map<
    TransformPropertyName,
    NumericValue
  > = new Map();
  private readonly pendingCSSUpdates: Map<CSSPropertyName, AnimationValue> =
    new Map();

  private readonly options: Required<PropertyManagerOptions>;
  private updateScheduled: boolean = false;

  private readonly cache: PropertyCache = new PropertyCache();
  private isDisposed: boolean = false;

  /**
   * Creates a new PropertyManager bound to a specific element.
   *
   * @param element HTMLElement the manager will read/animate.
   * @param options Behavior configuration (all fields optional).
   */
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
   * Parses a raw input into a normalized AnimationValue for a given property.
   * Delegates to the appropriate handler based on property type.
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
   * Resets internal state and clears pending updates.
   * Safe to call between animation runs to ensure a clean slate.
   *
   * - Clears caches
   * - Resets handlers
   * - Cancels any scheduled batch flush
   */
  reset(): void {
    safeOperation(() => {
      this.pendingTransformUpdates.clear();
      this.pendingCSSUpdates.clear();
      this.updateScheduled = false;
      this.transformHandler.reset();
      this.styleAnimator.reset();
      this.cache.clear();
    }, "Error during reset");
  }

  /**
   * Interpolates between two AnimationValues for a given property at a specific progress.
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
   * Get recommended 'from' values for animations
   * This is what CSSAnimator should call when user doesn't specify 'from'
   */
  getRecommendedFromValue(property: AnimatableProperty): AnimationValue {
    if (this.isTransformProperty(property)) {
      return this.transformHandler.getRecommendedFromValue(property);
    }

    if (this.isCSSProperty(property)) {
      return this.styleAnimator.getRecommendedFromValue(property);
    }

    throw new Error(`Unknown property type: ${property}`);
  }

  /**
   * Returns the current computed AnimationValue for a property.
   * Uses internal caching to avoid redundant reads.
   */
  getCurrentValue(prop: AnimatableProperty): AnimationValue {
    this.validateProperty(prop);
    if (this.cache.isValid(prop)) {
      const cached = this.cache.get(prop);
      console.log(`📋 Cache hit for ${prop}:`, cached?.value);
      return cached!.value;
    }

    try {
      const value = this.readCurrentValueFromDOM(prop);
      const hasTransformChanges = this.isTransformProperty(prop);
      this.cache.set(prop, value, hasTransformChanges);

      return value;
    } catch (error) {
      console.error(`Failed to get current value for ${prop}:`, error);
      throw error;
    }
  }

  /**
   * Applies a new value to a property.
   *
   * Behavior depends on `batchUpdates`:
   * - When true (default): queues the change and flushes it on the next rAF tick.
   * - When false: applies immediately to the DOM/handler.
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
   * Forces application of any pending updates.
   *
   * - If batching is enabled: flushes all queued updates in one pass and writes to DOM.
   * - If batching is disabled: recomputes the transform string and writes to DOM if needed.
   */
  applyUpdates(): void {
    if (this.options.batchUpdates) {
      this.flushPendingUpdates();
      return;
    }
    this.applyTransformToDom();
  }

  /**
   * Apply transform changes to DOM by computing the aggregate transform string
   * from the transform handler and setting element.style.transform.
   * @internal
   */
  private applyTransformToDom(): void {
    const hasTransformChanges = Array.from(this.cache.getAll().values()).some(
      (state) => state.hasTransformChanges
    );

    if (hasTransformChanges) {
      const transformString = this.transformHandler.computeTransform();
      this.element.style.transform = transformString;
    }
  }

  /**
   * Routes update to the appropriate handler based on property type.
   * @internal
   */
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
   * Schedules a rAF callback to flush batched updates.
   * No-op if already scheduled.
   * @internal
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
   * Updates the internal tracking state for a property.
   * @internal
   */
  private updatePropertyState(
    prop: AnimatableProperty,
    value: AnimationValue
  ): void {
    const isTransform = this.isTransformProperty(prop);
    this.cache.set(prop, value, isTransform);
  }

  /**
   * Validates and queues/applies a transform property update.
   * @internal
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

  /**
   * Reads current value from the appropriate handler.
   * @internal
   */
  private readCurrentValueFromDOM(prop: AnimatableProperty) {
    if (this.isTransformProperty(prop)) {
      return this.transformHandler.currentValue(prop);
    }

    if (this.isCSSProperty(prop)) {
      return this.styleAnimator.currentValue(prop);
    }

    throw new Error(`Unsupported prop type: ${prop}`);
  }

  /**
   * Queues/applies a CSS property update depending on batching mode.
   * @internal
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

  /**
   * Asserts that a property is animatable by this manager.
   * @internal
   */
  private validateProperty(prop: string): void {
    throwIf(
      !PropertyManager.isAnimatable(prop),
      `Property "${prop}" is not animatable`
    );
  }

  /**
   * Type guard: checks if a property is a transform.
   * @internal
   */
  private isTransformProperty(
    property: string | AnimatableProperty
  ): property is TransformPropertyName {
    return TransformHandler.isTransformProperty(property);
  }

  /**
   * Type guard: checks if a property is an animatable CSS property.
   * @internal
   */
  private isCSSProperty(
    property: string | AnimatableProperty
  ): property is CSSPropertyName {
    return StyleAnimator.isAnimatableProperty(property);
  }

  /**
   * Validates progress is a number in the inclusive range [0, 1].
   * @internal
   */
  private validateProgress(progress: number): void {
    throwIf(
      typeof progress !== "number" || progress < 0 || progress > 1,
      `Invalid progress value: ${progress}. Must be between 0 and 1.`
    );
  }

  /**
   * Ensures from/to values share the same AnimationValue type.
   * @internal
   */
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
   * Flushes all pending transform and CSS updates efficiently and applies
   * the computed transform string to the DOM, if needed.
   *
   * Robust to internal errors; logs and continues.
   * @internal
   */
  private flushPendingUpdates(): void {
    try {
      if (this.pendingTransformUpdates.size > 0) {
        const transformUpdates = new Map(this.pendingTransformUpdates);
        this.transformHandler.updateTransforms(transformUpdates);
        this.pendingTransformUpdates.clear();
      }

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
   * Determines if a string refers to an animatable property known to this manager.
   */
  public static isAnimatable(property: string): property is AnimatableProperty {
    return (
      TransformHandler.isTransformProperty(property) ||
      StyleAnimator.isAnimatableProperty(property)
    );
  }

  /**
   * Validates an AnimationValue for a given property, ensuring correct shape and type.
   * Throws with actionable messages when invalid.
   * @internal
   */
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
