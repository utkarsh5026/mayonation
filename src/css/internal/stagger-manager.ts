import { clampProgress } from "@/utils/progress";

/**
 * Calculates stagger timing for multiple elements
 * Responsibility: Stagger calculations, element timing coordination
 */
export class StaggerManager {
  private staggerDelay: number;
  private elementCount: number;
  private totalDuration: number;

  /**
   * @param staggerDelay Delay between starts of consecutive elements (ms).
   * @param elementCount Total number of elements.
   * @param baseDuration Duration for a single element (ms).
   * Initializes the total timeline length including stagger.
   */
  constructor(
    staggerDelay: number,
    elementCount: number,
    baseDuration: number
  ) {
    this.staggerDelay = staggerDelay;
    this.elementCount = elementCount;
    this.totalDuration = this.calculateTotalDuration(baseDuration);
  }

  /**
   * Total timeline length including stagger (ms).
   * @returns Total duration in milliseconds.
   */
  getTotalDuration(): number {
    return this.totalDuration;
  }

  /**
   * Element progress at a given global elapsed time.
   * - Before its start: progress 0, inactive.
   * - After its end: progress 1, complete.
   * - Otherwise: (elapsed - startTime)/baseDuration (clamped).
   * @param elementIndex Zero-based element index.
   * @param elapsed Global elapsed time (ms).
   * @param baseDuration Duration for a single element (ms).
   */
  getElementProgressAtTime(
    elementIndex: number,
    elapsed: number,
    baseDuration: number
  ) {
    const startTime = this.getElementStartTime(elementIndex);
    const endTime = this.getElementEndTime(elementIndex, baseDuration);

    if (elapsed < startTime) {
      return {
        progress: 0,
        isActive: false,
        isComplete: false,
      };
    }

    if (elapsed > endTime) {
      return {
        progress: 1,
        isActive: false,
        isComplete: true,
      };
    }

    const progress = (elapsed - startTime) / baseDuration;
    return {
      progress: clampProgress(progress),
      isActive: true,
      isComplete: false,
    };
  }

  /**
   * Get start time for specific element
   */
  private getElementStartTime(elementIndex: number): number {
    return elementIndex * this.staggerDelay;
  }

  /**
   * Get end time for specific element
   */
  private getElementEndTime(
    elementIndex: number,
    baseDuration: number
  ): number {
    return this.getElementStartTime(elementIndex) + baseDuration;
  }

  /**
   * Total duration including the last element's staggered start (ms).
   * @param baseDuration Duration for a single element (ms).
   * @returns Total duration in milliseconds.
   */
  private calculateTotalDuration(baseDuration: number): number {
    const lastElementStartTime = (this.elementCount - 1) * this.staggerDelay;
    return lastElementStartTime + baseDuration;
  }
}
