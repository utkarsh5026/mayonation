import { describe, it, expect } from "vitest";
import {
  parseValue,
  convertLength,
  convertScale,
  convertAngle,
  type ConversionContext,
} from "../unit";

describe("parseValue", () => {
  it("handles numeric values", () => {
    expect(parseValue(42)).toEqual({ value: 42, unit: "" });
    expect(parseValue(0)).toEqual({ value: 0, unit: "" });
    expect(parseValue(-10)).toEqual({ value: -10, unit: "" });
  });

  it("handles string values with units", () => {
    expect(parseValue("100px")).toEqual({ value: 100, unit: "px" });
    expect(parseValue("50%")).toEqual({ value: 50, unit: "%" });
    expect(parseValue("2.5em")).toEqual({ value: 2.5, unit: "em" });
    expect(parseValue("-90deg")).toEqual({ value: -90, unit: "deg" });
  });

  it("throws error for invalid values", () => {
    expect(() => parseValue("invalid")).toThrow(
      'Invalid value format: "invalid"'
    );
    expect(() => parseValue("")).toThrow('Invalid value format: ""');
  });
});

describe("convertLength", () => {
  const testContext: ConversionContext = {
    parentSize: {
      width: 1000,
      height: 500,
    },
    fontSize: 16,
    viewportSize: {
      width: 1920,
      height: 1080,
    },
  };

  it("converts pixel values", () => {
    expect(convertLength("100px", testContext)).toBe(100);
    expect(convertLength("-50px", testContext)).toBe(-50);
  });

  it("converts percentage values", () => {
    expect(convertLength("50%", testContext)).toBe(500); // 50% of parent width (1000)
    expect(convertLength("100%", testContext)).toBe(1000);
  });

  it("converts em values", () => {
    expect(convertLength("1em", testContext)).toBe(16);
    expect(convertLength("2.5em", testContext)).toBe(40);
  });

  it("converts rem values", () => {
    expect(convertLength("1rem", testContext)).toBe(16);
    expect(convertLength("2rem", testContext)).toBe(32);
  });

  it("converts viewport units", () => {
    expect(convertLength("50vh", testContext)).toBe(540); // 50% of 1080
    expect(convertLength("50vw", testContext)).toBe(960); // 50% of 1920
    expect(convertLength("50vmin", testContext)).toBe(540); // 50% of min(1920, 1080)
    expect(convertLength("50vmax", testContext)).toBe(960); // 50% of max(1920, 1080)
  });

  it("handles numeric values without units", () => {
    expect(convertLength(100, testContext)).toBe(100);
    expect(convertLength("100", testContext)).toBe(100);
  });

  it("uses default context when none provided", () => {
    expect(convertLength("100px")).toBe(100);
  });
});

describe("convertScale", () => {
  it("converts numeric scale values", () => {
    expect(convertScale(1.5)).toBe(1.5);
    expect(convertScale("2")).toBe(2);
    expect(convertScale("0.5")).toBe(0.5);
  });

  it("throws error for invalid values", () => {
    expect(() => convertScale("invalid")).toThrow(
      'Invalid value format: "invalid"'
    );
    expect(() => convertScale("")).toThrow('Invalid value format: ""');
  });
});

describe("convertAngle", () => {
  it("converts degree values", () => {
    expect(convertAngle("90deg")).toBe(90);
    expect(convertAngle("-180deg")).toBe(-180);
    expect(convertAngle("360deg")).toBe(360);
  });

  it("converts radian values", () => {
    expect(convertAngle("3.14159rad")).toBeCloseTo(180, 1);
    expect(convertAngle("1.5708rad")).toBeCloseTo(90, 1);
  });

  it("converts turn values", () => {
    expect(convertAngle("0.25turn")).toBe(90);
    expect(convertAngle("0.5turn")).toBe(180);
    expect(convertAngle("1turn")).toBe(360);
  });

  it("handles numeric values as degrees", () => {
    expect(convertAngle(90)).toBe(90);
    expect(convertAngle("90")).toBe(90);
  });
});
