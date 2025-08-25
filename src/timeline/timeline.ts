import type { TimelinePosition, TimelineEvent } from "./types";
import { CSSAnimator, AnimationProperties, AnimationKeyframe } from "@/css";
import { AnimationEngine } from "@/core";
import { ElementLike } from "@/utils/dom";
import { EaseFunction } from "@/core/ease-fns";
import { clamp } from "@/utils/math";

interface TimelineItem {
  animator: CSSAnimator;
  startTime: number;
  endTime: number;
  id: string;
}

export class Timeline {
  private items: TimelineItem[] = [];
  private engine: AnimationEngine | null = null;
  private totalDuration: number = 0;
  private lastAddedTime: number = 0;
  private eventCallbacks: Map<string, Function[]> = new Map();

  constructor(private options: { loop?: boolean } = {}) {}

  /**
   * Add CSS animation to timeline with enhanced property support
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

  seek(position: number | TimelinePosition): Timeline {
    const time =
      typeof position === "number" ? position : this.resolvePosition(position);

    this.updateAllItems(time);

    if (this.engine) {
      this.engine.seek(time / this.totalDuration);
    }

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

  on(event: TimelineEvent, callback: Function): Timeline {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)!.push(callback);
    return this;
  }

  off(event: TimelineEvent, callback: Function): Timeline {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    }
    return this;
  }

  get duration(): number {
    return this.totalDuration;
  }

  get isPlaying(): boolean {
    return this.engine?.isPlaying ?? false;
  }

  get isPaused(): boolean {
    return this.engine?.isPaused ?? false;
  }

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

        const localProgress = (currentTime - startTime) / animator.totalDuration;
        animator.update(clamp(localProgress, 0, 1));
      } catch (error) {
        console.error(`Timeline animator update error:`, error);
      }
    });
  }

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
