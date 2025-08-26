/**
 * PropertyManager
 *
 * High-level orchestrator for animating both CSS properties and transform properties
 * on a single HTMLElement. It delegates parsing, interpolation, and application of values
 * to specialized handlers while providing:
 * - A unified API for transforms and CSS props
 * - Intelligent batching and DOM write minimization
 * - Validation and robust error handling with safe fallbacks
 */

import {
  isNumericValue,
  NumericValue,
  type AnimationValue,
  type ColorSpace,
  isRGBColor,
  isHSLColor,
} from "@/core";
import { StyleAnimator, CSSPropertyName } from "./styles";
import { TransformHandler, TransformPropertyName } from "./transform";
import { safeOperation, throwIf } from "@/utils/error";

/**
 * Internal per-property state used for caching and change tracking.
 * @internal
 */
interface PropertyState {
  /** Whether the cached value is invalid and needs recomputation. */
  isDirty: boolean;
  /** Last value returned or applied for this property. */
  lastValue: AnimationValue;
  /** Whether this property's last change affects transform string recomputation. */
  hasTransformChanges: boolean;
}

/**
 * Options for configuring PropertyManager behavior.
 */
interface PropertyManagerOptions {
  /**
   * Preferred color space for color parsing/interpolation.
   * Defaults to 'hsl'.
   */
  colorSpace?: ColorSpace;

  /**
   * When true, defers DOM writes and batches them on the next animation frame.
   * Greatly reduces layout thrashing and improves performance under load.
   * Defaults to true.
   */
  batchUpdates?: boolean;

  /**
   * Number of decimal places to use when serializing numeric values.
   * Defaults to 3.
   */
  precision?: number;

  /**
   * When true, enables GPU-friendly transforms (e.g., translateZ(0)) where supported.
   * Actual behavior is delegated to the underlying handlers.
   * Defaults to true.
   */
  useGPUAcceleration?: boolean;
}

/**
 * A property that can be animated by PropertyManager.
 *
 * This can be either a transform property (e.g., 'translateX', 'rotate', 'scale')
 * or a CSS property supported by StyleAnimator (e.g., 'opacity', 'backgroundColor').
 *
 * @example
 * ```ts
 * const p: AnimatableProperty = 'opacity';     // CSS property
 * const t: AnimatableProperty = 'translateX';  // transform property
 * ```
 */
export type AnimatableProperty = TransformPropertyName | CSSPropertyName;

/**
 * PropManager serves as a unified interface for handling both transform and CSS properties
 * during animations. It coordinates between TransformHandler and StyleAnimator while providing
 * a simpler API for the animation system.
 *
 * Key features:
 * - Consistent parsing and interpolation across transforms and CSS
 * - Validation and meaningful error messages
 * - Optional batching via requestAnimationFrame to minimize DOM writes
 * - Caching of current values for efficiency
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
   *
   * @param property The property to parse (transform or CSS).
   * @param value A string or number input value (e.g., 100, "50%", "#ff0", "hsl(0 100% 50%)").
   * @returns A normalized AnimationValue or null if parsing fails safely.
   *
   * @throws If the property is not animatable.
   *
   * @example
   * ```ts
   * const v1 = pm.parse('opacity', 0.5);          // numeric AnimationValue
   * const v2 = pm.parse('backgroundColor', '#09f'); // color AnimationValue
   * const v3 = pm.parse('translateX', 100);       // numeric AnimationValue (px by handler convention)
   * ```
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
      this.propertyStates.clear();
    }, "Error during reset");
  }

  /**
   * Interpolates between two AnimationValues for a given property at a specific progress.
   *
   * @param property Animatable property to interpolate.
   * @param from Start value (must match type of `to`).
   * @param to End value (must match type of `from`).
   * @param progress A number in [0, 1].
   * @returns Interpolated AnimationValue.
   *
   * @throws If:
   *  - property is not animatable
   *  - progress is out of [0, 1]
   *  - value types mismatch
   *  - transform properties receive non-numeric values
   *
   * On internal errors, falls back to `from` for progress < 0.5, else `to`.
   *
   * @example
   * ```ts
   * const from = pm.parse('opacity', 0)!;
   * const to = pm.parse('opacity', 1)!;
   * const mid = pm.interpolate('opacity', from, to, 0.5);
   * ```
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
   * Returns the current computed AnimationValue for a property.
   * Uses internal caching to avoid redundant reads.
   *
   * @param prop The target property.
   * @returns The current AnimationValue.
   *
   * @throws If the property is not animatable.
   *
   * @example
   * ```ts
   * const current = pm.getCurrentValue('opacity');
   * ```
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
   * Applies a new value to a property.
   *
   * Behavior depends on `batchUpdates`:
   * - When true (default): queues the change and flushes it on the next rAF tick.
   * - When false: applies immediately to the DOM/handler.
   *
   * @param prop The property to update.
   * @param val The normalized AnimationValue to apply.
   *
   * @throws If the property is invalid or the value fails validation.
   *
   * @example
   * ```ts
   * const val = pm.parse('translateY', 120)!;
   * pm.updateProperty('translateY', val); // queued when batchUpdates = true
   * ```
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
   *
   * @example
   * ```ts
   * pm.applyUpdates();
   * ```
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
    const hasTransformChanges = Array.from(this.propertyStates.values()).some(
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

    this.propertyStates.set(prop, {
      isDirty: false,
      lastValue: value,
      hasTransformChanges: isTransform,
    });
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
   * Determines if a string refers to an animatable property known to this manager.
   *
   * @param property The property name to test.
   * @returns true if the property is a supported transform or CSS property.
   *
   * @example
   * ```ts
   * PropertyManager.isAnimatable('opacity');     // true
   * PropertyManager.isAnimatable('translateX');  // true
   * PropertyManager.isAnimatable('display');     // false
   * ```
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
