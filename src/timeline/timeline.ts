import { TimelineSegment, type TimelineSegmentConfig } from "./segment";
import { AnimationOptions } from "@/core/config";
import { resolveEaseFn } from "@/core/ease-fns";
import {
  type BaseKeyframe,
  type ProcessedBaseKeyframe,
  BaseKeyframeManager,
} from "@/keyframe";
import { TimelineState, TimelinePosition, TimelineEventType } from "./types";

/**
 * Timeline class for managing complex animations
 */
export class Timeline {
  private readonly segments: TimelineSegment<
    BaseKeyframe,
    ProcessedBaseKeyframe,
    any
  >[] = [];
  private readonly eventListeners: Map<TimelineEventType, Set<Function>> =
    new Map();

  // Animation state tracking
  private startTime: number | null = null; // When animation started
  private pauseTime: number | null = null; // When animation was paused
  private currentTime: number = 0; // Current playback position
  private duration: number = 0; // Total timeline duration
  private lastSegmentEnd: number = 0; // End time of last added segment
  private state: TimelineState = "idle"; // Current timeline state
  private lastFrameTime: number | null = null; // Last animation frame timestamp

  // Animation frame ID for cancellation
  private rafID: number | null = null;

  /**
   * Creates a new Timeline instance for managing complex animations.
   */
  constructor(
    private readonly options: Partial<{
      loop: boolean;
      precision?: number;
    }>
  ) {
    this.options = {
      loop: false,
      precision: 0.001,
      ...options,
    };
    this.tick = this.tick.bind(this);
  }

  /**
   * Adds a new animation segment to the timeline. This is the main method for building
   * your animation sequence.
   */
  public add<K extends BaseKeyframe, P extends ProcessedBaseKeyframe, T>(
    targetManagers: BaseKeyframeManager<K, P, T>[],
    options: AnimationOptions,
    pos?: TimelinePosition
  ): this {
    try {
      const startTime =
        pos !== undefined ? this.resolveTimePosition(pos) : this.latestEndTime;

      const config = this.createSegmentConfig(options, startTime);

      targetManagers.forEach((targetManager, index) => {
        this.segments.push(new TimelineSegment(config, targetManager));
      });

      this.duration = Math.max(
        this.duration,
        startTime + config.duration * (config.iterations ?? 1)
      );

      this.lastSegmentEnd = startTime + config.duration;
      return this;
    } catch (error) {
      console.error("Timeline: Error adding animation:", error);
      throw error;
    }
  }

  /**
   * Pauses the timeline at its current position. The animation can be resumed
   * from this point using resume().
   */
  public pause(): this {
    if (this.state !== "playing") return this;

    this.pauseTime = this.currentTime;
    this.state = "paused";

    if (this.rafID) {
      cancelAnimationFrame(this.rafID);
      this.rafID = null;
    }

    this.emit("pause", { time: this.currentTime });
    return this;
  }

  /**
   * Resumes playback from the paused state. If the timeline isn't paused,
   * this method has no effect.
   */
  public resume(): this {
    if (this.state !== "paused") return this;
    return this.play();
  }

  /**
   * Resets the timeline to its initial state. This:
   * - Sets current time to 0
   * - Clears all timing data
   * - Resets all segments
   * - Cancels any pending animation frames
   */
  public reset() {
    this.currentTime = 0;
    this.startTime = null;
    this.pauseTime = null;
    this.lastFrameTime = null;
    this.state = "idle";

    if (this.rafID) {
      cancelAnimationFrame(this.rafID);
      this.rafID = null;
    }

    this.segments.forEach((seg) => seg.reset());
    return this;
  }

  /**
   * Starts or resumes timeline playback. If the timeline is:
   * - New: Starts playback from the beginning
   * - Paused: Resumes from pause point
   * - Playing: Has no effect
   */
  public play(): this {
    if (this.state === "playing") return this;

    if (!this.startTime) {
      // Initial play
      this.startTime = performance.now();
      this.lastFrameTime = this.startTime;
      this.emit("start", { time: 0 });
    } else if (this.pauseTime !== null) {
      // Resume from pause
      this.startTime = performance.now() - this.pauseTime;
      this.lastFrameTime = performance.now();
      this.pauseTime = null;
      this.emit("resume", { time: this.currentTime });
    }

    this.state = "playing";
    this.tick();
    return this;
  }

