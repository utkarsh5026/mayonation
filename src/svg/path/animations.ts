import { EaseFunction, resolveEaseFn } from "../../core/ease_fns";
import {
  BaseKeyframeManager,
  type BaseKeyframe,
  type ProcessedBaseKeyframe,
} from "../../keyframe/keyframe";
import { linear } from "../../utils/interpolate";

/**
 * Static options for configuring SVG path styling
 */
export type StaticPathOptions = Partial<{
  strokeWidth: number;
  stroke: string;
  fill: string;
  strokeLinecap: "butt" | "round" | "square";
  strokeLinejoin: "miter" | "round" | "bevel";
  strokeMiterlimit: number;
  easing: EaseFunction;
  reverse: boolean;
  startPercentage: number; // percentage of path to start drawing from (0-1)
  endPercentage: number; // percentage of path to end drawing at (0-1)
}>;

/**
 * Animatable properties for the drawing animation
 */
type InterpolatedProps = {
  strokeOpacity?: number;
  strokeDashoffset: number;
};

export type DrawingKeyframe = InterpolatedProps & BaseKeyframe;

type ProcessedDrawingKeyframe = Required<InterpolatedProps> &
  ProcessedBaseKeyframe;

/**
 * Handles the drawing animation of SVG paths.
 *
 * This class manages the animation of SVG paths by controlling properties like stroke opacity
 * and dash offset to create drawing effects. It supports both forward and reverse animations,
 * partial path drawing, and customizable styling.
 *
 * @example
 * ```ts
 * // Create a basic drawing animation
 * const path = document.querySelector('path');
 * const handler = new DrawingHandler(path);
 *
 * // Customize the animation with options
 * const handler = new DrawingHandler(path, {
 *   stroke: 'red',
 *   strokeWidth: 2,
 *   reverse: true,
 *   startPercentage: 0.2,
 *   endPercentage: 0.8
 * });
 *
 * // Add custom keyframes
 * const handler = new DrawingHandler(path, {}, [
 *   { offset: 0, strokeOpacity: 0, strokeDashoffset: 0 },
 *   { offset: 1, strokeOpacity: 1, strokeDashoffset: 100 }
 * ]);
 * ```
 */
export class DrawingHandler extends BaseKeyframeManager<
  DrawingKeyframe,
  ProcessedDrawingKeyframe,
  InterpolatedProps
