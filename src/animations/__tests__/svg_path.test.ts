import { describe, it, expect } from "vitest";
import { PathUtils, PathError } from "../svg/path";

describe("PathUtils", () => {
  describe("parsePath", () => {
    it("should parse move command (M/m)", () => {
      const absolutePath = "M100 200";
      const relativePath = "m10 20";

      const absoluteCommands = PathUtils.parsePath(absolutePath);
      const relativeCommands = PathUtils.parsePath(relativePath);

      expect(absoluteCommands[0]).toEqual({
        type: "M",
        values: [100, 200],
        relative: false,
        endPoint: { x: 100, y: 200 },
      });

      expect(relativeCommands[0]).toEqual({
        type: "M",
        values: [10, 20],
        relative: true,
        endPoint: { x: 10, y: 20 },
      });
    });

    it("should parse line command (L/l)", () => {
      const absolutePath = "L100 200";
      const relativePath = "l10 20";

      const absoluteCommands = PathUtils.parsePath(absolutePath);
      const relativeCommands = PathUtils.parsePath(relativePath);

      expect(absoluteCommands[0]).toEqual({
        type: "L",
        values: [100, 200],
        relative: false,
        endPoint: { x: 100, y: 200 },
      });

      expect(relativeCommands[0]).toEqual({
        type: "L",
        values: [10, 20],
        relative: true,
        endPoint: { x: 10, y: 20 },
      });
    });

    it("should parse horizontal line command (H/h)", () => {
      const absolutePath = "H100";
      const relativePath = "h10";

      const absoluteCommands = PathUtils.parsePath(absolutePath);
      const relativeCommands = PathUtils.parsePath(relativePath);

      expect(absoluteCommands[0]).toEqual({
        type: "H",
        values: [100],
        relative: false,
        endPoint: { x: 100, y: 0 },
      });

      expect(relativeCommands[0]).toEqual({
        type: "H",
        values: [10],
        relative: true,
        endPoint: { x: 10, y: 0 },
      });
    });

    it("should parse vertical line command (V/v)", () => {
      const absolutePath = "V100";
      const relativePath = "v10";

      const absoluteCommands = PathUtils.parsePath(absolutePath);
      const relativeCommands = PathUtils.parsePath(relativePath);

      expect(absoluteCommands[0]).toEqual({
        type: "V",
        values: [100],
        relative: false,
        endPoint: { x: 0, y: 100 },
      });

      expect(relativeCommands[0]).toEqual({
        type: "V",
        values: [10],
        relative: true,
        endPoint: { x: 0, y: 10 },
      });
    });

    it("should parse cubic curve command (C/c)", () => {
      const absolutePath = "C10 20 30 40 50 60";
      const relativePath = "c1 2 3 4 5 6";

      const absoluteCommands = PathUtils.parsePath(absolutePath);
      const relativeCommands = PathUtils.parsePath(relativePath);

      expect(absoluteCommands[0]).toEqual({
        type: "C",
        values: [10, 20, 30, 40, 50, 60],
        relative: false,
        endPoint: { x: 50, y: 60 },
        controlPoints: [
          { x: 10, y: 20 },
          { x: 30, y: 40 },
        ],
      });

      expect(relativeCommands[0]).toEqual({
        type: "C",
        values: [1, 2, 3, 4, 5, 6],
        relative: true,
        endPoint: { x: 5, y: 6 },
        controlPoints: [
          { x: 1, y: 2 },
          { x: 3, y: 4 },
        ],
      });
    });

    it("should parse smooth curve command (S/s)", () => {
      const absolutePath = "S30 40 50 60";
      const relativePath = "s3 4 5 6";

      const absoluteCommands = PathUtils.parsePath(absolutePath);
      const relativeCommands = PathUtils.parsePath(relativePath);

      expect(absoluteCommands[0]).toEqual({
        type: "S",
        values: [30, 40, 50, 60],
        relative: false,
        endPoint: { x: 50, y: 60 },
        controlPoints: [{ x: 30, y: 40 }],
      });

      expect(relativeCommands[0]).toEqual({
        type: "S",
        values: [3, 4, 5, 6],
        relative: true,
        endPoint: { x: 5, y: 6 },
        controlPoints: [{ x: 3, y: 4 }],
      });
    });

    it("should parse quadratic curve command (Q/q)", () => {
      const absolutePath = "Q30 40 50 60";
      const relativePath = "q3 4 5 6";

      const absoluteCommands = PathUtils.parsePath(absolutePath);
      const relativeCommands = PathUtils.parsePath(relativePath);

      expect(absoluteCommands[0]).toEqual({
        type: "Q",
        values: [30, 40, 50, 60],
        relative: false,
        endPoint: { x: 50, y: 60 },
        controlPoints: [{ x: 30, y: 40 }],
      });

      expect(relativeCommands[0]).toEqual({
        type: "Q",
        values: [3, 4, 5, 6],
        relative: true,
        endPoint: { x: 5, y: 6 },
        controlPoints: [{ x: 3, y: 4 }],
      });
    });

    it("should parse smooth quadratic curve command (T/t)", () => {
      const absolutePath = "T50 60";
      const relativePath = "t5 6";

      const absoluteCommands = PathUtils.parsePath(absolutePath);
      const relativeCommands = PathUtils.parsePath(relativePath);

      expect(absoluteCommands[0]).toEqual({
        type: "T",
        values: [50, 60],
        relative: false,
        endPoint: { x: 50, y: 60 },
      });

      expect(relativeCommands[0]).toEqual({
        type: "T",
        values: [5, 6],
        relative: true,
        endPoint: { x: 5, y: 6 },
      });
    });

    it("should parse arc command (A/a)", () => {
      const absolutePath = "A25 25 0 0 1 50 60";
      const relativePath = "a2 2 0 0 1 5 6";

      const absoluteCommands = PathUtils.parsePath(absolutePath);
      const relativeCommands = PathUtils.parsePath(relativePath);

      expect(absoluteCommands[0]).toEqual({
        type: "A",
        values: [25, 25, 0, 0, 1, 50, 60],
        relative: false,
        endPoint: { x: 50, y: 60 },
      });

      expect(relativeCommands[0]).toEqual({
        type: "A",
        values: [2, 2, 0, 0, 1, 5, 6],
        relative: true,
        endPoint: { x: 5, y: 6 },
      });
    });

    it("should parse close path command (Z/z)", () => {
      const absolutePath = "Z";
      const relativePath = "z";

      const absoluteCommands = PathUtils.parsePath(absolutePath);
      const relativeCommands = PathUtils.parsePath(relativePath);

      expect(absoluteCommands[0]).toEqual({
        type: "Z",
        values: [],
        relative: false,
        endPoint: { x: 0, y: 0 },
      });

      expect(relativeCommands[0]).toEqual({
        type: "Z",
        values: [],
        relative: true,
        endPoint: { x: 0, y: 0 },
      });
    });

    it("should parse complex paths", () => {
      const complexPath = "M10 20 L30 40 H50 V60 C70 80 90 100 110 120 Z";
      const commands = PathUtils.parsePath(complexPath);

      expect(commands).toHaveLength(6);
      expect(commands.map((cmd) => cmd.type)).toEqual([
        "M",
        "L",
        "H",
        "V",
        "C",
        "Z",
      ]);
    });

    it("should handle paths with both spaces and commas", () => {
      const path = "M10,20 L30,40";
      const commands = PathUtils.parsePath(path);

      expect(commands).toHaveLength(2);
      expect(commands[0].values).toEqual([10, 20]);
      expect(commands[1].values).toEqual([30, 40]);
    });
  });

  describe("commandsToPath", () => {
    it("should convert commands back to path string", () => {
      const originalPath = "M10 20 L30 40 H50 V60 C70 80 90 100 110 120 Z";
      const commands = PathUtils.parsePath(originalPath);
      const resultPath = PathUtils.commandsToPath(commands);

      expect(resultPath).toBe("M10 20 L30 40 H50 V60 C70 80 90 100 110 120 Z");
    });
  });

  describe("makeAbsolute", () => {
    it("should convert relative commands to absolute", () => {
      const command = PathUtils.parsePath("l10 20")[0];
      const referencePoint = { x: 100, y: 100 };

      const absoluteCommand = PathUtils.makeAbsolute(command, referencePoint);

      expect(absoluteCommand.relative).toBe(false);
      expect(absoluteCommand.values).toEqual([110, 120]);
      expect(absoluteCommand.endPoint).toEqual({ x: 110, y: 120 });
    });

    it("should handle H and V commands correctly", () => {
      const hCommand = PathUtils.parsePath("h10")[0];
      const vCommand = PathUtils.parsePath("v20")[0];
      const referencePoint = { x: 100, y: 100 };

      const absoluteH = PathUtils.makeAbsolute(hCommand, referencePoint);
      const absoluteV = PathUtils.makeAbsolute(vCommand, referencePoint);

      expect(absoluteH.values).toEqual([110]);
      expect(absoluteV.values).toEqual([120]);
    });
  });

  describe("error handling", () => {
    it("should throw PathError for invalid commands", () => {
      expect(() => PathUtils.parsePath("X10 20")).toThrow(PathError);
    });

    it("should throw PathError for invalid number of parameters", () => {
      expect(() => PathUtils.parsePath("L10")).toThrow(PathError);
      expect(() => PathUtils.parsePath("C10 20 30")).toThrow(PathError);
    });
  });
});
