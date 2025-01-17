import { type EaseFn, type EaseFnName, easeFns } from "./ease_fns";
import type { AnimationValue } from "./animation-val";
import { type AnimatableProperty, PropertyManager } from "./prop";
import type { PropertiesConfig } from "./config";

/**
 * Represents a single keyframe in an animation sequence.
 * A keyframe defines the state of animatable properties at a specific point in time.
 * @property offset - Optional number between 0-1 indicating when this keyframe occurs in the animation
 * @extends PropertiesConfig - Inherits animatable CSS and transform properties
 */
export type Keyframe = {
  offset?: number;
} & PropertiesConfig;

/**
 * Internal representation of a fully processed keyframe that is ready for animation.
 * Converts raw property values into strongly-typed AnimationValue objects.
 * @property properties - Map of animatable properties to their corresponding AnimationValue
 * @property offset - Normalized time offset between 0-1 when this keyframe occurs
 * @property easing - Easing function to use when interpolating to the next keyframe
 */
type ProcessedKeyframe = {
  properties: Map<AnimatableProperty, AnimationValue>; // Animated properties and their values
  offset: number; // Normalized position (0-1)
  easing: (t: number) => number; // Easing function for this frame
};

/**
 * Manages a sequence of keyframes for animating properties on an element.
 * Handles processing raw keyframes into a normalized format, interpolating between
 * keyframes, and applying animated values to the element.
 */
export class KeyframeManager {
  /** Array of processed keyframes in chronological order */
  private readonly keyframes: ProcessedKeyframe[] = [];

  /** Manager for applying property updates to the target element */
  private readonly propManager: PropertyManager;

  /**
   * Creates a new KeyframeManager instance.
   * @param element - The DOM element to animate
   * @param keyframes - Array of raw keyframes defining the animation sequence
   */
  constructor(element: HTMLElement, keyframes: Keyframe[]) {
    this.propManager = new PropertyManager(element);
    this.keyframes = this.processKeyframes(keyframes);
  }

  /**
   * Gets the interpolated property values at a specific animation progress.
   * @param progress - Number between 0-1 indicating current animation progress
   * @returns Map of properties to their interpolated values at the given progress
   */
  public getValuesAtProgress(
    progress: number
  ): Map<AnimatableProperty, AnimationValue> {
    if (progress <= 0) {
      return this.keyframes[0].properties;
    }

    if (progress >= 1) {
      return this.keyframes[this.keyframes.length - 1].properties;
    }

    const surrounding = this.getSurroundingKeyframes(progress);
    if (!surrounding) return new Map();

    const [curr, next] = surrounding;
    const localProgress =
      (progress - curr.offset) / (next.offset - curr.offset);
    const easedProgress = curr.easing(localProgress);
    return this.interpolate(curr, next, easedProgress);
  }

  /**
   * Updates the element's properties based on the current animation progress.
   * @param progress - Number between 0-1 indicating current animation progress
   */
  public update(progress: number) {
    const values = this.getValuesAtProgress(progress);
    values.forEach((value, property) => {
      this.propManager.updateProperty(property, value);
    });
    this.propManager.applyUpdates();
  }

  /**
   * Resets all animated properties to their initial values.
   */
  public reset() {
    this.propManager.reset();
  }

  /**
   * Processes raw keyframes into the internal ProcessedKeyframe format.
   * Validates the sequence, distributes offsets if needed, and captures initial values.
   * @param frames - Array of raw keyframes to process
   * @returns Array of processed keyframes ready for animation
   */
  private processKeyframes(frames: Keyframe[]): ProcessedKeyframe[] {
    this.validateKeyframeSequence(frames);
    const distributed = this.distributeOffsets(frames);
    const startFrame = this.captureCurrentValues(frames);

    if (distributed[0].offset === 0) {
      distributed[0] = { ...startFrame, ...distributed[0] };
    } else {
      distributed.unshift({ ...startFrame, offset: 0 });
    }

    const processed = distributed.map((frame) => ({
      properties: this.processKeyframeProperties(frame),
      offset: frame.offset!,
      easing: this.resolveEasing(frame.easing),
    }));

    this.validatePropertiesConcistency(
      processed.map((frame) => Array.from(frame.properties.keys()))
    );

    return processed;
  }

  /**
   * Validates the consistency of properties in the keyframes.
   * @param props - Array of arrays of animatable properties
   * @throws Error if any property is missing in the next keyframe
   */
  private validatePropertiesConcistency(props: AnimatableProperty[][]) {
    for (let i = 0; i < props.length - 1; i++) {
      const curr = new Set(props[i]);
      const next = new Set(props[i + 1]);

      curr.forEach((prop) => {
        if (!next.has(prop))
          throw Error(`Missing value for property "${prop}"`);
      });
    }
  }

  /**
   * Validates that a sequence of keyframes is properly formed.
   * Checks for minimum length and consistent offset usage.
   * @param frames - Keyframe sequence to validate
   * @throws Error if sequence is invalid
   */
  private validateKeyframeSequence(frames: Keyframe[]): void {
    if (!Array.isArray(frames) || frames.length < 2)
      throw new Error("Animation must have at least 2 keyframes");

    const hasOffsets = frames.some((frame) => frame.offset !== undefined);
    const allHaveOffsets = frames.every((frame) => frame.offset !== undefined);

    if (hasOffsets && !allHaveOffsets)
      throw new Error("If any keyframe has an offset, all must have offsets");
  }

