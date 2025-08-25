/**
 * Performance Benchmarking Framework for Mayonation
 * Provides comprehensive performance testing and comparison capabilities
 */

class PerformanceProfiler {
  constructor() {
    this.metrics = new Map();
    this.samples = new Map();
    this.isSupported = typeof performance !== 'undefined';
  }

  /**
   * Start performance measurement
   */
  start(label) {
    if (!this.isSupported) return;
    
    if (!this.metrics.has(label)) {
      this.metrics.set(label, {
        measurements: [],
        totalTime: 0,
        avgTime: 0,
        minTime: Infinity,
        maxTime: 0,
        count: 0
      });
    }

    this.samples.set(label, {
      startTime: performance.now(),
      startMemory: this.getMemoryUsage()
    });
  }

  /**
   * End performance measurement
   */
  end(label) {
    if (!this.isSupported || !this.samples.has(label)) return;

    const sample = this.samples.get(label);
    const endTime = performance.now();
    const endMemory = this.getMemoryUsage();
    
    const duration = endTime - sample.startTime;
    const memoryDelta = endMemory - sample.startMemory;

    const metric = this.metrics.get(label);
    metric.measurements.push({
      duration,
      memoryDelta,
      timestamp: Date.now()
    });
    
    metric.totalTime += duration;
    metric.count++;
    metric.avgTime = metric.totalTime / metric.count;
    metric.minTime = Math.min(metric.minTime, duration);
    metric.maxTime = Math.max(metric.maxTime, duration);

    this.samples.delete(label);
    return duration;
  }

