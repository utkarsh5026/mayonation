import { TransformPropertyName } from "./types";
import { AnimationUnit } from "@/utils/unit";

export const TRANSFORM_PROPERTIES = new Map<
  TransformPropertyName,
  AnimationUnit
>([
  ["translateX", "px"],
  ["translateY", "px"],
  ["translateZ", "px"],
  ["rotateX", "deg"],
  ["rotateY", "deg"],
  ["rotateZ", "deg"],
  ["scale", ""],
  ["scaleX", ""],
  ["scaleY", ""],
  ["scaleZ", ""],
  ["skewX", "deg"],
  ["skewY", "deg"],
]);
