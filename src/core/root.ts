/**
 * Resolves a set of targets into an array of HTMLElement objects.
 * @param targets - The targets to resolve. Can be a string, HTMLElement, array of HTMLElements, or a NodeList.
 * @returns An array of HTMLElement objects.
 */
export function resolveElements(
  targets: string | HTMLElement | HTMLElement[] | NodeListOf<Element>
): HTMLElement[] {
  if (typeof targets === "string")
    return Array.from(document.querySelectorAll(targets));

  if (targets instanceof NodeList) return Array.from(targets) as HTMLElement[];

  if (Array.isArray(targets)) return targets;

  return [targets];
}
