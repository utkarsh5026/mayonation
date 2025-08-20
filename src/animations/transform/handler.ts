import { type NumericValue, createValue } from "../../core/animation-val";
import { validateProgress } from "../../svg/utils";
import {
  type TransformState,
  type TransformAxis,
  type TransformPropertyName,
  isTranslateProp,
  isRotateProp,
  isSkewProp,
} from "./units";
import {
  decomposeMatrix,
  interpolateLinear,
  interpolateRotation,
  interpolateScale,
} from "./math";
import type { AnimationUnit } from "../../utils/unit";
import { parseValue } from "../../utils/unit";

const transformProperties = new Map<TransformPropertyName, AnimationUnit>([
  ["translateX", "px"],
  ["translateY", "px"],
  ["translateZ", "px"],
  ["rotateX", "deg"],
  ["rotateY", "deg"],
  ["rotateZ", "deg"],
  ["scale", ""],
  ["scaleX", ""],
  ["scaleY", ""],
  ["scaleZ", ""],
  ["skewX", "deg"],
  ["skewY", "deg"],
]);

/**
 * Handles transform animations and state management for DOM elements.
 * Manages translation, rotation, scale and skew transformations.
 */
export class TransformHandler {
  /** Current transform state containing all transform values */
  private transformState: TransformState;

  /** Flag indicating if transform state has changed and needs recomputing */
  private hasStateChanges: boolean = false;

  /** Cached transform string to avoid recomputing when unchanged */
  private currentTransform: string = "";

  /** The DOM element to handle transforms for */
  private readonly element: HTMLElement;

  /**
   * Creates a new TransformHandler instance.
   * @param el - The DOM element to handle transforms for
   */
  constructor(el: HTMLElement) {
    this.element = el;
    this.transformState = {
      translate: { x: 0, y: 0, z: 0 },
      rotate: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      skew: { x: 0, y: 0 },
    };
    this.parseInitialTransforms(el);
  }

  /**
   * Parses and sets initial transform values from an element's computed style.
   */
  private parseInitialTransforms(element: HTMLElement) {
    const { transform } = window.getComputedStyle(element);
    if (transform && transform !== "none") {
      const matrix = new DOMMatrix(transform);
      this.transformState = decomposeMatrix(matrix);
    }
  }

  /**
   * Generates a CSS transform string from the current transform state.
   */
  private generateTransformString(): string {
    const { translate, rotate, scale, skew } = this.transformState;

    const transformOrder = [
      {
        check: () =>
          translate.x !== 0 || translate.y !== 0 || translate.z !== 0,
        generate: () =>
          `translate3d(${translate.x}px, ${translate.y}px, ${translate.z}px)`,
      },
      {
        // Handle rotations in specific ZYX order to match decomposition
        check: () => rotate.z !== 0,
        generate: () => `rotateZ(${rotate.z}deg)`,
      },
      {
        check: () => rotate.y !== 0,
        generate: () => `rotateY(${rotate.y}deg)`,
      },
      {
        check: () => rotate.x !== 0,
        generate: () => `rotateX(${rotate.x}deg)`,
      },
      {
        check: () => scale.x !== 1 || scale.y !== 1 || scale.z !== 1,
        generate: () => `scale3d(${scale.x}, ${scale.y}, ${scale.z})`,
      },
      // Last to apply (leftmost in CSS string)
      {
        check: () => skew.x !== 0 || skew.y !== 0,
        generate: () => `skew(${skew.x}deg, ${skew.y}deg)`,
      },
    ];

    return transformOrder
      .filter(({ check }) => check())
      .map(({ generate }) => generate())
      .join(" ");
  }

  /**
   * Interpolates between two transform values based on progress.
   */
  public interpolate(
    property: TransformPropertyName,
    from: NumericValue,
    to: NumericValue,
    progress: number
  ): NumericValue {
    validateProgress(progress);
    switch (true) {
      case property.startsWith("rotate"):
        return interpolateRotation(from, to, progress);
      case property.startsWith("scale"):
        return interpolateScale(from, to, progress);
      default:
        return interpolateLinear(from, to, progress);
    }
  }

