# 🚀 Mayonation Performance Benchmarks

Comprehensive performance testing and benchmarking suite for the Mayonation animation library.

## 📊 Overview

This benchmarking system provides:

- **Performance Metrics**: Track execution times, memory usage, and frame rates
- **Library Comparisons**: Compare against GSAP, Anime.js, Framer Motion, and others
- **Runtime Monitoring**: Real-time performance tracking during animations
- **Visual Reports**: Generate HTML reports with charts and analysis
- **Regression Testing**: Compare current performance against baselines

## 🏃‍♂️ Quick Start

### Run All Benchmarks
```bash
npm run benchmark
```

### Run Specific Benchmark
```bash
npm run benchmark:single "Transform Calculations"
```

### Library Comparison
```bash
npm run benchmark:compare
```

### Real-time Performance Profiling
```bash
npm run benchmark:profile
```

### Generate HTML Reports
```bash
npm run benchmark:report benchmarks/results/latest-results.json
```

## 📁 Structure

```
benchmarks/
├── framework.js           # Core benchmarking framework
├── animation-benchmarks.js # Animation-specific tests
├── library-comparison.js  # Cross-library performance comparison
├── reporter.js            # HTML report generation
├── results/               # Benchmark results storage
├── reports/               # Generated HTML reports
└── README.md             # This file
```

## 🧪 Available Benchmarks

### Animation Performance Tests

1. **Basic Animation Creation** - Tests animation object instantiation
2. **Property Updates** - Measures DOM property update performance
3. **Transform Calculations** - Benchmarks transform matrix calculations
4. **Color Interpolation** - Tests color space conversions and blending
5. **Easing Calculations** - Measures easing function performance
6. **Timeline Operations** - Tests timeline management and synchronization
7. **Memory Allocation** - Tracks memory usage patterns
8. **Batch Updates** - Tests bulk property update performance
9. **Style Parsing** - Measures CSS/style string parsing speed

### Library Comparison Tests

Compares Mayonation against:
- **GSAP** - Industry standard animation library
- **Anime.js** - Lightweight animation library
- **Framer Motion** - React-focused animation library
- **Web Animations API** - Native browser animations

## 🔧 Command Line Interface

### Animation Benchmarks

```bash
# Run all animation benchmarks
node benchmarks/animation-benchmarks.js run

# Run specific benchmark
node benchmarks/animation-benchmarks.js single "Benchmark Name"

# Real-time profiling
node benchmarks/animation-benchmarks.js profile [duration-ms]

# Compare with baseline
node benchmarks/animation-benchmarks.js compare path/to/baseline.json
```

### Library Comparison

```bash
# Run library comparison
node benchmarks/library-comparison.js
```

### Report Generation

```bash
# Generate HTML report
node benchmarks/reporter.js html results/benchmark-results.json [output-name]

# Generate comparison report
node benchmarks/reporter.js compare current.json baseline.json [output-name]
```

## 📈 Performance Monitoring

### Runtime Performance Monitor

```typescript
import { PerformanceMonitor, getPerformanceMonitor } from './src/core/performance-monitor';

// Create monitor
const monitor = new PerformanceMonitor({
  enabled: true,
  sampleInterval: 1000,
  trackFrameRate: true,
  trackMemory: true
});

// Start monitoring
monitor.start();

// Your animation code here...

// Stop and generate report
monitor.stop();
const report = monitor.generateReport();
```

### Performance Decorator

```typescript
import { performanceTrack } from './src/core/performance-monitor';

class MyAnimator {
  @performanceTrack('Animation Update')
  updateAnimation() {
    // Animation logic
  }
}
```

### Subscription to Performance Updates

```typescript
const monitor = getPerformanceMonitor();

const unsubscribe = monitor.subscribe((metrics) => {
  console.log(`FPS: ${metrics.frameRate}, Memory: ${metrics.memoryUsage}MB`);
  
  if (metrics.frameRate < 30) {
    console.warn('Performance degraded!');
  }
});

// Later: unsubscribe()
```

## 📊 Understanding Reports

### Performance Grades
- **A**: Excellent (55+ FPS, no dropped frames)
- **B**: Good (45+ FPS, minimal drops)
- **C**: Fair (30+ FPS, some drops)
- **D**: Poor (20+ FPS, frequent drops)
- **F**: Very Poor (<20 FPS, major issues)

