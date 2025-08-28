import { type NumericValue, createValue } from "@/core/animation-val";
import { isRotateProp, isScaleProp } from "./units";
import {
  decomposeMatrix,
  interpolateLinear,
  interpolateRotation,
  interpolateScale,
} from "./math";
import { TRANSFORM_PROPERTIES } from "./props";
import type {
  TransformState,
  TransformAxis,
  TransformPropertyName,
} from "./types";
import { safeOperation, throwIf } from "@/utils/error";
import { TransformParser } from "./transform-parser";
import { clamp } from "@/utils/math";

export class TransformHandler {
  private transformState: TransformState;
  private readonly element: HTMLElement;
  private readonly supportedProperties: Set<string>;
  private readonly parser: TransformParser;

  private isDirty: boolean = true;
  private lastComputedTransform: string = "";

  /**
   * Create a handler for a specific element.
   * @param el Target HTMLElement whose transform will be read/updated.
   */
  constructor(el: HTMLElement) {
    this.element = el;
    this.supportedProperties = new Set(TRANSFORM_PROPERTIES.keys());
    this.transformState = this.createInitialState();
    this.parser = new TransformParser();
    this.syncFromDOM();
  }

  /**
   * Get the current value of a transform property from the element.
   *
   * Ensures internal state is synced from the DOM if needed and returns a value
   * with the correct unit for that property.
   *
   * @param property Transform property name (e.g., "translateX", "rotateZ", "scaleY").
   * @returns NumericValue representing the current value and unit.
   * @throws If the property is unsupported or axis is invalid for the property.
   */
  currentValue(property: TransformPropertyName): NumericValue {
    this.validateProp(property);
    if (this.isDirty) {
      this.syncFromDOM();
    }

    const [stateKey, axis] = this.parser.parseTransformProperty(property);
    const transform = this.transformState[stateKey];

    throwIf(
      !(axis in transform),
      `Invalid axis ${axis} for property ${property}`
    );

    const value = (transform as any)[axis];
    const unit = TRANSFORM_PROPERTIES.get(property)!;
    return createValue.numeric(value, unit);
  }

  /**
   * Parse a user-provided value (number or string) into a normalized NumericValue.
   *
   * Examples:
   * - parse("translateX", "20px") -> { value: 20, unit: "px" }
   * - parse("rotateZ", 45)        -> { value: 45, unit: "deg" }
   *
   * @param property Transform property name.
   * @param value A number (assumes default unit for the property) or a unit string.
   * @returns Normalized NumericValue.
   * @throws If the property is unsupported or the value cannot be parsed.
   */
  parse(property: TransformPropertyName, value: number | string): NumericValue {
    this.validateProp(property);
    return this.parser.parse(this.supportedProperties, property, value);
  }

  /**
   * Interpolate between two values for a specific property.
   *
   * Behavior:
   * - Clamps progress to [0, 1].
   * - Validates that units match.
   * - Uses shortest-path interpolation for rotations.
   * - Uses multiplicative-safe interpolation for scale.
   *
   * @param prop Transform property name.
   * @param from Starting value (unit must match "to").
   * @param to Ending value (unit must match "from").
   * @param progress A number between 0 and 1 (values are clamped).
   * @returns Interpolated NumericValue.
   * @throws If units do not match or property is unsupported.
   */
  interpolate(
    prop: TransformPropertyName,
    from: NumericValue,
    to: NumericValue,
    progress: number
  ): NumericValue {
    this.validateProp(prop);
    const clampedProgress = clamp(progress, 0, 1);

    throwIf(
      from.unit !== to.unit,
      `Unit mismatch for ${prop}: ${from.unit} vs ${to.unit}`
    );

    if (isRotateProp(prop)) {
      return interpolateRotation(from, to, clampedProgress);
    }

    if (isScaleProp(prop)) {
      return interpolateScale(from, to, clampedProgress);
    }

    return interpolateLinear(from, to, clampedProgress);
  }

