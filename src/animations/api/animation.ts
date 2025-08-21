import type {
  AnimationConfig,
  AnimationProperties,
  AnimationState,
  ProcessedKeyframe,
} from "./types";
import { AnimatableProperty, PropertyManager } from "@/core/property-manager";
import { ElementResolver, type ElementLike } from "@/utils/dom";
import { resolveEaseFn } from "@/core/ease_fns";

/**
 * Represents an individual element's animation state and manager
 */
interface ElementAnimationState {
  element: HTMLElement;
  propertyManager: PropertyManager;
  startTime: number;
  currentProgress: number;
  isActive: boolean;
  isComplete: boolean;
}

/**
 * Enhanced animation class that handles multiple elements with stagger support
 */
export class MayoAnimation {
  readonly id: string;
  readonly config: Readonly<AnimationConfig>;
  readonly elements: HTMLElement[];

  private _state: AnimationState = "idle";
  private _progress: number = 0;
  private _duration: number;
  private _startTime: number = 0;
  private _pausedTime: number = 0;
  private _rafId: number | null = null;
  private _finishedPromise: Promise<void>;
  private _finishedResolve?: () => void;
  private _timeScale: number = 1;
  private _direction: 1 | -1 = 1;
  private _iteration: number = 0;

  private _lastFrameTime: number = 0;
  private _frameCount: number = 0;
  private _fps: number = 60;

  // Multi-element state management
  private elementStates: ElementAnimationState[] = [];
  private staggerDelay: number = 0;
  private totalAnimationDuration: number = 0;

  // Processed keyframes for animation
  private processedKeyframes: ProcessedKeyframe[] = [];

  /**
   * Creates a new MayoAnimation instance that can handle multiple elements
   */
  constructor(config: AnimationConfig, id: string) {
    this.id = id;
    this.config = Object.freeze({ ...config });
    this.elements = this.resolveElements(config.target!);
    this._duration = config.duration || 1000;
    this.staggerDelay = config.stagger || 0;

    // Initialize element states for each target element
    this.initializeElementStates();

    // Calculate total animation duration including stagger
    this.calculateTotalDuration();

    this.processAnimationKeyframes();

    this._finishedPromise = new Promise((resolve) => {
      this._finishedResolve = resolve;
    });
  }

  /**
   * Initialize animation state for each element
   * Each element gets its own PropertyManager and timing
   */
  private initializeElementStates(): void {
    this.elementStates = this.elements.map((element, index) => ({
      element,
      propertyManager: new PropertyManager(element),
      startTime: index * this.staggerDelay, // Stagger the start times
      currentProgress: 0,
      isActive: false,
      isComplete: false,
    }));
  }

  /**
   * Calculate the total duration including stagger delays
   */
  private calculateTotalDuration(): void {
    const lastElementStartTime = (this.elements.length - 1) * this.staggerDelay;
    this.totalAnimationDuration = lastElementStartTime + this._duration;
  }

  /**
   * Start animation for all elements with stagger support
   */
  public async play(): Promise<void> {
    if (this._state === "running") return this._finishedPromise;

    // Handle initial delay for the entire animation
    if (this.config.delay && this._progress === 0) {
      await this.delay(this.config.delay);
    }

    this._state = "running";
    this._startTime = performance.now() - this._pausedTime;
    this._lastFrameTime = this._startTime;

    this.config.onStart?.();
    this.startAnimationLoop();

    return this._finishedPromise;
  }

  /**
   * Pause all element animations
   */
  public pause(): void {
    if (this._state !== "running") return;

    this._state = "paused";
    this._pausedTime = performance.now() - this._startTime;

    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    this.config.onPause?.();
  }

  /**
   * Resume all element animations
   */
  public resume(): void {
    if (this._state !== "paused") return;
    this.play();
    this.config.onResume?.();
  }

