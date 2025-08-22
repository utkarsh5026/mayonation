/**
 * Core animation engine that handles timing, progress calculation, and updates.
 * This is shared between Timeline and standalone Mayonation instances.
 */
export class AnimationEngine {
  private startTime: number | null = null;
  private pauseTime: number | null = null;
  private rafId: number | null = null;
  private state: "idle" | "playing" | "paused" | "completed" = "idle";

  private readonly duration: number;
  private readonly loop: boolean;
  private readonly onUpdate: (progress: number) => void;
  private readonly onComplete: () => void;

  constructor(options: {
    duration: number;
    loop?: boolean;
    onUpdate: (progress: number) => void;
    onComplete: () => void;
  }) {
    this.duration = options.duration;
    this.loop = options.loop ?? false;
    this.onUpdate = options.onUpdate;
    this.onComplete = options.onComplete;
  }

  play(): void {
    if (this.state === "playing") return;

    if (this.state === "paused" && this.pauseTime !== null) {
      this.startTime = performance.now() - this.pauseTime;
      this.pauseTime = null;
    } else {
      this.startTime = performance.now();
    }

    this.state = "playing";
    this.tick();
  }

  pause(): void {
    if (this.state !== "playing") return;
    this.pauseTime = performance.now() - (this.startTime ?? 0);
    this.state = "paused";
    this.cancelAnimation();
  }

  reset(): void {
    this.state = "idle";
    this.startTime = null;
    this.pauseTime = null;
    this.cancelAnimation();
  }

  private tick = (): void => {
    if (this.state !== "playing" || !this.startTime) return;

    const elapsed = performance.now() - this.startTime;
    let progress = elapsed / this.duration;

    if (this.loop) {
      progress = progress % 1;
    } else {
      progress = Math.min(progress, 1);
    }

    this.onUpdate(progress);

    if (progress >= 1 && !this.loop) {
      this.state = "completed";
      this.onComplete();
      return;
    }

    this.rafId = requestAnimationFrame(this.tick);
  };

  private cancelAnimation(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
