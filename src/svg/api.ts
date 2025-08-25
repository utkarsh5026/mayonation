import {
  DrawingHandler,
  TraceHandler,
  type DrawingKeyframe,
  type StaticPathOptions,
  type TraceKeyframe,
} from "./path/animations";

/**
 * Resolves the provided element(s) into an array of SVGPathElement.
 * If a string is provided, it queries the DOM for matching elements.
 * If an array is provided, it returns the array.
 * If a single SVGPathElement is provided, it returns an array containing that element.
 *
 * @param element - The element(s) to resolve. Can be a CSS selector string, a single SVGPathElement, or an array of SVGPathElement.
 * @returns An array of resolved SVGPathElement.
 */
const resolveElements = (
  element: SVGPathElement | string | SVGPathElement[]
): SVGPathElement[] => {
  if (typeof element === "string")
    return Array.from(document.querySelectorAll(element));

  return Array.isArray(element) ? element : [element];
};

/**
 * Configuration options for drawing SVG paths.
 */
export type SvgDrawOptions = {
  /** The target element(s) to draw. Can be a CSS selector string, a single SVGPathElement, or an array of SVGPathElement. */
  element: SVGPathElement | string;
  /** The style options for the static path. */
  style: StaticPathOptions;
  /** The keyframes for the drawing animation. */
  keyframes: DrawingKeyframe[];
} & AnimationOptions;

/**
 * Draws SVG paths based on the provided configuration.
 *
 * @param config - The configuration options for drawing SVG paths.
 * @returns An array of DrawingHandler instances for each resolved SVGPathElement.
 */
export function draw(config: SvgDrawOptions): DrawingHandler[] {
  const elements = resolveElements(config.element);
  return elements.map(
    (el) => new DrawingHandler(el, config.style, config.keyframes)
  );
}

/**
 * Configuration options for tracing along SVG paths.
 */
export type SvgTraceOptions = {
  /** The path element(s) to trace along. Can be a CSS selector string, a single SVGPathElement, or an array of SVGPathElement. */
  path: SVGPathElement | string;
  /** The element that will trace along the path */
  element: SVGElement | HTMLElement;
  /** The style options for the path */
  style?: StaticPathOptions;
  /** The keyframes for the tracing animation */
  keyframes?: TraceKeyframe[];
} & AnimationOptions;

/**
 * Creates animations for elements tracing along SVG paths.
 *
 * @param config - The configuration options for tracing along SVG paths.
 * @returns An array of TraceHandler instances for each resolved SVGPathElement.
 */
export function trace(config: SvgTraceOptions): TraceHandler[] {
  const paths = resolveElements(config.path);
  return paths.map(
    (path) =>
      new TraceHandler(path, config.element, config.style, config.keyframes)
  );
}
