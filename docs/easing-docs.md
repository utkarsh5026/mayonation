# Easing Functions Documentation

Easing functions are the magic behind smooth, natural-feeling animations. They control how a transition progresses over time, allowing animations to accelerate, decelerate, bounce, or move in other ways that feel natural to users.

## Basic Linear Animation

```typescript
export function linear(t: number): number {
  return t;
}
```

**Mathematical Expression:** f(t) = t

**What it feels like:** The linear easing moves at a constant speed from start to finish. While this might seem like the most logical choice, it often feels mechanical and unnatural to users because real-world objects rarely move at perfectly constant speeds.

**Best used for:** 
- Simple progress indicators
- Continuous animations where smoothness is more important than natural movement
- Technical visualizations where precise, constant movement is desired

## Cubic Ease-In

```typescript
export function easeIn(t: number): number {
  return Math.pow(t, 3);
}
```

**Mathematical Expression:** f(t) = t³

**What it feels like:** The animation starts slowly and gradually accelerates, like a car starting from a standstill. This creates a sense of "winding up" or "gathering momentum". The cubic power (³) makes this acceleration quite pronounced.

**Best used for:**
- Entrance animations where objects should appear to "gather speed"
- Transitions that simulate physical objects starting to move
- Animations that need to draw attention to their endpoint

## Cubic Ease-Out

```typescript
export function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
```

**Mathematical Expression:** f(t) = 1 - (1-t)³

**What it feels like:** The animation starts quickly and gradually slows to a stop, like a car gently braking to a halt. This creates a natural, satisfying conclusion to the animation that feels like objects are settling into place.

**Best used for:**
- Exit animations where objects should gracefully come to rest
- Dropping elements into place
- Transitions that should feel conclusive and settled

## Cubic Ease-In-Out

```typescript
export function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
```

**Mathematical Expression:** 
- When t < 0.5: f(t) = 4t³
- When t ≥ 0.5: f(t) = 1 - (-2t + 2)³/2

**What it feels like:** The animation both starts and ends gradually, with acceleration in the middle. This creates the most natural-feeling motion, similar to how a person might move their hand from one point to another - starting gently, moving quickly in the middle, and coming to a smooth stop.

**Best used for:**
- Most general-purpose animations where natural movement is desired
- Interface elements that move from one position to another
- Any animation where smoothness and polish are top priorities

## Quadratic Variations

### Ease-In-Quad

```typescript
export function easeInQuad(t: number): number {
  return t * t;
}
```

**Mathematical Expression:** f(t) = t²

**What it feels like:** Similar to cubic ease-in but with a gentler acceleration. The quadratic curve provides a more subtle ease-in effect that can feel less dramatic than its cubic counterpart.

### Ease-Out-Quad

```typescript
export function easeOutQuad(t: number): number {
  return 1 - Math.pow(1 - t, 2);
}
```

**Mathematical Expression:** f(t) = 1 - (1-t)²

**What it feels like:** A gentle deceleration that's less pronounced than cubic ease-out. This creates a subtle, professional feel that's less playful than the cubic variation.

### Ease-In-Out-Quad

```typescript
export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
```

**Mathematical Expression:**
- When t < 0.5: f(t) = 2t²
- When t ≥ 0.5: f(t) = 1 - (-2t + 2)²/2

**What it feels like:** A smoothed motion that's more subtle than cubic ease-in-out. This creates professional, understated transitions that don't draw attention to themselves while still maintaining natural movement.

## Tips for Choosing the Right Easing

1. **For UI Elements:**
   - Use ease-out for entrances (elements entering the screen)
   - Use ease-in for exits (elements leaving the screen)
   - Use ease-in-out for elements moving within the viewport

2. **For Natural Motion:**
   - Cubic variations create more playful, energetic movements
   - Quadratic variations create more subtle, professional movements
   - Linear easing should generally be avoided except for specific technical purposes

3. **For Performance:**
   - All these functions are computationally lightweight
   - They can be safely used for multiple simultaneous animations
   - Consider using quadratic variations for many simultaneous animations on lower-end devices

Remember that easing functions are just one part of creating great animations. The duration, delay, and the properties being animated all play crucial roles in creating animations that feel natural and enhance the user experience.