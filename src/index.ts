import PathBuilder from "./svg/path/path-builder";
export * from "./core/ease-fns";
export { PropertiesConfig } from "./core/config";
export { PathBuilder };
import { Mayonation, MayonationConfig } from "@/api";
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
