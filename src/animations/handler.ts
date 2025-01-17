import { AnimationValue } from "../core/animation-val";

/**
 * Interface for handling animations on elements.
 * Provides methods for resetting, applying updates, interpolating values, updating attributes, validating attributes, getting valid attributes, parsing values, and getting current values.
 */
interface AnimationHandler {
  /**
   * Resets all attributes to their initial values.
   */
  reset(): void;
  /**
   * Applies all pending updates to the element.
   */
  applyUpdates(): void;
  /**
   * Interpolates between two values for a given attribute.
   *
   * @param attribute - The attribute to interpolate.
   * @param from - The starting value.
   * @param to - The ending value.
   * @param progress - The progress of the interpolation (0 to 1).
   * @returns The interpolated value.
   */
  interpolate(
    attribute: string,
    from: AnimationValue,
    to: AnimationValue,
    progress: number
  ): AnimationValue;
  /**
   * Updates a specific attribute with a new value.
   *
   * @param attribute - The attribute to update.
   * @param value - The new value.
   */
  updateAttribute(attribute: string, value: AnimationValue): void;
  /**
   * Checks if an attribute is valid for the current element.
   *
   * @param attribute - The attribute to check.
   * @returns True if the attribute is valid, false otherwise.
   */
  isValidAttribute(attribute: string): boolean;
  /**
   * Gets an array of all valid attributes for the current element.
   *
   * @returns An array of valid attribute names.
   */
  getValidAttributes(): string[];
  /**
   * Parses a string value into an AnimationValue.
   *
   * @param value - The string value to parse.
   * @returns The parsed AnimationValue.
   */
  parseValue(value: string): AnimationValue;
  /**
   * Gets the current value of a specific attribute.
   *
   * @param attribute - The attribute to get the value of.
   * @returns The current value of the attribute.
   */
  getCurrentValue(attribute: string): AnimationValue;
}

export default AnimationHandler;
