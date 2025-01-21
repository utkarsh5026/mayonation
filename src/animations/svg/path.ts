import type { Point, PathCommandType } from "./unit";
import { PathInterpolator, InterpolationOptions } from "./path_interpolate";

/**
 * Core PathCommand interface representing a single SVG path command
 * Each command has a type (like M, L, C) and its parameters
 */
export type PathCommand = {
  type: PathCommandType; // The command type (M, L, C, etc)
  points: Point[]; // Points for the command
  relative: boolean; // Whether it's a relative command
  endPoint: Point; // End point for the command
  controlPoints?: Point[]; // Control points for curves
  params?: {
    radius?: { x: number; y: number };
    rotation?: number;
    largeArc?: boolean;
    sweep?: boolean;
  };
};

/**
 * Validation rules for each command type
 */
const COMMAND_VALIDATION: Record<
  PathCommandType,
  {
    requiredParams: number;
    multipleAllowed: boolean;
  }
> = {
  M: { requiredParams: 2, multipleAllowed: true }, // x,y (can have multiple pairs)
  L: { requiredParams: 2, multipleAllowed: true }, // x,y (can have multiple pairs)
  H: { requiredParams: 1, multipleAllowed: true }, // x
  V: { requiredParams: 1, multipleAllowed: true }, // y
  C: { requiredParams: 6, multipleAllowed: true }, // x1,y1,x2,y2,x,y
  S: { requiredParams: 4, multipleAllowed: true }, // x2,y2,x,y
  Q: { requiredParams: 4, multipleAllowed: true }, // x1,y1,x,y
  T: { requiredParams: 2, multipleAllowed: true }, // x,y
  A: { requiredParams: 7, multipleAllowed: true }, // rx,ry,angle,large-arc,sweep,x,y
  Z: { requiredParams: 0, multipleAllowed: false }, // no parameters
} as const;

/**
 * SVGPath class handles parsing, manipulation and serialization of SVG path data.
 * It breaks down complex SVG path strings into a sequence of commands that can be
 * processed individually.
 *
 * SVG paths consist of commands like:
 * - M/m: Move to point (x,y)
 * - L/l: Draw line to point (x,y)
 * - H/h: Draw horizontal line to x
 * - V/v: Draw vertical line to y
 * - C/c: Cubic Bézier curve with control points (x1,y1) and (x2,y2) to end point (x,y)
 * - S/s: Smooth cubic Bézier with one control point (x2,y2) to (x,y)
 * - Q/q: Quadratic Bézier with control point (x1,y1) to (x,y)
 * - T/t: Smooth quadratic Bézier to point (x,y)
 * - A/a: Arc to (x,y) with radius (rx,ry), rotation, and arc flags
 * - Z/z: Close path
 *
 * Uppercase commands use absolute coordinates, lowercase use relative coordinates.
 */
class SVGPath {
  private readonly commands: PathCommand[] = [];
  private readonly ipr: PathInterpolator = new PathInterpolator();
  private readonly originalPath: string;

  /**
   * Creates a new SVGPath instance from a path data string
   * @param pathData - SVG path data string (e.g. "M0,0 L100,100")
   */
  constructor(pathData: string) {
    this.originalPath = pathData;
    this.parsePathData(pathData);
    console.dir(this.commands, { depth: null });
  }

