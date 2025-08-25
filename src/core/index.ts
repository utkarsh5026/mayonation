// Core animation system
export { AnimationEngine } from "./engine";
export * from "./ease-fns";
export { 
  AnimationValue, 
  NumericValue, 
  ColorValue,
  type ColorSpace,
  isNumericValue,
  isColorValue,
  isRGBColor,
  isHSLColor,
  createValue
} from "./animation-val";
