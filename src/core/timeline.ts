import { type EaseFnName, type EaseFn, easeFns } from "./ease_fns";
import type { PropertiesConfig } from "./config";
import { KeyframeManager, type Keyframe } from "./keyframe";

type TimelinePosition =
  | number // Absolute time in ms
  | "<" // At start of timeline
  | ">" // At end of timeline
  | `+=${number}` // Relative to previous animation end
  | `-=${number}`; // Relative to previous animation start

type TimelineTargets =
  | string
  | HTMLElement
  | HTMLElement[]
  | NodeListOf<Element>;

type TimelineSegmentConfig = {
  targets: TimelineTargets;
  keyframes: Keyframe[];
  startTime: number;
  duration: number;
  easing?: EaseFn | EaseFnName;
  direction?: "normal" | "reverse" | "alternate";
  iterations?: number;
};

type TimelineState = "idle" | "playing" | "paused" | "completed";
type TimelineEventType =
  | "start"
  | "pause"
  | "resume"
  | "complete"
  | "loop"
  | "update";

/**
 * Represents a segment of a timeline, managing the animation of a set of keyframes.
 *
 * This class encapsulates the logic for updating the animation state based on progress,
 * handling iterations, direction, and easing of the animation. It also provides methods
 * for resetting the animation state and getting the end time of the segment.
 *
 * @param element The HTML element to animate.
 * @param config The configuration for the timeline segment.
 */
export class TimelineSegment {
  private readonly kfManager: KeyframeManager;
  private iterationCount: number = 0;
  private currDirection: "forward" | "backward" = "forward";
  private lastProgress: number | null = null;
  private readonly config: Required<TimelineSegmentConfig>;

  /**
   * Initializes a new instance of the TimelineSegment class.
   *
   * @param element The HTML element to animate.
   * @param config The configuration for the timeline segment.
   */
  constructor(element: HTMLElement, config: TimelineSegmentConfig) {
    if (!element) throw new Error("Element is required");

    this.validateConfig(config);
    this.config = {
      ...config,
      iterations: config.iterations ?? 1,
      direction: config.direction ?? "normal",
      easing: config.easing ?? easeFns.linear,
    };
    // Apply the segment's easing function to each keyframe if not already set
    const keyframes = config.easing
      ? config.keyframes.map((kf) => ({
          ...kf,
          easing: kf.easing || config.easing,
        }))
      : config.keyframes;
    this.kfManager = new KeyframeManager(element, keyframes);
  }

  /**
   * Updates the animation state based on the given progress.
   *
   * This method calculates the local time within the segment based on the progress,
   * determines the current iteration and direction, and updates the keyframe manager
   * accordingly. It also handles edge cases such as progress before the start time,
   * at the end time, or beyond the end time.
   *
   * @param progress The progress value to update the animation state.
   */
  public update(progress: number) {
    if (typeof progress !== "number" || isNaN(progress)) {
      console.warn("Invalid progress value:", progress);
      return;
    }

    const {
      startTime,
      duration,
      iterations = 1,
      direction = "normal",
    } = this.config;

    const localTime = progress - startTime;
    if (this.handleLocalTime(localTime, progress)) return;

    try {
      const currItr = Math.min(localTime / duration, iterations);
      const newItrCount = Math.floor(currItr);

      if (newItrCount !== this.iterationCount) {
        this.iterationCount = newItrCount;
        this.updateDirection();
      }

      let iterationProgress;
      if (localTime === duration * iterations) {
        iterationProgress = 1;
      } else {
        iterationProgress = currItr % 1;
        iterationProgress = Math.max(0, Math.min(1, iterationProgress));
      }

      if (direction === "reverse" || this.currDirection === "backward") {
        iterationProgress = 1 - iterationProgress;
      }

      this.kfManager.update(iterationProgress);
      this.lastProgress = progress;
    } catch (error) {
      console.error("Error updating animation:", error);
      this.reset();
    }
  }

