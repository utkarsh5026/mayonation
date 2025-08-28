export { Mayonation, type MayonationConfig } from "./api";
export { Timeline, Position } from "./timeline";
export type { ElementLike } from "./utils/dom";

export * from "./core/ease-fns";
import { Mayonation, MayonationConfig } from "./api";
import { Timeline, Position } from "./timeline";
import { ElementLike } from "./utils/dom";

/**
 * Create a new Timeline to orchestrate multiple animations in sequence or parallel.
 *
 * @param options Optional configuration.
 * @param options.loop When true, the timeline will repeat after it completes.
 * @returns A new Timeline instance.
 */
export function timeline(options?: { loop?: boolean }): Timeline {
  return new Timeline(options);
}

/**
 * Create a Mayonation animation.
 *
 * Overloads:
 * - mayo(config): pass a full {@link MayonationConfig} that includes the `target`
 * - mayo(target, config): pass the `target` separately and omit it from `config`
 *
 * @param config Full configuration including `target` when using the single-argument form.
 * @returns A new {@link Mayonation} instance.
 *
 * @example
 * // 1) Single-argument form
 * const anim1 = mayo({
 *   target: document.querySelector('#box'),
 *   from: { opacity: 0 },
 *   to: { opacity: 1 },
 *   duration: 400
 * });
 *
 * @example
 * // 2) Two-argument form
 * const el = document.querySelector('#box');
 * const anim2 = mayo(el, {
 *   from: { x: 0 },
 *   to: { x: 100 },
 *   duration: 300
 * });
 */
export function mayo(config: MayonationConfig): Mayonation;
export function mayo(
  target: ElementLike,
  config: Omit<MayonationConfig, "target">
): Mayonation;
/**
 * See {@link mayo} for usage details.
 *
 * @param targetOrConfig The animatable target element when using the two-argument form.
 * @param config Configuration object without the `target` when `targetOrConfig` is a target.
 * @returns A new {@link Mayonation} instance.
 */
export function mayo(targetOrConfig: any, config?: any): Mayonation {
  if (config) {
    return new Mayonation({ target: targetOrConfig, ...config });
  }
  return new Mayonation(targetOrConfig);
}

export * as core from "./core";
export * as animations from "./animations";
export * as utils from "./utils/interpolators";
