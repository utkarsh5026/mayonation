# 🎨 Mayonation


Welcome to Mayonation, a lightweight and performant animation library for the web. This library is designed to make animating HTML elements simple and efficient, providing a powerful API to enhance your web projects. I developed this project as a learning project for animations.

**See the [live preview](https://utkarsh5026.github.io/mayosite/). 🚀**

![Tests](https://github.com/utkarsh5026/mayonation/actions/workflows/test.yml/badge.svg)


## Why Mayonation?

- 🪶 **Lightweight AF** - Tiny footprint that won't bloat your bundle
- 🎯 **Dead Simple API** - Chain methods like a boss
- 🚀 **Performance First** - Optimized for silky smooth 60fps
- 🎮 **Timeline Support** - Create complex sequences with ease
- 🎨 **CSS & Transform** - Animate any property you want
- 📦 **TypeScript Ready** - Full type support out of the box

## Quick Start

```bash
npm install mayonation
```

### Basic Animation

```typescript
import { animate } from 'mayonation'

// Make it move!
animate('.my-box')
  .to({
    translateX: 100,
    opacity: 0.5
  })
  .duration(1000)
  .easing('easeOutQuad')
  .play()
```

### Keyframe Magic

```typescript
animate('#bouncy-ball')
  .keyframes([
    { translateY: 0, offset: 0 },
    { translateY: 200, offset: 0.5 },
    { translateY: 0, offset: 1 }
  ])
  .duration(2000)
  .play()
```

### Timeline Power

```typescript
import { timeline } from 'mayonation'

timeline()
  .add('.box1', {
    translateX: 100,
    duration: 1000
  })
  .add('.box2', {
    scale: 2
  }, '+=500')  // Starts 500ms after previous
  .add('.box3', {
    opacity: 0
  }, 2000)     // Starts at specific time
  .play()
```

## 🛠️ Features

### Transform Animations

- Scale, rotate, translate with GPU acceleration
- Chain multiple transforms seamlessly
- Perfect for smooth UI transitions

### CSS Properties

- Animate colors, dimensions, opacity
- Smart unit handling (px, %, em, rem)
- Automatic value interpolation

### Easing Functions

```typescript
animate('.element')
  .to({ scale: 1.5 })
  .easing('easeInOutQuad')  // Built-in easings
  .duration(500)
  .play()
```

Available easings:

- `linear`
- `easeIn`, `easeOut`, `easeInOut`
- `easeInQuad`, `easeOutQuad`, `easeInOutQuad`
- `easeInCubic`, `easeOutCubic`, `easeInOutCubic`

### Timeline Control

- Precise timing control
- Relative or absolute positioning
- Loop and reverse options
- Pause, resume, and seek

## 🎮 API Reference

### `animate(target)`

Creates a simple animation instance.

**Target can be:**

- CSS selector string
- HTML Element
- Array of elements

**Methods:**

- `.to(properties)` - Set target values
- `.keyframes(frames)` - Define keyframe sequence
- `.duration(ms)` - Set animation length
- `.easing(name)` - Set easing function
- `.delay(ms)` - Add initial delay
- `.play()` - Start animation

### `timeline(options?)`

Creates a complex animation sequence.

**Options:**

- `loop: boolean` - Loop the timeline
- `precision: number` - Animation precision in ms

**Methods:**

- `.add(target, properties, position?)` - Add animation
- `.play()` - Start timeline
- `.pause()` - Pause timeline
- `.resume()` - Resume timeline
- `.seek(time)` - Jump to position

## 🚀 Examples

### Fade and Move

```typescript
animate('.card')
  .to({
    opacity: 0,
    translateY: -50
  })
  .duration(500)
  .easing('easeInOutCubic')
  .play()
```

### Staggered Animation

```typescript
timeline()
  .add('.item-1', { scale: 1.2 })
  .add('.item-2', { scale: 1.2 }, '+=100')
  .add('.item-3', { scale: 1.2 }, '+=100')
  .play()
```

## 🤝 Contributing

Found a bug? Want to add a feature? Contributions are welcome! Check out our [GitHub repo](https://github.com/utkarsh5026/mayonation).

## 📝 License

MIT © [Utkarsh Priyadarshi](https://github.com/utkarsh5026)

---

Made with ❤️ for smooth animations