  /**
   * Get memory usage (if available)
   */
  getMemoryUsage() {
    if (typeof performance.memory !== 'undefined') {
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Get FPS measurement
   */
  measureFPS(callback, duration = 1000) {
    return new Promise((resolve) => {
      let frameCount = 0;
      let lastTime = performance.now();
      const startTime = lastTime;
      
      const frame = (currentTime) => {
        frameCount++;
        
        if (currentTime - startTime >= duration) {
          const fps = Math.round((frameCount * 1000) / (currentTime - startTime));
          resolve(fps);
          return;
        }
        
        callback();
        requestAnimationFrame(frame);
      };
      
      requestAnimationFrame(frame);
    });
  }

  /**
   * Benchmark function execution
   */
  async benchmark(label, fn, iterations = 100) {
    const results = [];
    
    // Warmup
    for (let i = 0; i < 10; i++) {
      await fn();
    }
    
    // Actual benchmark
    for (let i = 0; i < iterations; i++) {
      this.start(`${label}_iteration`);
      await fn();
      const duration = this.end(`${label}_iteration`);
      results.push(duration);
    }

    const sorted = results.sort((a, b) => a - b);
    const sum = results.reduce((a, b) => a + b, 0);
    
    return {
      label,
      iterations,
      avg: sum / iterations,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      results
    };
  }

  /**
   * Get all metrics
   */
  getMetrics() {
    const result = {};
    for (const [label, metric] of this.metrics) {
      result[label] = { ...metric };
    }
    return result;
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics.clear();
    this.samples.clear();
  }

  /**
   * Generate report
   */
  generateReport() {
    const metrics = this.getMetrics();
    const report = {
      timestamp: new Date().toISOString(),
      environment: this.getEnvironmentInfo(),
      metrics: {},
      summary: {
        totalMeasurements: 0,
        avgExecutionTime: 0,
        totalExecutionTime: 0
      }
    };

    let totalTime = 0;
    let totalCount = 0;

    for (const [label, metric] of Object.entries(metrics)) {
      report.metrics[label] = {
        ...metric,
        avgTimeFormatted: `${metric.avgTime.toFixed(2)}ms`,
        minTimeFormatted: `${metric.minTime.toFixed(2)}ms`,
        maxTimeFormatted: `${metric.maxTime.toFixed(2)}ms`,
        totalTimeFormatted: `${metric.totalTime.toFixed(2)}ms`
      };

      totalTime += metric.totalTime;
      totalCount += metric.count;
    }

    report.summary.totalMeasurements = totalCount;
    report.summary.totalExecutionTime = totalTime;
    report.summary.avgExecutionTime = totalCount > 0 ? totalTime / totalCount : 0;

    return report;
  }

  /**
   * Get environment information
   */
  getEnvironmentInfo() {
    const info = {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node.js',
      platform: typeof navigator !== 'undefined' ? navigator.platform : process.platform,
      timestamp: Date.now()
    };

    if (typeof performance.memory !== 'undefined') {
      info.memory = {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      };
    }

    return info;
  }
}

// Benchmark Suite
class BenchmarkSuite {
  constructor(name) {
    this.name = name;
    this.profiler = new PerformanceProfiler();
    this.benchmarks = new Map();
    this.results = [];
  }

  /**
   * Add a benchmark
   */
  add(name, fn, options = {}) {
    this.benchmarks.set(name, {
      fn,
      iterations: options.iterations || 100,
      warmup: options.warmup || 10,
      async: options.async || false
    });
    return this;
  }

  /**
   * Run all benchmarks
   */
  async run() {
    console.log(`🚀 Running benchmark suite: ${this.name}`);
    console.log('='.repeat(60));

    for (const [name, benchmark] of this.benchmarks) {
      console.log(`⏱️  Running: ${name}...`);
      
      try {
        const result = await this.profiler.benchmark(
          name, 
          benchmark.fn, 
          benchmark.iterations
        );
        
        this.results.push(result);
        console.log(`✅ ${name}: ${result.avg.toFixed(2)}ms avg (${result.iterations} iterations)`);
      } catch (error) {
        console.error(`❌ ${name} failed:`, error.message);
        this.results.push({
          label: name,
          error: error.message,
          failed: true
        });
      }
    }

    return this.generateReport();
  }

  /**
   * Generate comprehensive report
   */
  generateReport() {
    const report = {
      suite: this.name,
      timestamp: new Date().toISOString(),
      environment: this.profiler.getEnvironmentInfo(),
      results: this.results,
      summary: this.generateSummary()
    };

    return report;
  }

  /**
   * Generate summary statistics
   */
  generateSummary() {
    const successful = this.results.filter(r => !r.failed);
    
    if (successful.length === 0) {
      return { message: 'No successful benchmarks' };
    }

    const avgTimes = successful.map(r => r.avg);
    const totalAvg = avgTimes.reduce((a, b) => a + b, 0) / avgTimes.length;
    
    const fastest = successful.reduce((prev, current) => 
      prev.avg < current.avg ? prev : current
    );
    
    const slowest = successful.reduce((prev, current) => 
      prev.avg > current.avg ? prev : current
    );

    return {
      totalBenchmarks: this.results.length,
      successful: successful.length,
      failed: this.results.length - successful.length,
      avgExecutionTime: totalAvg,
      fastest: fastest.label,
      slowest: slowest.label,
      speedDifference: `${(slowest.avg / fastest.avg).toFixed(2)}x`
    };
  }

  /**
   * Compare with baseline
   */
  compareWith(baseline) {
    const comparisons = [];
    
    for (const result of this.results) {
      if (result.failed) continue;
      
      const baselineResult = baseline.results.find(b => b.label === result.label);
      if (baselineResult && !baselineResult.failed) {
        const improvement = ((baselineResult.avg - result.avg) / baselineResult.avg) * 100;
        comparisons.push({
          benchmark: result.label,
          current: result.avg,
          baseline: baselineResult.avg,
          improvement: improvement,
          faster: improvement > 0
        });
      }
    }
    
    return comparisons;
  }

  /**
   * Print results to console
   */
  printResults() {
    const report = this.generateReport();
    
    console.log(`\n📊 BENCHMARK RESULTS - ${report.suite}`);
    console.log('='.repeat(70));
    console.log(`📅 Timestamp: ${new Date(report.timestamp).toLocaleString()}`);
    console.log(`🖥️  Environment: ${report.environment.userAgent}`);
    
    if (report.environment.memory) {
      const memory = report.environment.memory;
      console.log(`💾 Memory: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB used`);
    }
    
    console.log('\n📈 RESULTS:');
    console.log('-'.repeat(70));
    console.log('Benchmark'.padEnd(30) + 'Avg (ms)'.padStart(12) + 'Min (ms)'.padStart(12) + 'Max (ms)'.padStart(12));
    console.log('-'.repeat(70));
    
    for (const result of report.results) {
      if (result.failed) {
        console.log(`❌ ${result.label.padEnd(29)} FAILED: ${result.error}`);
      } else {
        console.log(
          `${result.label.padEnd(30)} ${result.avg.toFixed(2).padStart(8)} ${result.min.toFixed(2).padStart(8)} ${result.max.toFixed(2).padStart(8)}`
        );
      }
    }
    
    console.log('\n📊 SUMMARY:');
    console.log('-'.repeat(30));
    const summary = report.summary;
    console.log(`Total Benchmarks: ${summary.totalBenchmarks}`);
    console.log(`Successful: ${summary.successful}`);
    if (summary.failed > 0) console.log(`Failed: ${summary.failed}`);
    if (!summary.message) {
      console.log(`Average Execution: ${summary.avgExecutionTime.toFixed(2)}ms`);
      console.log(`Fastest: ${summary.fastest}`);
      console.log(`Slowest: ${summary.slowest}`);
      console.log(`Speed Difference: ${summary.speedDifference}`);
    }
    
    console.log('\n' + '='.repeat(70));
  }
}

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PerformanceProfiler, BenchmarkSuite };
} else if (typeof window !== 'undefined') {
  window.PerformanceProfiler = PerformanceProfiler;
  window.BenchmarkSuite = BenchmarkSuite;
}