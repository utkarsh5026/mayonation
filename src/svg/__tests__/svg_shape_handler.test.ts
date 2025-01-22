/// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from "vitest";
import { ShapeAnimationHandler } from "../shape";
import { createValue } from "../../core/animation-val";

describe("ShapeAnimationHandler", () => {
  let mockRectElement: SVGRectElement;
  let mockCircleElement: SVGCircleElement;
  let mockEllipseElement: SVGEllipseElement;
  let mockLineElement: SVGLineElement;
  let handler: ShapeAnimationHandler;

  beforeEach(() => {
    mockRectElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect"
    );
    mockCircleElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle"
    );
    mockEllipseElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "ellipse"
    );
    mockLineElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line"
    );
  });

  describe("Constructor and Initialization", () => {
    it("should correctly initialize with a rect element", () => {
      handler = new ShapeAnimationHandler(mockRectElement);
      expect(handler.isValidAttribute("width")).toBe(true);
      expect(handler.isValidAttribute("invalid")).toBe(false);
    });

    it("should throw error for unsupported elements", () => {
      const invalidElement = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      expect(() => new ShapeAnimationHandler(invalidElement)).toThrow(
        "Unsupported shape type"
      );
    });
  });

  describe("Attribute Validation", () => {
    beforeEach(() => {
      handler = new ShapeAnimationHandler(mockRectElement);
    });

    it("should validate correct attributes for rect", () => {
      expect(handler.isValidAttribute("width")).toBe(true);
      expect(handler.isValidAttribute("height")).toBe(true);
      expect(handler.isValidAttribute("x")).toBe(true);
      expect(handler.isValidAttribute("y")).toBe(true);
    });

    it("should reject invalid attributes", () => {
      expect(handler.isValidAttribute("invalid")).toBe(false);
    });

    it("should validate correct attributes for circle", () => {
      handler = new ShapeAnimationHandler(mockCircleElement);
      expect(handler.isValidAttribute("cx")).toBe(true);
      expect(handler.isValidAttribute("cy")).toBe(true);
      expect(handler.isValidAttribute("r")).toBe(true);
      expect(handler.isValidAttribute("width")).toBe(false);
    });

    it("should validate correct attributes for ellipse", () => {
      handler = new ShapeAnimationHandler(mockEllipseElement);
      expect(handler.isValidAttribute("cx")).toBe(true);
      expect(handler.isValidAttribute("cy")).toBe(true);
      expect(handler.isValidAttribute("rx")).toBe(true);
      expect(handler.isValidAttribute("ry")).toBe(true);
      expect(handler.isValidAttribute("r")).toBe(false);
    });

    it("should validate correct attributes for line", () => {
      handler = new ShapeAnimationHandler(mockLineElement);
      expect(handler.isValidAttribute("x1")).toBe(true);
      expect(handler.isValidAttribute("y1")).toBe(true);
      expect(handler.isValidAttribute("x2")).toBe(true);
      expect(handler.isValidAttribute("y2")).toBe(true);
      expect(handler.isValidAttribute("cx")).toBe(false);
    });
  });

  describe("Value Updates", () => {
    beforeEach(() => {
      handler = new ShapeAnimationHandler(mockRectElement);
    });

    it("should update valid attribute values", () => {
      const value = createValue.numeric(100, "px");
      handler.updateAttribute("width", value);
      handler.applyUpdates();
      expect(mockRectElement.getAttribute("width")).toBe("100");
    });

    it("should throw error for invalid values", () => {
      const negativeValue = createValue.numeric(-100, "px");
      expect(() => handler.updateAttribute("width", negativeValue)).toThrow();
    });
  });

  describe("Value Updates for Different Shapes", () => {
    it("should update circle attributes correctly", () => {
      handler = new ShapeAnimationHandler(mockCircleElement);
      const value = createValue.numeric(100, "px");
      handler.updateAttribute("r", value);
      handler.applyUpdates();
      expect(mockCircleElement.getAttribute("r")).toBe("100");
    });

    it("should update ellipse attributes correctly", () => {
      handler = new ShapeAnimationHandler(mockEllipseElement);
      const value = createValue.numeric(100, "px");
      handler.updateAttribute("rx", value);
      handler.updateAttribute("ry", value);
      handler.applyUpdates();
      expect(mockEllipseElement.getAttribute("rx")).toBe("100");
      expect(mockEllipseElement.getAttribute("ry")).toBe("100");
    });

    it("should update line attributes correctly", () => {
      handler = new ShapeAnimationHandler(mockLineElement);
      const value = createValue.numeric(100, "px");
      handler.updateAttribute("x1", value);
      handler.updateAttribute("y2", value);
      handler.applyUpdates();
      expect(mockLineElement.getAttribute("x1")).toBe("100");
      expect(mockLineElement.getAttribute("y2")).toBe("100");
    });

    it("should throw error for invalid values in circle", () => {
      handler = new ShapeAnimationHandler(mockCircleElement);
      const negativeValue = createValue.numeric(-100, "px");
      expect(() => handler.updateAttribute("r", negativeValue)).toThrow();
    });

    it("should throw error for invalid values in ellipse", () => {
      handler = new ShapeAnimationHandler(mockEllipseElement);
      const negativeValue = createValue.numeric(-100, "px");
      expect(() => handler.updateAttribute("rx", negativeValue)).toThrow();
      expect(() => handler.updateAttribute("ry", negativeValue)).toThrow();
    });
  });

  describe("Interpolation", () => {
    beforeEach(() => {
      handler = new ShapeAnimationHandler(mockRectElement);
    });

    it("should correctly interpolate between values", () => {
      const from = createValue.numeric(0, "px");
      const to = createValue.numeric(100, "px");
      const result = handler.interpolate("width", from, to, 0.5);
      expect(result.value).toBe(50);
      expect(result.unit).toBe("px");
    });
  });

  describe("Reset Functionality", () => {
    beforeEach(() => {
      handler = new ShapeAnimationHandler(mockRectElement);
    });

    it("should reset to initial values", () => {
      mockRectElement.setAttribute("width", "50");
      handler = new ShapeAnimationHandler(mockRectElement);

      const newValue = createValue.numeric(100, "px");
      handler.updateAttribute("width", newValue);
      handler.applyUpdates();

      handler.reset();
      expect(mockRectElement.getAttribute("width")).toBe("50");
    });
  });

  describe("Reset Functionality for Different Shapes", () => {
    it("should reset circle to initial values", () => {
      mockCircleElement.setAttribute("r", "50");
      handler = new ShapeAnimationHandler(mockCircleElement);

      const newValue = createValue.numeric(100, "px");
      handler.updateAttribute("r", newValue);
      handler.applyUpdates();

      handler.reset();
      expect(mockCircleElement.getAttribute("r")).toBe("50");
    });

    it("should reset ellipse to initial values", () => {
      mockEllipseElement.setAttribute("rx", "50");
      mockEllipseElement.setAttribute("ry", "30");
      handler = new ShapeAnimationHandler(mockEllipseElement);

      const newValue = createValue.numeric(100, "px");
      handler.updateAttribute("rx", newValue);
      handler.updateAttribute("ry", newValue);
      handler.applyUpdates();

      handler.reset();
      expect(mockEllipseElement.getAttribute("rx")).toBe("50");
      expect(mockEllipseElement.getAttribute("ry")).toBe("30");
    });
  });
});