  /**
   * Apply multiple transform property updates to the internal state.
   *
   * Notes:
   * - Does not mutate the DOM automatically. Call computeTransform() and
   *   assign the result to element.style.transform to apply.
   *
   * @param updates Map of property -> NumericValue to set.
   */
  updateTransforms(updates: Map<TransformPropertyName, NumericValue>): void {
    updates.forEach((value, property) => {
      this.updateTransformState(property, value);
    });
  }

  /**
   * Update a single transform property in the internal state.
   *
   * Notes:
   * - Negative scale values are clamped to 0 (with a console warning).
   * - Does not mutate the DOM automatically. Use computeTransform() to get the string.
   *
   * @param property Transform property name.
   * @param value Normalized NumericValue for that property.
   */
  updateTransform(property: TransformPropertyName, value: NumericValue): void {
    this.updateTransformState(property, value);
  }

  /**
   * Snapshot of the current internal transform state.
   *
   * Returns a deep clone to prevent accidental mutation.
   * @returns Read-only TransformState clone.
   */
  getTransformState(): Readonly<TransformState> {
    return structuredClone(this.transformState);
  }

  /**
   * Mark the internal state as dirty so the next read will re-sync from the DOM.
   */
  markDirty(): void {
    this.isDirty = true;
  }

  /**
   * Reset the element's inline transform, force a reflow, and resync state.
   *
   * Use this to clear local overrides and reflect the browser's default transform.
   */
  reset(): void {
    this.element.style.transform = "";
    this.element.offsetHeight; // Trigger reflow
    this.isDirty = true;
    this.syncFromDOM();
  }

  /**
   * Compose the current internal transform state into a CSS transform string.
   *
   * Also caches the last computed string to aid sync decisions.
   *
   * @returns CSS transform string (e.g., "translate3d(... ) rotateZ(... ) scale3d(... )").
   */
  computeTransform(): string {
    const transformString = this.generateTransformString();
    this.lastComputedTransform = transformString;
    return transformString;
  }

  /**
   * Convenience helper that returns a safe "from" value for animating a property.
   *
   * Ensures the internal state reflects the DOM and returns currentValue(property).
   *
   * @param property Transform property name.
   * @returns NumericValue appropriate as the animation's starting point.
   */
  getRecommendedFromValue(property: TransformPropertyName): NumericValue {
    this.syncFromDOM();
    return this.currentValue(property);
  }

  /**
   * Type guard to check if a string is a supported transform property name.
   * @param property String to test.
   * @returns True if supported.
   */
  static isTransformProperty(
    property: string
  ): property is TransformPropertyName {
    return TRANSFORM_PROPERTIES.has(property as TransformPropertyName);
  }

  /**
   * Create the initial transform state with standard browser defaults.
   * @returns Fresh TransformState.
   */
  private createInitialState(): TransformState {
    return {
      translate: { x: 0, y: 0, z: 0 },
      rotate: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      skew: { x: 0, y: 0 },
    };
  }

  /**
   * Parse individual transform functions from a transform string and apply to state.
   * Supports functions like translateX, translate3d, rotateZ, scale, skew, etc.
   * @param transform Raw CSS transform string (functional syntax).
   */
  private parseTransformFunctions(transform: string): void {
    const transformRegex = /(\w+)\(([^)]+)\)/g;
    let match;

