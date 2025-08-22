import type {
  TranslateProperties,
  RotateProperties,
  SkewProperties,
  ScaleProperties,
} from "./types";

/**
 * Checks if a property is a translate transform property
 * @param prop - The property name to check
 * @returns True if the property is a translate property (translate, translateX, translateY, translateZ)
 */
export const isTranslateProp = (prop: string): prop is TranslateProperties => {
  return (
    prop === "translate" ||
    prop === "translateX" ||
    prop === "translateY" ||
    prop === "translateZ"
  );
};

/**
 * Checks if a property is a rotate transform property
 * @param prop - The property name to check
 * @returns True if the property is a rotate property (rotate, rotateX, rotateY, rotateZ)
 */
export const isRotateProp = (prop: string): prop is RotateProperties => {
  return (
    prop === "rotate" ||
    prop === "rotateX" ||
    prop === "rotateY" ||
    prop === "rotateZ"
  );
};

/**
 * Checks if a property is a scale transform property
 * @param prop - The property name to check
 * @returns True if the property is a scale property (scale, scaleX, scaleY, scaleZ)
 */
export const isScaleProp = (prop: string): prop is ScaleProperties => {
  return (
    prop === "scale" ||
    prop === "scaleX" ||
    prop === "scaleY" ||
    prop === "scaleZ"
  );
};

/**
 * Checks if a property is a skew transform property
 * @param prop - The property name to check
 * @returns True if the property is a skew property (skew, skewX, skewY)
 */
export const isSkewProp = (prop: string): prop is SkewProperties => {
  return prop === "skew" || prop === "skewX" || prop === "skewY";
};
