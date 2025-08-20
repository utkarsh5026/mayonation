/**
 * Resolves various element input types into an array of HTMLElements.
 *
 * @param element - The element(s) to resolve. Can be:
 *   - A CSS selector string (e.g., ".class", "#id", "div")
 *   - A single HTMLElement
 *   - An array of HTMLElements
 * @returns An array of HTMLElements
 * @throws {Error} Throws an error if the element is not found or invalid
 */
export const resolveElement = (
  element: string | HTMLElement | HTMLElement[]
): HTMLElement[] => {
  if (typeof element === "string")
    element = Array.from(document.querySelectorAll(element));
  else element = Array.isArray(element) ? element : [element];

  if (element.every((el) => el instanceof HTMLElement)) return element;
  throw new Error("Element not found");
};
