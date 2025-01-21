import { Point } from "./unit";
import { validateNumber } from "../../utils/type_validate";
import { angle, clampProgress, linear } from "../../utils/interpolate";
import { clamp } from "../../utils/math";

export class InterpolationError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "InterpolationError";
  }
}

export const ErrorCodes = {
  INVALID_START_POINT: "INVALID_START_POINT",
  INVALID_END_POINT: "INVALID_END_POINT",
  INVALID_CONTROL_POINT: "INVALID_CONTROL_POINT",
  INVALID_PROGRESS: "INVALID_PROGRESS",
  INVALID_STEPS: "INVALID_STEPS",
  INVALID_RADIUS: "INVALID_RADIUS",
  INVALID_ROTATION: "INVALID_ROTATION",
  INVALID_ARC_PARAMS: "INVALID_ARC_PARAMS",
  UNEXPECTED_ERROR: "UNEXPECTED_ERROR",
} as const;

export const INTERPOLATION_CONSTANTS = {
  EPSILON: 1e-10,
  MAX_STEPS: 1000,
  MIN_STEPS: 2,
  MIN_RADIUS: 1e-6,
  MAX_SAFE_COORDINATE: 1e6,
  DEFAULT_STEPS: 10,
  MIN_PRESSURE: 0,
  MAX_PRESSURE: 1,
  DEFAULT_MIN_STEP_SIZE: 0.1,
} as const;

type ValidateNumberResult = {
  isValid: boolean;
  error?: string;
};

export type ArcParameters = {
  radius: { x: number; y: number };
  rotation: number;
  largeArc: boolean;
  sweep: boolean;
};

export type CurvePoints = {
  start: Point;
  end: Point;
  control1?: Point;
  control2?: Point;
  arcParams?: ArcParameters;
};

export type InterpolationOptions = Partial<{
  steps: number;
  adaptiveSteps: boolean;
  minStepSize: number;
  includePressure: boolean;
  includeAngle: boolean;
}>;

type PathTypes = "line" | "quadratic" | "cubic" | "arc";

export class PathInterpolator {
  private readonly lp: LineInterpolator = new LineInterpolator();

  public interpolate(
    path: PathTypes,
    points: CurvePoints,
    progress: number,
    opts: InterpolationOptions = {}
  ): Point[] {
    switch (path) {
      case "line":
        return this.lp.interpolate(points.start, points.end, progress, opts);
      case "quadratic":
      case "cubic":
      case "arc":
      default:
        throw new InterpolationError(
          `Unsupported path type: ${path}`,
          ErrorCodes.UNEXPECTED_ERROR
        );
    }
  }
}

/**
 * LineInterpolator provides functionality for interpolating points along a straight line.
 * This is useful for creating smooth animations between two points or generating
 * evenly spaced points along a line segment.
 */
