/**
 * Validates a number.
 * @param value - The number to validate.
 * @param name - The name of the number.
 * @throws An error if the number is not a finite number.
 */
export const validateNumber = (value: number, name: string) => {
  if (typeof value !== "number")
    throw new Error(`${name} must be a number, got ${value}`);
  if (!Number.isFinite(value))
    throw new Error(`${name} must be a finite number, got ${value}`);
};

/**
 * Validates all values are numbers.
 * @param values - The values to validate.
 * @throws An error if any value is not a number.
 */
export const allCorrectNumbers = (...values: number[]) => {
  values.forEach((value, index) => {
    validateNumber(value, `value at index ${index}`);
  });
};
