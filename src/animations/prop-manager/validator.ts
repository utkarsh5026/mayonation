import {
  isNumericValue,
  type AnimationValue,
  isRGBColor,
  isHSLColor,
} from "@/core";
import { CSSPropertyName, StyleAnimator } from "../styles";
import { TransformHandler, TransformPropertyName } from "../transform";
import { throwIf } from "@/utils/error";
import type { AnimatableProperty } from "./types";

export class PropValidator {
  /**
   * Asserts that a property is animatable by this manager.
   */
  static validateProperty(prop: string): void {
    throwIf(!this.isAnimatable(prop), `Property "${prop}" is not animatable`);
  }

  /**
   * Validates an AnimationValue for a given property, ensuring correct shape and type.
   * Throws with actionable messages when invalid.
   */
  static validateValue(value: AnimationValue, property: string): void {
    throwIf(
      !value || typeof value !== "object",
      `Invalid value for property ${property}`
    );

    throwIf(
      !value.type,
      `Invalid AnimationValue: missing type for property ${property}`
    );

    if (
      value.type === "numeric" &&
      (typeof value.value !== "number" || !isFinite(value.value))
    ) {
      throw new Error(`Invalid numeric value for property ${property}`);
    }

    if (value.type === "color") {
      if (!value.value || typeof value.value !== "object") {
        throw new Error(`Invalid color value for property ${property}`);
      }

      const colorValue = value.value;
      if (isRGBColor(colorValue)) {
        if (
          typeof colorValue.r !== "number" ||
          typeof colorValue.g !== "number" ||
          typeof colorValue.b !== "number" ||
          typeof colorValue.a !== "number"
        ) {
          throw new Error(`Invalid RGB color value for property ${property}`);
        }
      } else if (isHSLColor(colorValue)) {
        if (
          typeof colorValue.h !== "number" ||
          typeof colorValue.s !== "number" ||
          typeof colorValue.l !== "number" ||
          typeof colorValue.a !== "number"
        ) {
          throw new Error(`Invalid HSL color value for property ${property}`);
        }
      }
    }

    if (!["numeric", "color"].includes((value as any).type)) {
      throw new Error(
        `Unknown AnimationValue type: ${
          (value as any).type
        } for property ${property}`
      );
    }

    if (
      TransformHandler.isTransformProperty(property) &&
      !isNumericValue(value)
    ) {
      throw new Error(`Transform property ${property} requires numeric value`);
    }
  }

  /**
   * Ensures from/to values share the same AnimationValue type.
   */
  static validateValueTypes(
    from: AnimationValue,
    to: AnimationValue,
    property: string
  ): void {
    throwIf(
      from.type !== to.type,
      `Value type mismatch for ${property}: ${from.type} vs ${to.type}`
    );
  }

  /**
   * Determines if a string refers to an animatable property known to this manager.
   */
  static isAnimatable(property: string): property is AnimatableProperty {
    return (
      TransformHandler.isTransformProperty(property) ||
      StyleAnimator.isAnimatableProperty(property)
    );
  }

  /**
   * Type guard: checks if a property is a transform.
   */
  static isTransformProperty(
    property: string | AnimatableProperty
  ): property is TransformPropertyName {
    return TransformHandler.isTransformProperty(property);
  }

  /**
   * Type guard: checks if a property is an animatable CSS property.
   */
  static isCSSProperty(
    property: string | AnimatableProperty
  ): property is CSSPropertyName {
    return StyleAnimator.isAnimatableProperty(property);
  }
}
