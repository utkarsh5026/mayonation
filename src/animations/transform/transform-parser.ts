import type {
  TransformAxis,
  TransformPropertyName,
  TransformState,
} from "./types";
import { isTranslateProp, isRotateProp, isSkewProp } from "./units";
import { NumericValue, createValue } from "@/core/animation-val";
import { throwIf } from "@/utils/error";
import type { AnimationUnit } from "@/utils/unit";
import { parseValue } from "@/utils/unit";
import { TRANSFORM_PROPERTIES } from "./props";

export class TransformParser {
  /**
   * Valid units for different property types
   */
  private readonly validUnits = {
    length: ["px", "em", "rem", "%", "vh", "vw", "vmin", "vmax"],
    angle: ["deg", "rad", "grad", "turn"],
    scale: [""],
  };

  /**
   * Check if a unit is valid for a property
   */
  private isValidUnitForProperty(
    property: TransformPropertyName,
    unit: string
  ): boolean {
    if (isTranslateProp(property)) {
      return this.validUnits.length.includes(unit);
    }
    if (isRotateProp(property) || isSkewProp(property)) {
      return this.validUnits.angle.includes(unit);
    }

    return this.validUnits.scale.includes(unit);
  }

  /**
   * Enhanced parsing with better error handling
   */
  parse(
    supportProps: Set<string>,
    property: TransformPropertyName,
    value: number | string
  ): NumericValue {
    throwIf(!supportProps.has(property), `Unsupported property: ${property}`);

    if (typeof value === "number") {
      let unit: AnimationUnit;

      switch (true) {
        case isTranslateProp(property):
          unit = "px";
          break;
        case isRotateProp(property):
        case isSkewProp(property):
          unit = "deg";
          break;
        default:
          unit = "";
      }

      return createValue.numeric(value, unit);
    }

    try {
      const parsed = parseValue(value);

      const expectedUnit = TRANSFORM_PROPERTIES.get(property);
      if (
        parsed.unit !== "" &&
        !this.isValidUnitForProperty(property, parsed.unit)
      ) {
        throw new Error(
          `Invalid unit "${parsed.unit}" for property "${property}". Expected units like "${expectedUnit}"`
        );
      }

      return createValue.numeric(
        parsed.value,
        parsed.unit || expectedUnit || ""
      );
    } catch (error) {
      throw new Error(
        `Invalid value "${value}" for property "${property}": ${error}`
      );
    }
  }

  /**
   * Apply parsed transform function to state
   */
  applyParsedTransform(
    transformState: TransformState,
    func: string,
    values: string[]
  ): void {
    switch (func) {
      case "translateX":
        transformState.translate.x = parseFloat(values[0]);
        break;
      case "translateY":
        transformState.translate.y = parseFloat(values[0]);
        break;
      case "translateZ":
        transformState.translate.z = parseFloat(values[0]);
        break;
      case "translate":
        transformState.translate.x = parseFloat(values[0]);
        transformState.translate.y = values[1] ? parseFloat(values[1]) : 0;
        break;
      case "translate3d":
        transformState.translate.x = parseFloat(values[0]);
        transformState.translate.y = parseFloat(values[1]);
        transformState.translate.z = parseFloat(values[2]);
        break;
      case "rotateX":
        transformState.rotate.x = this.parseDegrees(values[0]);
        break;
      case "rotateY":
        transformState.rotate.y = this.parseDegrees(values[0]);
        break;
      case "rotateZ":
      case "rotate":
        transformState.rotate.z = this.parseDegrees(values[0]);
        break;
      case "scaleX":
        transformState.scale.x = parseFloat(values[0]);
        break;
      case "scaleY":
        transformState.scale.y = parseFloat(values[0]);
        break;
      case "scaleZ":
        transformState.scale.z = parseFloat(values[0]);
        break;
      case "scale":
        transformState.scale.x = parseFloat(values[0]);
        transformState.scale.y = values[1]
          ? parseFloat(values[1])
          : transformState.scale.x;
        break;
      case "skewX":
        transformState.skew.x = this.parseDegrees(values[0]);
        break;
      case "skewY":
        transformState.skew.y = this.parseDegrees(values[0]);
        break;
    }
  }

  /**
   * Enhanced property parsing with validation
   */
  parseTransformProperty(
    property: string
  ): [keyof TransformState, TransformAxis] {
    const propertyMap: Record<string, [keyof TransformState, TransformAxis][]> =
      {
        translate: [
          ["translate", "x"],
          ["translate", "y"],
        ],
        translateX: [["translate", "x"]],
        translateY: [["translate", "y"]],
        translateZ: [["translate", "z"]],
        rotate: [["rotate", "z"]],
        rotateX: [["rotate", "x"]],
        rotateY: [["rotate", "y"]],
        rotateZ: [["rotate", "z"]],
        scale: [
          ["scale", "x"],
          ["scale", "y"],
        ],
        scaleX: [["scale", "x"]],
        scaleY: [["scale", "y"]],
        scaleZ: [["scale", "z"]],
        skewX: [["skew", "x"]],
        skewY: [["skew", "y"]],
      };

    const mappings = propertyMap[property];
    if (!mappings) {
      throw new Error(`Invalid transform property: ${property}`);
    }

    return mappings[0];
  }

  /**
   * Parse degree values from CSS strings
   */
  private parseDegrees(value: string): number {
    if (value.endsWith("deg")) {
      return parseFloat(value);
    }

    if (value.endsWith("rad")) {
      return parseFloat(value) * (180 / Math.PI);
    }

    if (value.endsWith("turn")) {
      return parseFloat(value) * 360;
    }
    return parseFloat(value); // Assume degrees if no unit
  }
}
