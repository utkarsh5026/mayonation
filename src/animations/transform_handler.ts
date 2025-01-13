import {
  NumericUnit,
  TransformState,
  AnmimationValue,
  TransformAxis,
  TransformPropertyName,
} from "../core/types";

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

class TransformHandler {
  private transformState: TransformState;
  private hasStateChanges: boolean = false;
  private currentTransform: string = "";

  static readonly rotationUnits: NumericUnit[] = ["deg"];
  static readonly scaleUnits: NumericUnit[] = ["px", "%", "em", "rem"];
  static readonly translationUnits: NumericUnit[] = ["px", "%", "em", "rem"];

  constructor(el: HTMLElement) {
    this.transformState = {
      translate: { x: 0, y: 0, z: 0 },
      rotate: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      skew: { x: 0, y: 0 },
    };
    this.parseInitialTransforms(el);
  }

  protected getAllowedUnits(property: TransformPropertyName): NumericUnit[] {
    if (property.startsWith("translate"))
      return TransformHandler.translationUnits;
    if (property.startsWith("rotate")) return TransformHandler.rotationUnits;
    if (property.startsWith("scale")) return TransformHandler.scaleUnits;

    return ["px"];
  }

  private parseInitialTransforms(element: HTMLElement) {
    const { transform } = window.getComputedStyle(element);
    if (transform && transform !== "none") {
      const matrix = new DOMMatrix(transform);
      this.transformState = decomposeMatrix(matrix);
    }
  }

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

  private isShorthandProperty(property: string): boolean {
    return property === "translate" || property === "scale";
  }

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

  public computeTransform(): string {
    if (!this.hasStateChanges) return this.currentTransform;

    this.currentTransform = this.generateTransformString();
    this.hasStateChanges = false;
    return this.currentTransform;
  }

  public updateTransform(
    property: TransformPropertyName,
    value: AnmimationValue
  ): void {
    this.updateTransformState(property, value);
    this.hasStateChanges = true;
  }

  public updateTransforms(
    updates: Map<TransformPropertyName, AnmimationValue>
  ): void {
    updates.forEach((value, property) => {
      this.updateTransformState(property, value);
    });
    this.hasStateChanges = true;
  }

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

  public parseTransformValue(
    property: TransformPropertyName,
    value: number
  ): AnmimationValue {
    return { value: value, unit: transformProperties.get(property)! };
  }

  public static isTransformProperty(property: string): boolean {
    return transformProperties.has(property as TransformPropertyName);
  }

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
function interpolateScale(
  from: AnmimationValue,
  to: AnmimationValue,
  progress: number
): AnmimationValue {
  const fromLog = Math.log(from.value);
  const toLog = Math.log(to.value);
  const interpolatedLog = fromLog + (toLog - fromLog) * progress;
  return { value: Math.exp(interpolatedLog), unit: from.unit };
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
  from: AnmimationValue,
  to: AnmimationValue,
  progress: number
): AnmimationValue {
  const fromRad = from.value * (Math.PI / 180);
  const toRad = to.value * (Math.PI / 180);

  let diff = toRad - fromRad;
  if (Math.abs(diff) > Math.PI) diff -= Math.sign(diff) * 2 * Math.PI;

  const interpolatedRad = fromRad + diff * progress;
  return { value: interpolatedRad * (180 / Math.PI), unit: "deg" };
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
  from: AnmimationValue,
  to: AnmimationValue,
  progress: number
): AnmimationValue {
  return {
    value: from.value + (to.value - from.value) * progress,
    unit: from.unit,
  };
}

export default TransformHandler;
