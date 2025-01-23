import { Point } from "../unit";
import { validateNumber } from "../../utils/type_validate";
import { angle, clampProgress, linear } from "../../utils/interpolate";
import {
  clamp,
  distance,
  normalizeAngle,
  radiansToDegrees,
} from "../../utils/math";

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
  MAX_SAFE_COORDINATE: 1e6,

  MAX_STEPS: 120, // Reduced: ~2 points per frame at 60 FPS
  MIN_STEPS: 2,
  DEFAULT_STEPS: 30,

  DEFAULT_MIN_STEP_SIZE: 5,
  MIN_RADIUS: 1e-6,

  MIN_PRESSURE: 0,
  MAX_PRESSURE: 1,

  COMPLEXITY_SCALE: 0.5,
  MAX_COMPLEXITY_FACTOR: 2,
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
  private readonly qp: QuadraticBezierInterpolator =
    new QuadraticBezierInterpolator();
  private readonly cp: CubicBezierInterpolator = new CubicBezierInterpolator();

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
        return this.qp.interpolate(points, progress, opts);
      case "cubic":
        return this.cp.interpolate(points, progress, opts);
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
    const dist = distance(start, end);

    if (dist < INTERPOLATION_CONSTANTS.EPSILON) {
      return validResult(false, "Points are too close together");
    }

    if (!Number.isFinite(dist)) {
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
    return distance(start, end);
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
    const x = linear.interpolate(start.x, end.x, t);
    const y = linear.interpolate(start.y, end.y, t);
    return pointCreate(x, y);
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
    return radiansToDegrees(Math.atan2(end.y - start.y, end.x - start.x));
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
    const oneMinusT = 1 - t;
    const tMinusOneSquared = oneMinusT * oneMinusT;

    return tMinusOneSquared * p1 + 2 * oneMinusT * t * p2 + tSquared * p3;
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
    if (controlAngle === undefined)
      return angle.interpolate(startAngle, endAngle, t);

    const result = this.beitzerQuadratic(
      t,
      normalizeAngle(startAngle),
      normalizeAngle(controlAngle),
      normalizeAngle(endAngle)
    );
    return normalizeAngle(result);
  }

  /**
   * Validates that the control point exists and has finite coordinates
   * within safe numerical bounds.
   */
  private validateControlPoint(points: CurvePoints): ValidateNumberResult {
    if (!points.control1)
      return validResult(false, "Quadratic Bezier requires one control point");

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
      length += distance(currentPoint, previousPoint);

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
   * Calculates adaptive step count based on curve complexity
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
    const lineLength = distance(start, end);
    if (lineLength === 0) return 0;
    const d1 = distance(control, start);
    const d2 = distance(control, end);
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
 * CubicBezierInterpolator generates points along a cubic Bézier curve.
 *
 * A cubic Bézier curve is defined by 4 points:
 * - P₀: Start point
 * - P₁: First control point
 * - P₂: Second control point
 * - P₃: End point
 *
 * The curve is calculated using the cubic Bézier formula:
 * B(t) = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
 * where t ranges from 0 to 1
 *
 * Key features:
 * - Smooth interpolation between start and end points
 * - Two control points provide precise shape control
 * - Interpolates position (x,y), pressure, and angle attributes
 * - Supports adaptive step sizing based on curve complexity
 *
 * Mathematical properties:
 * - The curve always passes through P₀ and P₃
 * - The curve is tangent to P₀P₁ at P₀ and P₂P₃ at P₃
 * - The curve lies within the convex hull of the control points
 * - First derivative: B'(t) = 3(1-t)²(P₁-P₀) + 6(1-t)t(P₂-P₁) + 3t²(P₃-P₂)
 * - Second derivative: B''(t) = 6(1-t)(P₂-2P₁+P₀) + 6t(P₃-2P₂+P₁)
 */
export class CubicBezierInterpolator {
  private readonly minSteps = INTERPOLATION_CONSTANTS.MIN_STEPS;
  private readonly maxSteps = INTERPOLATION_CONSTANTS.MAX_STEPS;

  /**
   * Interpolates points along a cubic Bézier curve.
   *
   * The method:
   * 1. Validates input points and parameters
   * 2. Determines optimal number of steps based on curve complexity
   * 3. Generates evenly spaced points along the curve
   * 4. Interpolates pressure and angle attributes if present
   *
   * @param points - The curve's defining points (start, end, and two control points)
   * @param progress - How far along the curve to interpolate (0 to 1)
   * @param options - Configuration options for interpolation
   * @returns Array of points along the curve
   *
   * @throws {InterpolationError} If inputs are invalid or calculation fails
   */
  public interpolate(
    points: CurvePoints,
    progress: number,
    options: InterpolationOptions = {}
  ): Point[] {
    try {
      this.validateInputPoints(points);
      const clampedProgress = clampProgress(progress);
      const actualSteps = this.determineStepCount(points, options);

      const result: Point[] = [];

      for (let i = 0; i <= actualSteps; i++) {
        const t = (i / actualSteps) * clampedProgress;
        const point = this.calculateCubicBezierPoint(
          points.start,
          points.control1!,
          points.control2!,
          points.end,
          t
        );

        // Validate generated point
        if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
          throw new InterpolationError(
            "Generated invalid point coordinates",
            ErrorCodes.UNEXPECTED_ERROR
          );
        }

        result.push(point);
      }

      return result;
    } catch (error) {
      if (error instanceof InterpolationError) {
        throw error;
      }
      throw new InterpolationError(
        `Unexpected error during cubic Bezier interpolation: ${error}`,
        ErrorCodes.UNEXPECTED_ERROR
      );
    }
  }

  /**
   * Validates the required points for cubic Bézier interpolation.
   * A cubic Bézier curve requires 4 valid points:
   * - Start point (P₀)
   * - Two control points (P₁, P₂)
   * - End point (P₃)
   */
  private validateInputPoints(points: CurvePoints): void {
    if (!points.start || !points.end) {
      throw new InterpolationError(
        "Start and end points are required",
        ErrorCodes.INVALID_END_POINT
      );
    }

    const controlValidation = this.validateControlPoints(points);
    if (!controlValidation.isValid) {
      throw new InterpolationError(
        controlValidation.error!,
        ErrorCodes.INVALID_CONTROL_POINT
      );
    }
  }

  /**
   * Determines the number of interpolation steps based on curve properties.
   *
   * Two methods are supported:
   * 1. Fixed step count: Uses the provided steps value
   * 2. Adaptive steps: Calculates steps based on:
   *    - Curve length
   *    - Curvature complexity
   *    - Minimum step size requirement
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
          points.control2!,
          points.end,
          minStepSize
        )
      : this.calculateFixedSteps(steps);
  }

  /**
   * Ensures the step count is within valid bounds.
   * Steps are clamped between minSteps and maxSteps to prevent:
   * - Too few steps (poor curve resolution)
   * - Too many steps (performance issues)
   */
  private calculateFixedSteps(steps: number): number {
    return clamp(Math.floor(steps), this.minSteps, this.maxSteps);
  }

  /**
   * Calculates a point on a cubic Bézier curve at parameter t.
   *
   * The formula expands to:
   * x(t) = (1-t)³x₀ + 3(1-t)²tx₁ + 3(1-t)t²x₂ + t³x₃
   * y(t) = (1-t)³y₀ + 3(1-t)²ty₁ + 3(1-t)t²y₂ + t³y₃
   *
   * Where:
   * - (x₀,y₀) is the start point
   * - (x₁,y₁) is the first control point
   * - (x₂,y₂) is the second control point
   * - (x₃,y₃) is the end point
   * - t ∈ [0,1] is the curve parameter
   */
  private calculateCubicBezierPoint(
    start: Point,
    control1: Point,
    control2: Point,
    end: Point,
    t: number
  ): Point {
    const time = clampProgress(t);

    const point: Point = {
      x: this.cubicBezier(start.x, control1.x, control2.x, end.x, time),
      y: this.cubicBezier(start.y, control1.y, control2.y, end.y, time),
    };

    if (
      typeof start.pressure === "number" &&
      typeof end.pressure === "number"
    ) {
      point.pressure = this.cubicBezier(
        start.pressure,
        control1.pressure ?? start.pressure,
        control2.pressure ?? end.pressure,
        end.pressure,
        time
      );
    }

    if (typeof start.angle === "number" && typeof end.angle === "number") {
      point.angle = this.interpolateAngle(
        start.angle,
        end.angle,
        time,
        control1.angle,
        control2.angle
      );
    }

    return point;
  }

  /**
   * Implements the cubic Bézier formula for a single dimension.
   *
   * Formula: B(t) = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
   *
   * This is the Bernstein polynomial form of the curve where:
   * - (1-t)³ is the weight for P₀
   * - 3(1-t)²t is the weight for P₁
   * - 3(1-t)t² is the weight for P₂
   * - t³ is the weight for P₃
   */
  private cubicBezier(
    start: number,
    control1: number,
    control2: number,
    end: number,
    t: number
  ): number {
    const oneMinusT = 1 - t;
    const oneMinusTSquared = oneMinusT * oneMinusT;
    const oneMinusTCubed = oneMinusTSquared * oneMinusT;
    const tSquared = t * t;
    const tCubed = tSquared * t;

    return (
      oneMinusTCubed * start +
      3 * oneMinusTSquared * t * control1 +
      3 * oneMinusT * tSquared * control2 +
      tCubed * end
    );
  }

  /**
   * Interpolates angles along the Bézier curve with wraparound handling.
   *
   * For angles, special handling is needed because:
   * 1. Angles wrap around (360° = 0°)
   * 2. The shortest path between angles must be used
   * 3. Control point angles influence the path of rotation
   *
   * The method:
   * 1. Normalizes all angles to [-180°, 180°]
   * 2. Uses cubic Bézier interpolation if control angles are provided
   * 3. Falls back to linear angle interpolation if no control angles
   */
  private interpolateAngle(
    startAngle: number,
    endAngle: number,
    t: number,
    control1Angle?: number,
    control2Angle?: number
  ): number {
    if (control1Angle && control2Angle) {
      const finalAngle = this.cubicBezier(
        normalizeAngle(startAngle),
        normalizeAngle(control1Angle),
        normalizeAngle(control2Angle),
        normalizeAngle(endAngle),
        t
      );

      return normalizeAngle(finalAngle);
    }
    return angle.interpolate(startAngle, endAngle, t);
  }

  /**
   * Validates the control points for the cubic Bézier curve.
   *
   * Checks:
   * 1. Both control points must be present
   * 2. Coordinates must be finite numbers
   * 3. Coordinates must be within safe bounds
   *
   * The MAX_SAFE_COORDINATE constant prevents:
   * - Overflow in calculations
   * - Precision loss in floating point math
   * - Performance issues with extreme values
   */
  private validateControlPoints(points: CurvePoints): ValidateNumberResult {
    if (!points.control1 || !points.control2) {
      return {
        isValid: false,
        error: "Cubic Bezier requires two control points",
      };
    }

    const points_to_validate = [
      { point: points.control1, name: "Control point 1" },
      { point: points.control2, name: "Control point 2" },
    ];

    for (const { point, name } of points_to_validate) {
      const xError = validateCoordinate(point.x, `${name} x`);
      if (xError) return { isValid: false, error: xError };

      const yError = validateCoordinate(point.y, `${name} y`);
      if (yError) return { isValid: false, error: yError };
    }

    return { isValid: true };
  }

  /**
   * Approximates the length of a cubic Bézier curve using adaptive sampling.
   *
   * Method:
   * 1. Divides curve into samples
   * 2. Calculates points at each sample
   * 3. Sums the distances between consecutive points
   *
   * This is an approximation because:
   * - Bézier curve length has no closed-form solution
   * - More samples = better accuracy but slower performance
   * - Default 100 samples balances accuracy and speed
   */
  private calculateApproximateLength(
    start: Point,
    control1: Point,
    control2: Point,
    end: Point,
    samples: number = 100
  ): number {
    let length = 0;
    let previousPoint = start;

    for (let i = 1; i <= samples; i++) {
      const t = i / samples;
      const currentPoint = this.calculateCubicBezierPoint(
        start,
        control1,
        control2,
        end,
        t
      );

      length += distance(currentPoint, previousPoint);
      previousPoint = currentPoint;
    }

    return length;
  }

  /**
   * Calculates adaptive step count based on curve complexity.
   *
   * The method considers:
   * 1. Curve length: Longer curves need more steps
   * 2. Curvature: More complex shapes need more steps
   * 3. Minimum step size: Ensures sufficient detail
   *
   * Formula for final steps:
   * 1. baseSteps = ceil(curveLength / minStepSize)
   * 2. complexityFactor = log₂(1 + curvature * 10) + 1
   * 3. scaledSteps = ceil(baseSteps * complexityFactor)
   * 4. Apply logarithmic scaling for high step counts
   * 5. Clamp between minSteps and maxSteps
   */
  private calculateAdaptiveSteps(
    start: Point,
    control1: Point,
    control2: Point,
    end: Point,
    minStepSize: number
  ): number {
    const length = this.calculateApproximateLength(
      start,
      control1,
      control2,
      end,
      8
    );
    const baseSteps = Math.ceil(length / minStepSize);
    const curvature = this.calculateCurvatureMetric(
      start,
      control1,
      control2,
      end
    );
    const complexityFactor = Math.log2(1 + curvature * 10) + 1;
    const scaledSteps = Math.ceil(baseSteps * complexityFactor);
    const finalSteps =
      scaledSteps > this.maxSteps / 2
        ? Math.ceil(
            this.maxSteps / 2 + Math.log2(1 + scaledSteps - this.maxSteps / 2)
          )
        : scaledSteps;

    return clamp(finalSteps, this.minSteps, this.maxSteps);
  }

  /**
   * Calculates a metric for curve complexity.
   *
   * The metric combines three factors:
   * 1. Control Point Deviation:
   *    - Measures how far control points deviate from the baseline
   *    - Uses perpendicular distance from control points to start-end line
   *    - Formula: distance(control, projection) / lineLength
   *
   * 2. Control Point Spacing:
   *    - Measures relative spacing between control points
   *    - Formula: distance(control1, control2) / lineLength
   *
   * 3. Angular Variation:
   *    - Detects sharp turns in the curve
   *    - Measures maximum angle difference between segments
   *    - Normalized to [0,1] by dividing by π
   *
   * Final metric = deviation * 0.5 + spacing * 0.2 + angles * 0.3
   *
   * Weights prioritize:
   * - Control point deviation (50%): Most important for curve shape
   * - Angular variation (30%): Important for detecting sharp turns
   * - Control point spacing (20%): Less critical but still relevant
   */
  private calculateCurvatureMetric(
    start: Point,
    control1: Point,
    control2: Point,
    end: Point
  ): number {
    const lineLength = distance(start, end);
    if (lineLength === 0) return 0;

    const points = { start, control1, control2, end };
    const controlSpacing = this.calculateControlSpacing(points);
    const maxAngleChange = this.calculateAngularVariation(points);

    const averageDeviation = this.calculateControlPointDeviation(points);
    return this.combineCurvatureMetrics(
      averageDeviation,
      controlSpacing,
      maxAngleChange
    );
  }

  /**
   * Calculates the relative spacing between control points.
   *
   * This measures how spread out the control points are relative to the curve's baseline length.
   * A higher value indicates the control points are far apart, suggesting a more complex curve.
   *
   * Mathematical calculation:
   * spacing = |C₁C₂| / |SE|
   * where:
   * - |C₁C₂| is the distance between control points 1 and 2
   * - |SE| is the distance between start and end points
   *
   * @param points The curve points containing start, end and control points
   * @returns A dimensionless ratio >= 0 indicating relative control point spacing
   */
  private calculateControlSpacing(
    points: Required<Omit<CurvePoints, "arcParams">>
  ): number {
    const startToEnd = distance(points.start, points.end);
    const control1ToControl2 = distance(points.control1, points.control2);
    return control1ToControl2 / startToEnd;
  }

  /**
   * Calculates how far the control points deviate from the baseline.
   *
   * This measures the average perpendicular distance of control points from the start-end line,
   * normalized by the curve's baseline length. Higher values indicate more dramatic curves.
   *
   * Mathematical steps:
   * 1. For each control point C:
   *    a. Calculate projection P onto start-end line SE using vector projection:
   *       t = ((C-S)·(E-S)) / |E-S|²
   *       P = S + t(E-S)
   *    b. Find perpendicular distance: |CP|
   *
   * 2. Average the two distances and normalize:
   *    deviation = (|C₁P₁| + |C₂P₂|) / (2|SE|)
   *
   * @param points The curve points containing start, end and control points
   * @returns A dimensionless ratio >= 0 indicating average control point deviation
   */
  private calculateControlPointDeviation(
    points: Required<Omit<CurvePoints, "arcParams">>
  ) {
    const { start, end } = points;
    const lineLength = distance(start, end);
    const getPerpendicularDistance = (control: Point) => {
      const dotProduct =
        (control.x - start.x) * (end.x - start.x) +
        (control.y - start.y) * (end.y - start.y);
      const t = dotProduct / (lineLength * lineLength);

      const projectedPoint = pointCreate(
        start.x + t * (end.x - start.x),
        start.y + t * (end.y - start.y)
      );
      return distance(control, projectedPoint);
    };

    const control1Deviation = getPerpendicularDistance(points.control1);
    const control2Deviation = getPerpendicularDistance(points.control2);
    return (control1Deviation + control2Deviation) / (2 * lineLength);
  }

  /**
   * Calculates the maximum angular variation between curve segments.
   *
   * This detects sharp turns in the curve by measuring the largest angle change
   * between consecutive segments: start→control1, control1→control2, and control2→end.
   *
   * Mathematical steps:
   * 1. Calculate angles θᵢ for each segment using atan2:
   *    θᵢ = atan2(yᵢ₊₁-yᵢ, xᵢ₊₁-xᵢ)
   *
   * 2. Find angle changes between consecutive segments:
   *    Δθᵢ = |normalize(θᵢ₊₁ - θᵢ)|
   *    where normalize brings angle to [-π,π]
   *
   * 3. Take maximum change and normalize to [0,1]:
   *    variation = max(Δθ₁, Δθ₂) / π
   *
   * @param points The curve points containing start, end and control points
   * @returns A value in [0,1] indicating maximum angular variation
   */
  private calculateAngularVariation(
    points: Required<Omit<CurvePoints, "arcParams">>
  ): number {
    const { start, control1, control2, end } = points;
    const startToControl1 = Math.atan2(
      control1.y - start.y,
      control1.x - start.x
    );
    const control1ToControl2 = Math.atan2(
      control2.y - control1.y,
      control2.x - control1.x
    );
    const control2ToEnd = Math.atan2(end.y - control2.y, end.x - control2.x);
    const angleChange1 = Math.abs(
      normalizeAngle(control1ToControl2 - startToControl1)
    );
    const angleChange2 = Math.abs(
      normalizeAngle(control2ToEnd - control1ToControl2)
    );

    return Math.max(angleChange1, angleChange2) / Math.PI;
  }

  /**
   * Combines individual curvature metrics into a final complexity score.
   *
   * The final metric is a weighted sum of:
   * - Control point deviation (50%): How far control points are from baseline
   * - Control point spacing (20%): How spread apart the control points are
   * - Angular variation (30%): How sharply the curve changes direction
   *
   * These weights prioritize the visual impact of the curve shape while
   * accounting for both smooth variations and sharp turns.
   *
   * @param deviation The normalized control point deviation [0,∞)
   * @param spacing The normalized control point spacing [0,∞)
   * @param angleChange The normalized angular variation [0,1]
   * @returns A combined complexity metric ≥ 0
   */
  private combineCurvatureMetrics(
    deviation: number,
    spacing: number,
    angleChange: number
  ): number {
    return deviation * 0.5 + spacing * 0.2 + angleChange * 0.3;
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

/**
 * Creates a point object with optional pressure and angle properties
 */
const pointCreate = (
  x: number,
  y: number,
  pressure?: number,
  angle?: number
) => {
  return { x, y, pressure, angle };
};

/*
 *  Validate the coordinate to ensure it is a finite number and within the safe bounds
 */
const validateCoordinate = (value: number, name: string) => {
  if (
    !Number.isFinite(value) ||
    Math.abs(value) > INTERPOLATION_CONSTANTS.MAX_SAFE_COORDINATE
  ) {
    return `${name} coordinate is invalid: ${value}`;
  }
  return null;
};
