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
