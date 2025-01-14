/**
 * Converts camelCase property names to dash-case for CSS.
 * Example: backgroundColor -> background-color
 */
export function camelToDash(str: string): string {
  return str.replace(/([A-Z])/g, "-$1").toLowerCase();
}
