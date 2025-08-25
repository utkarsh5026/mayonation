import type { TimelinePosition, TimelineEvent } from "./types";
import { CSSAnimator, AnimationProperties, AnimationKeyframe } from "@/css";
import { AnimationEngine } from "@/core";
import { ElementLike } from "@/utils/dom";
import { EaseFunction } from "@/core/ease-fns";
import { clamp } from "@/utils/math";

export interface TimelineItem {
  animator: CSSAnimator;
  startTime: number;
  endTime: number;
  id: string;
}

/**
 * High-level animation timeline.
 *
 * - Schedules multiple CSS animations on one clock.
 * - Supports placement tokens ("<", ">", "+=x", "-=x") or absolute times.
 * - Controls playback (play, pause, resume, seek, reset).
 * - Emits lifecycle events: start, update, complete, pause, resume.
 */
export class Timeline {
  private items: TimelineItem[] = [];
  private engine: AnimationEngine | null = null;
  private totalDuration: number = 0;
  private lastAddedTime: number = 0;
  private eventCallbacks: Map<string, Function[]> = new Map();

  /**
   * Create a timeline.
   * @param options.loop If true, restarts when completed.
   */
  constructor(private options: { loop?: boolean } = {}) {}

  /**
   * Add a CSS animation to the timeline.
   *
   * Usage:
   * - position "<" at time 0
   * - position ">" at current end
   * - position "+=500" 500ms after last add
   * - position "-=250" 250ms before last add
   *
   * @param target Elements to animate (selector, element, or list).
   * @param config Animation config: duration, delay, stagger, ease, from/to, keyframes.
   * @param position Optional placement token or absolute ms.
   * @returns this (chainable)
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
    const startTime = this.resolvePosition(position);
    const duration = config.duration ?? 1000;

    const animator = new CSSAnimator({
      target,
      duration,
      ...config,
    });

    const endTime = startTime + animator.totalDuration;
    this.addItem(animator, startTime, endTime);
    return this;
  }

  /**
   * Start playback (no-op if already playing).
   * Triggers start/update/complete events as time advances.
   * @returns this
   */
  play(): Timeline {
    if (this.engine?.isPlaying) return this;

    this.engine = new AnimationEngine({
      duration: this.totalDuration,
      loop: this.options.loop,
      onStart: () => {
        this.items.forEach((item) => {
          try {
            item.animator.start();
          } catch (error) {
            console.error(`Timeline animator start error:`, error);
          }
        });
        this.emit("start");
      },
      onUpdate: (progress: number) => {
        this.updateAllItems(progress * this.totalDuration);
        this.emit("update", { progress, time: progress * this.totalDuration });
      },
      onComplete: () => {
        this.items.forEach((item) => {
          try {
            item.animator.complete();
          } catch (error) {
            console.error(`Timeline animator complete error:`, error);
          }
        });
        this.emit("complete");
      },
      onPause: () => this.emit("pause"),
      onResume: () => this.emit("resume"),
    });

    this.engine.play();
    return this;
  }

  /**
   * Jump to a time/position without playing.
   * @param position Absolute ms or token ("<", ">", "+=x", "-=x").
   * @returns this
   */
  seek(position: number | TimelinePosition): Timeline {
    const time =
      typeof position === "number" ? position : this.resolvePosition(position);

    this.updateAllItems(time);

    if (this.engine) {
      this.engine.seek(time / this.totalDuration);
    }

    return this;
  }

  /**
   * Pause playback.
   * @returns this
   */
  pause(): Timeline {
    this.engine?.pause();
    return this;
  }

  /**
   * Resume playback (starts if not started).
   * @returns this
   */
  resume(): Timeline {
    this.engine?.play();
    return this;
  }

  /**
   * Stop engine and reset all items to their initial state.
   * @returns this
   */
  reset(): Timeline {
    this.engine?.reset();
    this.items.forEach((item) => {
      try {
        item.animator.reset();
      } catch (error) {
        console.error(`Timeline animator reset error:`, error);
      }
    });
    this.lastAddedTime = 0;
    return this;
  }

  /**
   * Listen to a timeline event.
   * Events: "start", "update", "complete", "pause", "resume".
   * @param event Event name.
   * @param callback Handler invoked with event data.
   * @returns this
   */
  on(event: TimelineEvent, callback: Function): Timeline {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)!.push(callback);
    return this;
  }

  /**
   * Remove a previously registered handler.
   * @param event Event name.
   * @param callback Same reference passed to on().
   * @returns this
   */
  off(event: TimelineEvent, callback: Function): Timeline {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    }
    return this;
  }

  /** Total scheduled duration (ms). */
  get duration(): number {
    return this.totalDuration;
  }

  /** True while timeline is playing. */
  get isPlaying(): boolean {
    return this.engine?.isPlaying ?? false;
  }

  /** True while timeline is paused. */
  get isPaused(): boolean {
    return this.engine?.isPaused ?? false;
  }

  /**
   * Internal: update all items to reflect a global time (ms).
   * Converts global time to each item's local progress and updates its animator.
   */
  private updateAllItems(currentTime: number): void {
    this.items.forEach((item) => {
      const { animator, startTime, endTime } = item;

      try {
        if (currentTime < startTime) {
          animator.update(0);
          return;
        }

        if (currentTime >= endTime) {
          animator.update(1);
          return;
        }

        const localProgress =
          (currentTime - startTime) / animator.totalDuration;
        animator.update(clamp(localProgress, 0, 1));
      } catch (error) {
        console.error(`Timeline animator update error:`, error);
      }
    });
  }

  /**
   * Internal: add an item and extend total duration.
   */
  private addItem(animator: CSSAnimator, start: number, end: number) {
    this.items.push({
      animator,
      startTime: start,
      endTime: end,
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    });

    // Update total duration and last added time
    this.totalDuration = Math.max(this.totalDuration, end);
    this.lastAddedTime = end;
  }

  /**
   * Internal: resolve a position token to an absolute time (ms).
   * "<" => 0, ">" => timeline end, "+=x" => last + x, "-=x" => last - x.
   */
  private resolvePosition(position?: TimelinePosition): number {
    if (position === undefined) return this.lastAddedTime;
    if (typeof position === "number") return position;
    if (position === "<") return 0;
    if (position === ">") return this.totalDuration;

    if (typeof position === "string") {
      if (position.startsWith("+=")) {
        return this.lastAddedTime + parseFloat(position.slice(2));
      }
      if (position.startsWith("-=")) {
        return this.lastAddedTime - parseFloat(position.slice(2));
      }
    }

    return this.lastAddedTime;
  }

  /**
   * Internal: emit an event to registered handlers.
   */
  private emit(event: string, data?: any): void {
    const callbacks = this.eventCallbacks.get(event) ?? [];
    callbacks.forEach((cb) => {
      try {
        cb(data);
      } catch (error) {
        console.error(`Timeline event "${event}" callback error:`, error);
      }
    });
  }
}
