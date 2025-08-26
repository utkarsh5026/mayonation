import type { TimelinePosition, TimelineEvent } from "./types";
import { CSSAnimator, AnimationProperties, AnimationKeyframe } from "@/css";
import { AnimationEngine } from "@/core";
import { ElementLike } from "@/utils/dom";
import { EaseFunction } from "@/core/ease-fns";
import { clamp } from "@/utils/math";

/**
 * Represents an animation item in the timeline with its timing information
 */
export interface TimelineItem {
  /** Unique identifier for this timeline item */
  id: string;
  /** The CSS animator that handles the actual animation */
  animator: CSSAnimator;
  /** When this animation starts on the timeline (ms) */
  startTime: number;
  /** When this animation ends on the timeline (ms) */
  endTime: number;
  /** Duration of just this animation (ms) */
  duration: number;
  /** Current state of this animation item */
  state: "pending" | "active" | "complete";
}

/**
 * Configuration for timeline behavior
 */
export interface TimelineOptions {
  /** Whether the timeline should loop when it completes */
  loop?: boolean;
  /** Called when timeline starts */
  onStart?(): void;
  /** Called on each timeline update */
  onUpdate?(progress: number, info?: TimelineUpdateInfo): void;
  /** Called when timeline completes */
  onComplete?(): void;
  /** Called when timeline is paused */
  onPause?(): void;
  /** Called when timeline is resumed */
  onResume?(): void;
}

/**
 * Information provided during timeline updates
 */
export interface TimelineUpdateInfo {
  /** Current time position in the timeline (ms) */
  currentTime: number;
  /** Total timeline duration (ms) */
  totalDuration: number;
  /** Number of currently active animations */
  activeAnimations: number;
  /** Timeline progress as a percentage (0-100) */
  progressPercent: number;
}

/**
 * High-level animation timeline that orchestrates multiple CSS animations.
 *
 * The Timeline manages global time coordination while delegating individual
 * element animations to CSSAnimator instances. It provides precise control
 * over animation sequencing, parallel execution, and relative positioning.
 *
 * Key Features:
 * - Sequential and parallel animation scheduling
 * - Relative positioning with tokens ("<", ">", "+=", "-=")
 * - Precise seek/scrub functionality
 * - Event-driven updates
 * - Loop support
 * - Pause/resume capabilities
 *
 * @example
 * ```typescript
 * const tl = new Timeline({ loop: false });
 *
 * tl.add('#box1', { from: { x: 0 }, to: { x: 100 }, duration: 1000 })
 *   .add('#box2', { from: { y: 0 }, to: { y: 100 }, duration: 800 }, "+=200")
 *   .add('#box3', { from: { scale: 1 }, to: { scale: 2 }, duration: 600 }, "<")
 *   .play();
 * ```
 */
export class Timeline {
  private items: TimelineItem[] = [];
  private engine: AnimationEngine | null = null;
  private eventCallbacks: Map<TimelineEvent, Function[]> = new Map();
  private options: TimelineOptions;

  // Timing state
  private _totalDuration: number = 0;
  private _lastEndTime: number = 0;
  private currentTimelineTime: number = 0;

  /**
   * Creates a new Timeline instance
   * @param options Configuration options for timeline behavior
   */
  constructor(options: TimelineOptions = {}) {
    this.options = {
      loop: false,
      ...options,
    };
  }

  /**
   * Adds an animation to the timeline at the specified position.
   *
   * Position tokens:
   * - `"<"`: Start at timeline beginning (0ms)
   * - `">"`: Start at current timeline end
   * - `"+=500"`: Start 500ms after current timeline end
   * - `"-=300"`: Start 300ms before current timeline end
   * - `undefined`: Start at current timeline end (same as ">")
   * - `number`: Start at specific time in milliseconds
   *
   * @param target Elements to animate (selector, element, or array)
   * @param config Animation configuration
   * @param position Where to place this animation on the timeline
   * @returns This timeline instance (for chaining)
   */
  add(
    target: ElementLike,
    config: {
      duration?: number;
      delay?: number;
      stagger?: number;
      ease?: EaseFunction;
      from?: AnimationProperties;
      to?: AnimationProperties;
      keyframes?: AnimationKeyframe[];
    },
    position?: TimelinePosition
  ): Timeline {
    try {
      // Create the CSS animator
      const animator = new CSSAnimator({
        target,
        duration: config.duration ?? 1000,
        delay: 0, // Timeline manages timing, not individual animators
        stagger: config.stagger ?? 0,
        ease: config.ease,
        from: config.from,
        to: config.to,
        keyframes: config.keyframes,
      });

      // Resolve the start position on the timeline
      const startTime = this.resolvePosition(position);
      const endTime = startTime + animator.totalDuration;

      // Create timeline item
      const item: TimelineItem = {
        id: this.generateItemId(),
        animator,
        startTime,
        endTime,
        duration: animator.totalDuration,
        state: "pending",
      };

      // Add to timeline and update duration tracking
      this.items.push(item);
      this.updateTimelineDuration();

      return this;
    } catch (error) {
      console.error("Timeline.add() error:", error);
      throw error;
    }
  }

