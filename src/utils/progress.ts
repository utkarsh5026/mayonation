import { clamp } from "./math";

/**
 * Clamps a progress value between 0 and 1.
 *
 * @param progress - The progress value to clamp.
 * @returns The clamped progress value between 0 and 1.
 */
export const clampProgress = (progress: number) => {
  return clamp(progress, 0, 1);
};
