import {
  type AnimationValue,
  createValue,
  NumericValue,
} from "../../core/animation-val";
import { linear } from "../../utils/interpolate";
import { convertLength, parseValue } from "../../utils/unit";
import AnimationHandler from "../handler";

/**
 * Defines the attributes for different types of SVG shapes.
 * This includes rect, circle, ellipse, and line shapes.
 */
export type ShapeAttributes = {
  /**
   * Attributes for a rectangle shape.
   * @property x - The x-coordinate of the rectangle.
   * @property y - The y-coordinate of the rectangle.
   * @property width - The width of the rectangle.
   * @property height - The height of the rectangle.
   * @property rx - Optional. The x-axis radius for rounded corners.
   * @property ry - Optional. The y-axis radius for rounded corners.
   */
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
    rx?: number;
    ry?: number;
  };
  /**
   * Attributes for a circle shape.
   * @property cx - The x-coordinate of the circle's center.
   * @property cy - The y-coordinate of the circle's center.
   * @property r - The radius of the circle.
   */
  circle: {
    cx: number;
    cy: number;
    r: number;
  };
  /**
   * Attributes for an ellipse shape.
   * @property cx - The x-coordinate of the ellipse's center.
   * @property cy - The y-coordinate of the ellipse's center.
   * @property rx - The x-axis radius of the ellipse.
   * @property ry - The y-axis radius of the ellipse.
   */
  ellipse: {
    cx: number;
    cy: number;
    rx: number;
    ry: number;
  };
  /**
   * Attributes for a line shape.
   * @property x1 - The x-coordinate of the line's start point.
   * @property y1 - The y-coordinate of the line's start point.
   * @property x2 - The x-coordinate of the line's end point.
   * @property y2 - The y-coordinate of the line's end point.
   */
  line: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
};

/**
 * Represents the type of an SVG shape.
 * This is a union type of all shape types defined in ShapeAttributes.
 */
type ShapeType = keyof ShapeAttributes;

type ValidAttributes = ShapeAttributes[ShapeType];

/**
 * Define valid attributes configuration once to avoid duplication
 */
const SHAPE_CONFIGS = {
  rect: {
    required: ["x", "y", "width", "height"] as const,
    optional: ["rx", "ry"] as const,
    constraints: {
      width: { min: 0 },
      height: { min: 0 },
      rx: { min: 0 },
      ry: { min: 0 },
    },
  },
  circle: {
    required: ["cx", "cy", "r"] as const,
    optional: [] as const,
    constraints: {
      r: { min: 0 },
    },
  },
  ellipse: {
    required: ["cx", "cy", "rx", "ry"] as const,
    optional: [] as const,
    constraints: {
      rx: { min: 0 },
      ry: { min: 0 },
    },
  },
  line: {
    required: ["x1", "y1", "x2", "y2"] as const,
    optional: [] as const,
    constraints: {},
  },
} as const;

// Add type safety for attributes
type ShapeAttribute<T extends ShapeType> =
  | (typeof SHAPE_CONFIGS)[T]["required"][number]
  | (typeof SHAPE_CONFIGS)[T]["optional"][number];

/**
 * Handles animation of SVG shapes by managing their attribute transitions.
 * Each shape type (rect, circle, etc.) has its own set of animatable attributes.
 */
export class ShapeAnimationHandler implements AnimationHandler {
  private readonly element: SVGElement;
  private readonly shapeType: ShapeType;
  private readonly currentValues: Map<string, AnimationValue> = new Map();
  private readonly initialValues: Map<string, string> = new Map();
  private readonly pendingUpdates: Map<string, NumericValue> = new Map();

  constructor(element: SVGElement) {
    this.element = element;
    this.shapeType = this.determineShapeType(element);
    this.captureInitialValues();
  }

  /**
   * Captures initial values of all valid attributes
   */
  private captureInitialValues(): void {
    const validAttributes = this.getValidAttributes();
    validAttributes.forEach((attr) => {
      const value = this.element.getAttribute(attr);
      if (value !== null) {
        this.initialValues.set(attr, value);
      }
    });
  }

  /**
   * Determines the type of shape from the element's tag name
   * For example: 'rect' from SVGRectElement
   */
  private determineShapeType(element: SVGElement): ShapeType {
    const tagName = element.tagName.toLowerCase();
    if (!this.validShapeType(tagName)) {
      throw new Error(`Unsupported shape type: ${tagName}`);
    }
    return tagName;
  }

  /**
   * Type guard to ensure we have a valid shape type
   */
  private validShapeType(type: string): type is ShapeType {
    return ["rect", "circle", "ellipse", "line"].includes(type);
  }

