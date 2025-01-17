import { PropertiesConfig } from "./config";
import { Timeline } from "./timeline";
import type { Keyframe } from "./keyframe";
import type { EaseFn, EaseFnName } from "./ease_fns";

/**
 * Creates a simple animation with a fluent API.
 *
 * @example
 * ```ts
 * // Simple animation
 * animate('.box')
 *   .to({
 *     translateX: 100,
 *     opacity: 0.5
 *   })
 *   .duration(1000)
 *   .easing('easeOutQuad')
 *   .play();
 *
 *
 *  * // With keyframes
 * animate('#circle')
 *   .keyframes([
 *     { translateY: 0, offset: 0 },
 *     { translateY: 100, offset: 0.5 },
 *     { translateY: 0, offset: 1 }
 *   ])
 *   .duration(2000)
 *   .play();
 * ```
 */
export function animate(targets: string | HTMLElement | HTMLElement[]) {
  const timeline = new Timeline({});
  let config: Partial<PropertiesConfig> = {};
  let kframes: Keyframe[] | null = null;

  const api = {
    to(properties: Record<string, any>) {
      config = { ...config, ...properties };
      return api;
    },

    keyframes(frames: Keyframe[]) {
      kframes = frames;
      return api;
    },

    duration(ms: number) {
      config.duration = ms;
      return api;
    },

    easing(ease: EaseFnName | EaseFn) {
      config.easing = ease;
      return api;
    },

    delay(ms: number) {
      config.delay = ms;
      return api;
    },

    play() {
      if (kframes) {
        timeline.add(targets, kframes);
      } else {
        timeline.add(targets, config);
      }
      return timeline.play();
    },
  };

  return api;
}

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
  return new Timeline(options || {});
}