  /**
   * Converts the path commands back to an SVG path string
   * Handles all command types with proper coordinate formatting
   */
  public toString(): string {
    return this.commands
      .map((cmd) => {
        const type = cmd.type;

        switch (type) {
          case "M":
          case "L":
            return type + cmd.points.map((p) => `${p.x},${p.y}`).join(" ");

          case "H":
            return `${type}${cmd.points.map((p) => p.x).join(" ")}`;
          case "V":
            return `${type}${cmd.points.map((p) => p.y).join(" ")}`;

          case "C": {
            // Cubic Bézier has 2 control points followed by end point
            const [cp1, cp2] = cmd.controlPoints!;
            return `${type}${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${cmd.points[0].x},${cmd.points[0].y}`;
          }

          case "S": {
            // Smooth cubic Bézier has 1 control point followed by end point
            const [cp2] = cmd.controlPoints!;
            return `${type}${cp2.x},${cp2.y} ${cmd.points[0].x},${cmd.points[0].y}`;
          }

          case "Q": {
            // Quadratic Bézier has 1 control point followed by end point
            const [cp] = cmd.controlPoints!;
            return `${type}${cp.x},${cp.y} ${cmd.points[0].x},${cmd.points[0].y}`;
          }

          case "T":
            return `${type}${cmd.points[0].x},${cmd.points[0].y}`;

          case "A": {
            const params = cmd.params!;
            return `${type}${params.radius!.x},${params.radius!.y} ${
              params.rotation
            } ${params.largeArc ? 1 : 0} ${params.sweep ? 1 : 0} ${
              cmd.points[0].x
            },${cmd.points[0].y}`;
          }

          case "Z":
            return type;

          default:
            return "";
        }
      })
      .join(" ");
  }

  /**
   * Returns the original path string that was used to create this SVGPath
   */
  public get getOriginalPath(): string {
    return this.originalPath;
  }

  /**
   * Parses SVG path data string into individual commands
   * Uses regex to extract command type and parameter values
   */
  private parsePathData(pathData: string): void {
    const commandPattern = /([a-zA-Z])([^a-zA-Z]*)/g;
    let match: RegExpExecArray | null;

    while ((match = commandPattern.exec(pathData)) !== null) {
      const [_, type, valueString] = match;
      const values = valueString
        .trim()
        .split(/[\s,]+/)
        .filter((v) => v !== "")
        .map(Number);

      const cmd = this.createCommand(type, values);
      this.commands.push(cmd);
    }
  }

  /**
   * Creates a PathCommand object from command type and parameters
   * Handles special case of move commands with implicit line commands
   */
  private createCommand(type: string, params: number[]): PathCommand {
    this.validateCommandParams(type, params);
    if (this.commands.length === 0 && type.toUpperCase() !== "M") {
      this.commands.push(this.createCommand("M", [0, 0]));
    }

    const command = this.initializeCommand(type);
    const prevPoint = this.getPreviousEndPoint();

    if (this.isSubsequentMoveCommand(type, params)) {
      const moveParams = params.slice(0, 2);
      const lineParams = params.slice(2);

      const moveCmd = this.createCommandPoints(command, moveParams, prevPoint);
      this.commands.push(moveCmd);

      const lineType = type === "m" ? "l" : "L";
      return this.createCommand(lineType, lineParams);
    }

    return this.createCommandPoints(command, params, prevPoint);
  }

  /**
   * Creates points and control points for a command based on its type
   * Handles coordinate calculations for both absolute and relative commands
   */
  private createCommandPoints(
    command: PathCommand,
    params: number[],
    prevPoint: Point
  ): PathCommand {
    const points = this.pairToPoints(params);
    switch (command.type) {
      case "M":
      case "L": {
        // M x,y L x,y
        command.points = points;
        command.endPoint = command.points[command.points.length - 1];
        break;
      }

      case "H": {
        // H x
        const x = command.relative ? prevPoint.x + params[0] : params[0];
        command.points = [{ x, y: prevPoint.y }];
        command.endPoint = command.points[0];
        break;
      }

      case "V": {
        // V y
        const y = command.relative ? prevPoint.y + params[0] : params[0];
        command.points = [{ x: prevPoint.x, y }];
        command.endPoint = command.points[0];
        break;
      }

      case "C": {
        // C x1,y1 x2,y2 x,y
        command.points = [points[2]];
        command.controlPoints = [points[0], points[1]];
        command.endPoint = command.points[0];
        break;
      }

      case "S":
      case "Q": {
        // S x2,y2 x,y Q x1,y1 x,y
        command.points = [points[1]];
        command.controlPoints = [points[0]];
        command.endPoint = command.points[0];
        break;
      }

      case "T": {
        // T x,y
        command.points = points;
        command.endPoint = command.points[0];
        break;
      }

      case "A": {
        // A rx,ry angle large-arc sweep x,y
        const [rx, ry, angle, largeArc, sweep, x, y] = params;
        const endPoint = command.relative
          ? { x: prevPoint.x + x, y: prevPoint.y + y }
          : { x, y };

        command.points = [endPoint];
        command.params = {
          radius: { x: Math.abs(rx), y: Math.abs(ry) }, // Ensure positive radii
          rotation: angle % 360, // Normalize angle
          largeArc: Boolean(largeArc),
          sweep: Boolean(sweep),
        };
        command.endPoint = endPoint;
        break;
      }

      case "Z": {
        // Z
        const pathStart = this.getStartOfPath();
        command.points = [pathStart];
        command.endPoint = pathStart;
        break;
      }
    }
    return this.handleRelativeCommand(command, prevPoint);
  }

