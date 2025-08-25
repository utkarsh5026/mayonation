import { clampProgress } from "@/utils/progress";

/**
 * Calculates stagger timing for multiple elements
 * Responsibility: Stagger calculations, element timing coordination
 */
export class StaggerManager {
  private staggerDelay: number;
  private elementCount: number;
  private totalDuration: number;

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
   * Get total duration including stagger
   */
  getTotalDuration(): number {
    return this.totalDuration;
  }

  /**
   * Calculate element progress based on global elapsed time
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
   * Calculate total animation duration including stagger
   */
  private calculateTotalDuration(baseDuration: number): number {
    const lastElementStartTime = (this.elementCount - 1) * this.staggerDelay;
    return lastElementStartTime + baseDuration;
  }
}
