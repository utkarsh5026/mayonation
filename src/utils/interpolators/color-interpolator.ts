import type { RGB, HSL, ColorSpace } from "@/core/animation-val";

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
   * Interpolates between two RGB colors
   *  helps with color transitions
   */
  private interpolateRGB(from: RGB, to: RGB, progress: number): RGB {
    const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

    return {
      r: Math.round(lerp(from.r, to.r, progress)),
      g: Math.round(lerp(from.g, to.g, progress)),
      b: Math.round(lerp(from.b, to.b, progress)),
    };
  }

  private interpolateHSL(from: HSL, to: HSL, progress: number): HSL {
    let h1 = from.h;
    let h2 = to.h;

    h1 = ((h1 % 360) + 360) % 360;
    h2 = ((h2 % 360) + 360) % 360;

    let diff = h2 - h1;
    if (diff > 180) {
      diff -= 360;
    } else if (diff < -180) {
      diff += 360;
    }

    const interpolatedHue = (h1 + diff * progress + 360) % 360;

    return {
      h: Math.round(interpolatedHue),
      s: Math.round(from.s + (to.s - from.s) * progress),
      l: Math.round(from.l + (to.l - from.l) * progress),
    };
  }
}
