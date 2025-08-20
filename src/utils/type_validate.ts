/**
 * Validates a number.
 */
export const validateNumber = (value: number, name: string) => {
  if (typeof value !== "number")
    throw new Error(`${name} must be a number, got ${value}`);
  if (!Number.isFinite(value))
    throw new Error(`${name} must be a finite number, got ${value}`);
};

/**
 * Validates all values are numbers.
 */
export const allCorrectNumbers = (...values: number[]) => {
  values.forEach((value, index) => {
    validateNumber(value, `value at index ${index}`);
  });
};
