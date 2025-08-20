import type { TransformPropertyName } from "../animations/transform/units";
import { CSSHandler, TransformHandler } from "@/animations";
import {
  isNumericValue,
  type AnimationValue,
  type ColorSpace,
} from "./animation-val";
import { type CSSPropertyName } from "../animations/css/units";
import { convertColorValueToCssString } from "@/utils/color";

/**
 * A property that can be animated like a transform or a CSS property.
 */
export type AnimatableProperty = TransformPropertyName | CSSPropertyName;

/**
 * PropManager serves as a unified interface for handling both transform and CSS properties
 * during animations. It coordinates between TransformHandler and CSSHandler while providing
 * a simpler API for the animation system.
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
   */
  public getCurrentValue(property: AnimatableProperty): AnimationValue {
    if (this.isTransProp(property))
      return this.transformHandler.getCurrentTransform(property);

    if (this.isCSSProp(property))
      return this.cssHandler.getCurrentAnimatedValue(property);
    else throw new Error(`Unsupported property: ${property}`);
  }

  /**
   * Interpolates between two values for any property type
   */
  public interpolate(
    property: AnimatableProperty,
    from: AnimationValue,
    to: AnimationValue,
    progress: number
  ): AnimationValue {
    if (this.isTransProp(property)) {
      if (isNumericValue(from) && isNumericValue(to))
        return this.transformHandler.interpolate(property, from, to, progress);
      else
        throw new Error(
          `Invalid numeric value for transform property: property: ${property}`
        );
    }

    if (this.isCSSProp(property)) {
      return this.cssHandler.interpolate(property, from, to, progress);
    }

    throw new Error(`Unsupported property: ${property}`);
  }

  /**
   * Updates a property with a new value during animation
   */
  public updateProperty(
    property: AnimatableProperty,
    value: AnimationValue
  ): void {
    this.activeProperties.add(property);

    if (this.isTransProp(property)) {
      if (isNumericValue(value))
        this.transformHandler.updateTransform(property, value);
      else
        throw new Error(
          `Invalid numeric value for transform property update: property: ${property}`
        );
    }

    if (this.isCSSProp(property))
      this.cssHandler.applyAnimatedPropertyValue(property, value);
  }

  /**
   * Resets all animation state
   */
  public reset(): void {
    this.transformHandler.reset();
    this.cssHandler.restoreOriginalPropertyValues();
    this.activeProperties.clear();
  }

  /**
   * Validates if a property can be animated
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
      this.isTransProp(prop)
    );

    if (hasTransforms) {
      this.element.style.transform = this.transformHandler.computeTransform();
    }
  }

  /**
   * Parses a raw value into an AnimationValue for the given property
   */
  public parse(
    property: AnimatableProperty,
    value: string | number
  ): AnimationValue | null {
    if (this.isCSSProp(property))
      return this.cssHandler.parseCSSValueToAnimationValue(
        property,
        value.toString()
      );

    if (this.isTransProp(property))
      return this.transformHandler.parse(property, value);

    return null;
  }

  /**
   * Converts an AnimationValue into a string representation.
   */
  public static stringifyValue(val: AnimationValue) {
    if (isNumericValue(val)) return `${val.value}${val.unit}`;
    else return convertColorValueToCssString(val.value);
  }

  /**
   * Checks if a property is a transform property
   */
  private isTransProp(
    property: AnimatableProperty
  ): property is TransformPropertyName {
    return TransformHandler.isTransformProperty(property);
  }

  private isCSSProp(property: AnimatableProperty): property is CSSPropertyName {
    return CSSHandler.isAnimatableProperty(property);
  }
}
