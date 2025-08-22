export const error = (message: string) => {
  throw new Error(`Mayonation Error: ${message}`);
};

/**
 * Throws an error if the condition is true
 */
export const throwIf = (condition: boolean, message: string) => {
  if (condition) {
    error(message);
  }
};

/**
 * Safely executes an operation with comprehensive error handling and fallback support.
 *
 * Wraps potentially dangerous operations in a try-catch block, providing automatic
 * error logging, optional error callbacks, and fallback values. This function is
 * essential for maintaining application stability when dealing with DOM operations,
 * parsing, or other operations that might fail.
 *
 * @template T - The return type of the operation
 * @param operation - The function to execute safely
 * @param errorMessage - Message to log if the operation fails
 * @param fallback - Value to return if operation fails (optional)
 * @param onError - Optional callback to handle the caught error
 * @returns The result of the operation, or the fallback value if operation fails
 * Safely executes an operation with error handling and logging
 */
export function safeOperation<T>(
  operation: () => T,
  errorMessage: string,
  fallback: T,
  onError?: (error: unknown) => void
): T;
export function safeOperation<T>(
  operation: () => T,
  errorMessage: string,
  fallback?: undefined,
  onError?: (error: unknown) => void
): T | undefined;
export function safeOperation<T>(
  operation: () => T,
  errorMessage: string,
  fallback?: T,
  onError?: (error: unknown) => void
): T | undefined {
  try {
    return operation();
  } catch (err) {
    console.error(errorMessage, err);
    onError?.(err);
    return fallback;
  }
}