  /**
   * Checks if an attribute is valid for the current shape type
   */
  public isValidAttribute(attribute: string): boolean {
    const validAttributes: Record<ShapeType, string[]> = {
      rect: ["x", "y", "width", "height", "rx", "ry"],
      circle: ["cx", "cy", "r"],
      ellipse: ["cx", "cy", "rx", "ry"],
      line: ["x1", "y1", "x2", "y2"],
    };

    return validAttributes[this.shapeType].includes(attribute);
  }

  /**
   * Parses a string value into an AnimationValue
   * Handles different units and value types
   */
  public parseValue(value: string): NumericValue {
    const parsedValue = parseValue(value);
    return createValue.numeric(parsedValue.value, parsedValue.unit);
  }

  /**
   * Validates numeric value ranges for attributes
   */
  private validateAttributeValue(attribute: string, value: number): void {
    const minValues: Record<string, number> = {
      width: 0,
      height: 0,
      r: 0,
      rx: 0,
      ry: 0,
    };

    const maxValues: Record<string, number> = {
      r: Number.MAX_VALUE,
      rx: Number.MAX_VALUE,
      ry: Number.MAX_VALUE,
    };

    if (attribute in minValues && value < minValues[attribute])
      throw new Error(
        `Invalid value ${value} for attribute "${attribute}". Must be >= ${minValues[attribute]}`
      );

    if (attribute in maxValues && value > maxValues[attribute])
      throw new Error(
        `Invalid value ${value} for attribute "${attribute}". Must be <= ${maxValues[attribute]}`
      );

    if (
      ["x", "y", "cx", "cy", "x1", "y1", "x2", "y2"].includes(attribute) &&
      !Number.isFinite(value)
    ) {
      throw new Error(
        `Invalid coordinate value ${value} for attribute "${attribute}"`
      );
    }
  }

  /**
   * Applies all pending updates to the DOM
   */
  private flushUpdates(): void {
    this.pendingUpdates.forEach((attrValue, attribute) => {
      const { value, unit } = attrValue;
      const formattedValue =
        unit === "px" ? value.toString() : `${value}${unit}`;
      this.element.setAttribute(attribute, formattedValue);
      this.currentValues.set(attribute, attrValue);
    });
    this.pendingUpdates.clear();
  }

  /**
   * Interpolates between two values for an attribute
   * Handles different types of transitions (size, position, etc.)
   */
  public interpolate(
    attribute: string,
    from: NumericValue,
    to: NumericValue,
    progress: number
  ): NumericValue {
    const fromPx = convertLength(from.value + from.unit);
    const toPx = convertLength(to.value + to.unit);
    const value = linear.interpolate(fromPx, toPx, progress);
    return createValue.numeric(value, "px");
  }

  /**
   * Updates a shape attribute with a new value
   * Handles both the DOM update and internal state
   */
  public updateAttribute(attribute: string, value: NumericValue) {
    if (!this.isValidAttribute(attribute)) {
      throw new Error(
        `Invalid attribute "${attribute}" for shape type "${this.shapeType}"`
      );
    }

    this.validateAttributeValue(attribute, value.value);
    this.pendingUpdates.set(attribute, value);
  }

  /**
   * Gets the current value of a shape attribute
   * Handles both explicit attributes and computed values
   */
  public getCurrentValue(attribute: string): AnimationValue {
    if (this.currentValues.has(attribute))
      return this.currentValues.get(attribute)!;

    const value = this.element.getAttribute(attribute) ?? "0";
    const parsedValue = this.parseValue(value);
    this.currentValues.set(attribute, parsedValue);
    return parsedValue;
  }

  /**
   * Resets all attributes to their initial values
   */
  public reset(): void {
    this.initialValues.forEach((value, attribute) => {
      this.element.setAttribute(attribute, value);
    });
    this.currentValues.clear();
    this.pendingUpdates.clear();
  }

  /**
   * Gets all valid attributes for the current shape type
   */
  public getValidAttributes(): string[] {
    const validAttributes: Record<ShapeType, string[]> = {
      rect: ["x", "y", "width", "height", "rx", "ry"],
      circle: ["cx", "cy", "r"],
      ellipse: ["cx", "cy", "rx", "ry"],
      line: ["x1", "y1", "x2", "y2"],
    };
    return validAttributes[this.shapeType];
  }

  /**
   * Forces immediate application of pending updates
   */
  public applyUpdates(): void {
    if (this.pendingUpdates.size > 0) {
      this.flushUpdates();
    }
  }
}
