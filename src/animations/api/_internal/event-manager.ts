import { AnimationCallbacks, AnimationConfig } from "../types";

/**
 * Handles animation events and callbacks
 * Responsibility: Event emission, callback management
 */
export class EventManager {
  private callbacks: AnimationCallbacks;

  constructor(callbacks: AnimationCallbacks = {}) {
    this.callbacks = callbacks;
  }

  onStart(): void {
    this.callbacks.onStart?.();
  }

  onUpdate(progress: number, info?: any): void {
    this.callbacks.onUpdate?.(progress, info);
  }

  onComplete(): void {
    this.callbacks.onComplete?.();
  }

  onPause(): void {
    this.callbacks.onPause?.();
  }

  onResume(): void {
    this.callbacks.onResume?.();
  }

  onReverse(): void {
    this.callbacks.onReverse?.();
  }

  public static fromAnimationConfig(config: AnimationConfig) {
    const { onComplete, onPause, onResume, onReverse, onStart, onUpdate } =
      config;
    return new EventManager({
      onComplete,
      onPause,
      onResume,
      onReverse,
      onStart,
      onUpdate,
    });
  }
}
