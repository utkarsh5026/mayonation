# Mayonation

Welcome to Mayonation, a lightweight and performant animation library for the web. This library is designed to make animating HTML elements simple and efficient, providing a powerful API to enhance your web projects. I developed this project as a learning project for animations.

**See the [live preview](https://utkarsh5026.github.io/mayosite/). 🚀**

![Tests](https://github.com/utkarsh5026/mayonation/actions/workflows/test.yml/badge.svg)


## Features

- **High-performance Transform Animations**: Easily animate properties like translate, rotate, and scale.
- **CSS Property Animations**: Animate properties such as opacity, colors, and dimensions.
- **Customizable Easing Functions**: Choose from a variety of easing functions for smooth animations.
- **Multiple Targets**: Animate multiple elements simultaneously.
- **Lifecycle Hooks**: Utilize hooks for animation start, update, and completion events.
- **Pause, Resume, and Destroy Controls**: Manage your animations with ease.

## Installation

You can install Mayonation via npm:

```bash
npm install mayonation
```

Or, if you prefer yarn:

```bash
yarn add mayonation
```

## Usage

Here's a quick example to get you started:

```typescript
import { Animation } from 'mayonation';

const element = document.querySelector('.my-element');

const animation = new Animation(element, {
  translateX: 100,
  opacity: 0.5,
  duration: 1000,
  easing: 'easeInOut'
});

animation.play();
```

## API

### `Animation`

- **Constructor**: `new Animation(targets, properties, options)`

  - `targets`: HTMLElement or array of HTMLElements to animate.
  - `properties`: Object defining the properties and target values to animate.
  - `options`: Configuration options including duration, delay, easing, and lifecycle callbacks.
- **Methods**:

  - `play()`: Starts or resumes the animation.
  - `pause()`: Pauses the animation.
  - `resume()`: Resumes a paused animation.
  - `destroy()`: Cleans up resources used by the animation.

### Options

- `duration`: Duration of the animation in milliseconds.
- `delay`: Delay before the animation starts in milliseconds.
- `easing`: Easing function name or custom function.
- `onComplete`: Callback function when the animation completes.
- `onStart`: Callback function when the animation starts.
- `onUpdate`: Callback function on each animation frame.

## Contributing

Contributions are welcome! Feel free to fork the repository and submit pull requests. Whether it's bug fixes, feature requests, or documentation improvements, your input is appreciated.

## License

This project is licensed under the MIT License.

---

I hope you find this library useful in your projects. Happy animating! 🎨

---

Feel free to adjust the content to better fit your style or add any additional information you think is necessary.

