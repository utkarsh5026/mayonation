<div align="center">

# 🎨 Mayonation

A lightweight and performant animation library for the web

[![Tests](https://github.com/utkarsh5026/mayonation/actions/workflows/test.yml/badge.svg)](https://github.com/utkarsh5026/mayonation/actions)
[![npm version](https://badge.fury.io/js/mayonation.svg)](https://www.npmjs.com/package/mayonation)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[Demo](https://utkarsh5026.github.io/mayosite/) • [Documentation](#-api-reference) • [Examples](#-examples)

</div>

## ✨ Features

- 🪶 **Lightweight** - Tiny footprint (<5kb gzipped)
- 🎯 **Simple API** - Intuitive chainable methods
- 🚀 **High Performance** - Optimized for 60fps animations
- 🎮 **Timeline Control** - Create complex animation sequences
- 🎨 **Flexible** - Animate CSS & SVG elements
- 📦 **TypeScript Ready** - Full type support included

## 📦 Installation

```bash
npm install mayonation
# or
yarn add mayonation
# or
pnpm add mayonation
```

## 🚀 Quick Start

### Timeline Animation

```typescript
import { timeline, animate } from 'mayonation'

// Sequential animations
timeline({ loop: true, precision: 1 })
  .add(animate({
    target: '.box1',
    translateX: 100,
    duration: 1000
  }))
  .add(animate({
    target: '.box2',
    scale: 2
  }), '+=500')  // Starts 500ms after previous
  .add(animate({
    target: '.box3',
    opacity: 0
  }), 2000)     // Starts at 2000ms
  .play()
```

### SVG Drawing Animation

```typescript
import { draw, trace } from 'mayonation'

// Draw SVG path
timeline()
  .add(draw({
    target: '#my-path',
    duration: 1000
  }))
  .play()

// Trace SVG path
timeline()
  .add(trace({
    target: '#my-path',
    duration: 1000
  }))
  .play()
```

## 🌟 Examples

### Basic Timeline

```typescript
timeline()
  .add(animate({
    target: '.element',
    translateX: 100,
    duration: 1000
  }))
  .play()
```

### SVG Animation

```typescript
timeline()
  .add(draw({
    target: '#svg-path',
    duration: 2000
  }))
  .add(trace({
    target: '#svg-path',
    duration: 1000
  }), '+=500')
  .play()
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

MIT © [Utkarsh Priyadarshi](https://github.com/utkarsh5026)

---

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/utkarsh5026">Utkarsh Priyadarshi</a></sub>
</div>
