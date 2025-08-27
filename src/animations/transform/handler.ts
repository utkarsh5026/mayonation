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

/**
 * TransformHandler with better performance and error handling
 */
export class TransformHandler {
  private transformState: TransformState;
  private readonly element: HTMLElement;
  private readonly supportedProperties: Set<string>;
  private readonly parser: TransformParser;

  private isDirty: boolean = true;
  private lastComputedTransform: string = "";

  constructor(el: HTMLElement) {
    this.element = el;
    this.supportedProperties = new Set(TRANSFORM_PROPERTIES.keys());
    this.transformState = this.createInitialState();
    this.parser = new TransformParser();
    this.syncFromDOM();
  }

  /**
   * Enhanced current value getter with validation
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

  parse(property: TransformPropertyName, value: number | string): NumericValue {
    this.validateProp(property);
    return this.parser.parse(this.supportedProperties, property, value);
  }

  /**
   * Enhanced interpolation with validation
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
   * Batch updates for better performance
   */
  updateTransforms(updates: Map<TransformPropertyName, NumericValue>): void {
    updates.forEach((value, property) => {
      this.updateTransformState(property, value);
    });
  }

  /**
   * Single transform update
   */
  updateTransform(property: TransformPropertyName, value: NumericValue): void {
    this.updateTransformState(property, value);
  }

  /**
   * Get current transform state (read-only)
   */
  getTransformState(): Readonly<TransformState> {
    return structuredClone(this.transformState);
  }

  /**
   * Enhanced reset with cleanup
   */
  reset(): void {
    this.element.style.transform = "";
    this.element.offsetHeight; // Trigger reflow
    this.isDirty = true;
    this.syncFromDOM();
  }

  /**
   * Enhanced compute transform with caching
   */
  computeTransform(): string {
    if (!this.isDirty) {
      return this.lastComputedTransform;
    }

    const newHash = this.generateStateHash();
    if (newHash === this.lastComputedTransform) {
      return this.lastComputedTransform;
    }

    const transformString = this.generateTransformString();
    this.lastComputedTransform = transformString;
    return transformString;
  }

  getRecommendedFromValue(property: TransformPropertyName): NumericValue {
    this.syncFromDOM();
    return this.currentValue(property);
  }

  static isTransformProperty(
    property: string
  ): property is TransformPropertyName {
    return TRANSFORM_PROPERTIES.has(property as TransformPropertyName);
  }

  /**
   * Creates initial transform state with proper defaults
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
   * Parse individual transform functions from transform string
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
   * Enhanced state update with validation
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

  private validateProp(property: string) {
    throwIf(
      !this.supportedProperties.has(property),
      `Unsupported property: ${property}`
    );
  }

  /**
   * Check if property affects multiple axes
   */
  private isShorthandProperty(property: string): boolean {
    return property === "translate" || property === "scale";
  }

  /**
   * Generate hash for caching
   */
  private generateStateHash(): string {
    const { translate, rotate, scale, skew } = this.transformState;
    return `${translate.x},${translate.y},${translate.z}|${rotate.x},${rotate.y},${rotate.z}|${scale.x},${scale.y},${scale.z}|${skew.x},${skew.y}`;
  }

  /**
   * Enhanced transform string generation with proper CSS order
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
   * ✅ NEW: Core responsibility - sync internal state with DOM reality
   * This is called:
   * - On construction
   * - After reset()
   * - When state is marked dirty
   * - Before providing current values (if needed)
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
   * ✅ PROPER: Default transform state (browser defaults)
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