  /**
   * Resets the animation state to its initial state.
   *
   * This method resets the keyframe manager, iteration count, direction, and last progress.
   */
  public reset(): void {
    this.kfManager.reset();
    this.iterationCount = 0;
    this.currDirection = "forward";
    this.lastProgress = null;
  }

  /**
   * Gets the end time of the timeline segment.
   *
   * This method calculates and returns the end time of the segment based on its start time,
   * duration, and number of iterations.
   *
   * @returns The end time of the timeline segment.
   */
  public get endTime(): number {
    const { startTime, duration, iterations = 1 } = this.config;
    return startTime + duration * iterations;
  }

  /**
   * Validates the configuration for the timeline segment.
   *
   * This method checks if the keyframes array is not empty, duration is positive, and
   * iterations are positive if specified.
   *
   * @param config The configuration to validate.
   */
  private validateConfig(config: TimelineSegmentConfig) {
    if (!config.keyframes?.length) throw new Error("Keyframes are required");
    if (config.duration <= 0) throw new Error("Duration must be positive");
    if (config.iterations !== undefined && config.iterations <= 0) {
      throw new Error("Iterations must be positive");
    }
  }

  /**
   * Updates the direction of the animation based on the current iteration count.
   *
   * This method determines the direction of the animation based on the iteration count
   * and the direction specified in the configuration.
   */
  private updateDirection() {
    const { direction } = this.config;
    if (direction === "alternate") {
      this.currDirection =
        this.iterationCount % 2 === 0 ? "forward" : "backward";
    } else {
      this.currDirection = direction === "normal" ? "forward" : "backward";
    }
  }

  /**
   * Handles edge cases for local time within the segment.
   *
   * This method checks if the local time is before the start time, at the end time, or
   * beyond the end time, and updates the keyframe manager accordingly.
   *
   * @param localTime The local time within the segment.
   * @param progress The progress value.
   * @returns True if the local time is at an edge case, false otherwise.
   */
  private handleLocalTime(localTime: number, progress: number): boolean {
    const { duration, iterations } = this.config;
    if (localTime < 0) {
      this.kfManager.update(this.config.direction === "reverse" ? 1 : 0);
      this.lastProgress = progress;
      return true;
    }

    const epsilon = 0.000001;
    const totalDuration = duration * iterations;

    if (localTime > totalDuration + epsilon) {
      this.kfManager.update(this.config.direction === "reverse" ? 0 : 1);
      this.lastProgress = progress;
      return true;
    }

    if (Math.abs(localTime - totalDuration) < epsilon) {
      this.kfManager.update(this.config.direction === "reverse" ? 0 : 1);
      this.lastProgress = progress;
      return true;
    }

    return false;
  }
}

/**
 * Timeline class for managing complex animations.
 *
 * This class provides a powerful animation timeline system that allows you to:
 * - Create sequences of animations
 * - Control playback (play, pause, resume, reset)
 * - Seek to specific positions
 * - Handle events
 * - Support looping animations
 *
 * Key features:
 * - Precise timing control with configurable precision
 * - Multiple animation segments support
 * - Event system for animation lifecycle hooks
 * - Flexible positioning system for animation sequencing
 */
