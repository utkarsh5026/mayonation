import type { RGB, HSL, ColorSpace } from "@/core/animation-val";
import { clamp, normalizeAngle } from "@/utils/math";

/**
 * Interpolates between colors in either RGB or HSL color space.
 * RGB interpolation is simpler but can produce muddy colors.
 * HSL interpolation often produces more visually pleasing transitions.
 */
export class ColorInterpolator implements Interpolator<RGB | HSL> {
  /**
   * Creates a new color interpolator
   * @param space - The color space to use for interpolation:
   *   - "rgb": Red-Green-Blue color space (default)
   *   - "hsl": Hue-Saturation-Lightness color space
   */
  constructor(private readonly space: ColorSpace = "rgb") {}

  /**
   * Interpolates between two color
   */
  public interpolate(from: RGB, to: RGB, progress: number): RGB;
  public interpolate(from: HSL, to: HSL, progress: number): HSL;
  public interpolate(
    from: RGB | HSL,
    to: RGB | HSL,
    progress: number
  ): RGB | HSL {
    switch (this.space) {
      case "rgb":
        return this.interpolateRGB(from as RGB, to as RGB, progress);
      case "hsl":
        return this.interpolateHSL(from as HSL, to as HSL, progress);
    }
  }

  /**
   * RGB interpolation with proper boundary enforcement
   * Critical: RGB values must stay within [0, 255] regardless of easing overshoot
   */
  private interpolateRGB(from: RGB, to: RGB, progress: number): RGB {
    const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

    const rgb = (start: number, end: number) =>
      Math.round(clamp(lerp(start, end, progress), 0, 255));

    return {
      r: rgb(from.r, to.r),
      g: rgb(from.g, to.g),
      b: rgb(from.b, to.b),
      a:
        from.a !== undefined && to.a !== undefined
          ? clamp(lerp(from.a, to.a, progress), 0, 1)
          : from.a || to.a,
    };
  }

  /**
   * HSL interpolation with proper hue wrapping and value clamping
   */
  private interpolateHSL(from: HSL, to: HSL, progress: number): HSL {
    let h1 = normalizeAngle(from.h);
    let h2 = normalizeAngle(to.h);

    let hueDiff = h2 - h1;
    if (hueDiff > 180) {
      hueDiff -= 360;
    } else if (hueDiff < -180) {
      hueDiff += 360;
    }

    const interpolatedHue = normalizeAngle(h1 + hueDiff * progress);
    const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

    return {
      h: Math.round(interpolatedHue),
      s: Math.round(clamp(lerp(from.s, to.s, progress), 0, 100)),
      l: Math.round(clamp(lerp(from.l, to.l, progress), 0, 100)),
      a:
        from.a !== undefined && to.a !== undefined
          ? clamp(lerp(from.a, to.a, progress), 0, 1)
          : from.a || to.a,
    };
  }
}
