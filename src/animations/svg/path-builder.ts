/**
 * A helper class for building SVG paths using a fluent interface.
 * Makes path creation more intuitive by providing chainable methods
 * that correspond to natural drawing actions.
 */
class PathBuilder {
  private readonly pathData: string[] = [];

  /**
   * Start a new path at the specified coordinates
   * @param x - X coordinate
   * @param y - Y coordinate
   */
  public moveTo(x: number, y: number): this {
    this.pathData.push(`M ${x} ${y}`);
    return this;
  }

  /**
   * Draw a line to the specified coordinates
   * @param x - X coordinate
   * @param y - Y coordinate
   */
  public lineTo(x: number, y: number): this {
    this.pathData.push(`L ${x} ${y}`);
    return this;
  }

  /**
   * Draw a horizontal line to the specified x coordinate
   * @param x - X coordinate
   */
  public horizontalLineTo(x: number): this {
    this.pathData.push(`H ${x}`);
    return this;
  }

  /**
   * Draw a vertical line to the specified y coordinate
   * @param y - Y coordinate
   */
  public verticalLineTo(y: number): this {
    this.pathData.push(`V ${y}`);
    return this;
  }

  /**
   * Draw a cubic bezier curve to the specified point
   * @param controlPoint1X - First control point X
   * @param controlPoint1Y - First control point Y
   * @param controlPoint2X - Second control point X
   * @param controlPoint2Y - Second control point Y
   * @param endX - End point X
   * @param endY - End point Y
   */
  public curveTo(
    controlPoint1X: number,
    controlPoint1Y: number,
    controlPoint2X: number,
    controlPoint2Y: number,
    endX: number,
    endY: number
  ): this {
    this.pathData.push(
      `C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${endX} ${endY}`
    );
    return this;
  }

  /**
   * Draw a smooth cubic bezier curve to the specified point
   * The first control point is calculated automatically
   * @param controlPoint2X - Second control point X
   * @param controlPoint2Y - Second control point Y
   * @param endX - End point X
   * @param endY - End point Y
   */
  public smoothCurveTo(
    controlPoint2X: number,
    controlPoint2Y: number,
    endX: number,
    endY: number
  ): this {
    this.pathData.push(
      `S ${controlPoint2X} ${controlPoint2Y}, ${endX} ${endY}`
    );
    return this;
  }

  /**
   * Draw a quadratic bezier curve to the specified point
   * @param controlX - Control point X
   * @param controlY - Control point Y
   * @param endX - End point X
   * @param endY - End point Y
   */
  public quadraticCurveTo(
    controlX: number,
    controlY: number,
    endX: number,
    endY: number
  ): this {
    this.pathData.push(`Q ${controlX} ${controlY}, ${endX} ${endY}`);
    return this;
  }

  /**
   * Draw an arc to the specified point
   * @param rx - X radius
   * @param ry - Y radius
   * @param xRotation - X axis rotation
   * @param largeArc - Use large arc (1) or small arc (0)
   * @param sweep - Use positive angle (1) or negative angle (0)
   * @param endX - End point X
   * @param endY - End point Y
   */
  public arcTo(
    rx: number,
    ry: number,
    xRotation: number,
    largeArc: 0 | 1,
    sweep: 0 | 1,
    endX: number,
    endY: number
  ): this {
    this.pathData.push(
      `A ${rx} ${ry} ${xRotation} ${largeArc} ${sweep} ${endX} ${endY}`
    );
    return this;
  }

  /**
   * Close the current path by drawing a line back to the starting point
   */
  public closePath(): this {
    this.pathData.push("Z");
    return this;
  }

  /**
   * Generate the complete SVG path data string
   */
  public toString(): string {
    return this.pathData.join(" ");
  }
}

export default PathBuilder;
