import { Point } from "./unit";
import { validateNumber } from "../../utils/type_validate";
import { angle, clampProgress, linear } from "../../utils/interpolate";
import { clamp, normalizeAngle } from "../../utils/math";

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
      return validResult(false, "Points are too close together");
    }

    if (!Number.isFinite(distance)) {
      return validResult(false, "Invalid distance between points");
    }

    return validResult(true);
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

/**
 * QuadraticBezierInterpolator generates points along a quadratic Bézier curve.
 *
 * A quadratic Bézier curve is defined by 3 points:
 * - P₀: Start point
 * - P₁: Control point (determines the curve's shape)
 * - P₂: End point
 *
 * The curve is calculated using the quadratic Bézier formula:
 * B(t) = (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
 * where t ranges from 0 to 1
 *
 * Key features:
 * - Smooth interpolation between start and end points
 * - Control point influences curve shape without being on the curve
 * - Interpolates position (x,y), pressure, and angle attributes
 * - Supports adaptive step sizing based on curve complexity
 *
 * Mathematical properties:
 * - The curve always passes through P₀ and P₂
 * - The curve is tangent to P₀P₁ at P₀ and P₁P₂ at P₂
 * - The curve lies within the convex hull of the control points
 */
export class QuadraticBezierInterpolator {
  private readonly maxSteps = INTERPOLATION_CONSTANTS.MAX_STEPS;
  private readonly minSteps = INTERPOLATION_CONSTANTS.MIN_STEPS;

  /**
   * Calculates a point on the quadratic Bézier curve at parameter t.
   *
   * The formula expands to:
   * x(t) = (1-t)²x₀ + 2(1-t)tx₁ + t²x₂
   * y(t) = (1-t)²y₀ + 2(1-t)ty₁ + t²y₂
   *
   * Where:
   * - (x₀,y₀) is the start point
   * - (x₁,y₁) is the control point
   * - (x₂,y₂) is the end point
   * - t ∈ [0,1] is the curve parameter
   */
  private calculateQuadraticBezierPoint(
    start: Point,
    control: Point,
    end: Point,
    t: number
  ): Point {
    const time = clampProgress(t);

    const point: Point = {
      x: this.beitzerQuadratic(time, start.x, control.x, end.x),
      y: this.beitzerQuadratic(time, start.y, control.y, end.y),
    };

    // Interpolate pressure if available using same Bézier formula
    if (
      typeof start.pressure === "number" &&
      typeof end.pressure === "number"
    ) {
      point.pressure = this.beitzerQuadratic(
        time,
        start.pressure,
        control.pressure ?? (start.pressure + end.pressure) / 2,
        end.pressure
      );
    }

    // Interpolate angle with special handling for wraparound
    if (typeof start.angle === "number" && typeof end.angle === "number") {
      point.angle = this.interpolateAngle(
        start.angle,
        end.angle,
        time,
        control.angle
      );
    }

    return point;
  }

  /**
   * Implements the quadratic Bézier formula for a single component (x, y, or pressure)
   * B(t) = (1-t)²p₁ + 2(1-t)tp₂ + t²p₃
   */
  private beitzerQuadratic(
    t: number,
    p1: number,
    p2: number,
    p3: number
  ): number {
    const tSquared = t * t;
    const tMinusOne = 1 - t;
    const tMinusOneSquared = tMinusOne * tMinusOne;

    return tMinusOneSquared * p1 + 2 * tMinusOne * t * p2 + tSquared * p3;
  }

  /**
   * Handles angle interpolation with special consideration for wraparound.
   * For example, interpolating from 350° to 10° should rotate 20° clockwise,
   * not 340° counterclockwise.
   */
  private interpolateAngle(
    startAngle: number,
    endAngle: number,
    t: number,
    controlAngle?: number
  ): number {
    startAngle = normalizeAngle(startAngle);
    endAngle = normalizeAngle(endAngle);

    if (controlAngle === undefined) {
      let diff = endAngle - startAngle;
      if (Math.abs(diff) > 180) diff -= Math.sign(diff) * 360;
      return normalizeAngle(startAngle + diff * t);
    }

    controlAngle = normalizeAngle(controlAngle);
    const result = this.beitzerQuadratic(t, startAngle, controlAngle, endAngle);
    return normalizeAngle(result);
  }

  /**
   * Validates that the control point exists and has finite coordinates
   * within safe numerical bounds.
   */
  private validateControlPoint(points: CurvePoints): ValidateNumberResult {
    if (!points.control1)
      return validResult(false, "Quadratic Bezier requires one control point");

    const validateCoordinate = (value: number, name: string) => {
      if (
        !Number.isFinite(value) ||
        Math.abs(value) > INTERPOLATION_CONSTANTS.MAX_SAFE_COORDINATE
      ) {
        return `${name} coordinate is invalid: ${value}`;
      }
      return null;
    };

    const xError = validateCoordinate(points.control1.x, "Control point x");
    if (xError) return validResult(false, xError);

    const yError = validateCoordinate(points.control1.y, "Control point y");
    if (yError) return validResult(false, yError);

    return validResult(true);
  }

  /**
   * Approximates the length of the Bézier curve using linear segments.
   * More samples provide better approximation but take longer to calculate.
   */
  private calculateApproximateLength(
    start: Point,
    control: Point,
    end: Point,
    samples: number = 50
  ): number {
    let length = 0;
    let previousPoint = start;

    for (let i = 1; i <= samples; i++) {
      const t = i / samples;
      const currentPoint = this.calculateQuadraticBezierPoint(
        start,
        control,
        end,
        t
      );

      length += Math.hypot(
        currentPoint.x - previousPoint.x,
        currentPoint.y - previousPoint.y
      );

      previousPoint = currentPoint;
    }

    return length;
  }

