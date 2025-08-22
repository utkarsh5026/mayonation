import type { EaseFn, EaseFnName } from "@/core/ease-fns";

/**
 * Error types for path animation
 */
export enum PathErrorType {
  INVALID_PATH = "INVALID_PATH",
  INVALID_COMMAND = "INVALID_COMMAND",
  TRANSFORM_ERROR = "TRANSFORM_ERROR",
  STYLE_ERROR = "STYLE_ERROR",
  ANIMATION_ERROR = "ANIMATION_ERROR",
  INVALID_ELEMENT = "INVALID_ELEMENT",
}

export type PathCommandType =
  | "M"
  | "L"
  | "H"
  | "V"
  | "C"
  | "S"
  | "Q"
  | "T"
  | "A"
  | "Z";

/**
 * Core PathCommand interface representing a single SVG path command
 * Each command has a type (like M, L, C) and its parameters
 */
export type PathCommand = {
  type: PathCommandType; // The command type (M, L, C, etc)
  values: number[]; // Numeric parameters for the command
  relative: boolean; // Whether it's a relative command
  endPoint: Point; // End point for the command
  controlPoints?: Point[]; // Control points for curves
  params?: {
    radius?: number;
    rotation?: number;
    largeArc?: boolean;
    sweep?: boolean;
  };
};

/**
 * Represents a 2D point in the coordinate system
 */
export type Point = {
  x: number;
  y: number;
  pressure?: number;
  angle?: number;
};

/**
 * Configuration options for path animations
 */
export type PathAnimationOptions = {
  duration: number; // Animation duration in ms
  easing?: EaseFn | EaseFnName; // Easing function
  autoClose?: boolean; // Whether to auto-close paths
  precision?: number; // Decimal precision for calculations
  optimizePaths?: boolean; // Whether to optimize paths
};

export type PathStyleProperties = Partial<{
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  dasharray: number[];
  dashoffset: number;
}>;

export type BoundingBox = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type PathTransformProperties = Partial<{
  translate: {
    x: number;
    y: number;
  };
  rotate: {
    angle: number;
    origin?: Point;
  };
  scale: {
    x: number;
    y: number;
    origin?: Point;
  };
  skew: {
    x: number;
    y: number;
  };
}>;

export type PathAnimationConfig = Partial<{
  targetPath: string;
  styleProperties: PathStyleProperties;
  transformProperties: PathTransformProperties;
  options: PathAnimationOptions;
  drawingEffect: {
    enabled: boolean;
    reverse: boolean;
  };
}>;

export type AnimationState = {
  path: {
    current: string;
    target?: string;
    commands: PathCommand[];
  };
  style: Required<PathStyleProperties>;
  transform: Required<PathTransformProperties>;
  drawing: {
    progress: number;
    length: number;
    dashArray: number[];
    dashOffset: number;
  };
};

export class PathError extends Error {
  constructor(
    public type: PathErrorType,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = "PathError";
  }
}
