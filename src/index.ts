// Main exports for full library usage
export { Mayonation, type MayonationConfig } from "./api";
export { Timeline } from "./timeline";
export type { ElementLike } from "./utils/dom";

// Core easing functions (most commonly used)
export * from "./core/ease-fns";

// SVG path builder (commonly used)
export { default as PathBuilder } from "./svg/path/path-builder";

// Convenience functions
import { Mayonation, MayonationConfig } from "./api";
import { Timeline } from "./timeline";
import { ElementLike } from "./utils/dom";

export function timeline(options?: { loop?: boolean }): Timeline {
  return new Timeline(options);
}

export function mayo(config: MayonationConfig): Mayonation;
export function mayo(
  target: ElementLike,
  config: Omit<MayonationConfig, "target">
): Mayonation;

export function mayo(targetOrConfig: any, config?: any): Mayonation {
  if (config) {
    return new Mayonation({ target: targetOrConfig, ...config });
  }
  return new Mayonation(targetOrConfig);
}

// Re-export submodules for selective importing
export * as core from "./core";
export * as animations from "./animations";
export * as utils from "./utils/interpolators";

// SVG functionality (under development - not exported for tree-shaking yet)
// export * as svg from "./svg/api";
