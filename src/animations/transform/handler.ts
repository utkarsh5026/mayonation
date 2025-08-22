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
  TransformCache,
} from "./types";
import { safeOperation, throwIf } from "@/utils/error";
import { TransformParser } from "./transform-parser";
import { clamp } from "@/utils/math";

/**
 * Enhanced TransformHandler with better performance and error handling
 */
export class TransformHandler {
  private transformState: TransformState;
  private hasStateChanges: boolean = false;
  private transformCache: TransformCache = {
    transformString: "",
    hash: "",
    isValid: false,
  };
  private readonly element: HTMLElement;
  private readonly supportedProperties: Set<string>;
  private readonly parser: TransformParser;

  constructor(el: HTMLElement) {
    this.element = el;
    this.supportedProperties = new Set(TRANSFORM_PROPERTIES.keys());
    this.transformState = this.createInitialState();
    this.parser = new TransformParser();
    this.parseInitialTransforms(el);
  }

  /**
   * Enhanced current value getter with validation
   */
  getCurrentTransform(property: TransformPropertyName): NumericValue {
    this.validateProp(property);

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

    return safeOperation(
      () => {
        if (isRotateProp(prop)) {
          return interpolateRotation(from, to, clampedProgress);
        }

        if (isScaleProp(prop)) {
          return interpolateScale(from, to, clampedProgress);
        }

        return interpolateLinear(from, to, clampedProgress);
      },
      `Interpolation failed for ${prop}:`,
      from
    );
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
    this.transformState = this.createInitialState();
    this.transformCache = {
      transformString: "",
      hash: "",
      isValid: false,
    };
    this.hasStateChanges = true;

    const transform = this.computeTransform();
    this.element.style.transform = transform || "";
  }

  /**
   * Enhanced compute transform with caching
   */
  computeTransform(): string {
    if (!this.hasStateChanges && this.transformCache.isValid) {
      return this.transformCache.transformString;
    }

    const newHash = this.generateStateHash();
    if (newHash === this.transformCache.hash && this.transformCache.isValid) {
      return this.transformCache.transformString;
    }

    const transformString = this.generateTransformString();

    this.transformCache = {
      transformString,
      hash: newHash,
      isValid: true,
    };

    this.hasStateChanges = false;
    return transformString;
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
   * Enhanced initial transform parsing with better error handling
   */
  private parseInitialTransforms(element: HTMLElement): void {
    safeOperation(() => {
      const computedStyle = window.getComputedStyle(element);
      const transform = computedStyle.transform;

      if (
        transform &&
        transform !== "none" &&
        transform !== "matrix(1, 0, 0, 1, 0, 0)"
      ) {
        if (transform.startsWith("matrix")) {
          const matrix = new DOMMatrix(transform);
          this.transformState = decomposeMatrix(matrix);
        } else {
          this.parseTransformFunctions(transform);
        }
      }
    }, "Failed to parse initial transforms");
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

    this.invalidateCache();
  }

  private validateProp(property: string) {
    throwIf(
      !this.supportedProperties.has(property),
      `Unsupported property: ${property}`
    );
  }

  /**
   * Invalidate transform cache
   */
  private invalidateCache(): void {
    this.hasStateChanges = true;
    this.transformCache.isValid = false;
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
}