  /**
   * Main entry point for generating points along a quadratic Bézier curve.
   *
   * @param points - The start, control, and end points defining the curve
   * @param progress - How far along the curve to interpolate (0 to 1)
   * @param options - Configuration for step size and adaptive sampling
   * @returns Array of points along the curve
   */
  public interpolate(
    points: CurvePoints,
    progress: number,
    options: InterpolationOptions = {}
  ): Point[] {
    try {
      this.validateInputPoints(points);
      const actualSteps = this.determineStepCount(points, options);
      const clampedProgress = clampProgress(progress);
      return this.generateCurvePoints(points, clampedProgress, actualSteps);
    } catch (error) {
      if (error instanceof InterpolationError) {
        throw error;
      }
      throw new InterpolationError(
        `Unexpected error during quadratic Bezier interpolation: ${error}`,
        ErrorCodes.UNEXPECTED_ERROR
      );
    }
  }

  /**
   * Validates that required points exist and have valid coordinates
   */
  private validateInputPoints(points: CurvePoints): void {
    if (!points.start || !points.end)
      throw new InterpolationError(
        "Start and end points are required",
        ErrorCodes.INVALID_END_POINT
      );

    const controlValidation = this.validateControlPoint(points);
    if (!controlValidation.isValid)
      throw new InterpolationError(
        controlValidation.error!,
        ErrorCodes.INVALID_CONTROL_POINT
      );
  }

  /**
   * Determines how many points to generate along the curve based on:
   * - Fixed step count from options
   * - Adaptive step count based on curve length and complexity
   * - Minimum and maximum step constraints
   */
  private determineStepCount(
    points: CurvePoints,
    options: InterpolationOptions
  ): number {
    const {
      steps = INTERPOLATION_CONSTANTS.DEFAULT_STEPS,
      adaptiveSteps = false,
      minStepSize = INTERPOLATION_CONSTANTS.DEFAULT_MIN_STEP_SIZE,
    } = options;

    return adaptiveSteps
      ? this.calculateAdaptiveSteps(
          points.start,
          points.control1!,
          points.end,
          minStepSize
        )
      : this.calculateFixedSteps(steps);
  }

  /**
   * Clamps the step count between minimum and maximum values
   */
  private calculateFixedSteps(steps: number): number {
    return clamp(Math.floor(steps), this.minSteps, this.maxSteps);
  }

  /**
   * Calculates adaptive step count based on:
   * 1. Curve length - longer curves need more steps
   * 2. Curvature - more curved sections need more steps
   * 3. Minimum step size - ensures sufficient detail
   * 4. Maximum step limit - prevents excessive computation
   */
  private calculateAdaptiveSteps(
    start: Point,
    control: Point,
    end: Point,
    minStepSize: number
  ): number {
    const length = this.calculateApproximateLength(start, control, end);
    const curvature = this.calculateCurvatureMetric(start, control, end);
    const stepsPerLength = Math.ceil(length / minStepSize);

    const baseSteps = Math.max(this.minSteps, stepsPerLength);
    const scaledBaseSteps = Math.min(baseSteps, this.maxSteps / 2);
    const curvatureSteps = Math.ceil(scaledBaseSteps * curvature);

    return clamp(
      Math.floor(scaledBaseSteps + curvatureSteps),
      this.minSteps,
      this.maxSteps
    );
  }

  /**
   * Calculates a metric for curve complexity based on control point deviation.
   *
   * The metric compares the sum of distances:
   * 1. From start to control point (d₁)
   * 2. From control point to end (d₂)
   * With the direct distance from start to end (L)
   *
   * Metric = (d₁ + d₂)/L - 1
   *
   * This gives:
   * - 0 for a straight line (control point on the line)
   * - Higher values for more curved shapes
   */
  private calculateCurvatureMetric(
    start: Point,
    control: Point,
    end: Point
  ): number {
    const lineLength = Math.hypot(end.x - start.x, end.y - start.y);
    if (lineLength === 0) return 0;

    const d1 = Math.hypot(control.x - start.x, control.y - start.y);
    const d2 = Math.hypot(control.x - end.x, control.y - end.y);

    const s = (d1 + d2) / lineLength;

    return Math.max(0, s - 1);
  }

  /**
   * Generates the final array of points along the curve by:
   * 1. Calculating evenly spaced parameters
   * 2. Computing curve points at each parameter
   * 3. Validating generated points
   */
  private generateCurvePoints(
    points: CurvePoints,
    progress: number,
    steps: number
  ): Point[] {
    const result: Point[] = [];

    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * progress;
      const point = this.calculateQuadraticBezierPoint(
        points.start,
        points.control1!,
        points.end,
        t
      );

      validateGeneratedPoint(point);
      result.push(point);
    }

    return result;
  }
}

/**
 * Validates the result of a validation function and returns an object with isValid and error properties.
 * @param valid - Whether the validation passed
 * @param error - The error message if the validation failed
 * @returns An object with isValid and error properties
 */
const validResult = (valid: boolean, error?: string) => {
  return { isValid: valid, error };
};

/**
 * Validates the generated point to ensure it has valid coordinates
 */
const validateGeneratedPoint = (point: Point): void => {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new InterpolationError(
      "Generated invalid point coordinates",
      ErrorCodes.UNEXPECTED_ERROR
    );
  }
};
