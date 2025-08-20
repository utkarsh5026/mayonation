import type { TransformState } from "./units";
import { createValue, NumericValue } from "@/core/animation-val";
import { linear, logarithmic } from "@/utils/interpolators";

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
export function decomposeMatrix(matrix: DOMMatrix): TransformState {
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
export function extractRotation(matrix: Record<string, number>) {
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
 * @param options -
 * @returns Interpolated rotation value in degrees with 'deg' unit
 *
 * @example
 * // Rotating from 350° to 10° with progress 0.5 yields 0°
 * interpolateRotation({value: 350, unit: 'deg'}, {value: 10, unit: 'deg'}, 0.5)
 * // Returns {value: 0, unit: 'deg'}
 */
export function interpolateRotation(
  from: NumericValue,
  to: NumericValue,
  progress: number,
  options?: RotationOptions
): NumericValue {
  const { maintainRevolution = true, direction = "clockwise" } = options || {};

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

  const value = !maintainRevolution
    ? (fromDeg + diff * progress) % 360
    : fromDeg + diff * progress;
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
export function interpolateLinear(
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
export function normalizeAngle(angle: number) {
  return ((angle % 360) + 360) % 360;
}

export type RotationOptions = {
  maintainRevolution?: boolean;
  direction?: "clockwise" | "counterclockwise" | "shortest";
};
