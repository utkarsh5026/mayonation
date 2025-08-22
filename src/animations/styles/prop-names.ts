export const COLOR_PROPERTIES = new Set<string>([
  "backgroundColor",
  "color",
  "borderColor",
  "outlineColor",
  "textDecorationColor",
  "textEmphasisColor",
  "caretColor",
  "columnRuleColor",
]);

export const MULTI_VALUE_PROPERTIES = new Set<string>([
  "boxShadow",
  "textShadow",
  "filter",
  "backdropFilter",
]);

// Extended set of animatable CSS properties
export const EXTENDED_ANIMATABLE_PROPERTIES = new Set<string>([
  // Layout
  "width",
  "height",
  "top",
  "left",
  "right",
  "bottom",
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",

  // Visual
  "opacity",
  "backgroundColor",
  "color",
  "borderColor",
  "borderWidth",
  "borderRadius",
  "boxShadow",
  "textShadow",

  // Typography
  "fontSize",
  "lineHeight",
  "letterSpacing",
  "wordSpacing",

  // Filters
  "filter",
  "backdropFilter",

  // Flex & Grid
  "flexGrow",
  "flexShrink",
  "flexBasis",
  "gridTemplateColumns",
  "gridTemplateRows",
  "gap",
]);
