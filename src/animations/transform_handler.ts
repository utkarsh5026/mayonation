import {
  type NumericValue,
  type AnimationUnit,
  createValue,
} from "../core/animation-val";
import { linear, logarithmic } from "../utils/interpolate";

const transformProperties = new Map<TransformPropertyName, AnimationUnit>([
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
  static readonly rotationUnits: AnimationUnit[] = ["deg"];

  /** Valid units for scale transforms */
  static readonly scaleUnits: AnimationUnit[] = ["px", "%", "em", "rem"];

  /** Valid units for translation transforms */
  static readonly translationUnits: AnimationUnit[] = ["px", "%", "em", "rem"];

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
    from: NumericValue,
    to: NumericValue,
    progress: number
  ): NumericValue {
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
    value: NumericValue
  ): void {
    this.updateTransformState(property, value);
    this.hasStateChanges = true;
  }

  /**
   * Updates multiple transform properties at once.
   * @param updates - Map of properties and values to update
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
   * @param property - Transform property name
   * @returns Current value and unit
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
   * @param property - Transform property name
   * @param value - Numeric value
   * @returns Animation value with unit
   */
  public parseTransformValue(
    property: TransformPropertyName,
    value: number
  ): NumericValue {
    return createValue.numeric(value, transformProperties.get(property)!);
  }

  /**
   * Checks if a property is a valid transform property.
   * @param property - Property name to check
   * @returns True if valid transform property
   */
  public static isTransformProperty(
    property: string
  ): property is TransformPropertyName {
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
    z: matrix.m43,
  };

  const scale = {
    x: Math.sqrt(
      matrix.m11 * matrix.m11 +
        matrix.m12 * matrix.m12 +
        matrix.m13 * matrix.m13
    ),
    y: Math.sqrt(
      matrix.m21 * matrix.m21 +
        matrix.m22 * matrix.m22 +
        matrix.m23 * matrix.m23
    ),
    z: Math.sqrt(
      matrix.m31 * matrix.m31 +
        matrix.m32 * matrix.m32 +
        matrix.m33 * matrix.m33
    ),
  };

  const rotationMatrix = {
    m11: matrix.m11 / scale.x,
    m12: matrix.m12 / scale.x,
    m13: matrix.m13 / scale.x,
    m21: matrix.m21 / scale.y,
    m22: matrix.m22 / scale.y,
    m23: matrix.m23 / scale.y,
    m31: matrix.m31 / scale.z,
    m32: matrix.m32 / scale.z,
    m33: matrix.m33 / scale.z,
  };

  const rotate = extractRotation(rotationMatrix);

  const skew = {
    x: Math.atan2(matrix.m21, matrix.m22) * (180 / Math.PI),
    y: Math.atan2(matrix.m12, matrix.m22) * (180 / Math.PI),
  };

  return { translate, rotate, scale, skew };
}
/**
 * Extracts Euler rotation angles from a normalized rotation matrix.
 *
 * This function decomposes a 3x3 rotation matrix into Euler angles using the ZYX convention,
 * meaning the rotations are applied in the order:
 * 1. First rotate around Z axis
 * 2. Then rotate around Y axis
 * 3. Finally rotate around X axis
 *
 * The function handles two cases:
 * 1. Normal case - When the Y rotation is not close to ±90 degrees
 * 2. Gimbal lock case - When Y rotation approaches ±90 degrees, causing loss of one degree of freedom
 *
 * In the gimbal lock case (when matrix.m31 is close to ±1):
 * - X rotation is set to 0
 * - Y rotation is set to ±90 degrees
 * - Z rotation is calculated from remaining matrix elements
 *
 * @param matrix - Normalized 3x3 rotation matrix in column-major format:
 *                 [m11 m12 m13]
 *                 [m21 m22 m23]
 *                 [m31 m32 m33]
 * @returns Object containing rotation angles in degrees:
 *          {x, y, z} where:
 *          - x is rotation around X axis (-180° to 180°)
 *          - y is rotation around Y axis (-90° to 90°)
 *          - z is rotation around Z axis (-180° to 180°)
 */
function extractRotation(matrix: Record<string, number>) {
  const epsilon = 0.0001;

  if (Math.abs(matrix.m31) > 1 - epsilon) {
    const sign = Math.sign(matrix.m31);
    return {
      x: 0,
      y: sign * 90,
      z: Math.atan2(sign * matrix.m12, matrix.m22) * (180 / Math.PI),
    };
  } else {
    return {
      x: Math.atan2(-matrix.m32, matrix.m33) * (180 / Math.PI),
      y: Math.asin(matrix.m31) * (180 / Math.PI),
      z: Math.atan2(-matrix.m21, matrix.m11) * (180 / Math.PI),
    };
  }
}