    while ((match = transformRegex.exec(transform)) !== null) {
      const [, func, args] = match;
      const values = args.split(",").map((s) => s.trim());

      safeOperation(
        () =>
          this.parser.applyParsedTransform(this.transformState, func, values),
        `Failed to parse transform function ${func}`
      );
    }
  }

  /**
   * Update the internal transform state for a given property.
   *
   * Special handling:
   * - Scale values < 0 are clamped to 0 with a warning.
   * - Shorthand properties ("translate", "scale") apply to both x and y axes.
   *
   * @param property Transform property name.
   * @param value Normalized NumericValue for that property.
   * @throws If the property is unsupported.
   */
  private updateTransformState(
    property: TransformPropertyName,
    value: NumericValue
  ): void {
    this.validateProp(property);

    if (isScaleProp(property) && value.value < 0) {
      console.warn(`Negative scale value for ${property}, clamping to 0`);
      value.value = 0;
    }

    const [stateKey, axis] = this.parser.parseTransformProperty(property);
    const axes: TransformAxis[] = this.isShorthandProperty(property)
      ? ["x", "y"]
      : [axis];

    axes.forEach((currentAxis) => {
      const transform = this.transformState[stateKey];
      if (currentAxis in transform) {
        (transform as any)[currentAxis] = value.value;
      }
    });
  }

  /**
   * Ensure the property is supported or throw.
   * @param property Transform property string.
   * @throws If unsupported.
   */
  private validateProp(property: string) {
    throwIf(
      !this.supportedProperties.has(property),
      `Unsupported property: ${property}`
    );
  }

  /**
   * Whether the property is a 2D shorthand that targets multiple axes.
   * @param property Property name ("translate" or "scale").
   * @returns True if it updates multiple axes.
   */
  private isShorthandProperty(property: string): boolean {
    return property === "translate" || property === "scale";
  }

  /**
   * Build a CSS transform string in a stable, browser-friendly order:
   * - translate3d
   * - rotateZ, rotateY, rotateX (ZYX)
   * - scale3d
   * - skew
   *
   * Only non-default components are emitted.
   * @returns CSS transform string.
   */
  private generateTransformString(): string {
    const { translate, rotate, scale, skew } = this.transformState;
    const transforms: string[] = [];

    if (translate.x !== 0 || translate.y !== 0 || translate.z !== 0) {
      transforms.push(
        `translate3d(${translate.x}px, ${translate.y}px, ${translate.z}px)`
      );
    }

    // Rotate - apply in ZYX order to match matrix decomposition
    if (rotate.z !== 0) transforms.push(`rotateZ(${rotate.z}deg)`);
    if (rotate.y !== 0) transforms.push(`rotateY(${rotate.y}deg)`);
    if (rotate.x !== 0) transforms.push(`rotateX(${rotate.x}deg)`);

    // Scale - use scale3d for consistency
    if (scale.x !== 1 || scale.y !== 1 || scale.z !== 1) {
      transforms.push(`scale3d(${scale.x}, ${scale.y}, ${scale.z})`);
    }

    // Skew
    if (skew.x !== 0 || skew.y !== 0) {
      transforms.push(`skew(${skew.x}deg, ${skew.y}deg)`);
    }

    return transforms.join(" ");
  }

  /**
   * Sync internal state from the element's computed style.
   *
   * Tries to:
   * 1) Detect unchanged transforms to avoid rework.
   * 2) Parse matrix(...) via DOMMatrix decomposition when present.
   * 3) Parse functional syntax when available.
   * Falls back to defaults on error.
   */
  private syncFromDOM(): void {
    safeOperation(
      () => {
        const { transform } = window.getComputedStyle(this.element);

        if (transform !== this.lastComputedTransform) {
          this.lastComputedTransform = transform;

          if (transform === "none" || !transform) {
            // Element has no transform - use defaults
            this.transformState = this.createDefaultState();
          } else this.parseTransformFromDOM(transform);
        }

        this.isDirty = false;
      },
      "Failed to sync transform state from DOM",
      null,
      () => {
        this.transformState = this.createDefaultState();
        this.isDirty = false;
      }
    );
  }

  /**
   * Parse and apply a computed transform string to the internal state.
   * @param transformString Computed style transform string.
   */
  private parseTransformFromDOM(transformString: string): void {
    try {
      if (transformString.startsWith("matrix")) {
        const matrix = new DOMMatrix(transformString);
        this.transformState = decomposeMatrix(matrix);
        return;
      }

      this.parseTransformFunctions(transformString);
    } catch (error) {
      console.warn("Failed to parse transform, using defaults:", error);
      this.transformState = this.createDefaultState();
    }
  }

  /**
   * Create default transform state reflecting browser defaults.
   * @returns Default TransformState.
   */
  private createDefaultState(): TransformState {
    return {
      translate: { x: 0, y: 0, z: 0 },
      rotate: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      skew: { x: 0, y: 0 },
    };
  }
}
