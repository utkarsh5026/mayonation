import type { TransformState } from "../types";

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
