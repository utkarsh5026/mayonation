import {
  type PathCommand,
  type PathCommandType,
  type Point,
  PathErrorType,
  PathError,
} from "./unit";

/**
 * This class provides utility methods for parsing and manipulating SVG path commands.
 * It includes methods for parsing a path string into an array of PathCommand objects,
 * converting PathCommand objects back into a path string, and making relative path
 * commands absolute by adjusting their coordinates based on a reference point.
 */
class PathUtils {
  /**
   * Parses an SVG path string into an array of PathCommand objects.
   *
   * @param path - The SVG path string to parse.
   * @returns An array of PathCommand objects representing the parsed path.
   * @throws PathError if the path is invalid or cannot be parsed.
   */
  public static parsePath(path: string): PathCommand[] {
    const commands: PathCommand[] = [];
    const commandRegex = /([MLHVCSQTAZmlhvcsqtaz])([^MLHVCSQTAZmlhvcsqtaz]*)/g;

    let match;

    try {
      while ((match = commandRegex.exec(path)) !== null) {
        const [_, type, valueString] = match;
        const values = valueString
          .trim()
          .split(/[\s,]+/)
          .filter((v) => v !== "")
          .map((v) => parseFloat(v));

        const command = this.createCommand(type, values);
        commands.push(command);
      }

      if (commands.length === 0 && path.length > 0) {
        throw new PathError(
          PathErrorType.INVALID_PATH,
          `Failed to parse path: ${path}`
        );
      }
    } catch (error) {
      throw new PathError(
        PathErrorType.INVALID_PATH,
        `Failed to parse path: ${error}`,
        { path }
      );
    }

    return commands;
  }

  /**
   * Creates a PathCommand object based on the given type and values.
   *
   * @param type - The type of the path command (e.g., 'M', 'L', 'C', etc.).
   * @param values - The values for the path command.
   * @returns A PathCommand object representing the command.
   * @throws PathError if the command type is invalid or the number of values is incorrect.
   */
  private static createCommand(type: string, values: number[]): PathCommand {
    const isRelative = type === type.toLowerCase();
    const upperType = type.toUpperCase() as PathCommandType;

    this.validateCommand(upperType, values);

    const { endPoint, controlPoints } = this.calculateCommandPoints(
      upperType,
      values
    );

    return {
      type: upperType,
      values,
      relative: isRelative,
      endPoint,
      controlPoints,
    };
  }

  /**
   * Calculates the end point and control points for a PathCommand based on its type and values.
   *
   * @param type - The type of the path command.
   * @param values - The values for the path command.
   * @returns An object containing the end point and control points for the command.
   */
  private static calculateCommandPoints(
    type: string,
    values: number[]
  ): Pick<PathCommand, "endPoint" | "controlPoints"> {
    switch (type) {
      case "M":
      case "L":
        return { endPoint: { x: values[0], y: values[1] } };

      case "H":
        return {
          endPoint: { x: values[0], y: 0 }, // Y will be adjusted later
        };

      case "V":
        return {
          endPoint: { x: 0, y: values[0] }, // X will be adjusted later
        };

      case "C":
        return {
          endPoint: { x: values[4], y: values[5] },
          controlPoints: [
            { x: values[0], y: values[1] },
            { x: values[2], y: values[3] },
          ],
        };

      case "S":
      case "Q":
        return {
          endPoint: { x: values[2], y: values[3] },
          controlPoints: [{ x: values[0], y: values[1] }],
        };

      case "T":
        return {
          endPoint: { x: values[0], y: values[1] },
        };

      case "A":
        return {
          endPoint: { x: values[5], y: values[6] },
        };

      case "Z":
        return {
          endPoint: { x: 0, y: 0 }, // Will be adjusted to first point
        };

      default:
        throw new PathError(
          PathErrorType.INVALID_COMMAND,
          `Unknown command type: ${type}`
        );
    }
  }

  /**
   * Validates a path command based on its type and number of values.
   *
   * @param type - The type of the path command.
   * @param values - The values for the path command.
   * @throws PathError if the number of values is incorrect for the given command type.
   */
  private static validateCommand(type: PathCommandType, values: number[]) {
    const expectedValues: Record<PathCommandType, number> = {
      M: 2,
      L: 2,
      H: 1,
      V: 1,
      C: 6,
      S: 4,
      Q: 4,
      T: 2,
      A: 7,
      Z: 0,
    };

    const expected = expectedValues[type];
    if (expected === undefined || values.length !== expected) {
      throw new PathError(
        PathErrorType.INVALID_COMMAND,
        `Invalid number of values for command ${type}`,
        { type, values, expected }
      );
    }
  }

  /**
   * Converts an array of PathCommand objects back into an SVG path string.
   *
   * @param commands - The array of PathCommand objects to convert.
   * @returns The SVG path string representation of the commands.
   */
  public static commandsToPath(commands: PathCommand[]) {
    return commands
      .map((command) => {
        if (command.type === "Z") return "Z";

        const cmdType = command.relative
          ? command.type.toLowerCase()
          : command.type;
        return `${cmdType}${command.values.join(" ")}`;
      })
      .join(" ");
  }

  /**
   * Converts a relative PathCommand object to an absolute one by adjusting its coordinates based on a reference point.
   *
   * @param command - The PathCommand object to convert.
   * @param referencePoint - The reference point to use for conversion.
   * @returns The absolute PathCommand object.
   */
  public static makeAbsolute(
    command: PathCommand,
    referencePoint: Point
  ): PathCommand {
    if (!command.relative) return command;
    const { x, y } = referencePoint;

    const newValues = [...command.values];
    for (let i = 0; i < newValues.length; i += 2) {
      if (i + 1 < newValues.length) {
        newValues[i] += x;
        newValues[i + 1] += y;
      } else if (command.type === "H") {
        newValues[i] += x;
      } else if (command.type === "V") {
        newValues[i] += y;
      }
    }

    return {
      ...command,
      values: newValues,
      relative: false,
      endPoint: {
        x: command.endPoint.x + x,
        y: command.endPoint.y + y,
      },
      controlPoints: command.controlPoints?.map((point) => ({
        x: point.x + x,
        y: point.y + y,
      })),
    };
  }
}

export default PathUtils;