export class LineInterpolator {
  /**
   * Interpolates points between two positions with configurable parameters.
   *
   * @param from - The starting point with x,y coordinates and optional pressure/angle
   * @param to - The ending point with x,y coordinates and optional pressure/angle
   * @param progress - A value between 0-1 indicating how far along the line to interpolate
   * @param opts - Optional configuration:
   *   - steps: Number of interpolation steps (default: 10)
   *   - includePressure: Whether to interpolate pressure values (default: true)
   *   - includeAngle: Whether to interpolate angle values (default: true)
   *
   * @returns An array of interpolated points between start and end positions
   *
   * @throws {InterpolationError} If the points are invalid or too close together
   *
   * @example
   * ```ts
   * const interpolator = new LineInterpolator();
   * const points = interpolator.interpolate(
   *   {x: 0, y: 0},
   *   {x: 10, y: 10},
   *   0.5
   * );
   * // Returns points from (0,0) to (5,5)
   * ```
   */
  public interpolate(
    from: Point,
    to: Point,
    progress: number,
    opts: InterpolationOptions = {}
  ): Point[] {
    const {
      steps = INTERPOLATION_CONSTANTS.DEFAULT_STEPS,
      includePressure = true,
      includeAngle = true,
    } = opts;

    try {
      progress = this.validateAndClampProgress(progress);
      if (progress === 0) return [{ ...from }];

      if (!this.handleDistanceValidation(this.validateDistance(from, to)))
        return [{ ...from }];

      const actualSteps = this.calculateSteps(steps);
      return this.generateInterpolatedPoints(from, to, progress, actualSteps, {
        includePressure,
        includeAngle,
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      throw new InterpolationError(
        `Unexpected error during line interpolation: ${errMsg}`,
        ErrorCodes.UNEXPECTED_ERROR
      );
    }
  }

  /**
   * Validates and clamps the progress value to ensure it's a valid number between 0-1.
   *
   * @param progress - The progress value to validate and clamp
   * @returns The validated and clamped progress value
   * @throws {InterpolationError} If progress is not a valid number
   * @internal
   */
  private validateAndClampProgress(progress: number): number {
    validateNumber(progress, "Progress");
    return clampProgress(progress);
  }

  /**
   * Calculates the actual number of interpolation steps, clamped between min and max values.
   *
   * @param steps - The requested number of steps
   * @returns The clamped number of steps between MIN_STEPS and MAX_STEPS
   * @internal
   */
  private calculateSteps(steps: number): number {
    return clamp(
      steps,
      INTERPOLATION_CONSTANTS.MIN_STEPS,
      INTERPOLATION_CONSTANTS.MAX_STEPS
    );
  }

  /**
   * Handles validation of distance between points and determines appropriate response.
   *
   * @param validation - The validation result object
   * @returns false if points are too close, true if validation passes
   * @throws {InterpolationError} If points are invalid for reasons other than being too close
   * @internal
   */
  private handleDistanceValidation(validation: ValidateNumberResult): boolean {
    if (!validation.isValid) {
      if (validation.error === "Points are too close together") {
        return false;
      }
      throw new InterpolationError(
        validation.error!,
        ErrorCodes.INVALID_END_POINT
      );
    }
    return true;
  }

  /**
   * Generates an array of interpolated points between two positions.
   *
   * @param from - Starting point
   * @param to - Ending point
   * @param progress - Progress value between 0-1
   * @param steps - Number of interpolation steps
   * @param opts - Options for including pressure and angle interpolation
   * @returns Array of interpolated points
   * @internal
   */
  private generateInterpolatedPoints(
    from: Point,
    to: Point,
    progress: number,
    steps: number,
    opts: { includePressure: boolean; includeAngle: boolean }
  ): Point[] {
    const points: Point[] = [];

    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * progress;
      const point = this.interpolatePoint(from, to, t, opts);
      points.push(point);
    }

    return points;
  }

  /**
   * Interpolates a single point along the line between two positions.
   * Handles interpolation of x,y coordinates as well as optional pressure and angle values.
   *
   * @param from - Starting point with optional pressure/angle
   * @param to - Ending point with optional pressure/angle
   * @param t - Interpolation parameter between 0-1
   * @param opts - Options for including pressure and angle interpolation
   * @returns Interpolated point with optional pressure/angle values
   * @internal
   */
  private interpolatePoint(
    from: Point,
    to: Point,
    t: number,
    opts: { includePressure: boolean; includeAngle: boolean }
  ): Point {
    const point: Point = {
      x: linear.interpolate(from.x, to.x, t),
      y: linear.interpolate(from.y, to.y, t),
    };

    if (
      opts.includePressure &&
      typeof from.pressure === "number" &&
      typeof to.pressure === "number"
    ) {
      point.pressure = linear.interpolate(from.pressure, to.pressure, t);
    }

    if (
      opts.includeAngle &&
      typeof from.angle === "number" &&
      typeof to.angle === "number"
    ) {
      point.angle = angle.interpolate(from.angle, to.angle, t);
    }

    return point;
  }

  /**
   * Validates if two points are at a valid distance from each other.
   * Points that are too close together (less than EPSILON) or at invalid distances
   * (infinite/NaN) are rejected.
   *
   * @param start - The starting point
   * @param end - The ending point
   * @returns Object indicating if distance is valid and any error message
   *
   * @internal
   */
  private validateDistance(start: Point, end: Point): ValidateNumberResult {
    const distance = Math.hypot(end.x - start.x, end.y - start.y);

    if (distance < INTERPOLATION_CONSTANTS.EPSILON) {
      return {
        isValid: false,
        error: "Points are too close together",
      };
    }

    if (!Number.isFinite(distance)) {
      return {
        isValid: false,
        error: "Invalid distance between points",
      };
    }

    return { isValid: true };
  }

  /**
   * Calculates the straight-line distance between two points using the Pythagorean theorem.
   *
   * @param start - The starting point
   * @param end - The ending point
   * @returns The distance between the points
   *
   * @example
   * ```ts
   * const length = interpolator.calculateLength({x: 0, y: 0}, {x: 3, y: 4});
   * // Returns 5
   * ```
   */
  public calculateLength(start: Point, end: Point): number {
    return Math.hypot(end.x - start.x, end.y - start.y);
  }

  /**
   * Gets the coordinates of a point at a specific distance along the line.
   * Useful for finding intermediate points based on distance rather than percentage.
   *
   * @param start - The starting point
   * @param end - The ending point
   * @param distance - The distance along the line to find the point
   * @returns The point at the specified distance
   *
   * @example
   * ```ts
   * const point = interpolator.getPointAtDistance(
   *   {x: 0, y: 0},
   *   {x: 10, y: 0},
   *   5
   * );
   * // Returns {x: 5, y: 0}
   * ```
   */
  public getPointAtDistance(start: Point, end: Point, distance: number): Point {
    const totalLength = this.calculateLength(start, end);
    if (totalLength === 0) return { ...start };

    const t = Math.max(0, Math.min(1, distance / totalLength));

    return {
      x: linear.interpolate(start.x, end.x, t),
      y: linear.interpolate(start.y, end.y, t),
    };
  }

  /**
   * Calculates the angle of the line in degrees relative to the positive x-axis.
   * - Returns 0° for a horizontal line going right
   * - Returns 90° for a vertical line going up
   * - Returns 180° for a horizontal line going left
   * - Returns -90° for a vertical line going down
   *
   * @param start - The starting point
   * @param end - The ending point
   * @returns The angle in degrees (-180° to 180°)
   *
   * @example
   * ```ts
   * const angle = interpolator.getAngle(
   *   {x: 0, y: 0},
   *   {x: 10, y: 10}
   * );
   * // Returns 45
   * ```
   */
  public getAngle(start: Point, end: Point): number {
    return Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI);
  }
}