/**
 * Timeline class for managing complex animations.
 *
 * This class provides a powerful and flexible animation timeline system that allows you to create
 * sophisticated animations with precise control. Think of it like a video editing timeline where
 * you can sequence multiple animations, control their playback, and coordinate timing.
 *
 * Core capabilities:
 * - Create sequences of animations that play in order or overlap
 * - Control playback with play(), pause(), resume(), reset()
 * - Seek to any position in the timeline
 * - Handle animation lifecycle events (start, update, complete, etc)
 * - Support looping animations
 * - Animate multiple elements in sync
 *
 * Key features:
 * - Precise timing control with configurable precision
 * - Multiple animation segments that can be positioned absolutely or relatively
 * - Rich event system for animation lifecycle hooks
 * - Flexible positioning system using absolute times or relative offsets
 * - Support for both keyframe and property-based animations
 * - Chainable API for fluent usage
 *
 * Basic usage:
 * ```ts
 * const timeline = new Timeline();
 *
 * // Add animations
 * timeline
 *   .add('.box1', { translateX: 100, duration: 1000 })
 *   .add('.box2', { scale: 2 }, '+=500') // Starts 500ms after previous
 *   .add('.box3', { opacity: 0 }, 2000);  // Starts at 2000ms
 *
 * // Control playback
 * timeline.play();
 * timeline.pause();
 * timeline.resume();
 * timeline.seek(1500); // Jump to 1.5s
 * ```
 *
 * Advanced features:
 * - Keyframe animations with multiple steps
 * - Custom easing functions
 * - Event handling for animation lifecycle
 * - Precise timing control
 * - Element selection via CSS selectors
 *
 * @example
 * ```ts
 * // Create a timeline with looping enabled
 * const timeline = new Timeline({ loop: true });
 *
 * // Add a keyframe animation
 * timeline.add('.element', [
 *   { offset: 0, translateX: 0 },
 *   { offset: 0.5, translateX: 100 },
 *   { offset: 1, translateX: 0 }
 * ]);
 *
 * // Listen for events
 * timeline.on('update', ({ time, progress }) => {
 *   console.log(`Progress: ${progress}`);
 * });
 *
 * timeline.play();
 * ```
 */
