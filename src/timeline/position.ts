export interface PositionContext {
  currentEnd: number;
  previousEnd: number;
  totalDuration: number;
  labels: Map<string, number>;
}

/**
 * Alternative object-based API for those who prefer configuration objects
 */
export type TimelinePos =
  | Position
  | { at: number }
  | { after: number }
  | { before: number }
  | { percent: number }
  | { with: string; offset?: number }
  | "start"
  | "end"
  | number;

/**
 * Position Builder - Fluent API for creating timeline positions
 *
 * This allows intuitive position creation with full type safety
 * and intellisense support in IDEs.
 */
export class Position {
  private constructor(
    private readonly type:
      | "absolute"
      | "relative"
      | "start"
      | "end"
      | "with"
      | "percent",
    private readonly value: number = 0,
    private readonly reference?: string | number
  ) {}

  /**
   * Position at the absolute start of the timeline (time = 0)
   * @example Position.start()
   */
  static start(): Position {
    return new Position("start");
  }

  /**
   * Position at the current end of the timeline
   * @example Position.end()
   */
  static end(): Position {
    return new Position("end");
  }

  /**
   * Position at an absolute time in milliseconds
   * @example Position.at(1000) // At exactly 1 second
   */
  static at(milliseconds: number): Position {
    return new Position("absolute", milliseconds);
  }

  /**
   * Position at a percentage of the total timeline duration
   * @example Position.percent(50) // At 50% of timeline
   */
  static percent(percentage: number): Position {
    return new Position("percent", percentage);
  }

  /**
   * Position relative to the end of the previous animation
   * @example
   * Position.after(200) // 200ms after previous
   * Position.after(-100) // 100ms before previous ends (overlap)
   */
  static after(milliseconds: number = 0): Position {
    return new Position("relative", milliseconds);
  }

  /**
   * Position relative to the start of another animation
   * @example Position.with('intro') // Start with animation labeled 'intro'
   * Position.with('intro', 100) // 100ms after 'intro' starts
   */
  static with(label: string, offset: number = 0): Position {
    return new Position("with", offset, label);
  }

  /**
   * Internal: resolve to absolute milliseconds
   */
  _resolve(context: PositionContext): number {
    switch (this.type) {
      case "start":
        return 0;
      case "end":
        return context.currentEnd;
      case "absolute":
        return this.value;
      case "relative":
        return Math.max(0, context.previousEnd + this.value);
      case "percent":
        return (this.value / 100) * context.totalDuration;
      case "with":
        const labelTime = context.labels.get(this.reference as string) ?? 0;
        return labelTime + this.value;
      default:
        return context.currentEnd;
    }
  }
}
