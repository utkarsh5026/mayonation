import type { CSSAnimationConfig } from "./types";
import {
  ElementManager,
  KeyframesBuilder,
  PropertyAnimator,
  StaggerManager,
} from "./internal";
import { ElementResolver } from "@/utils/dom";
import { GPUAccelerator } from "@/core/gpu";

export class CSSAnimator {
  private readonly config: Required<CSSAnimationConfig>;

  private readonly elementManager: ElementManager;
  private readonly staggerManager: StaggerManager;

  private readonly elements: HTMLElement[];
  private kfBuilder: KeyframesBuilder;
  private hasStarted: boolean = false;

  /**
   * Prepare managers, resolve targets, and precompute keyframes.
   * @param config Animation configuration.
   */
  constructor(config: CSSAnimationConfig) {
    this.config = {
      ...config,
      delay: config.delay ?? 0,
      stagger: config.stagger ?? 0,
      ease: config.ease ?? "easeOut",
      from: config.from ?? {},
      to: config.to ?? {},
      keyframes: config.keyframes ?? [],
      onStart: config.onStart ?? (() => {}),
      onUpdate: config.onUpdate ?? (() => {}),
      onComplete: config.onComplete ?? (() => {}),
    };
    this.elements = ElementResolver.resolveHTMLElements(this.config.target);

    this.elementManager = new ElementManager(this.elements);
    this.staggerManager = new StaggerManager(
      this.config.stagger,
      this.elements.length,
      this.config.duration
    );

    this.kfBuilder = new KeyframesBuilder(
      this.elements,
      this.elementManager,
      this.config
    );

    this.kfBuilder.prepareAllKeyframes();
    this.elements.forEach((el) => {
      GPUAccelerator.prepareElementForAcceleration(
        el,
        Object.keys(this.config.to)
      );
    });
  }

  /**
   * Advance the animation to a normalized progress [0..1] and update all elements.
   * @param globalProgress Global timeline progress.
   */
  update(globalProgress: number): void {
    const elapsed = globalProgress * this.totalDuration;

    this.elements.forEach((_, i) => {
      const { progress, isActive, isComplete } =
        this.staggerManager.getElementProgressAtTime(
          i,
          elapsed,
          this.config.duration
        );

      this.elementManager.updateElement(i, progress, isActive, isComplete);

      if (isActive || isComplete) {
        this.applyAtProgress(i, progress);
      }
    });

    this.config.onUpdate(globalProgress, {
      elapsed,
      remaining: this.totalDuration - elapsed,
      activeElements: this.countActiveElements(),
    });
  }

  /**
   * Resets the animation state
   */
  reset(): void {
    this.elementManager.reset();
  }

  /**
   * Total duration including stagger and delay (ms).
   */
  get totalDuration(): number {
    return this.staggerManager.getTotalDuration();
  }

  /**
   * Base animation duration excluding stagger (ms).
   */
  get baseDuration(): number {
    return this.config.duration;
  }

  /**
   * Initial delay before starting (ms).
   */
  get delay(): number {
    return this.config.delay;
  }

  /**
   * Number of target elements.
   */
  get elementCount(): number {
    return this.elements.length;
  }

  /**
   * Invoke onStart hook.
   */
  start(syncWithDOM?: boolean): void {
    if (this.hasStarted) return;
    this.hasStarted = true;

    if (syncWithDOM) {
      this.kfBuilder.syncFromDOM();
    }

    console.log("Keyframes ", this.kfBuilder.getFinalKeyframes());
    this.config.onStart();
  }

  /**
   * Jump to end state and invoke onComplete.
   */
  public complete(): void {
    this.update(1);
    this.config.onComplete();
  }

  /**
   * Apply keyframes to one element at the given progress.
   * @param elementIndex Element index.
   * @param progress Normalized progress [0..1].
   */
  private applyAtProgress(elementIndex: number, progress: number): void {
    const propMgr = this.elementManager.getPropertyManager(elementIndex);
    if (!propMgr) return;

    const keyframes = this.kfBuilder.getFinalKeyframes().get(elementIndex);
    if (!keyframes) return;

    const animator = new PropertyAnimator(keyframes);
    animator.updateElement(propMgr, progress, this.config.ease);
  }

  /**
   * Count elements currently active (for diagnostics/insight in onUpdate).
   * @returns number
   */
  private countActiveElements(): number {
    return this.elementManager.getAllStates().filter((state) => state.isActive)
      .length;
  }
}
