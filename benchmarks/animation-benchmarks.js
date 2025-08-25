/**
 * Animation Performance Benchmarks for Mayonation
 * Tests various animation scenarios and performance characteristics
 */

// Import the benchmarking framework
const { BenchmarkSuite, PerformanceProfiler } = require('./framework');

// Mock DOM environment for Node.js testing
if (typeof document === 'undefined') {
  global.document = {
    createElement: () => ({
      style: {},
      setAttribute: () => {},
      getBoundingClientRect: () => ({ width: 100, height: 100, top: 0, left: 0 })
    }),
    querySelectorAll: () => [],
    body: { appendChild: () => {} }
  };
  
  global.window = {
    getComputedStyle: () => ({ fontSize: '16px' }),
    requestAnimationFrame: (cb) => setTimeout(cb, 16)
  };
  
  global.requestAnimationFrame = global.window.requestAnimationFrame;
}

// Animation Performance Tests
class AnimationBenchmarks {
  constructor() {
    this.suite = new BenchmarkSuite('Mayonation Animation Performance');
    this.profiler = new PerformanceProfiler();
    this.setupBenchmarks();
  }

  /**
   * Create test elements
   */
  createTestElements(count = 100) {
    const elements = [];
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.style.position = 'absolute';
      el.style.width = '50px';
      el.style.height = '50px';
      el.style.backgroundColor = 'red';
      el.style.left = `${i * 60}px`;
      el.style.top = '0px';
      elements.push(el);
    }
    return elements;
  }

  /**
   * Setup all benchmark tests
   */
  setupBenchmarks() {
    // Basic Animation Creation
    this.suite.add('Basic Animation Creation', () => {
      const elements = this.createTestElements(10);
      const animations = [];
      
      for (const el of elements) {
        // Mock animation creation (replace with actual Mayonation code)
        const animation = {
          element: el,
          properties: { x: 100, opacity: 0.5 },
          duration: 1000
        };
        animations.push(animation);
      }
      
      return animations;
    }, { iterations: 1000 });

    // Property Updates
    this.suite.add('Property Updates', () => {
      const element = this.createTestElements(1)[0];
      
      // Simulate property updates
      element.style.transform = 'translateX(100px)';
      element.style.opacity = '0.8';
      element.style.backgroundColor = 'blue';
      
      return element;
    }, { iterations: 5000 });

    // Transform Calculations
    this.suite.add('Transform Calculations', () => {
      const transforms = [];
      
      for (let i = 0; i < 100; i++) {
        const transform = {
          translateX: Math.sin(i * 0.1) * 100,
          translateY: Math.cos(i * 0.1) * 50,
          rotate: i * 2,
          scale: 1 + Math.sin(i * 0.05) * 0.2
        };
        
        // Simulate transform string generation
        const transformString = `translateX(${transform.translateX}px) translateY(${transform.translateY}px) rotate(${transform.rotate}deg) scale(${transform.scale})`;
        transforms.push(transformString);
      }
      
      return transforms;
    }, { iterations: 1000 });

    // Color Interpolation
    this.suite.add('Color Interpolation', () => {
      const colors = [];
      
      for (let i = 0; i < 100; i++) {
        const progress = i / 99;
        
        // RGB interpolation
        const r = Math.round(255 * (1 - progress) + 0 * progress);
        const g = Math.round(0 * (1 - progress) + 255 * progress);
        const b = Math.round(0 * (1 - progress) + 0 * progress);
        
        colors.push(`rgb(${r}, ${g}, ${b})`);
      }
      
      return colors;
    }, { iterations: 2000 });

    // Easing Function Calculations
    this.suite.add('Easing Calculations', () => {
      const easings = [];
      
      for (let i = 0; i <= 100; i++) {
        const t = i / 100;
        
        // Test various easing functions
        const linear = t;
        const easeIn = t * t;
        const easeOut = 1 - (1 - t) * (1 - t);
        const easeInOut = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        
        easings.push({ linear, easeIn, easeOut, easeInOut });
      }
      
      return easings;
    }, { iterations: 3000 });

    // Timeline Management
    this.suite.add('Timeline Operations', () => {
      const timeline = {
        animations: [],
        currentTime: 0,
        duration: 2000
      };
      
      // Add animations to timeline
      for (let i = 0; i < 20; i++) {
        timeline.animations.push({
          startTime: i * 100,
          duration: 1000,
          properties: { x: i * 50 }
        });
      }
      
      // Simulate timeline updates
      for (let time = 0; time <= timeline.duration; time += 16) {
        timeline.currentTime = time;
        
        // Calculate active animations
        const activeAnimations = timeline.animations.filter(anim => 
          time >= anim.startTime && time <= anim.startTime + anim.duration
        );
        
        // Update properties
        activeAnimations.forEach(anim => {
          const progress = (time - anim.startTime) / anim.duration;
          anim.currentX = anim.properties.x * progress;
        });
      }
      
      return timeline;
    }, { iterations: 500 });

    // Memory Allocation Test
    this.suite.add('Memory Allocation', () => {
      const objects = [];
      
      // Create many objects to test memory allocation
      for (let i = 0; i < 1000; i++) {
        objects.push({
          element: { id: i },
          properties: { x: i, y: i * 2, rotation: i * 0.5 },
          startTime: Date.now(),
          duration: 1000 + i
        });
      }
      
      // Clean up
      objects.length = 0;
      
      return objects.length;
    }, { iterations: 100 });

    // Batch Updates
    this.suite.add('Batch Updates', () => {
      const elements = this.createTestElements(50);
      
      // Simulate batch property updates
      const updates = [];
      
      for (let i = 0; i < elements.length; i++) {
        updates.push({
          element: elements[i],
          properties: {
            transform: `translateX(${i * 10}px)`,
            opacity: 1 - (i / elements.length)
          }
        });
      }
      
      // Apply updates in batch
      updates.forEach(update => {
        Object.assign(update.element.style, update.properties);
      });
      
      return updates.length;
    }, { iterations: 1000 });

    // Style Parser Performance
    this.suite.add('Style Parsing', () => {
      const styleStrings = [
        'translate(100px, 50px) rotate(45deg) scale(1.2)',
        'rgb(255, 128, 0)',
        'rgba(255, 0, 0, 0.5)',
        'hsl(240, 100%, 50%)',
        '#ff0000',
        '10px 20px 5px rgba(0,0,0,0.3)',
        'linear-gradient(45deg, red, blue)'
      ];
      
      const parsed = [];
      
      for (const style of styleStrings) {
        // Mock parsing logic
        const result = {
          original: style,
          type: style.includes('translate') ? 'transform' : 
                style.includes('rgb') ? 'color' : 
                style.includes('#') ? 'color' : 'other',
          parsed: true
        };
        parsed.push(result);
      }
      
      return parsed;
    }, { iterations: 2000 });
  }

  /**
   * Run all benchmarks
   */
  async run() {
    const results = await this.suite.run();
    this.suite.printResults();
    
    // Save results to file
    const fs = require('fs');
    const path = require('path');
    
    const outputPath = path.join(__dirname, 'results', `animation-benchmark-${Date.now()}.json`);
    
    // Ensure results directory exists
    if (!fs.existsSync(path.dirname(outputPath))) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Results saved to: ${outputPath}`);
    
    return results;
  }

  /**
   * Run specific benchmark
   */
  async runSingle(benchmarkName) {
    const benchmark = this.suite.benchmarks.get(benchmarkName);
    if (!benchmark) {
      console.error(`❌ Benchmark "${benchmarkName}" not found`);
      return null;
    }
    
    console.log(`🎯 Running single benchmark: ${benchmarkName}`);
    const result = await this.profiler.benchmark(
      benchmarkName, 
      benchmark.fn, 
      benchmark.iterations
    );
    
    console.log(`✅ ${benchmarkName}: ${result.avg.toFixed(2)}ms avg`);
    return result;
  }

  /**
   * Profile animation performance in real-time
   */
  profileRealTime(duration = 5000) {
    console.log(`🔄 Starting real-time profiling for ${duration}ms...`);
    
    const startTime = Date.now();
    const frameData = [];
    let frameCount = 0;
    
    const frame = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      
      if (elapsed >= duration) {
        const avgFPS = Math.round((frameCount * 1000) / elapsed);
        console.log(`📊 Real-time profiling complete:`);
        console.log(`   Total frames: ${frameCount}`);
        console.log(`   Average FPS: ${avgFPS}`);
        console.log(`   Frame drops: ${frameData.filter(f => f.delta > 20).length}`);
        return;
      }
      
      // Simulate animation work
      const frameStart = performance.now();
      
      // Mock heavy animation calculations
      for (let i = 0; i < 100; i++) {
        Math.sin(elapsed * 0.001 + i) * Math.cos(elapsed * 0.001 + i);
      }
      
      const frameEnd = performance.now();
      const frameDelta = frameEnd - frameStart;
      
      frameData.push({
        frame: frameCount,
        delta: frameDelta,
        timestamp: currentTime
      });
      
      frameCount++;
      requestAnimationFrame(frame);
    };
    
    requestAnimationFrame(frame);
  }

  /**
   * Compare with baseline results
   */
  compareWithBaseline(baselineFile) {
    try {
      const fs = require('fs');
      const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
      
      console.log('📈 Comparing with baseline...');
      const comparisons = this.suite.compareWith(baseline);
      
      console.log('\n🔍 PERFORMANCE COMPARISON:');
      console.log('-'.repeat(70));
      console.log('Benchmark'.padEnd(30) + 'Current'.padStart(10) + 'Baseline'.padStart(10) + 'Change'.padStart(10));
      console.log('-'.repeat(70));
      
      for (const comp of comparisons) {
        const changeStr = comp.faster ? 
          `+${comp.improvement.toFixed(1)}%` : 
          `${comp.improvement.toFixed(1)}%`;
        const indicator = comp.faster ? '⚡' : '🐌';
        
        console.log(
          `${indicator} ${comp.benchmark.padEnd(28)} ${comp.current.toFixed(2).padStart(8)}ms ${comp.baseline.toFixed(2).padStart(8)}ms ${changeStr.padStart(8)}`
        );
      }
      
      return comparisons;
    } catch (error) {
      console.error(`❌ Could not load baseline file: ${error.message}`);
      return null;
    }
  }
}

// CLI interface
if (require.main === module) {
  const benchmarks = new AnimationBenchmarks();
  
  const command = process.argv[2];
  const arg = process.argv[3];
  
  switch (command) {
    case 'run':
      benchmarks.run();
      break;
    case 'single':
      if (!arg) {
        console.error('❌ Please specify benchmark name');
        process.exit(1);
      }
      benchmarks.runSingle(arg);
      break;
    case 'profile':
      const duration = arg ? parseInt(arg) : 5000;
      benchmarks.profileRealTime(duration);
      break;
    case 'compare':
      if (!arg) {
        console.error('❌ Please specify baseline file path');
        process.exit(1);
      }
      benchmarks.compareWithBaseline(arg);
      break;
    default:
      console.log(`
🚀 Mayonation Animation Benchmarks

Usage:
  node benchmarks/animation-benchmarks.js <command> [args]

Commands:
  run                           Run all benchmarks
  single <benchmark-name>       Run specific benchmark
  profile [duration-ms]         Profile real-time performance
  compare <baseline-file>       Compare with baseline results

Examples:
  node benchmarks/animation-benchmarks.js run
  node benchmarks/animation-benchmarks.js single "Transform Calculations"
  node benchmarks/animation-benchmarks.js profile 3000
  node benchmarks/animation-benchmarks.js compare results/baseline.json
      `);
  }
}

module.exports = AnimationBenchmarks;