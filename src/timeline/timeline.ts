import { CSSAnimator, AnimationProperties, AnimationKeyframe } from "@/css";
import { AnimationEngine } from "@/core";
import { ElementLike } from "@/utils/dom";
import { EaseFunction } from "@/core/ease-fns";
import { clamp } from "@/utils/math";
import { Position, type TimelinePos } from "./position";
import { clampProgress } from "@/utils/progress";

export interface TimelineAddOptions {
  /**
   * Optional label for this animation (for referencing)
   */
  label?: string;

  /**
   * Where to position this animation
   */
  position?: TimelinePos;

  /**
   * Animation configuration
   */
  duration?: number;
  ease?: EaseFunction;
  from?: AnimationProperties;
  to?: AnimationProperties;
  keyframes?: AnimationKeyframe[];
  stagger?: number;
}

export class Timeline {
  private items: Array<{
    animator: CSSAnimator;
    startTime: number;
    endTime: number;
    label?: string;
    hasStarted: boolean;
  }> = [];

  private engine: AnimationEngine | null = null;
  private totalDuration: number = 0;
  private lastEndTime: number = 0;
  private labels: Map<string, number> = new Map();

  constructor(private options: { loop?: boolean } = {}) {}

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
   * Add a delay/pause to the timeline
   */
  delay(milliseconds: number): Timeline {
    this.lastEndTime += milliseconds;
    this.totalDuration = Math.max(this.totalDuration, this.lastEndTime);
    return this;
  }

  play(): Timeline {
    if (this.engine?.isPlaying) return this;

    this.engine = new AnimationEngine({
      duration: this.totalDuration,
      loop: this.options.loop,
      onStart: () => {
        // Timeline starts, but individual animations start when their time comes
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

  pause(): Timeline {
    this.engine?.pause();
    return this;
  }

  resume(): Timeline {
    this.engine?.play();
    return this;
  }

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

  reset(): Timeline {
    this.engine?.reset();
    this.items.forEach((item) => {
      item.hasStarted = false;
      item.animator.reset();
    });
    return this;
  }

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
        const localProgress =
          (currentTime - item.startTime) / (item.endTime - item.startTime);
        item.animator.update(clampProgress(localProgress));
      }
    });
  }

  private resolvePosition(position?: TimelinePos): number {
    if (!position) return this.lastEndTime;

    // Handle Position class
    if (position instanceof Position) {
      return position._resolve({
        currentEnd: this.lastEndTime,
        previousEnd: this.lastEndTime,
        totalDuration: this.totalDuration,
        labels: this.labels,
      });
    }

    // Handle number
    if (typeof position === "number") {
      return position;
    }

    // Handle string literals
    if (position === "start") return 0;
    if (position === "end") return this.lastEndTime;

    if (typeof position === "object") {
      if ("at" in position) return position.at;
      if ("after" in position) return this.lastEndTime + position.after;
      if ("before" in position)
        return Math.max(0, this.lastEndTime - position.before);
      if ("percent" in position)
        return (position.percent / 100) * this.totalDuration;
      if ("with" in position) {
        const labelTime = this.labels.get(position.with) ?? 0;
        return labelTime + (position.offset ?? 0);
      }
    }

    return this.lastEndTime;
  }
}
