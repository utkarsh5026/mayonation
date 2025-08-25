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

/**
 * Validate the progress value
 * @param progress - The progress value to validate.
 * @throws Error if the progress is not between 0 and 1.
 */
export const validateProgress = (progress: number) => {
  if (progress < 0 || progress > 1) {
    throw new Error("Progress must be between 0 and 1");
  }
};
