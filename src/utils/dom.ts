import { throwIf } from "./error";
export type ElementLike = string | Element | Element[] | NodeListOf<Element>;

export class ElementResolver {
  static resolve(target: ElementLike): Element[] {
    if (typeof target === "string") {
      const elements = Array.from(document.querySelectorAll(target));
      if (elements.length === 0) {
        throw new Error(`No elements found for selector: "${target}"`);
      }
      return elements;
    }

    if (target instanceof Element) {
      return [target];
    }

    if (target instanceof NodeList) {
      return Array.from(target);
    }

    if (Array.isArray(target)) {
      const elements = target.filter((el) => el instanceof Element);
      if (elements.length === 0) {
        throw new Error("No valid elements found in array");
      }
      return elements;
    }

    throw new Error(
      "Invalid target type. Expected string, Element, Element[], or NodeList"
    );
  }

  /**
   * Resolves target elements from various input types (selector, element, array).
   * Filters results to ensure only HTMLElements are included.
   * @param target Selector/element/collection.
   */
  static resolveHTMLElements(target: ElementLike): HTMLElement[] {
    try {
      const elements = this.resolve(target).filter(
        (el): el is HTMLElement =>
          el instanceof HTMLElement || el instanceof SVGElement
      ) as HTMLElement[];

      throwIf(
        elements.length === 0,
        "Target must resolve to at least one HTMLElement or SVGElement"
      );

      return elements;
    } catch (error) {
      throw new Error(`Failed to resolve target: ${error}`);
    }
  }

  static validateElements(elements: Element[]): void {
    if (elements.length === 0) {
      throw new Error("No elements to animate");
    }

    const detachedElements = elements.filter((el) => !document.contains(el));
    if (detachedElements.length > 0) {
      console.warn(
        `${detachedElements.length} elements are not attached to the document`
      );
    }
  }
}
