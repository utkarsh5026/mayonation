import {
  DrawingHandler,
  type DrawingKeyframe,
  type StaticPathOptions,
} from "./path/animations";
import type { AnimationOptions } from "../core/config";

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