  /**
   * Reverse animation direction
   */
  public reverse(): void {
    this._direction *= -1;
    this._startTime =
      performance.now() -
      (this.totalAnimationDuration - (performance.now() - this._startTime));
    this.config.onReverse?.();
  }

  /**
   * Seek to a specific progress (0-1) across all elements
   */
  public seek(progress: number): void {
    progress = Math.max(0, Math.min(1, progress));
    const targetTime = progress * this.totalAnimationDuration;

    this.elementStates.forEach((elementState, index) => {
      const elementStartTime = index * this.staggerDelay;
      const elementEndTime = elementStartTime + this._duration;

      if (targetTime >= elementStartTime && targetTime <= elementEndTime) {
        const elementProgress =
          (targetTime - elementStartTime) / this._duration;
        elementState.currentProgress = elementProgress;
        this.updateElementAnimation(elementState, elementProgress);
      } else if (targetTime > elementEndTime) {
        elementState.currentProgress = 1;
        elementState.isComplete = true;
        this.updateElementAnimation(elementState, 1);
      } else {
        elementState.currentProgress = 0;
        this.updateElementAnimation(elementState, 0);
      }
    });
  }

  /**
   * Reset all elements to their initial state
   */
  public reset(): void {
    this._state = "idle";
    this._progress = 0;
    this._startTime = 0;
    this._pausedTime = 0;
    this._iteration = 0;

    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    // Reset each element's state
    this.elementStates.forEach((elementState) => {
      elementState.currentProgress = 0;
      elementState.isActive = false;
      elementState.isComplete = false;
      elementState.propertyManager.reset();
    });
  }

  /**
   * Get current progress for a specific element
   */
  public getElementProgress(elementIndex: number): number {
    if (elementIndex < 0 || elementIndex >= this.elementStates.length) {
      throw new Error(`Element index ${elementIndex} out of bounds`);
    }
    return this.elementStates[elementIndex].currentProgress;
  }

  /**
   * Main animation loop that handles all elements
   */
  private startAnimationLoop(): void {
    const animate = (currentTime: number) => {
      if (this._state !== "running") return;

      this.calculateFPS(currentTime);

      const elapsed =
        (currentTime - this._startTime) * this._timeScale * this._direction;
      const rawProgress = elapsed / this.totalAnimationDuration;

      // Handle repeat logic
      if (this.config.repeat !== undefined) {
        const { progress, iteration, shouldComplete } =
          this.handleRepeat(rawProgress);
        this._progress = progress;
        this._iteration = iteration;

        if (shouldComplete) {
          this.completeAnimation();
          return;
        }
      } else {
        this._progress = Math.max(0, Math.min(1, rawProgress));
        if (this._progress >= 1) {
          this.completeAnimation();
          return;
        }
      }

      // Update all elements based on their individual timing
      this.updateAllElements(elapsed);

      // Call global update callback
      this.config.onUpdate?.(this._progress, {
        elapsed: Math.abs(elapsed),
        remaining: this.totalAnimationDuration - Math.abs(elapsed),
        fps: this._fps,
        iteration: this._iteration,
      });

      this._rafId = requestAnimationFrame(animate);
    };

    this._rafId = requestAnimationFrame(animate);
  }

  /**
   * Update all elements based on their individual stagger timing
   */
  private updateAllElements(elapsed: number): void {
    let activeElementCount = 0;
    let completedElementCount = 0;

    this.elementStates.forEach((elementState, index) => {
      const elementStartTime = elementState.startTime;
      const elementEndTime = elementStartTime + this._duration;

      // Check if this element should be animating now
      if (elapsed >= elementStartTime && elapsed <= elementEndTime) {
        // Element is active
        elementState.isActive = true;
        elementState.isComplete = false;
        activeElementCount++;

        // Calculate element-specific progress
        const elementProgress = (elapsed - elementStartTime) / this._duration;
        elementState.currentProgress = Math.max(
          0,
          Math.min(1, elementProgress)
        );

        // Update this element's animation
        this.updateElementAnimation(elementState, elementState.currentProgress);
      } else if (elapsed > elementEndTime) {
        // Element has completed
        if (!elementState.isComplete) {
          elementState.isComplete = true;
          elementState.isActive = false;
          elementState.currentProgress = 1;
          this.updateElementAnimation(elementState, 1);
        }
        completedElementCount++;
      } else {
        // Element hasn't started yet
        elementState.isActive = false;
        elementState.isComplete = false;
        elementState.currentProgress = 0;
      }
    });
  }