  /**
   * Starts timeline playback.
   * If already playing, returns the existing state.
   * Creates a new animation engine and begins the timeline.
   *
   * @returns This timeline instance
   */
  play(): Timeline {
    if (this.engine?.isPlaying) {
      return this;
    }

    try {
      // Clean up any existing engine
      if (this.engine) {
        this.engine.reset();
      }

      // Create new animation engine
      this.engine = new AnimationEngine({
        duration: this._totalDuration,
        loop: this.options.loop,
        onStart: () => {
          this.currentTimelineTime = 0;
          this.emit("start");
          this.options.onStart?.();
        },
        onUpdate: (globalProgress: number) => {
          this.currentTimelineTime = globalProgress * this._totalDuration;
          this.updateAllItems(this.currentTimelineTime);

          const updateInfo: TimelineUpdateInfo = {
            currentTime: this.currentTimelineTime,
            totalDuration: this._totalDuration,
            activeAnimations: this.getActiveItemCount(),
            progressPercent: Math.round(globalProgress * 100),
          };

          this.emit("update", { progress: globalProgress, info: updateInfo });
          this.options.onUpdate?.(globalProgress, updateInfo);
        },
        onComplete: () => {
          // Ensure all animations reach their final state
          this.updateAllItems(this._totalDuration);
          this.markAllItemsComplete();

          this.emit("complete");
          this.options.onComplete?.();
        },
        onPause: () => {
          this.emit("pause");
          this.options.onPause?.();
        },
        onResume: () => {
          this.emit("resume");
          this.options.onResume?.();
        },
      });

      this.engine.play();
      return this;
    } catch (error) {
      console.error("Timeline.play() error:", error);
      return this;
    }
  }

  /**
   * Pauses timeline playback at the current position.
   * Can be resumed later with play() or resume().
   *
   * @returns This timeline instance
   */
  pause(): Timeline {
    try {
      this.engine?.pause();
    } catch (error) {
      console.error("Timeline.pause() error:", error);
    }
    return this;
  }

  /**
   * Resumes a paused timeline from its current position.
   * If not paused, starts the timeline.
   *
   * @returns This timeline instance
   */
  resume(): Timeline {
    try {
      if (this.engine?.isPaused) {
        this.engine.play();
      } else {
        this.play();
      }
    } catch (error) {
      console.error("Timeline.resume() error:", error);
    }
    return this;
  }

  /**
   * Seeks to a specific time position in the timeline.
   * Updates all animations to their state at that time.
   *
   * @param position Time position (ms) or position token
   * @returns This timeline instance
   */
  seek(position: number | TimelinePosition): Timeline {
    try {
      const targetTime =
        typeof position === "number"
          ? position
          : this.resolvePosition(position);

      // Clamp to valid range
      const clampedTime = clamp(targetTime, 0, this._totalDuration);

      // Update timeline state
      this.currentTimelineTime = clampedTime;
      this.updateAllItems(clampedTime);

      // Update engine if it exists
      if (this.engine) {
        const progress =
          this._totalDuration > 0 ? clampedTime / this._totalDuration : 0;
        this.engine.seek(progress);
      }
    } catch (error) {
      console.error("Timeline.seek() error:", error);
    }
    return this;
  }

  /**
   * Resets the timeline to its initial state.
   * Stops playback and resets all animations to their starting values.
   *
   * @returns This timeline instance
   */
  reset(): Timeline {
    try {
      // Reset engine
      this.engine?.reset();
      this.engine = null;

      // Reset timeline time
      this.currentTimelineTime = 0;

      // Reset all animation items
      this.items.forEach((item) => {
        try {
          item.animator.reset();
          item.state = "pending";
        } catch (error) {
          console.error(`Error resetting timeline item ${item.id}:`, error);
        }
      });
    } catch (error) {
      console.error("Timeline.reset() error:", error);
    }
    return this;
  }

