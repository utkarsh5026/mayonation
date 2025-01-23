import { CSSKeyframeManager, type Keyframe } from "./keyframe";
import type { PropertiesConfig, AnimationOptions } from "../core/config";

export type CSSAnimationOptions = {
  element: string | HTMLElement | HTMLElement[];
  props: PropertiesConfig | Keyframe[];
} & AnimationOptions;

const resolveElement = (
  element: string | HTMLElement | HTMLElement[]
): HTMLElement[] => {
  if (typeof element === "string")
    element = Array.from(document.querySelectorAll(element));
  else element = Array.isArray(element) ? element : [element];

  if (element.every((el) => el instanceof HTMLElement)) return element;
  throw new Error("Element not found");
};

export const animate = (config: CSSAnimationOptions): CSSKeyframeManager[] => {
  const { element, props } = config;
  const elements = resolveElement(element);
  if (elements === null || !Array.isArray(elements)) {
    throw new Error("Element not found");
  }

  if (Array.isArray(props)) {
    return elements.map((el) => new CSSKeyframeManager(el, props));
  }

  const kfms: Keyframe[] = [
    {
      offset: 0,
    },
    {
      offset: 1,
      ...props,
    },
  ];

  return elements.map((el) => new CSSKeyframeManager(el, kfms));
};
