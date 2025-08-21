# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**Mayonation** is a lightweight, performant web animation library built in TypeScript. The library focuses on creating smooth animations for CSS properties, transforms, and SVG paths with a fluent Timeline API.

### Core Architecture

The codebase is structured around several key architectural patterns:

**Timeline System**: The central orchestration system (`src/timeline/`) manages complex animation sequences. Each timeline can contain multiple segments that run at different times, with support for sequential, parallel, and staggered animations.

**Keyframe Management**: The library uses a two-tier keyframe system (`src/keyframe/`) where raw keyframes are processed into optimized internal formats. This separation allows for efficient property interpolation while maintaining flexibility in the API.

**Property Animation System**: Located in `src/animations/`, this handles CSS property animations with specialized handlers for transforms (`transform/handler.ts`) and regular CSS properties (`css/handler.ts`). The transform system maintains proper matrix order (translate → rotate → scale) and uses optimized 3D transforms.

**SVG Path Animation**: The `src/svg/` module provides specialized handling for SVG path drawing and tracing animations, with path interpolation capabilities for smooth morphing between different path shapes.

**Animation Value System**: The core value system (`src/core/animation-val.ts`) provides strongly-typed value interpolation with unit handling, supporting numeric values with units (px, %, deg, etc.) and color values.

## Common Development Commands

### Building and Development
```bash
# Development with watch mode
npm run dev

# Production build
npm run build

# Clean build artifacts
npm run clean

# Build for publishing
npm run prepublishOnly
```

### Testing
```bash
# Run all tests
npm run test

# Run tests in watch mode  
npm run test:watch

# Run tests for specific file
npm run test -- transform_handler.test.ts

# Run tests matching pattern
npm run test -- --grep "Timeline"
```

### Development Server
```bash
# Serve demo/examples
npm run serve
# Opens http://localhost:5173/html/index.html
```

## Key Technical Details

### Animation Engine Architecture

The animation system uses `requestAnimationFrame` for smooth 60fps animations. The core loop calculates:
1. **Elapsed Time**: Based on `performance.now()` timestamps
2. **Progress Calculation**: Linear progress (0-1) over animation duration  
3. **Easing Application**: Mathematical functions transform linear progress
4. **Property Interpolation**: Calculate intermediate values for each animated property
5. **DOM Updates**: Apply calculated values to elements efficiently

### Transform System Details

The transform handler (`src/animations/transform/handler.ts`) maintains a specific matrix multiplication order to prevent visual artifacts:
- **Translate** operations first
- **Rotate** operations second  
- **Scale** operations last

This creates predictable animations where elements scale and rotate around their translated position.

### Timeline Positioning System

The timeline supports flexible positioning with these position types:
- `number`: Absolute time in milliseconds
- `"<"`: Start of timeline  
- `">"`: End of timeline
- `"+=500"`: 500ms after previous animation ends
- `"-=200"`: 200ms before previous animation ends

### Memory Management

The system properly handles cleanup:
- Cancels `requestAnimationFrame` calls on pause/stop
- Clears event listeners on destroy
- Resets element styles on animation reset
- Manages stagger timing to prevent memory leaks with many elements

## Testing Patterns

### Test Environment Setup
- Tests use **Vitest** with **jsdom** environment
- Fake timers with `vi.useFakeTimers()` for deterministic timing tests
- Mock `performance.now()` for controlled time progression

### Common Test Patterns
```typescript
// Timeline testing pattern
const timeline = new Timeline({});
const element = document.createElement('div');
timeline.add(element, { duration: 1000, opacity: 0 });

// Transform testing pattern  
const handler = new TransformHandler(element);
handler.updateTransform('translateX', createValue.numeric(100, 'px'));
expect(handler.computeTransform()).toBe('translate3d(100px, 0px, 0px)');

// Event testing pattern
const callback = vi.fn();
timeline.on('start', callback);
timeline.play();
expect(callback).toHaveBeenCalled();
```

### Property Interpolation Testing
The test suite extensively covers edge cases in property interpolation:
- **Scale interpolation**: Uses logarithmic interpolation for natural scaling
- **Rotation interpolation**: Handles angle wrapping and negative/positive transitions
- **Color interpolation**: RGB/HSL color space transitions
- **Unit handling**: Proper unit preservation and conversion

## Important Implementation Notes

### Performance Considerations
- **Transform Preference**: Use transforms and opacity for hardware acceleration
- **Batch Updates**: Property updates are batched to minimize reflow/repaint cycles  
- **3D Transforms**: Always uses `translate3d`, `scale3d`, etc. to trigger GPU acceleration
- **Precision Control**: Timeline precision option prevents unnecessary updates

### Browser Compatibility
- Uses `requestAnimationFrame` for smooth animations
- Leverages `performance.now()` for high-precision timing
- CSS transforms use 3D matrix operations for broad browser support
- No dependencies on polyfills - uses native browser APIs

### Extensibility Points
- **Easing Functions**: Located in `src/core/ease_fns.ts`, easily extendable
- **Property Handlers**: Animation properties can be extended via the handler system
- **Interpolators**: Value interpolation system in `src/utils/interpolators/` supports custom types

The codebase emphasizes performance, type safety, and maintainable architecture while providing a simple, powerful API for complex animations.
