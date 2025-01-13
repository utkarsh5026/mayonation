import type { AnimationTarget } from "./types";

/**
 * Resolves the target to an HTMLElement.
 * @param target - The target to resolve.
 * @returns The resolved HTMLElement.
 */
export function resolveTarget(target: AnimationTarget): HTMLElement[] {
  if (typeof target === "string") {
    const element = document.querySelector(target);
    if (!element) {
      throw new Error(`Element not found: ${target}`);
    }
    return [element as HTMLElement];
  } else if (Array.isArray(target)) {
    return target;
  } else {
    return [target];
  }
}
