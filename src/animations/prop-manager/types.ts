import { CSSPropertyName } from "../styles";
import { TransformPropertyName } from "../transform";
import { ColorSpace } from "@/core";

/**
 * Options for configuring PropertyManager behavior.
 */
export interface PropertyManagerOptions {
  /**
   * Preferred color space for color parsing/interpolation.
   * Defaults to 'hsl'.
   */
  colorSpace?: ColorSpace;

  /**
   * When true, defers DOM writes and batches them on the next animation frame.
   * Greatly reduces layout thrashing and improves performance under load.
   * Defaults to true.
   */
  batchUpdates?: boolean;

  /**
   * Number of decimal places to use when serializing numeric values.
   * Defaults to 3.
   */
  precision?: number;

  /**
   * When true, enables GPU-friendly transforms (e.g., translateZ(0)) where supported.
   * Actual behavior is delegated to the underlying handlers.
   * Defaults to true.
   */
  useGPUAcceleration?: boolean;
}

/**
 * A property that can be animated by PropertyManager.
 *
 * This can be either a transform property (e.g., 'translateX', 'rotate', 'scale')
 * or a CSS property supported by StyleAnimator (e.g., 'opacity', 'backgroundColor').
 *
 * @example
 * ```ts
 * const p: AnimatableProperty = 'opacity';     // CSS property
 * const t: AnimatableProperty = 'translateX';  // transform property
 * ```
 */
export type AnimatableProperty = TransformPropertyName | CSSPropertyName;