> {
  private readonly el: SVGPathElement;
  private readonly pathLength: number;
  protected keyframes: ProcessedDrawingKeyframe[];
  private readonly options: StaticPathOptions;

  /**
   * Creates a new DrawingHandler instance.
   *
   * @param el - The SVG path element to animate
   * @param options - Static styling and animation options
   * @param keyframes - Custom animation keyframes (optional)
   */
  constructor(
    el: SVGPathElement,
    options: StaticPathOptions = {},
    keyframes: DrawingKeyframe[] = []
  ) {
    super();
    this.el = el;
    this.pathLength = el.getTotalLength();
    this.options = options;
    this.keyframes = this.processKeyframes(keyframes);
    this.initializeStyles(options);
  }

  /**
   * Updates the animated properties of the SVG path.
   * @internal
   */
  protected updateProps(props: InterpolatedProps): void {
    this.el.style.strokeDashoffset = `${props.strokeDashoffset}`;
    this.el.style.strokeOpacity = `${props.strokeOpacity}`;
  }

  /**
   * Resets all styling properties to their initial state.
   * Useful for cleaning up after animations or resetting the path.
   */
  public reset(): void {
    this.el.style.strokeDasharray = "";
    this.el.style.strokeDashoffset = "";
    this.el.style.strokeWidth = "";
    this.el.style.stroke = "";
    this.el.style.fill = "";
    this.el.style.strokeLinecap = "";
    this.el.style.strokeLinejoin = "";
    this.el.style.strokeMiterlimit = "";
  }

  /**
   * Checks if the given element is an instance of SVGPathElement.
   * @param el - The element to check
   * @returns True if the element is an instance of SVGPathElement, false otherwise
   */
  public isCorrectElenmentType(el: object): boolean {
    return el instanceof SVGPathElement;
  }

  /**
   * Interpolates between two keyframes based on progress.
   * @internal
   */
  protected interpolate(
    from: ProcessedDrawingKeyframe,
    to: ProcessedDrawingKeyframe,
    progress: number
  ) {
    const strokeOpacity = linear.interpolate(
      from.strokeOpacity,
      to.strokeOpacity,
      progress
    );
    const strokeDashoffset = linear.interpolate(
      from.strokeDashoffset,
      to.strokeDashoffset,
      progress
    );
    return {
      strokeOpacity,
      strokeDashoffset,
    };
  }

  /**
   * Processes a single keyframe, applying reverse direction if specified.
   * @internal
   */
  protected processKeyframe(frame: DrawingKeyframe): ProcessedDrawingKeyframe {
    let strokeDashoffset: number;

    if (frame.strokeDashoffset !== undefined) {
      strokeDashoffset = this.options.reverse
        ? -frame.strokeDashoffset
        : frame.strokeDashoffset;
    } else {
      strokeDashoffset = this.options.reverse ? 0 : this.pathLength;
    }

    return {
      offset: frame.offset!,
      easing: resolveEaseFn(frame.easing),
      strokeOpacity: frame.strokeOpacity ?? 1,
      strokeDashoffset,
    };
  }

  /**
   * Generates default keyframes when none are provided.
   * Creates a simple drawing animation based on start and end percentages.
   * @internal
   */
  protected handleNoKeyframes(): DrawingKeyframe[] {
    const start = this.options.startPercentage ?? 0;
    const end = this.options.endPercentage ?? 1;

    // For normal direction (non-reverse), we want to start with a larger offset
    // and animate to a smaller offset to reveal the path from start to end
    const startOffset = this.options.reverse
      ? this.pathLength * (1 - start)
      : this.pathLength;
    const endOffset = this.options.reverse ? this.pathLength * (1 - end) : 0;

    return [
      {
        offset: 0,
        strokeDashoffset: startOffset,
        strokeOpacity: 0,
        easing: resolveEaseFn(this.options.easing),
      },
      {
        offset: 1,
        strokeDashoffset: endOffset,
        strokeOpacity: 1,
      },
    ];
  }

  /**
   * Initializes the SVG path with the specified static styles and drawing configuration.
   * Sets up the dash array and offset for the drawing animation.
   * @internal
   */
  private initializeStyles(options: StaticPathOptions): void {
    const defaultStyles: Required<StaticPathOptions> = {
      strokeWidth: 1,
      stroke: "black",
      fill: "none",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      strokeMiterlimit: 4,
      easing: "linear",
      reverse: false,
      startPercentage: 0,
      endPercentage: 1,
    };

    const styles = { ...defaultStyles, ...options };

    // Calculate visible portion of the path
    const visibleLength =
      this.pathLength * (styles.endPercentage - styles.startPercentage);

    this.el.style.strokeWidth = `${styles.strokeWidth}px`;
    this.el.style.stroke = styles.stroke;
    this.el.style.fill = styles.fill;
    this.el.style.strokeDasharray = `${visibleLength} ${this.pathLength}`;
    this.el.style.strokeOpacity = "0"; // Start invisible
    this.el.style.strokeDashoffset = `${
      this.options.reverse
        ? this.pathLength * (1 - styles.startPercentage)
        : this.pathLength * styles.startPercentage
    }`;
    this.el.style.strokeLinecap = styles.strokeLinecap;
    this.el.style.strokeLinejoin = styles.strokeLinejoin;
    this.el.style.strokeMiterlimit = `${styles.strokeMiterlimit}`;
  }
}
