import { EaseFunction, resolveEaseFn } from "../../core/ease-fns";
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
    this.el.setAttribute(
      "stroke-dashoffset",
      props.strokeDashoffset.toString()
    );
    this.el.setAttribute(
      "stroke-opacity",
      props.strokeOpacity?.toString() || "1"
    );
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
    return [
      {
        offset: 0,
        strokeDashoffset: this.pathLength,
        strokeOpacity: 1,
      },
      {
        offset: 1,
        strokeDashoffset: 0,
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
      strokeWidth: 2,
      stroke: "black",
      fill: "none",
      strokeLinecap: "butt",
      strokeLinejoin: "miter",
      strokeMiterlimit: 4,
      easing: "linear",
      reverse: false,
      startPercentage: 0,
      endPercentage: 1,
    };
    const styles = { ...defaultStyles, ...options };

    const dashLength = this.pathLength;
    this.el.setAttribute("stroke-dasharray", `${dashLength}`);
    this.el.setAttribute("stroke-opacity", "1");
    this.el.setAttribute(
      "stroke-dashoffset",
      this.options.reverse ? `-${dashLength}` : `${dashLength}`
    );

    this.el.removeAttribute("style");

    this.el.setAttribute("fill", styles.fill);
    this.el.setAttribute("stroke", styles.stroke);
    this.el.setAttribute("stroke-width", styles.strokeWidth.toString());
    this.el.setAttribute("stroke-linecap", styles.strokeLinecap);
    this.el.setAttribute("stroke-linejoin", styles.strokeLinejoin);
    this.el.setAttribute(
      "stroke-miterlimit",
      styles.strokeMiterlimit.toString()
    );

    this.el.getBoundingClientRect();
  }
}

export type TraceKeyframe = BaseKeyframe & {
  distance?: number; // Distance along the path (0-1)
};

export type ProcessedTraceKeyframe = ProcessedBaseKeyframe & {
  distance: number;
};

/**
 * Handles the animation of an element tracing along an SVG path.
 *
 * @example
 * ```ts
 * // Create a trace animation with a circle following a path
 * const path = document.querySelector('path');
 * const circle = document.querySelector('circle');
 * const handler = new TraceHandler(path, circle);
 *
 * // Customize the animation
 * const handler = new TraceHandler(path, circle, {
 *   reverse: true,
 *   startPercentage: 0.2,
 *   endPercentage: 0.8
 * });
 * ```
 */
export class TraceHandler extends BaseKeyframeManager<
  TraceKeyframe,
  ProcessedTraceKeyframe,
  { distance: number }
> {
  private readonly pathElement: SVGPathElement;
  private readonly tracingElement: SVGElement | HTMLElement;
  protected keyframes: ProcessedTraceKeyframe[];
  private readonly options: StaticPathOptions;

  constructor(
    pathElement: SVGPathElement,
    tracingElement: SVGElement | HTMLElement,
    options: StaticPathOptions = {},
    keyframes: TraceKeyframe[] = []
  ) {
    super();
    this.pathElement = pathElement;
    this.tracingElement = tracingElement;
    this.options = options;
    this.keyframes = this.processKeyframes(keyframes);
  }

  protected updateProps({ distance }: { distance: number }): void {
    const point = this.pathElement.getPointAtLength(
      distance * this.pathElement.getTotalLength()
    );

    this.tracingElement.setAttribute(
      "transform",
      `translate(${point.x}, ${point.y})`
    );
  }

  public reset(): void {
    this.tracingElement.setAttribute("transform", "");
  }

  public isCorrectElenmentType(el: object): boolean {
    return el instanceof SVGPathElement;
  }

  protected interpolate(
    from: ProcessedTraceKeyframe,
    to: ProcessedTraceKeyframe,
    progress: number
  ) {
    return {
      distance: linear.interpolate(from.distance, to.distance, progress),
    };
  }

  protected processKeyframe(frame: TraceKeyframe): ProcessedTraceKeyframe {
    const distance = frame.distance ?? 0;
    return {
      offset: frame.offset!,
      easing: resolveEaseFn(frame.easing),
      distance: this.options.reverse ? 1 - distance : distance,
    };
  }

  protected handleNoKeyframes(): TraceKeyframe[] {
    const { startPercentage = 0, endPercentage = 1 } = this.options;
    return [
      { offset: 0, distance: startPercentage },
      { offset: 1, distance: endPercentage },
    ];
  }
}
