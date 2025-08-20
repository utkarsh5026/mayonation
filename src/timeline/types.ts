export type TimelineState = "idle" | "playing" | "paused" | "completed";

export type TimelineEventType =
  | "start"
  | "pause"
  | "resume"
  | "complete"
  | "loop"
  | "update";

export type TimelinePosition =
  | number // Absolute time in ms
  | "<" // At start of timeline
  | ">" // At end of timeline
  | `+=${number}` // Relative to previous animation end
  | `-=${number}`; // Relative to previous animation start