  /**
   * Distributes offsets evenly across keyframes that don't have explicit offsets.
   * @param keyframes - Array of keyframes to process
   * @returns New array with offsets assigned to all keyframes
   */
  private distributeOffsets(keyframes: Keyframe[]): Keyframe[] {
    const numKeyframes = keyframes.length;
    const distributed = keyframes.map((frame, i) => {
      if (frame.offset !== undefined) return frame;
      return { ...frame, offset: i / (numKeyframes - 1) };
    });

    return distributed
      .map((frame) => ({
        ...frame,
        offset: KeyframeManager.roundOffset(frame.offset!),
      }))
      .sort((a, b) => a.offset - b.offset);
  }

  /**
   * Rounds offset values to prevent floating point precision issues.
   * Maintains 2 decimal places while ensuring exactly 0 or 1 for endpoints.
   * @param offset - Raw offset value to round
   * @returns Rounded offset value
   */
  private static roundOffset(offset: number): number {
    if (Math.abs(offset) < Number.EPSILON) return 0;
    if (Math.abs(offset - 1) < Number.EPSILON) return 1;
    return Math.round(offset * 100) / 100;
  }

  /**
   * Processes the properties of a single keyframe into AnimationValue objects.
   * @param frame - Raw keyframe to process
   * @returns Map of properties to their processed AnimationValue representations
   * @throws Error if any property values are invalid
   */
  private processKeyframeProperties(
    frame: Keyframe
  ): Map<AnimatableProperty, AnimationValue> {
    const properties = new Map<AnimatableProperty, AnimationValue>();

    const animatableProps = Object.entries(frame)
      .filter(([key]) => PropertyManager.isAnimatable(key))
      .map(([key]) => key as AnimatableProperty);

    for (const prop of animatableProps) {
      const value = frame[prop];
      if (value === undefined) {
        throw new Error(`Missing value for property "${prop}"`);
      }

      const parsed = this.propManager.parse(prop, value);
      if (parsed === null) {
        throw new Error(`Invalid value "${value}" for property "${prop}"`);
      }

      properties.set(prop, parsed);
    }

    return properties;
  }

  /**
   * Resolves an easing specification to an easing function.
   * @param easing - Easing function or name of predefined easing
   * @returns Resolved easing function
   */
  private resolveEasing(easing?: EaseFn | EaseFnName): EaseFn {
    if (typeof easing === "function") return easing;
    if (typeof easing === "string" && easing in easeFns) return easeFns[easing];
    return easeFns.linear;
  }

  /**
   * Checks if a property name represents an animatable property.
   * @param prop - Property name to check
   * @returns True if property is animatable
   */
  private isAnimatableProp(prop: string) {
    return PropertyManager.isAnimatable(prop);
  }

  /**
   * Interpolates between two keyframes at a specific offset.
   * @param from - Starting keyframe
   * @param to - Ending keyframe
   * @param offset - Interpolation progress (0-1)
   * @returns Map of interpolated property values
   * @throws Error if any required property values are missing
   */
  private interpolate(
    from: ProcessedKeyframe,
    to: ProcessedKeyframe,
    offset: number
  ): Map<AnimatableProperty, AnimationValue> {
    const result = new Map<AnimatableProperty, AnimationValue>();
    const properties = new Set([
      ...from.properties.keys(),
      ...to.properties.keys(),
    ]);

    for (const prop of properties) {
      try {
        const fromValue = from.properties.get(prop);
        const toValue = to.properties.get(prop);

        if (!fromValue || !toValue) {
          console.warn(`Missing interpolation value for property "${prop}"`);
          // Use the available value or skip
          result.set(prop, fromValue ?? toValue ?? this.getFallbackValue(prop));
          continue;
        }

        const interpolated = this.propManager.interpolate(
          prop,
          fromValue,
          toValue,
          offset
        );
        result.set(prop, interpolated);
      } catch (error) {
        console.error(`Failed to interpolate property "${prop}":`, error);
        // Use from value as fallback
        const fallback =
          from.properties.get(prop) ?? this.getFallbackValue(prop);
        result.set(prop, fallback);
      }
    }

    return result;
  }

  private getFallbackValue(prop: AnimatableProperty): AnimationValue {
    // Implement appropriate fallback values based on property type
    return this.propManager.getCurrentValue(prop);
  }

  /**
   * Captures the current values of all animated properties on the element.
   * @param keyframe - Keyframes to extract property names from
   * @returns Keyframe containing current values of all animated properties
   */
  private captureCurrentValues(keyframe: Keyframe[]) {
    const properties = new Set<AnimatableProperty>();
    keyframe.forEach((frame) => {
      Object.keys(frame).forEach((property) => {
        if (PropertyManager.isAnimatable(property)) properties.add(property);
      });
    });

    const startKeyframe: Record<string, string | number> = { offset: 0 };
    properties.forEach((property) => {
      const value = this.propManager.getCurrentValue(property);
      startKeyframe[property] = PropertyManager.stringifyValue(value);
    });

    return startKeyframe as Keyframe;
  }

  /**
   * Finds the keyframes immediately before and after a given progress value.
   * @param progress - Current animation progress (0-1)
   * @returns Tuple of [previous, next] keyframes, or null if not found
   */
  private getSurroundingKeyframes(
    progress: number
  ): [ProcessedKeyframe, ProcessedKeyframe] | null {
    for (let i = 0; i < this.keyframes.length - 1; i++) {
      const curr = this.keyframes[i];
      const next = this.keyframes[i + 1];

      if (progress >= curr.offset && progress <= next.offset) {
        return [curr, next];
      }
    }
    return null;
  }
}
