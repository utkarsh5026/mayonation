import { type EaseFn, resolveEaseFn } from "../core/ease_fns";
import type { AnimationValue } from "../core/animation-val";
import { type AnimatableProperty, PropertyManager } from "../core/prop";
import type { PropertiesConfig } from "../core/config";
import { BaseKeyframeManager } from "../keyframe/keyframe";

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
  easing: EaseFn; // Easing function for this frame
};

type AnimateableValues = Map<AnimatableProperty, AnimationValue>;

/**
 * Manages a sequence of keyframes for animating properties on an element.
 * Handles processing raw keyframes into a normalized format, interpolating between
 * keyframes, and applying animated values to the element.
 */
export class CSSKeyframeManager extends BaseKeyframeManager<
  Keyframe,
  ProcessedKeyframe,
  AnimateableValues
> {
  /** Array of processed keyframes in chronological order */
  protected readonly keyframes: ProcessedKeyframe[] = [];

  /** Manager for applying property updates to the target element */
  private readonly propManager: PropertyManager;

  /**
   * Creates a new KeyframeManager instance.
   * @param element - The DOM element to animate
   * @param keyframes - Array of raw keyframes defining the animation sequence
   */
  constructor(element: HTMLElement, keyframes: Keyframe[]) {
    super();
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
    const props = this.getPropertiesAtProgress(progress);
    return props ?? new Map();
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

  public isCorrectElenmentType(el: object): boolean {
    return el instanceof HTMLElement;
  }

  protected updateProps(values: AnimateableValues) {
    values.forEach((value, property) => {
      this.propManager.updateProperty(property, value);
    });
    this.propManager.applyUpdates();
  }

  protected processKeyframe(frame: Keyframe): ProcessedKeyframe {
    return {
      properties: this.processKeyframeProperties(frame),
      offset: frame.offset ?? 0,
      easing: resolveEaseFn(frame.easing),
    };
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
  protected processKeyframes(frames: Keyframe[]): ProcessedKeyframe[] {
    this.validateKeyframeSequence(frames);
    const distributed = this.distributeOffsets(frames);
    const startFrame = this.captureCurrentValues(frames);

    if (distributed[0].offset === 0) {
      distributed[0] = { ...startFrame, ...distributed[0] };
    } else {
      distributed.unshift({ ...startFrame, offset: 0 });
    }

    const processed = distributed.map((frame) => this.processKeyframe(frame));

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
   * Interpolates between two keyframes at a specific offset.
   * @param from - Starting keyframe
   * @param to - Ending keyframe
   * @param offset - Interpolation progress (0-1)
   * @returns Map of interpolated property values
   * @throws Error if any required property values are missing
   */
  protected interpolate(
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

  /**
   * Gets the fallback value if not provided
   */
  private getFallbackValue(prop: AnimatableProperty): AnimationValue {
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

  protected handleNoKeyframes(): Keyframe[] {
    return [{}];
  }
}
