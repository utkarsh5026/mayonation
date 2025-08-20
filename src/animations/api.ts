import { CSSKeyframeManager, type Keyframe } from "./keyframe";
import type { PropertiesConfig, AnimationOptions } from "../core/config";
import { resolveElement } from "@/utils/dom";

export type CSSAnimationOptions = {
  element: string | HTMLElement | HTMLElement[];
  props: PropertiesConfig | Keyframe[];
} & AnimationOptions;

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