  /**
   * Parses a transform property into its state key and axis.
   */
  private parseTransformProperty(
    property: string
  ): [keyof TransformState, TransformAxis] {
    const lookup: Record<string, [keyof TransformState, TransformAxis][]> = {
      translate: [
        ["translate", "x"],
        ["translate", "y"],
      ],
      translateX: [["translate", "x"]],
      translateY: [["translate", "y"]],
      translateZ: [["translate", "z"]],
      rotate: [["rotate", "z"]],
      rotateX: [["rotate", "x"]],
      rotateY: [["rotate", "y"]],
      rotateZ: [["rotate", "z"]],
      scale: [
        ["scale", "x"],
        ["scale", "y"],
      ],
      scaleX: [["scale", "x"]],
      scaleY: [["scale", "y"]],
      scaleZ: [["scale", "z"]],
      skewX: [["skew", "x"]],
      skewY: [["skew", "y"]],
    };

    const results = lookup[property];
    if (!results) {
      throw new Error(`Invalid transform property: ${property}`);
    }

    // For shorthand properties that affect multiple axes, return the first one
    // The calling code should check if it's a shorthand and apply to all relevant axes
    return results[0];
  }

  /**
   * Checks if a property is a shorthand that affects multiple axes.
   */
  private isShorthandProperty(property: string): boolean {
    return property === "translate" || property === "scale";
  }

  /**
   * Updates the internal transform state for a property.
   */
  private updateTransformState(
    property: TransformPropertyName,
    value: NumericValue
  ): void {
    const axes: TransformAxis[] = [];
    const [stateKey, axis] = this.parseTransformProperty(property);

    if (this.isShorthandProperty(property)) {
      axes.push("x");
      axes.push("y");
    } else axes.push(axis);

    axes.forEach((axis) => {
      const toTransform = this.transformState[stateKey];
      if (axis === "x") toTransform.x = value.value;
      if (axis === "y") toTransform.y = value.value;
      if (axis === "z" && axis in toTransform) toTransform.z = value.value;
    });
  }

  /**
   * Computes and returns the current CSS transform string.
   */
  public computeTransform(): string {
    if (!this.hasStateChanges) return this.currentTransform;

    this.currentTransform = this.generateTransformString();
    this.hasStateChanges = false;
    return this.currentTransform;
  }

  /**
   * Updates a single transform property.
   */
  public updateTransform(
    property: TransformPropertyName,
    value: NumericValue
  ): void {
    this.updateTransformState(property, value);
    this.hasStateChanges = true;
  }

  /**
   * Updates multiple transform properties at once.
   */
  public updateTransforms(
    updates: Map<TransformPropertyName, NumericValue>
  ): void {
    updates.forEach((value, property) => {
      this.updateTransformState(property, value);
    });
    this.hasStateChanges = true;
  }

  /**
   * Gets the current value of a transform property.
   */
  public getCurrentTransform(property: TransformPropertyName): NumericValue {
    const [stateKey, axis] = this.parseTransformProperty(property);

    if (!(axis in this.transformState[stateKey])) {
      throw new Error(
        `Invalid transform axis: ${axis} for property: ${property}`
      );
    }

    const transform = this.transformState[stateKey];
    if (axis === "x")
      return createValue.numeric(
        transform.x,
        transformProperties.get(property)!
      );
    if (axis === "y")
      return createValue.numeric(
        transform.y,
        transformProperties.get(property)!
      );
    if (axis === "z" && "z" in transform)
      return createValue.numeric(
        transform.z,
        transformProperties.get(property)!
      );

    throw new Error(
      `Invalid transform axis: ${axis} for property: ${property}`
    );
  }

  /**
   * Creates an animation value with the correct unit for a property.
   */
  public parseTransformValue(
    property: TransformPropertyName,
    value: number
  ): NumericValue {
    return createValue.numeric(value, transformProperties.get(property)!);
  }

  public parse(
    property: TransformPropertyName,
    value: number | string
  ): NumericValue {
    if (typeof value === "number") {
      let unit: AnimationUnit;

      switch (true) {
        case isTranslateProp(property):
          unit = "px";
          break;
        case isRotateProp(property):
        case isSkewProp(property):
          unit = "deg";
          break;
        default:
          unit = "";
      }

      return createValue.numeric(value, unit);
    }
    try {
      const parsed = parseValue(value);
      return createValue.numeric(parsed.value, parsed.unit);
    } catch (error) {
      throw new Error(
        `Invalid value "${value}" for the property "${property}" `
      );
    }
  }

  /**
   * Checks if a property is a valid transform property.
   */
  public static isTransformProperty(
    property: string
  ): property is TransformPropertyName {
    return transformProperties.has(property as TransformPropertyName);
  }

  /**
   * Resets transform state back to initial values and updates the element.
   */
  public reset(): void {
    this.transformState = {
      translate: { x: 0, y: 0, z: 0 },
      rotate: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      skew: { x: 0, y: 0 },
    };
    this.currentTransform = "";
    this.hasStateChanges = true;
    const transform = this.computeTransform();
    this.element.style.transform = transform;
  }
}
