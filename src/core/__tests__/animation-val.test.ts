// src/core/animation-val.test.ts

import {
  createValue,
  isNumericValue,
  isColorValue,
  isRGBColor,
  isHSLColor,
  AnimationValue,
} from "../animation-val";

describe("Animation Value Tests", () => {
  test("createValue.numeric should create a NumericValue", () => {
    const numericValue = createValue.numeric(10, "px");
    expect(numericValue).toEqual({
      type: "numeric",
      value: 10,
      unit: "px",
    });
  });

  test("createValue.rgb should create a ColorValue with RGB", () => {
    const rgbValue = createValue.rgb(255, 0, 0, 0.5);
    expect(rgbValue).toEqual({
      type: "color",
      space: "rgb",
      value: { r: 255, g: 0, b: 0, a: 0.5 },
    });
  });

  test("createValue.hsl should create a ColorValue with HSL", () => {
    const hslValue = createValue.hsl(120, 100, 50, 0.5);
    expect(hslValue).toEqual({
      type: "color",
      space: "hsl",
      value: { h: 120, s: 100, l: 50, a: 0.5 },
    });
  });

  test("isNumericValue should correctly identify NumericValue", () => {
    const numericValue: AnimationValue = createValue.numeric(10, "px");
    expect(isNumericValue(numericValue)).toBe(true);

    const colorValue: AnimationValue = createValue.rgb(255, 0, 0);
    expect(isNumericValue(colorValue)).toBe(false);
  });

  test("isColorValue should correctly identify ColorValue", () => {
    const colorValue: AnimationValue = createValue.rgb(255, 0, 0);
    expect(isColorValue(colorValue)).toBe(true);

    const numericValue: AnimationValue = createValue.numeric(10, "px");
    expect(isColorValue(numericValue)).toBe(false);
  });

  test("isRGBColor should correctly identify RGB colors", () => {
    const rgbColor = { r: 255, g: 0, b: 0 };
    expect(isRGBColor(rgbColor)).toBe(true);

    const hslColor = { h: 120, s: 100, l: 50 };
    expect(isRGBColor(hslColor)).toBe(false);
  });

  test("isHSLColor should correctly identify HSL colors", () => {
    const hslColor = { h: 120, s: 100, l: 50 };
    expect(isHSLColor(hslColor)).toBe(true);

    const rgbColor = { r: 255, g: 0, b: 0 };
    expect(isHSLColor(rgbColor)).toBe(false);
  });
});