  /**
   * Update animation for a single element
   */
  private updateElementAnimation(
    elementState: ElementAnimationState,
    progress: number
  ): void {
    const easedProgress = this.applyEasing(progress);

    if (this.processedKeyframes.length > 0) {
      this.updateElementFromKeyframes(elementState, easedProgress);
    } else {
      this.updateElementFromToProperties(elementState, easedProgress);
    }
  }

  /**
   * Update a single element using keyframe-based animation
   */
  private updateElementFromKeyframes(
    elementState: ElementAnimationState,
    progress: number
  ): void {
    let fromFrame = this.processedKeyframes[0];
    let toFrame = this.processedKeyframes[this.processedKeyframes.length - 1];

    // Find appropriate keyframe segment
    for (let i = 0; i < this.processedKeyframes.length - 1; i++) {
      if (
        progress >= this.processedKeyframes[i].offset &&
        progress <= this.processedKeyframes[i + 1].offset
      ) {
        fromFrame = this.processedKeyframes[i];
        toFrame = this.processedKeyframes[i + 1];
        break;
      }
    }

    // Calculate local progress between keyframes
    const localProgress =
      fromFrame.offset === toFrame.offset
        ? 0
        : (progress - fromFrame.offset) / (toFrame.offset - fromFrame.offset);

    // Apply keyframe-specific easing
    const easedLocalProgress = resolveEaseFn(fromFrame.easing)(localProgress);

    this.interpolateAndApplyElementProperties(
      elementState,
      fromFrame.properties,
      toFrame.properties,
      easedLocalProgress
    );
  }

  /**
   * Update a single element using from/to properties
   */
  private updateElementFromToProperties(
    elementState: ElementAnimationState,
    progress: number
  ): void {
    const fromProps = this.config.from || {};
    const toProps = this.config.to || {};

    this.interpolateAndApplyElementProperties(
      elementState,
      fromProps,
      toProps,
      progress
    );
  }

  /**
   * Interpolate and apply properties to a specific element
   */
  private interpolateAndApplyElementProperties(
    elementState: ElementAnimationState,
    fromProps: AnimationProperties,
    toProps: AnimationProperties,
    progress: number
  ): void {
    const { propertyManager } = elementState;

    // Get all properties to animate
    const allProps = new Set([
      ...Object.keys(fromProps),
      ...Object.keys(toProps),
    ]);

    for (const prop of allProps) {
      if (!PropertyManager.isAnimatable(prop)) {
        console.warn(`Property "${prop}" is not animatable`);
        continue;
      }

      const fromValue = fromProps[prop];
      const toValue = toProps[prop];

      try {
        // Get current value if fromValue is undefined
        const actualFromValue =
          fromValue !== undefined
            ? fromValue
            : propertyManager.getCurrentValue(prop as AnimatableProperty);

        if (toValue !== undefined) {
          // Parse values
          const fromParsed = propertyManager.parse(
            prop as AnimatableProperty,
            actualFromValue
          );
          const toParsed = propertyManager.parse(
            prop as AnimatableProperty,
            toValue
          );

          if (fromParsed && toParsed) {
            // Interpolate
            const interpolated = propertyManager.interpolate(
              prop as AnimatableProperty,
              fromParsed,
              toParsed,
              progress
            );

            // Update property
            propertyManager.updateProperty(
              prop as AnimatableProperty,
              interpolated
            );
          }
        }
      } catch (error) {
        console.error(`Error animating property "${prop}" on element:`, error);
      }
    }

    // Apply all changes to this element
    propertyManager.applyUpdates();
  }

