import type { AnimationOptions } from "./config";
import { Timeline, type TimelinePosition } from "../timeline/timeline";
import {
  animate as animateCSS,
  type CSSAnimationOptions,
} from "../animations/api";
import {
  draw as drawSvg,
  trace as traceSvg,
  type SvgDrawOptions,
  type SvgTraceOptions,
} from "../svg/api";
import { DrawingHandler, TraceHandler } from "../svg/path/animations";
import {
  BaseKeyframeManager,
  type BaseKeyframe,
  type ProcessedBaseKeyframe,
} from "../keyframe/keyframe";
import { CSSKeyframeManager } from "../animations/keyframe";

type AnimationAPI<
  H extends BaseKeyframeManager<B, P, K>,
  B extends BaseKeyframe,
  P extends ProcessedBaseKeyframe,
  K,
  T extends AnimationOptions
> = {
  handlers: H[];
  options: T;
};

/**
 * Creates a complex animation timeline with a fluent API.
 *
 * @example
 * ```ts
 * // Sequential animations
 * timeline()
 *   .add('.box1', {
 *     translateX: 100,
 *     duration: 1000
 *   })
 *   .add('.box2', {
 *     scale: 2
 *   }, '+=500')  // Starts 500ms after previous
 *   .add('.box3', {
 *     opacity: 0
 *   }, 2000)     // Starts at 2000ms
 *   .play();
 *  * // With options
 * timeline({ loop: true })
 *   .add('#element1', {
 *     translateY: 100,
 *     duration: 1000
 *   })
 *   .add('#element2', [
 *     { scale: 1, offset: 0 },
 *     { scale: 2, offset: 0.5 },
 *     { scale: 1, offset: 1 }
 *   ])
 *   .on('complete', () => console.log('Done!'))
 *   .play();
 * ```
 */
export function timeline(
  options: Partial<{ loop: boolean; precision: number }>
) {
  const timeline = new Timeline(options || {});

  const api = {
    add<
      B extends BaseKeyframe,
      P extends ProcessedBaseKeyframe,
      K extends Keyframe,
      T extends AnimationOptions
    >(
      entiies: { handlers: BaseKeyframeManager<B, P, K>[]; options: T },
      position?: TimelinePosition
    ) {
      timeline.add(entiies.handlers, entiies.options, position);
      return api;
    },

    play() {
      timeline.play();
      return api;
    },
  };

  return api;
}

export function draw(
  config: SvgDrawOptions
): AnimationAPI<
  DrawingHandler,
  BaseKeyframe,
  ProcessedBaseKeyframe,
  Keyframe,
  SvgDrawOptions
> {
  const handlers = drawSvg(config);
  return {
    handlers,
    options: config,
  };
}

export function trace(
  config: SvgTraceOptions
): AnimationAPI<
  TraceHandler,
  BaseKeyframe,
  ProcessedBaseKeyframe,
  Keyframe,
  SvgTraceOptions
> {
  const handlers = traceSvg(config);
  return {
    handlers,
    options: config,
  };
}

export function animate(config: CSSAnimationOptions): {
  handlers: CSSKeyframeManager[];
  options: CSSAnimationOptions;
} {
  const handlers = animateCSS(config);
  return {
    handlers,
    options: config,
  };
}
