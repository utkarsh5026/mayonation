import { describe, it, expect } from "vitest";
import SVGPath from "../svg/path";

describe("SVGPath Command Creation", () => {
  describe("Move Commands (M, m)", () => {
    it("should handle absolute move commands", () => {
      const result = new SVGPath("M10,20");
      expect(result.toString()).toBe("M10,20");
    });

    it("should handle relative move commands", () => {
      const result = new SVGPath("m10,20");
      expect(result.toString()).toBe("M10,20");
    });

    it("should convert subsequent move coordinates to line commands", () => {
      const result = new SVGPath("M10,20 30,40");
      expect(result.toString()).toBe("M10,20 L30,40");
    });
  });

  describe("Line Commands (L, l, H, h, V, v)", () => {
    it("should handle absolute line commands", () => {
      const result = new SVGPath("M0,0 L10,20");
      expect(result.toString()).toBe("M0,0 L10,20");
    });

    it("should handle relative line commands", () => {
      const result = new SVGPath("M0,0 l10,20");
      expect(result.toString()).toBe("M0,0 L10,20");
    });

    it("should handle absolute horizontal lines", () => {
      const result = new SVGPath("M0,0 H30");
      expect(result.toString()).toBe("M0,0 H30");
    });

    it("should handle relative horizontal lines", () => {
      const result = new SVGPath("M0,0 h30");
      expect(result.toString()).toBe("M0,0 H30");
    });

    it("should handle absolute vertical lines", () => {
      const result = new SVGPath("M0,0 V30");
      expect(result.toString()).toBe("M0,0 V30");
    });

    it("should handle relative vertical lines", () => {
      const result = new SVGPath("M0,0 v30");
      expect(result.toString()).toBe("M0,0 V30");
    });
  });

  describe("Curve Commands (C, c, S, s)", () => {
    it("should handle absolute cubic bezier curves", () => {
      const result = new SVGPath("M0,0 C10,20 30,40 50,60");
      expect(result.toString()).toBe("M0,0 C10,20 30,40 50,60");
    });

    it("should handle relative cubic bezier curves", () => {
      const result = new SVGPath("M0,0 c10,20 30,40 50,60");
      expect(result.toString()).toBe("M0,0 C10,20 30,40 50,60");
    });

    it("should handle absolute smooth cubic curves", () => {
      const result = new SVGPath("M0,0 C10,20 30,40 50,60 S70,80 90,100");
      expect(result.toString()).toBe("M0,0 C10,20 30,40 50,60 S70,80 90,100");
    });

    it("should handle relative smooth cubic curves", () => {
      const result = new SVGPath("M0,0 c10,20 30,40 50,60 s20,20 40,40");
      expect(result.toString()).toBe("M0,0 C10,20 30,40 50,60 S70,80 90,100");
    });
  });

  describe("Quadratic Curve Commands (Q, q, T, t)", () => {
    it("should handle absolute quadratic curves", () => {
      const result = new SVGPath("M0,0 Q10,20 30,40");
      expect(result.toString()).toBe("M0,0 Q10,20 30,40");
    });

    it("should handle relative quadratic curves", () => {
      const result = new SVGPath("M0,0 q10,20 30,40");
      expect(result.toString()).toBe("M0,0 Q10,20 30,40");
    });

    it("should handle absolute smooth quadratic curves", () => {
      const result = new SVGPath("M0,0 Q10,20 30,40 T50,60");
      expect(result.toString()).toBe("M0,0 Q10,20 30,40 T50,60");
    });

    it("should handle relative smooth quadratic curves", () => {
      const result = new SVGPath("M0,0 q10,20 30,40 t20,20");
      expect(result.toString()).toBe("M0,0 Q10,20 30,40 T50,60");
    });
  });

  describe("Arc Commands (A, a)", () => {
    it("should handle absolute arc commands", () => {
      const result = new SVGPath("M0,0 A25,25 0 0 1 50,50");
      expect(result.toString()).toBe("M0,0 A25,25 0 0 1 50,50");
    });

    it("should handle relative arc commands", () => {
      const result = new SVGPath("M0,0 a25,25 0 0 1 50,50");
      expect(result.toString()).toBe("M0,0 A25,25 0 0 1 50,50");
    });

    it("should handle large arc flag", () => {
      const result = new SVGPath("M0,0 A25,25 0 1 0 50,50");
      expect(result.toString()).toBe("M0,0 A25,25 0 1 0 50,50");
    });
  });

  describe("Close Path Command (Z, z)", () => {
    it("should handle close path command", () => {
      const result = new SVGPath("M0,0 L10,10 Z");
      expect(result.toString()).toBe("M0,0 L10,10 Z");
    });

    it("should handle lowercase close path command", () => {
      const result = new SVGPath("M0,0 L10,10 z");
      expect(result.toString()).toBe("M0,0 L10,10 Z");
    });
  });

  describe("Error Handling", () => {
    it("should throw error for invalid command type", () => {
      expect(() => new SVGPath("X10,20")).toThrow("Invalid command type: X");
    });

    it("should throw error for missing parameters", () => {
      expect(() => new SVGPath("M")).toThrow("Command M requires parameters");
    });

    it("should throw error for incorrect number of parameters", () => {
      expect(() => new SVGPath("M10")).toThrow();
    });

    it("should throw error for invalid parameter values", () => {
      expect(() => new SVGPath("M10,invalid")).toThrow();
    });

    it("should automatically add M0,0 if path starts with other command", () => {
      const result = new SVGPath("L10,10");
      expect(result.toString()).toBe("M0,0 L10,10");
    });
  });
});