  /**
   * Converts relative coordinates to absolute coordinates
   * For relative commands, coordinates are offset from previous end point
   */
  private handleRelativeCommand(
    command: PathCommand,
    prevPoint: Point
  ): PathCommand {
    if (!command.relative) return command;

    const adjustPoint = (p: Point): Point => ({
      x: prevPoint.x + p.x,
      y: prevPoint.y + p.y,
    });

    const adjusted = { ...command };
    adjusted.points = command.points.map(adjustPoint);
    if (command.controlPoints)
      adjusted.controlPoints = command.controlPoints.map(adjustPoint);

    adjusted.endPoint = adjustPoint(command.endPoint);
    return adjusted;
  }

  /**
   * Validates command parameters against rules defined in COMMAND_VALIDATION
   * Checks number of parameters and ensures they are valid numbers
   */
  private validateCommandParams(type: string, params: number[]): void {
    const commandType = type.toUpperCase() as PathCommandType;
    const validation = COMMAND_VALIDATION[commandType];

    if (!validation) throw new Error(`Invalid command type: ${type}`);

    if (params.length === 0 && validation.requiredParams > 0)
      throw new Error(`Command ${type} requires parameters`);

    if (
      !validation.multipleAllowed &&
      params.length !== validation.requiredParams
    )
      throw new Error(
        `Command ${type} requires exactly ${validation.requiredParams} parameters, got ${params.length}`
      );

    if (
      validation.multipleAllowed &&
      params.length % validation.requiredParams !== 0
    )
      throw new Error(
        `Command ${type} requires parameters in multiples of ${validation.requiredParams}, got ${params.length}`
      );

    if (params.some((param) => !Number.isFinite(param)))
      throw new Error(`Invalid parameter value for command ${type}`);
  }

  /**
   * Creates a new PathCommand object with default values
   * Sets command type and whether it's relative based on case
   */
  private initializeCommand(type: string): PathCommand {
    return {
      type: type.toUpperCase() as PathCommandType,
      points: [],
      relative: type !== type.toUpperCase(),
      endPoint: { x: 0, y: 0 },
    };
  }

  /**
   * Checks if a move command has additional parameters
   * Move commands can include implicit line commands
   */
  private isSubsequentMoveCommand(type: string, params: number[]): boolean {
    const validation =
      COMMAND_VALIDATION[type.toUpperCase() as PathCommandType];
    return (
      type.toUpperCase() === "M" && params.length > validation.requiredParams
    );
  }

  /**
   * Gets the end point of the previous command
   * Returns origin (0,0) if this is the first command
   */
  private getPreviousEndPoint(): Point {
    return this.commands.length > 0
      ? { ...this.commands[this.commands.length - 1].endPoint }
      : { x: 0, y: 0 };
  }

  /**
   * Finds the start point of the current subpath
   * Used by Z command to close the path
   */
  private getStartOfPath(): Point {
    for (let i = this.commands.length - 1; i >= 0; i--) {
      const cmd = this.commands[i];
      if (cmd.type === "M") return cmd.endPoint;
    }
    return { x: 0, y: 0 };
  }

  /**
   * Converts array of numbers to array of Point objects
   * Takes pairs of numbers as x,y coordinates
   */
  private pairToPoints(params: number[]): Point[] {
    const points: Point[] = [];
    for (let i = 0; i < params.length; i += 2) {
      points.push({ x: params[i], y: params[i + 1] });
    }
    return points;
  }
}

export default SVGPath;
