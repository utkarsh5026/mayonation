export type TranslateProperties =
  | "translateX" // X-axis translation
  | "translateY" // Y-axis translation
  | "translateZ"; // Z-axis translation

export type RotateProperties =
  | "rotateX" // X-axis rotation
  | "rotateY" // Y-axis rotation
  | "rotateZ"; // Z-axis rotation

export type ScaleProperties =
  | "scale" // Uniform scale shorthand
  | "scaleX" // X-axis scale
  | "scaleY" // Y-axis scale
  | "scaleZ"; // Z-axis scale

export type SkewProperties =
  | "skewX" // X-axis skew
  | "skewY"; // Y-axis skew

/**
 * CSS transform properties that can be animated.
 * Includes translation, rotation, scale and skew transformations.
 */
export type TransformPropertyName =
  | TranslateProperties
  | ScaleProperties
  | RotateProperties
  | SkewProperties;

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

/**
 * Represents the axis that can be transformed.
 */
export type TransformAxis = "x" | "y" | "z";

/**
 * Configuration type for CSS transform properties
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/transform
 */
export type TransformConfig = Partial<{
  /** Move element horizontally (px, %, em, rem) - positive moves right */
  translateX: number | string;
  /** Move element vertically (px, %, em, rem) - positive moves down */
  translateY: number | string;
  /** Move element along Z-axis (px) - positive moves toward viewer */
  translateZ: number | string;

  /** Rotate around X-axis (deg, rad, turn) */
  rotateX: number | string;
  /** Rotate around Y-axis (deg, rad, turn) */
  rotateY: number | string;
  /** Rotate around Z-axis (deg, rad, turn) */
  rotateZ: number | string;

  /** Scale 2D - 1 is normal size, 2 is double, 0.5 is half  */
  scale: number;
  /** Scale width - 1 is normal size, 2 is double, 0.5 is half */
  scaleX: number;
  /** Scale height - 1 is normal size, 2 is double, 0.5 is half */
  scaleY: number;
  /** Scale depth - 1 is normal size, 2 is double, 0.5 is half */
  scaleZ: number;

  /** Skew around X-axis (deg, rad, turn) */
  skewX: number | string;
  /** Skew around Y-axis (deg, rad, turn) */
  skewY: number | string;
}>;

export interface TransformCache {
  transformString: string;
  hash: string;
  isValid: boolean;
}
