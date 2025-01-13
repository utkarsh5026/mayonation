import { AnmimationValue } from "../core/types";

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
  from: AnmimationValue,
  to: AnmimationValue,
  progress: number
): AnmimationValue {
  if (from.value <= 0 || to.value <= 0) {
    throw new Error("Scale values must be positive numbers");
  }

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
export function interpolateRotation(
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
export function interpolateLinear(
  from: AnmimationValue,
  to: AnmimationValue,
  progress: number
): AnmimationValue {
  return {
    value: from.value + (to.value - from.value) * progress,
    unit: from.unit,
  };
}