/**
 * Interpolates between two scale values using logarithmic interpolation.
 *
 * Scale interpolation requires special handling because linear interpolation can produce
 * unnatural-looking results. For example, scaling from 1x to 4x should have its midpoint
 * at 2x, not 2.5x. Logarithmic interpolation ensures perceptually smooth scaling.
 *
 * The function works by:
 * 1. Converting the scale values to logarithmic space using Math.log()
 * 2. Performing linear interpolation in log space
 * 3. Converting back to normal space using Math.exp()
 *
 * This produces natural-looking scale animations where:
 * - Progress 0.0 yields the 'from' scale
 * - Progress 0.5 yields the geometric mean of 'from' and 'to' scales
 * - Progress 1.0 yields the 'to' scale
 *
 * @param from - Starting scale value with format {value: number, unit: string}
 * @param to - Ending scale value with format {value: number, unit: string}
 * @param progress - Animation progress from 0 to 1
 * @returns Interpolated scale value with same unit as input
 *
 * @example
 * // Scaling from 1x to 4x with progress 0.5 yields 2x
 * interpolateScale({value: 1, unit: ''}, {value: 4, unit: ''}, 0.5)
 * // Returns {value: 2, unit: ''}
 */
export function interpolateScale(
  from: NumericValue,
  to: NumericValue,
  progress: number
): NumericValue {
  if (from.value <= 0 || to.value <= 0) {
    throw new Error("Scale values must be positive numbers");
  }

  const value = logarithmic.interpolate(from.value, to.value, progress);
  return createValue.numeric(value, from.unit);
}

/**
 * Interpolates between two rotation angles using the shortest path.
 *
 * Rotation interpolation requires special handling to ensure the animation takes
 * the shortest possible path between two angles. For example, rotating from 350°
 * to 10° should go forward 20° rather than backward 340°.
 *
 * The function works by:
 * 1. Converting degree values to radians for mathematical operations
 * 2. Finding the smallest angle difference between the two rotations
 * 3. Adjusting the difference if it exceeds 180° to take the shorter path
 * 4. Performing linear interpolation on the adjusted difference
 * 5. Converting back to degrees for the final result
 *
 * This produces natural-looking rotation animations where:
 * - Progress 0.0 yields the 'from' angle
 * - Progress 0.5 yields the midpoint along the shortest path
 * - Progress 1.0 yields the 'to' angle
 *
 * @param from - Starting rotation value in degrees with format {value: number, unit: string}
 * @param to - Ending rotation value in degrees with format {value: number, unit: string}
 * @param progress - Animation progress from 0 to 1
 * @returns Interpolated rotation value in degrees with 'deg' unit
 *
 * @example
 * // Rotating from 350° to 10° with progress 0.5 yields 0°
 * interpolateRotation({value: 350, unit: 'deg'}, {value: 10, unit: 'deg'}, 0.5)
 * // Returns {value: 0, unit: 'deg'}
 */
function interpolateRotation(
  from: NumericValue,
  to: NumericValue,
  progress: number,
  options?: RotationOptions
): NumericValue {
  const { maintainRevolution = false, direction = "clockwise" } = options || {};

  let fromDeg = from.value;
  let toDeg = to.value;

  if (!maintainRevolution) {
    fromDeg = normalizeAngle(fromDeg);
    toDeg = normalizeAngle(toDeg);
  }

  let diff = toDeg - fromDeg;
  if (!maintainRevolution) {
    switch (direction) {
      case "clockwise":
        if (diff < 0) diff += 360;
        break;
      case "counterclockwise":
        if (diff > 0) diff -= 360;
        break;
      case "shortest":
        if (Math.abs(diff) > 180) {
          diff -= Math.sign(diff) * 360;
        }
        break;
    }
  }

  const value = fromDeg + diff * progress;
  return createValue.numeric(value, "deg");
}

/**
 * Interpolates between two numeric values using linear interpolation.
 *
 * This function simply calculates the new value by adding the difference between
 * the 'from' and 'to' values to the 'from' value, scaled by the progress.
 *
 * @param from - Starting value with format {value: number, unit: string}
 * @param to - Ending value with format {value: number, unit: string}
 * @param progress - Animation progress from 0 to 1
 * @returns Interpolated value with same unit as input
 */
function interpolateLinear(
  from: NumericValue,
  to: NumericValue,
  progress: number
): NumericValue {
  const value = linear.interpolate(from.value, to.value, progress);
  return createValue.numeric(value, from.unit);
}

/**
 * Normalizes an angle to be within the range of 0 to 360 degrees.
 *
 * @param angle - The angle to normalize, in degrees
 * @returns The normalized angle, in degrees
 */
function normalizeAngle(angle: number) {
  return ((angle % 360) + 360) % 360;
}

export type RotationOptions = {
  maintainRevolution?: boolean;
  direction?: "clockwise" | "counterclockwise" | "shortest";
};

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

/**
 * Represents the complete transform state of an element.
 * Tracks all transform properties across translation, rotation, scale and skew.
 */
export type TransformState = {
  translate: {
    x: number; // Translation on X axis
    y: number; // Translation on Y axis
    z: number; // Translation on Z axis
  };
  rotate: {
    x: number; // Rotation around X axis (in degrees)
    y: number; // Rotation around Y axis (in degrees)
    z: number; // Rotation around Z axis (in degrees)
  };
  scale: {
    x: number; // Scale factor on X axis
    y: number; // Scale factor on Y axis
    z: number; // Scale factor on Z axis
  };
  skew: {
    x: number; // Skew angle on X axis (in degrees)
    y: number; // Skew angle on Y axis (in degrees)
  };
};

export type TransformAxis = "x" | "y" | "z";
