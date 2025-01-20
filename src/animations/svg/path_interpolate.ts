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

export class LineInterpolator {
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
      validateNumber(progress, "Progress");
      progress = clampProgress(progress);

      if (progress === 0) return [{ ...from }];

      const distanceValidation = this.validateDistance(from, to);
      if (!distanceValidation.isValid) {
        if (distanceValidation.error === "Points are too close together") {
          return [{ ...from }];
        }
        throw new InterpolationError(
          distanceValidation.error!,
          ErrorCodes.INVALID_END_POINT
        );
      }

      const actualSteps = clamp(
        steps,
        INTERPOLATION_CONSTANTS.MIN_STEPS,
        INTERPOLATION_CONSTANTS.MAX_STEPS
      );
      const points: Point[] = [];

      for (let i = 0; i <= actualSteps; i++) {
        const t = (i / actualSteps) * progress;

        const point: Point = {
          x: linear.interpolate(from.x, to.x, t),
          y: linear.interpolate(from.y, to.y, t),
        };

        if (
          includePressure &&
          typeof from.pressure === "number" &&
          typeof to.pressure === "number"
        ) {
          point.pressure = linear.interpolate(from.pressure, to.pressure, t);
        }

        if (
          includeAngle &&
          typeof from.angle === "number" &&
          typeof to.angle === "number"
        ) {
          point.angle = angle.interpolate(from.angle, to.angle, t);
        }

        points.push(point);
      }

      return points;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      throw new InterpolationError(
        `Unexpected error during line interpolation: ${errMsg}`,
        ErrorCodes.UNEXPECTED_ERROR
      );
    }
  }

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
   * Calculates the total length of the line
   */
  public calculateLength(start: Point, end: Point): number {
    return Math.hypot(end.x - start.x, end.y - start.y);
  }

  /**
   * Gets a point at a specific distance along the line
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
   * Gets the angle of the line in degrees
   */
  public getAngle(start: Point, end: Point): number {
    return Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI);
  }
}