  /**
   * Registers an event listener for timeline events.
   *
   * @param event Event name ('start', 'update', 'complete', 'pause', 'resume')
   * @param callback Function to call when event occurs
   * @returns This timeline instance
   */
  on(event: TimelineEvent, callback: Function): Timeline {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)!.push(callback);
    return this;
  }

  /**
   * Removes an event listener.
   *
   * @param event Event name
   * @param callback Function to remove (must be same reference as used in on())
   * @returns This timeline instance
   */
  off(event: TimelineEvent, callback: Function): Timeline {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
    return this;
  }

  /**
   * Removes all animations from the timeline and resets duration.
   * Does not affect currently playing state.
   *
   * @returns This timeline instance
   */
  clear(): Timeline {
    this.items = [];
    this._totalDuration = 0;
    this._lastEndTime = 0;
    return this;
  }

  // Getters for timeline state

  /** Total timeline duration in milliseconds */
  get duration(): number {
    return this._totalDuration;
  }

  /** Current time position in the timeline (milliseconds) */
  get currentTime(): number {
    return this.currentTimelineTime;
  }

  /** Whether the timeline is currently playing */
  get isPlaying(): boolean {
    return this.engine?.isPlaying ?? false;
  }

  /** Whether the timeline is currently paused */
  get isPaused(): boolean {
    return this.engine?.isPaused ?? false;
  }

  /** Number of animations in the timeline */
  get itemCount(): number {
    return this.items.length;
  }

  /** Current progress as a number between 0 and 1 */
  get progress(): number {
    return this._totalDuration > 0
      ? this.currentTimelineTime / this._totalDuration
      : 0;
  }

  // Private methods

  /**
   * Updates all timeline items based on the current timeline time.
   * Determines which animations should be active and updates them accordingly.
   */
  private updateAllItems(currentTime: number): void {
    this.items.forEach((item) => {
      try {
        let localProgress = 0;
        let newState: TimelineItem["state"] = "pending";

        if (currentTime < item.startTime) {
          // Animation hasn't started yet
          localProgress = 0;
          newState = "pending";
        } else if (currentTime >= item.endTime) {
          // Animation is complete
          localProgress = 1;
          newState = "complete";
        } else {
          // Animation is currently active
          localProgress = (currentTime - item.startTime) / item.duration;
          newState = "active";
        }

        // Update item state
        item.state = newState;

        // Update the animator with clamped progress
        const clampedProgress = clamp(localProgress, 0, 1);
        item.animator.update(clampedProgress);
      } catch (error) {
        console.error(`Error updating timeline item ${item.id}:`, error);
      }
    });
  }

  /**
   * Resolves a position token to an absolute time in milliseconds.
   */
  private resolvePosition(position?: TimelinePosition): number {
    if (position === undefined) {
      return this._lastEndTime;
    }

    if (typeof position === "number") {
      return Math.max(0, position);
    }

    switch (position) {
      case "<":
        return 0;
      case ">":
        return this._lastEndTime;
    }

    if (typeof position === "string") {
      if (position.startsWith("+=")) {
        const offset = parseFloat(position.slice(2));
        return this._lastEndTime + Math.max(0, offset);
      }

      if (position.startsWith("-=")) {
        const offset = parseFloat(position.slice(2));
        return Math.max(0, this._lastEndTime - Math.max(0, offset));
      }
    }

    // Fallback to end time
    return this._lastEndTime;
  }

  /**
   * Updates the timeline duration based on current items.
   */
  private updateTimelineDuration(): void {
    if (this.items.length === 0) {
      this._totalDuration = 0;
      this._lastEndTime = 0;
      return;
    }

    // Calculate total duration as the latest end time
    this._totalDuration = Math.max(...this.items.map((item) => item.endTime));
    this._lastEndTime = this._totalDuration;
  }

  /**
   * Generates a unique ID for timeline items.
   */
  private generateItemId(): string {
    return `timeline_item_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;
  }

  /**
   * Returns the number of currently active animations.
   */
  private getActiveItemCount(): number {
    return this.items.filter((item) => item.state === "active").length;
  }

  /**
   * Marks all timeline items as complete (used when timeline finishes).
   */
  private markAllItemsComplete(): void {
    this.items.forEach((item) => {
      item.state = "complete";
    });
  }

  /**
   * Emits an event to all registered listeners.
   */
  private emit(event: TimelineEvent, data?: any): void {
    const callbacks = this.eventCallbacks.get(event) ?? [];
    callbacks.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Timeline event "${event}" callback error:`, error);
      }
    });
  }
}
