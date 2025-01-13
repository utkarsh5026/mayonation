import {
  NumericUnit,
  TransformState,
  AnmimationValue,
  TransformAxis,
  TransformPropertyName,
} from "../core/types";
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
class TransformHandler {
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

    const transforms = [];

    if (translate.x !== 0 || translate.y !== 0 || translate.z !== 0) {
      transforms.push(
        `translate3d(${translate.x}px, ${translate.y}px, ${translate.z}px)`
      );
    }

    if (rotate.x !== 0) transforms.push(`rotateX(${rotate.x}deg)`);
    if (rotate.y !== 0) transforms.push(`rotateY(${rotate.y}deg)`);
    if (rotate.z !== 0) transforms.push(`rotateZ(${rotate.z}deg)`);

    if (scale.x !== 1 || scale.y !== 1 || scale.z !== 1) {
      transforms.push(`scale3d(${scale.x}, ${scale.y}, ${scale.z})`);
    }

    if (skew.x !== 0 || skew.y !== 0) {
      transforms.push(`skew(${skew.x}deg, ${skew.y}deg)`);
    }

    return transforms.join(" ");
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

    const currentValue = this.transformState[stateKey][axis];
    return { value: currentValue, unit: transformProperties.get(property)! };
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
 * Decomposes a DOMMatrix into individual transform components.
 * This function extracts translation, rotation, scale, and skew values from a matrix
 * transformation, making it easier to manipulate and interpolate individual properties.
 *
 * The decomposition follows these steps:
 * 1. Translation: Directly extracted from matrix.e (tx) and matrix.f (ty)
 * 2. Rotation: Calculated using Euler angles from the rotation sub-matrix
 * 3. Scale: Derived from the length of the transformed basis vectors
 * 4. Skew: Computed from the non-orthogonal relationships between axes
 *
 * Matrix component reference:
 * [m11 m12 m13 m14]
 * [m21 m22 m23 m24]
 * [m31 m32 m33 m34]
 * [m41 m42 m43 m44]
 *
 * @param matrix - The DOMMatrix to decompose
 * @returns TransformState object containing separated transform components:
 *          - translate: {x, y, z} in pixels
 *          - rotate: {x, y, z} in degrees
 *          - scale: {x, y, z} as multipliers
 *          - skew: {x, y} in degrees
 */
function decomposeMatrix(matrix: DOMMatrix): TransformState {
  const translate = {
    x: matrix.e,
    y: matrix.f,
    z: 0,
  };

  const rotate = {
    x: Math.atan2(matrix.m23, matrix.m33),
    y: Math.atan2(
      -matrix.m13,
      Math.sqrt(matrix.m23 * matrix.m23 + matrix.m33 * matrix.m33)
    ),
    z: Math.atan2(matrix.m12, matrix.m11),
  };

  const rotateDeg = {
    x: rotate.x * (180 / Math.PI),
    y: rotate.y * (180 / Math.PI),
    z: rotate.z * (180 / Math.PI),
  };

  const scale = {
    x: Math.sqrt(matrix.m11 * matrix.m11 + matrix.m12 * matrix.m12),
    y: Math.sqrt(matrix.m21 * matrix.m21 + matrix.m22 * matrix.m22),
    z: Math.sqrt(matrix.m31 * matrix.m31 + matrix.m32 * matrix.m32),
  };

  const skew = {
    x: Math.atan2(matrix.m21, matrix.m22) * (180 / Math.PI),
    y: Math.atan2(matrix.m12, matrix.m22) * (180 / Math.PI),
  };

  return { translate, rotate: rotateDeg, scale, skew };
}

export default TransformHandler;