  /**
   * Seeks to a specific position in the timeline. This allows you to jump
   * to any point in the animation instantly.
   */
  public seek(position: TimelinePosition): this {
    const time = this.resolveTimePosition(position);
    this.currentTime = Math.min(Math.max(0, time), this.duration);
    this.updateSegments(this.currentTime);
    return this;
  }

  /**
   * Gets the current progress of the timeline as a value between 0 and 1.
   */
  public get progress(): number {
    return this.currentTime / this.duration;
  }

  /**
   * Gets the total duration of the timeline in milliseconds.
   */
  public get totalDuration(): number {
    return this.duration;
  }

  /**
   * Adds an event listener for timeline events. Available events:
   * - 'start': Timeline begins playing
   * - 'update': Animation frame update
   * - 'pause': Timeline is paused
   * - 'resume': Timeline resumes from pause
   * - 'complete': Timeline finishes
   * - 'loop': Timeline completes a loop
   */
  public on(event: TimelineEventType, callback: Function): this {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)?.add(callback);
    return this;
  }

  /**
   * Removes an event listener for the specified event type.
   */
  public off(event: TimelineEventType, callback: Function): this {
    this.eventListeners.get(event)?.delete(callback);
    return this;
  }

  /**
   * Cleans up timeline resources. This:
   * - Resets the timeline
   * - Clears all segments
   * - Removes all event listeners
   */
  public destroy(): void {
    this.reset();
    this.segments.length = 0;
    this.eventListeners.clear();
  }

  /**
   * Resolves a position value to milliseconds
   */
  private resolveTimePosition(position?: TimelinePosition): number {
    if (position === undefined || position === "<") return 0;

    if (position === ">") return this.duration;

    if (typeof position === "string" && position.startsWith("+=")) {
      return this.lastSegmentEnd + parseInt(position.slice(2));
    }

    if (typeof position === "string" && position.startsWith("-=")) {
      return this.lastSegmentEnd - parseInt(position.slice(2));
    }
    return position as number;
  }

  /**
   * Creates configuration for a new animation segment
   */
  private createSegmentConfig(
    options: AnimationOptions,
    startTime: number
  ): TimelineSegmentConfig {
    const duration = options.duration ?? 1000;
    const easing = resolveEaseFn(options.easing);
    const delay = options.delay ?? 0;

    return {
      startTime,
      duration,
      easing,
      delay,
    };
  }

  /**
   * Gets the end time of the last segment
   */
  private get latestEndTime(): number {
    if (this.segments.length === 0) return 0;
    const endTimes = this.segments.map((segment) => {
      return segment.segmentEndTime;
    });
    return Math.max(...endTimes);
  }

  /**
   * Resolves target elements from various input types
   */
  private resolveElements(
    targets: string | HTMLElement | HTMLElement[] | NodeListOf<Element>
  ): HTMLElement[] {
    if (typeof targets === "string")
      return Array.from(document.querySelectorAll(targets));

    if (targets instanceof NodeList)
      return Array.from(targets) as HTMLElement[];

    if (Array.isArray(targets)) return targets;

    return [targets];
  }

  /**
   * Main animation loop
   * Handles timing, updates, and event emission
   */
  private tick() {
    if (!this.startTime || !this.lastFrameTime) return;

    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    const elapsed = now - this.startTime;
    const previousTime = this.currentTime;

    this.currentTime = this.options.loop
      ? elapsed % this.duration
      : Math.min(elapsed, this.duration);

    if (
      Math.abs(this.currentTime - previousTime) >=
      (this.options.precision ?? 0.1)
    ) {
      this.updateSegments(this.currentTime);
      this.emit("update", {
        time: this.currentTime,
        delta: deltaTime,
        progress: this.progress,
      });
    }

    if (elapsed >= this.duration) {
      if (this.options.loop) {
        this.emit("loop", {
          iterations: Math.floor(elapsed / this.duration),
        });
        this.rafID = requestAnimationFrame(this.tick);
      } else {
        this.complete();
      }
    } else {
      this.rafID = requestAnimationFrame(this.tick);
    }
  }

  /**
   * Handles animation completion
   */
  private complete() {
    this.rafID = null;
    this.startTime = null;
    this.currentTime = this.duration;

    if (this.options.loop) {
      this.play();
    }
  }

  /**
   * Updates all animation segments
   */
  private updateSegments(time: number) {
    this.segments.forEach((segment) => segment.updateAnimation(time));
  }

  /**
   * Emits events to registered listeners
   */
  private emit(event: TimelineEventType, data: any): void {
    this.eventListeners.get(event)?.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Timeline: Error in ${event} event handler:`, error);
      }
    });
  }
}