export class Timeline {
  // Store animation segments and event listeners
  private readonly segments: TimelineSegment[] = [];
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
   *
   * @param options Configuration options for the timeline
   * @param options.loop Whether the animation should loop after completion
   * @param options.precision Minimum time difference (in ms) to trigger updates (default: 0.001)
   *
   * @example
   * ```ts
   * // Create a basic timeline
   * const timeline = new Timeline();
   *
   * // Create a looping timeline with custom precision
   * const preciseLoop = new Timeline({
   *   loop: true,
   *   precision: 0.0001
   * });
   * ```
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
  }

  /**
   * Adds a new animation segment to the timeline. This is the main method for building
   * your animation sequence.
   *
   * @param targets Elements to animate - can be:
   *   - CSS selector string (e.g., '.my-class')
   *   - DOM element
   *   - Array of DOM elements
   *   - NodeList from querySelectorAll
   * @param props Animation properties configuration or keyframes array:
   *   - For basic animations: { duration, easing, ...properties }
   *   - For keyframes: Array of { offset, ...properties }
   * @param pos Position in timeline - can be:
   *   - Number (absolute time in ms)
   *   - "+=n" (n ms after previous animation)
   *   - "-=n" (n ms before previous animation)
   *   - ">" (at the end of timeline)
   * @returns this for method chaining
   *
   * @example
   * ```ts
   * timeline
   *   // Basic animation
   *   .add('.box', {
   *     duration: 1000,
   *     translateX: 100,
   *     opacity: 0.5
   *   })
   *
   *   // Keyframe animation
   *   .add('#circle', [
   *     { offset: 0, scale: 1 },
   *     { offset: 0.5, scale: 1.5 },
   *     { offset: 1, scale: 1 }
   *   ], '+=500')
   *
   *   // Multiple elements
   *   .add([el1, el2], {
   *     duration: 2000,
   *     rotate: 360
   *   }, 1000);
   * ```
   */
  public add(
    targets: TimelineTargets,
    props: PropertiesConfig | Keyframe[],
    pos?: TimelinePosition
  ): this {
    try {
      if (!targets) throw new Error("Timeline: targets are required");
      if (!props)
        throw new Error("Timeline: properties configuration is required");

      const elements = this.resolveElements(targets);

      if (elements.length === 0) {
        console.warn("Timeline: No elements found for the specified targets");
        return this;
      }

      const startTime =
        pos !== undefined ? this.resolveTimePosition(pos) : this.latestEndTime;
      const config = this.createSegmentConfig(elements, props, startTime);

      elements.forEach((element) => {
        const segment = new TimelineSegment(element, config);
        this.segments.push(segment);
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
   *
   * @returns this for method chaining
   *
   * @example
   * ```ts
   * // Play animation
   * timeline.play();
   *
   * // Later, pause it
   * setTimeout(() => {
   *   timeline.pause();
   * }, 1000);
   * ```
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
   *
   * @returns this for method chaining
   *
   * @example
   * ```ts
   * timeline.play()
   *   .pause()  // Pause after some time
   *   .resume(); // Resume playback
   * ```
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
   *
   * @returns this for method chaining
   *
   * @example
   * ```ts
   * // Reset and replay
   * timeline.reset().play();
   *
   * // Reset and seek to middle
   * timeline.reset().seek(timeline.duration / 2);
   * ```
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
   *
   * @returns this for method chaining
   *
   * @example
   * ```ts
   * // Basic playback
   * timeline.play();
   *
   * // Chain multiple operations
   * timeline
   *   .add('.element', { opacity: 0 })
   *   .seek(500)
   *   .play();
   * ```
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
   *
   * @param position Target position - can be:
   *   - Number (time in ms)
   *   - ">" (end of timeline)
   *   - "<" (start of timeline)
   * @returns this for method chaining
   *
   * @example
   * ```ts
   * // Seek to specific time
   * timeline.seek(1500); // 1.5 seconds
   *
   * // Seek to end
   * timeline.seek(">");
   *
   * // Seek to start
   * timeline.seek("<");
   * ```
   */
  public seek(position: TimelinePosition): this {
    const time = this.resolveTimePosition(position);
    this.currentTime = Math.min(Math.max(0, time), this.duration);
    this.updateSegments(this.currentTime);
    return this;
  }

  /**
   * Gets the current progress of the timeline as a value between 0 and 1.
   *
   * @returns Progress value (0 = start, 1 = end)
   *
   * @example
   * ```ts
   * timeline.on('update', () => {
   *   console.log(`Progress: ${timeline.progress * 100}%`);
   * });
   * ```
   */
  public get progress(): number {
    return this.currentTime / this.duration;
  }

  /**
   * Gets the total duration of the timeline in milliseconds.
   *
   * @returns Duration in milliseconds
   *
   * @example
   * ```ts
   * // Seek to halfway point
   * timeline.seek(timeline.totalDuration / 2);
   * ```
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
   *
   * @param event Event type to listen for
   * @param callback Function to call when event occurs
   * @returns this for method chaining
   *
   * @example
   * ```ts
   * timeline
   *   .on('start', () => console.log('Animation started'))
   *   .on('update', ({ progress }) => {
   *     console.log(`Progress: ${progress * 100}%`);
   *   })
   *   .on('complete', () => console.log('Done!'));
   * ```
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
   *
   * @param event Event type to remove listener from
   * @param callback The callback function to remove
   * @returns this for method chaining
   *
   * @example
   * ```ts
   * const updateFn = ({ progress }) => console.log(progress);
   *
   * // Add listener
   * timeline.on('update', updateFn);
   *
   * // Later, remove it
   * timeline.off('update', updateFn);
   * ```
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
   *
   * Call this when you're done with the timeline to prevent memory leaks.
   *
   * @example
   * ```ts
   * // Clean up when done
   * timeline.destroy();
   * ```
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
    elements: HTMLElement[],
    props: PropertiesConfig | Keyframe[],
    startTime: number
  ): TimelineSegmentConfig {
    if (Array.isArray(props)) {
      return {
        targets: elements,
        keyframes: props,
        startTime,
        duration: this.calculateKeyframeDuration(props),
      };
    }

    const { duration = 1000, easing, ...animationProps } = props;
    return {
      targets: elements,
      keyframes: [
        { offset: 0, easing },
        { ...animationProps, offset: 1 },
      ],
      startTime,
      duration,
    };
  }

  /**
   * Calculates duration from keyframe configuration
   */
  private calculateKeyframeDuration(keyframes: Keyframe[]): number {
    const lastKeyframe = keyframes[keyframes.length - 1];
    return lastKeyframe.duration ?? 1000;
  }

  /**
   * Gets the end time of the last segment
   */
  private get latestEndTime(): number {
    if (this.segments.length === 0) return 0;
    const endTimes = this.segments.map((segment) => {
      return segment.endTime;
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
    this.segments.forEach((segment) => segment.update(time));
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
