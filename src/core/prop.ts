import { TransformHandler } from "../animations/transform/handler";
import type { TransformPropertyName } from "../animations/transform/units";
import { CSSHandler } from "../animations/css/handler";
import {
  isNumericValue,
  type AnimationValue,
  type ColorSpace,
} from "./animation-val";
import { type CSSPropertyName } from "../animations/css/units";

/**
 * A property that can be animated like a transform or a CSS property.
 */
export type AnimatableProperty = TransformPropertyName | CSSPropertyName;

/**
 * PropManager serves as a unified interface for handling both transform and CSS properties
 * during animations. It coordinates between TransformHandler and CSSHandler while providing
 * a simpler API for the animation system.
 *
 * Key responsibilities:
 * - Property validation and routing
 * - State management for all animated properties
 * - Value interpolation coordination
 * - Efficient updates and batching
 */
export class PropertyManager {
  private readonly transformHandler: TransformHandler;
  private readonly cssHandler: CSSHandler;
  private readonly activeProperties: Set<AnimatableProperty> = new Set();

  constructor(private readonly element: HTMLElement, space?: ColorSpace) {
    this.transformHandler = new TransformHandler(element);
    this.cssHandler = new CSSHandler(element, { colorSpace: space });
  }

  /**
   * Gets the current value of any animatable property
   * @param property - The property name (transform or CSS)
   * @returns Current value of the property
   */
  public getCurrentValue(property: AnimatableProperty): AnimationValue {
    switch (true) {
      case isTransProp(property):
        return this.transformHandler.getCurrentTransform(property);
      case isCSSProp(property):
        return this.cssHandler.getCurrentValue(property);
      default:
        throw new Error(`Unsupported property: ${property}`);
    }
  }

  /**
   * Interpolates between two values for any property type
   * @param property - The property being animated
   * @param from - Starting value
   * @param to - Ending value
   * @param progress - Animation progress (0-1)
   */
  public interpolate(
    property: AnimatableProperty,
    from: AnimationValue,
    to: AnimationValue,
    progress: number
  ): AnimationValue {
    if (isTransProp(property)) {
      if (isNumericValue(from) && isNumericValue(to))
        return this.transformHandler.interpolate(property, from, to, progress);
      else
        throw new Error(
          `Invalid numeric value for transform property: property: ${property}`
        );
    } else if (isCSSProp(property))
      return this.cssHandler.interpolate(property, from, to, progress);

    throw new Error(`Unsupported property: ${property}`);
  }

  /**
   * Updates a property with a new value during animation
   * @param property - Property to update
   * @param value - New property value
   */
  public updateProperty(
    property: AnimatableProperty,
    value: AnimationValue
  ): void {
    this.activeProperties.add(property);

    if (isTransProp(property)) {
      if (isNumericValue(value))
        this.transformHandler.updateTransform(property, value);
      else
        throw new Error(
          `Invalid numeric value for transform property update: property: ${property}`
        );
    } else if (isCSSProp(property))
      this.cssHandler.updateProperty(property, value);
  }

  /**
   * Resets all animation state
   */
  public reset(): void {
    this.transformHandler.reset();
    this.cssHandler.reset();
    this.activeProperties.clear();
  }

  /**
   * Validates if a property can be animated
   * @param property - Property name to check
   * @returns true if property can be animated
   */
  public static isAnimatable(property: string): property is AnimatableProperty {
    return (
      TransformHandler.isTransformProperty(property) ||
      CSSHandler.isAnimatableProperty(property)
    );
  }

  /**
   * Applies all pending transform updates to the element
   * Called after all properties have been updated for a frame
   */
  public applyUpdates(): void {
    const hasTransforms = Array.from(this.activeProperties).some((prop) =>
      isTransProp(prop)
    );

    if (hasTransforms) {
      this.element.style.transform = this.transformHandler.computeTransform();
    }
  }

  /**
   * Parses a raw value into an AnimationValue for the given property
   * @param property - The animatable property to parse the value for
   * @param value - The raw value to parse, can be a string for CSS properties or number for transforms
   * @returns The parsed AnimationValue, or null if parsing fails
   */
  public parse(
    property: AnimatableProperty,
    value: string | number
  ): AnimationValue | null {
    if (isCSSProp(property))
      return this.cssHandler.parseValue(property, value.toString());
    else if (isTransProp(property))
      return this.transformHandler.parse(property, value);

    return null;
  }
}

/**
 * Checks if a property is a transform property
 * @param property - The property to check
 * @returns true if the property is a transform property
 */
const isTransProp = (
  property: AnimatableProperty
): property is TransformPropertyName =>
  TransformHandler.isTransformProperty(property);

/**
 * Checks if a property is a CSS property
 * @param property - The property to check
 * @returns true if the property is a CSS property
 */
const isCSSProp = (property: AnimatableProperty): property is CSSPropertyName =>
  CSSHandler.isAnimatableProperty(property);
