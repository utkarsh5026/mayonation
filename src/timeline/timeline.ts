import { CSSAnimator, AnimationProperties, AnimationKeyframe } from "@/css";
import { AnimationEngine } from "@/core";
import { ElementLike } from "@/utils/dom";
import { EaseFunction } from "@/core/ease-fns";
import { clamp } from "@/utils/math";
import { Position, type TimelinePos } from "./position";
import { clampProgress } from "@/utils/progress";

/**
 * Options for adding a single animation to a Timeline.
 */
export interface TimelineAddOptions {
  /**
   * Optional label for this animation (for referencing)
   * Use with positions like { with: "intro", offset: 200 }.
   */
  label?: string;

  /**
   * Where to position this animation.
   * Accepts:
   * - number (absolute ms)
   * - "start" | "end"
   * - Position instance (e.g., Position.after(200))
   * - Object: { at }, { after }, { before }, { percent }, { with, offset? }
   */
  position?: TimelinePos;

  /**
   * Total duration in milliseconds (defaults to 1000).
   */
  duration?: number;

  /**
   * Easing function for the animation.
   */
  ease?: EaseFunction;

  /**
   * Starting CSS properties (if omitted, current computed state is used).
   */
  from?: AnimationProperties;

  /**
   * Ending CSS properties.
   */
  to?: AnimationProperties;

  /**
   * Explicit keyframes (overrides from/to if provided).
   */
  keyframes?: AnimationKeyframe[];

  /**
   * Optional per-target delay (ms) for multi-target/staggered animations.
   */
  stagger?: number;
}

interface TimelineItem {
  animator: CSSAnimator;
  startTime: number;
  endTime: number;
  label?: string;
  hasStarted: boolean;
}
/**
 * Orchestrates multiple CSSAnimator instances on a shared timeline.
 * Use play/pause/resume/seek/reset to control playback.
 */
export class Timeline {
  private items: Array<TimelineItem> = [];

  private engine: AnimationEngine | null = null;
  private totalDuration: number = 0;
  private lastEndTime: number = 0;
  private labels: Map<string, number> = new Map();

  /**
   * Create a Timeline.
   * @param options.loop If true, restarts after reaching the end.
   */
  constructor(private options: { loop?: boolean } = {}) {}

  /**
   * Add an animation to the timeline.
   * Computes its start time, builds a CSSAnimator, and updates total duration.
   *
   * @param target Element or ElementLike to animate.
   * @param options See TimelineAddOptions.
   * @returns this
   */
  add(target: ElementLike, options: TimelineAddOptions): Timeline {
    const position = this.resolvePosition(options.position);
    const animator = new CSSAnimator({
      target,
      duration: options.duration ?? 1000,
      ease: options.ease,
      from: options.from,
      to: options.to,
      keyframes: options.keyframes,
      stagger: options.stagger ?? 0,
    });

    const startTime = position;
    const endTime = startTime + animator.totalDuration;

    if (options.label) {
      this.labels.set(options.label, startTime);
    }

    this.items.push({
      animator,
      startTime,
      endTime,
      label: options.label,
      hasStarted: false,
    });

    console.log(this.items);

    this.totalDuration = Math.max(this.totalDuration, endTime);
    this.lastEndTime = endTime;

    return this;
  }

  /**
   * Convenience: animate TO the given properties.
   *
   * @param target Element or ElementLike.
   * @param properties Ending CSS properties.
   * @param duration Milliseconds (default 1000).
   * @param position Where to place this item (see TimelinePos).
   * @returns this
   */
  to(
    target: ElementLike,
    properties: AnimationProperties,
    duration: number = 1000,
    position?: TimelinePos
  ): Timeline {
    return this.add(target, {
      to: properties,
      duration,
      position,
    });
  }

  /**
   * Convenience: animate FROM the given properties.
   *
   * @param target Element or ElementLike.
   * @param properties Starting CSS properties.
   * @param duration Milliseconds (default 1000).
   * @param position Where to place this item (see TimelinePos).
   * @returns this
   */
  from(
    target: ElementLike,
    properties: AnimationProperties,
    duration: number = 1000,
    position?: TimelinePos
  ): Timeline {
    return this.add(target, {
      from: properties,
      duration,
      position,
    });
  }

  /**
   * Insert a pause after the last scheduled end.
   *
   * @param milliseconds Gap length in ms.
   * @returns this
   */
  delay(milliseconds: number): Timeline {
    this.lastEndTime += milliseconds;
    this.totalDuration = Math.max(this.totalDuration, this.lastEndTime);
    return this;
  }