  /**
   * Complete the animation for all elements
   */
  private completeAnimation(): void {
    this._state = "completed";
    this._progress = 1;

    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    this.elementStates.forEach((elementState) => {
      elementState.currentProgress = 1;
      elementState.isComplete = true;
      elementState.isActive = false;
      this.updateElementAnimation(elementState, 1);
    });

    this.config.onComplete?.();
    this._finishedResolve?.();
  }

  // ... (keeping the existing helper methods)
  private applyEasing(progress: number): number {
    const easing = this.config.ease || "easeOut";
    const easingFn = resolveEaseFn(easing);
    return easingFn(progress);
  }

  private resolveElements(target: ElementLike): HTMLElement[] {
    try {
      const els = ElementResolver.resolve(target).filter(
        (el): el is HTMLElement => el instanceof HTMLElement
      );
      if (!els.length) throw new Error("Target must resolve to HTMLElement(s)");
      return els;
    } catch (error) {
      throw new Error(`Failed to resolve target: ${error}`);
    }
  }

  private processAnimationKeyframes(): void {
    if (this.config.keyframes) {
      this.processedKeyframes = this.config.keyframes.map((frame) => ({
        offset: frame.offset,
        properties: { ...frame },
        easing: resolveEaseFn(frame.ease || this.config.ease),
      }));
    }
  }

  private handleRepeat(rawProgress: number): {
    progress: number;
    iteration: number;
    shouldComplete: boolean;
  } {
    const repeat = this.config.repeat!;

    if (repeat === "infinite") {
      const iteration = Math.floor(Math.abs(rawProgress));
      let progress = Math.abs(rawProgress) % 1;

      if (this.config.yoyo && iteration % 2 === 1) {
        progress = 1 - progress;
      }

      return { progress, iteration, shouldComplete: false };
    }

    if (Math.abs(rawProgress) >= repeat) {
      return { progress: 1, iteration: repeat, shouldComplete: true };
    }

    const iteration = Math.floor(Math.abs(rawProgress));
    let progress = Math.abs(rawProgress) % 1;

    if (this.config.yoyo && iteration % 2 === 1) {
      progress = 1 - progress;
    }

    return { progress, iteration, shouldComplete: false };
  }

  private calculateFPS(currentTime: number): void {
    if (this._lastFrameTime > 0) {
      const delta = currentTime - this._lastFrameTime;
      this._fps = Math.round(1000 / delta);
    }
    this._lastFrameTime = currentTime;
    this._frameCount++;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  // Additional utility methods for multi-element support

  /**
   * Get the PropertyManager for a specific element
   */
  public getElementPropertyManager(elementIndex: number): PropertyManager {
    if (elementIndex < 0 || elementIndex >= this.elementStates.length) {
      throw new Error(`Element index ${elementIndex} out of bounds`);
    }
    return this.elementStates[elementIndex].propertyManager;
  }

  /**
   * Check if a specific element is currently animating
   */
  public isElementActive(elementIndex: number): boolean {
    if (elementIndex < 0 || elementIndex >= this.elementStates.length) {
      return false;
    }
    return this.elementStates[elementIndex].isActive;
  }

  /**
   * Check if a specific element has completed its animation
   */
  public isElementComplete(elementIndex: number): boolean {
    if (elementIndex < 0 || elementIndex >= this.elementStates.length) {
      return false;
    }
    return this.elementStates[elementIndex].isComplete;
  }

  /**
   * Get info about all elements' current state
   */
  public getElementsInfo(): Array<{
    index: number;
    element: HTMLElement;
    progress: number;
    isActive: boolean;
    isComplete: boolean;
  }> {
    return this.elementStates.map((state, index) => ({
      index,
      element: state.element,
      progress: state.currentProgress,
      isActive: state.isActive,
      isComplete: state.isComplete,
    }));
  }
}
