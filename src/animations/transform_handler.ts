import {
  NumericUnit,
  TransformState,
  AnmimationValue,
  TransformAxis,
} from "../types";
import { decomposeMatrix } from "./geom";
import {
  interpolateLinear,
  interpolateRotation,
  interpolateScale,
} from "./interpolate";

const transformProperties = new Map<TransformPropertyName, NumericUnit>([
  ["translate", "px"],
  ["translateX", "px"],
  ["translateY", "px"],
  ["translateZ", "px"],
  ["rotate", "deg"],
  ["rotateX", "deg"],
  ["rotateY", "deg"],
  ["rotateZ", "deg"],
  ["scale", ""],
  ["scaleX", ""],
  ["scaleY", ""],
  ["scaleZ", ""],
  ["skew", "deg"],
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

  /** Valid units for rotation transforms */
  static readonly rotationUnits: NumericUnit[] = ["deg"];

  /** Valid units for scale transforms */
  static readonly scaleUnits: NumericUnit[] = ["px", "%", "em", "rem"];

  /** Valid units for translation transforms */
  static readonly translationUnits: NumericUnit[] = ["px", "%", "em", "rem"];

  /**
   * Creates a new TransformHandler instance.
   * @param el - The DOM element to handle transforms for
   */
  constructor(el: HTMLElement) {
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
   * @param element - The element to parse transforms from
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
   * @returns CSS transform string
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
   * @param property - The transform property being interpolated
   * @param from - Starting transform value
   * @param to - Ending transform value
   * @param progress - Animation progress from 0 to 1
   * @returns Interpolated transform value
   */
  public interpolate(
    property: TransformPropertyName,
    from: AnmimationValue,
    to: AnmimationValue,
    progress: number
  ): AnmimationValue {
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
   * @param property - Transform property name
   * @returns Tuple of [state key, axis]
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
   * @param property - Transform property name
   * @returns True if property is shorthand
   */
  private isShorthandProperty(property: string): boolean {
    return property === "translate" || property === "scale";
  }

  /**
   * Updates the internal transform state for a property.
   * @param property - Transform property to update
   * @param value - New transform value
   */
  private updateTransformState(
    property: TransformPropertyName,
    value: AnmimationValue
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
   * Only recomputes if state has changed.
   * @returns CSS transform string
   */
  public computeTransform(): string {
    if (!this.hasStateChanges) return this.currentTransform;

    this.currentTransform = this.generateTransformString();
    this.hasStateChanges = false;
    return this.currentTransform;
  }

  /**
   * Updates a single transform property.
   * @param property - Transform property to update
   * @param value - New transform value
   */
  public updateTransform(
    property: TransformPropertyName,
    value: AnmimationValue
  ): void {
    this.updateTransformState(property, value);
    this.hasStateChanges = true;
  }

  /**
   * Updates multiple transform properties at once.
   * @param updates - Map of properties and values to update
   */
  public updateTransforms(
    updates: Map<TransformPropertyName, AnmimationValue>
  ): void {
    updates.forEach((value, property) => {
      this.updateTransformState(property, value);
    });
    this.hasStateChanges = true;
  }

  /**
   * Gets the current value of a transform property.
   * @param property - Transform property name
   * @returns Current value and unit
   */
  public getCurrentTransform(property: TransformPropertyName): AnmimationValue {
    const [stateKey, axis] = this.parseTransformProperty(property);

    if (!(axis in this.transformState[stateKey])) {
      throw new Error(
        `Invalid transform axis: ${axis} for property: ${property}`
      );
    }

    const transform = this.transformState[stateKey];
    if (axis === "x")
      return { value: transform.x, unit: transformProperties.get(property)! };
    if (axis === "y")
      return { value: transform.y, unit: transformProperties.get(property)! };
    if (axis === "z" && "z" in transform)
      return { value: transform.z, unit: transformProperties.get(property)! };

    throw new Error(
      `Invalid transform axis: ${axis} for property: ${property}`
    );
  }

  /**
   * Creates an animation value with the correct unit for a property.
   * @param property - Transform property name
   * @param value - Numeric value
   * @returns Animation value with unit
   */
  public parseTransformValue(
    property: TransformPropertyName,
    value: number
  ): AnmimationValue {
    return { value: value, unit: transformProperties.get(property)! };
  }

  /**
   * Checks if a property is a valid transform property.
   * @param property - Property name to check
   * @returns True if valid transform property
   */
  public static isTransformProperty(property: string): boolean {
    return transformProperties.has(property as TransformPropertyName);
  }

  /**
   * Resets transform state back to initial values.
   */
  public reset(): void {
    this.transformState = {
      translate: { x: 0, y: 0, z: 0 },
      rotate: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      skew: { x: 0, y: 0 },
    };
    this.currentTransform = "";
    this.hasStateChanges = false;
    this.computeTransform();
  }
}

/**
 * CSS transform properties that can be animated.
 * Includes translation, rotation, scale and skew transformations.
 */
export type TransformPropertyName =
  | "translate" // 2D translation shorthand
  | "translateX" // X-axis translation
  | "translateY" // Y-axis translation
  | "translateZ" // Z-axis translation
  | "rotate" // 2D rotation shorthand
  | "rotateX" // X-axis rotation
  | "rotateY" // Y-axis rotation
  | "rotateZ" // Z-axis rotation
  | "scale" // Uniform scale shorthand
  | "scaleX" // X-axis scale
  | "scaleY" // Y-axis scale
  | "scaleZ" // Z-axis scale
  | "skewX" // X-axis skew
  | "skewY" // Y-axis skew
  | "skew"; // 2D skew shorthand