  /**
   * Start playing from the current position.
   * No-op if already playing.
   * @returns this
   */
  play(): Timeline {
    if (this.engine?.isPlaying) return this;

    this.engine = new AnimationEngine({
      duration: this.totalDuration,
      loop: this.options.loop,
      onStart: () => {
        // Timeline starts, individual items fire at their own start times.
      },
      onUpdate: (progress: number) => {
        this.updateAllItems(progress * this.totalDuration);
      },
      onComplete: () => {
        this.items.forEach((item) => {
          if (item.hasStarted) {
            item.animator.complete();
          }
        });
      },
    });

    this.engine.play();
    return this;
  }

  /**
   * Pause playback (if playing).
   * @returns this
   */
  pause(): Timeline {
    this.engine?.pause();
    return this;
  }

  /**
   * Resume playback (if paused).
   * @returns this
   */
  resume(): Timeline {
    this.engine?.play();
    return this;
  }

  /**
   * Jump to an absolute time on the timeline and update all items.
   *
   * @param time Milliseconds from start (clamped to [0, totalDuration]).
   * @returns this
   */
  seek(time: number): Timeline {
    const clampedTime = clamp(time, 0, this.totalDuration);

    this.items.forEach((item) => {
      item.hasStarted = false;
    });

    this.updateAllItems(clampedTime);

    if (this.engine) {
      this.engine.seek(clampedTime / this.totalDuration);
    }

    return this;
  }

  /**
   * Reset timeline and all animations to their initial states.
   * @returns this
   */
  reset(): Timeline {
    this.engine?.reset();
    this.items.forEach((item) => {
      item.hasStarted = false;
      item.animator.reset();
    });
    return this;
  }

  /**
   * Schedule multiple animations to start together as a group.
   * The first uses the current end; others are pinned to that same start.
   *
   * @param animations Array of { target, options } (without position).
   * @returns this
   */
  group(
    animations: Array<{
      target: ElementLike;
      options: Omit<TimelineAddOptions, "position">;
    }>
  ): Timeline {
    const groupStart = this.lastEndTime;

    animations.forEach((anim, index) => {
      this.add(anim.target, {
        ...anim.options,
        position: index === 0 ? undefined : Position.at(groupStart),
      });
    });

    return this;
  }

  /**
   * Drive all scheduled items to a given global time.
   * Starts items at their startTime, updates active items with local progress,
   * and finalizes items that have passed endTime.
   *
   * @param currentTime Global time (ms).
   */
  private updateAllItems(currentTime: number): void {
    this.items.forEach((item) => {
      if (currentTime < item.startTime) {
        return;
      }

      if (!item.hasStarted && currentTime >= item.startTime) {
        item.hasStarted = true;
        item.animator.start();
      }

      if (currentTime >= item.endTime) {
        if (item.hasStarted) {
          item.animator.update(1);
        }
        return;
      }

      if (item.hasStarted) {
        const progress = this.getItemProgress(item, currentTime);
        item.animator.update(progress);
      }
    });
  }

  /**
   * Calculates the progress of a timeline item based on the current time.
   *
   * @param item - The timeline item containing the start and end times.
   * @param currentTime - The current time to calculate the progress against.
   * @returns The progress of the item as a number between 0 and 1, clamped to ensure it stays within this range.
   */
  private getItemProgress(item: TimelineItem, currentTime: number): number {
    const { startTime, endTime } = item;
    const dur = endTime - startTime;
    return clampProgress((currentTime - startTime) / dur);
  }

  /**
   * Resolve a TimelinePos into an absolute time in ms.
   *
   * @param position Timeline position or undefined (defaults to lastEndTime).
   * @returns Absolute time in milliseconds.
   */
  private resolvePosition(position?: TimelinePos): number {
    if (!position) return this.lastEndTime;

    if (position instanceof Position) {
      return position._resolve({
        currentEnd: this.lastEndTime,
        previousEnd: this.lastEndTime,
        totalDuration: this.totalDuration,
        labels: this.labels,
      });
    }

    if (typeof position === "number") {
      return position;
    }

    if (position === "start") return 0;
    if (position === "end") return this.lastEndTime;

    if (typeof position === "object") {
      if ("at" in position) {
        return position.at;
      }
      if ("after" in position) {
        return this.lastEndTime + position.after;
      }
      if ("before" in position) {
        return Math.max(0, this.lastEndTime - position.before);
      }
      if ("percent" in position) {
        return (position.percent / 100) * this.totalDuration;
      }
      if ("with" in position) {
        const labelTime = this.labels.get(position.with) ?? 0;
        return labelTime + (position.offset ?? 0);
      }
    }

    return this.lastEndTime;
  }
}