### Benchmark Categories
- **Excellent**: < 5ms execution time
- **Good**: 5-15ms execution time
- **Fair**: 15-50ms execution time
- **Poor**: > 50ms execution time

### Memory Usage Guidelines
- **Normal**: < 20MB
- **Elevated**: 20-50MB
- **High**: 50-100MB
- **Critical**: > 100MB

## 🎯 Performance Optimization Tips

Based on benchmark results, consider these optimizations:

### High Priority
- **Slow Operations**: Optimize operations > 50ms
- **Memory Leaks**: Fix continuously growing memory usage
- **Frame Drops**: Address operations causing dropped frames

### Medium Priority
- **Variance Issues**: Reduce inconsistent performance
- **Memory Spikes**: Implement object pooling
- **Batch Operations**: Group DOM updates

### Low Priority
- **Micro-optimizations**: Fine-tune already fast operations
- **Caching**: Add caching for repeated calculations

## 🔄 Continuous Integration

### GitHub Actions Example

```yaml
name: Performance Benchmarks

on: [push, pull_request]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run benchmark
      - run: npm run benchmark:compare
      - uses: actions/upload-artifact@v3
        with:
          name: benchmark-reports
          path: benchmarks/reports/
```

### Baseline Management

```bash
# Create baseline after major optimizations
cp benchmarks/results/latest-results.json benchmarks/baselines/v1.0-baseline.json

# Compare against baseline
npm run benchmark
node benchmarks/animation-benchmarks.js compare benchmarks/baselines/v1.0-baseline.json
```

## 🧩 Custom Benchmarks

### Adding New Tests

```javascript
// In animation-benchmarks.js
this.suite.add('My Custom Test', () => {
  // Your test code here
  const result = performMyOperation();
  return result;
}, { iterations: 1000 });
```

### Creating Custom Suites

```javascript
const { BenchmarkSuite } = require('./framework');

const customSuite = new BenchmarkSuite('My Custom Suite');

customSuite.add('Test 1', () => {
  // Test implementation
});

customSuite.add('Test 2', () => {
  // Test implementation
});

customSuite.run().then(results => {
  console.log('Custom suite completed!');
  customSuite.printResults();
});
```

## 📝 Best Practices

### Running Benchmarks
1. **Close unnecessary applications** to reduce system noise
2. **Run multiple times** and average results
3. **Use consistent environment** (same browser, OS state)
4. **Allow warmup period** before measuring
5. **Monitor system resources** during tests

### Interpreting Results
1. **Focus on averages** rather than individual runs
2. **Watch for consistency** (low standard deviation)
3. **Compare relative performance** between tests
4. **Consider real-world scenarios** over micro-benchmarks
5. **Track trends** over time

### Performance Testing
1. **Test on target devices** (mobile, low-end hardware)
2. **Simulate realistic conditions** (network throttling, high CPU usage)
3. **Test edge cases** (many elements, complex animations)
4. **Validate across browsers** (Chrome, Firefox, Safari)
5. **Monitor memory usage** alongside execution time

## 🐛 Troubleshooting

### Common Issues

**Benchmarks fail to run**
- Check Node.js version (requires 16+)
- Ensure all dependencies are installed
- Verify file paths are correct

**Inconsistent results**
- Close other applications
- Run benchmarks multiple times
- Check for background processes

**Memory issues**
- Increase Node.js heap size: `node --max-old-space-size=4096`
- Clean up test data between runs
- Monitor for memory leaks

**Report generation fails**
- Ensure output directory exists
- Check file permissions
- Verify JSON results are valid

## 📚 Additional Resources

- [Performance API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Performance)
- [Animation Performance Guide](https://web.dev/animations-guide/)
- [Chrome DevTools Performance](https://developers.google.com/web/tools/chrome-devtools/evaluate-performance)
- [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)

## 🤝 Contributing

1. Add new benchmarks in `animation-benchmarks.js`
2. Update library comparisons in `library-comparison.js`
3. Enhance reporting in `reporter.js`
4. Document your changes in this README
5. Test benchmarks across different environments

---

For questions or issues, please check the [main project issues](https://github.com/utkarsh5026/mayonation/issues).