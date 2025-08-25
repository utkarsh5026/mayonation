/**
 * Runtime Performance Monitor for Mayonation
 * Tracks performance metrics during animation execution
 */

export interface PerformanceMetrics {
  frameRate: number;
  frameDuration: number;
  memoryUsage: number;
  animationCount: number;
  droppedFrames: number;
  averageFrameTime: number;
  timestamp: number;
}

export interface PerformanceConfig {
  enabled: boolean;
  sampleInterval: number; // milliseconds
  maxSamples: number;
  trackMemory: boolean;
  trackFrameRate: boolean;
  warnThreshold: number; // frame time in ms
}

export class PerformanceMonitor {
  private config: PerformanceConfig;
  private metrics: PerformanceMetrics[] = [];
  private frameData: number[] = [];
  private lastFrameTime: number = 0;
  private animationCount: number = 0;
  private droppedFrames: number = 0;
  private isRunning: boolean = false;
  private animationId: number = 0;
  private observers: Array<(metrics: PerformanceMetrics) => void> = [];
  
  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      enabled: true,
      sampleInterval: 1000,
      maxSamples: 100,
      trackMemory: true,
      trackFrameRate: true,
      warnThreshold: 16.67, // 60fps threshold
      ...config
    };
  }

  /**
   * Start performance monitoring
   */
  start(): void {
    if (!this.config.enabled || this.isRunning) return;
    
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.frameData = [];
    this.droppedFrames = 0;
    
    if (this.config.trackFrameRate) {
      this.startFrameTracking();
    }
    
    // Start periodic sampling
    this.startPeriodicSampling();
    
    console.log('📊 Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
    
    console.log('⏹️ Performance monitoring stopped');
    this.generateReport();
  }

  /**
   * Track animation start
   */
  trackAnimationStart(): void {
    this.animationCount++;
  }

  /**
   * Track animation end
   */
  trackAnimationEnd(): void {
    if (this.animationCount > 0) {
      this.animationCount--;
    }
  }

  /**
   * Start frame rate tracking
   */
  private startFrameTracking(): void {
    const trackFrame = (currentTime: number) => {
      if (!this.isRunning) return;
      
      if (this.lastFrameTime > 0) {
        const frameDuration = currentTime - this.lastFrameTime;
        this.frameData.push(frameDuration);
        
        // Check for dropped frames
        if (frameDuration > this.config.warnThreshold * 2) {
          this.droppedFrames++;
        }
        
        // Limit frame data array size
        if (this.frameData.length > 60) {
          this.frameData.shift();
        }
      }
      
      this.lastFrameTime = currentTime;
      this.animationId = requestAnimationFrame(trackFrame);
    };
    
    this.animationId = requestAnimationFrame(trackFrame);
  }

  /**
   * Start periodic sampling
   */
  private startPeriodicSampling(): void {
    const sample = () => {
      if (!this.isRunning) return;
      
      const metrics = this.getCurrentMetrics();
      this.addMetrics(metrics);
      
      // Notify observers
      this.notifyObservers(metrics);
      
      setTimeout(sample, this.config.sampleInterval);
    };
    
    setTimeout(sample, this.config.sampleInterval);
  }

  /**
   * Get current performance metrics
   */
  private getCurrentMetrics(): PerformanceMetrics {
    const now = performance.now();
    
    // Calculate frame rate
    const recentFrames = this.frameData.slice(-30); // Last 30 frames
    const avgFrameDuration = recentFrames.length > 0 
      ? recentFrames.reduce((a, b) => a + b, 0) / recentFrames.length 
      : 16.67;
    
    const frameRate = 1000 / avgFrameDuration;
    
    // Get memory usage
    const memoryUsage = this.getMemoryUsage();
    
    return {
      frameRate: Math.round(frameRate),
      frameDuration: avgFrameDuration,
      memoryUsage,
      animationCount: this.animationCount,
      droppedFrames: this.droppedFrames,
      averageFrameTime: avgFrameDuration,
      timestamp: now
    };
  }

  /**
   * Get memory usage if available
   */
  private getMemoryUsage(): number {
    if (!this.config.trackMemory) return 0;
    
    if (typeof (performance as any).memory !== 'undefined') {
      return (performance as any).memory.usedJSHeapSize;
    }
    
    return 0;
  }

  /**
   * Add metrics to history
   */
  private addMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);
    
    // Limit metrics array size
    if (this.metrics.length > this.config.maxSamples) {
      this.metrics.shift();
    }
  }

  /**
   * Subscribe to performance updates
   */
  subscribe(callback: (metrics: PerformanceMetrics) => void): () => void {
    this.observers.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.observers.indexOf(callback);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }

  /**
   * Notify observers of new metrics
   */
  private notifyObservers(metrics: PerformanceMetrics): void {
    this.observers.forEach(callback => {
      try {
        callback(metrics);
      } catch (error) {
        console.error('Performance observer error:', error);
      }
    });
  }

  /**
   * Get performance history
   */
  getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get current performance snapshot
   */
  getCurrentSnapshot(): PerformanceMetrics {
    return this.getCurrentMetrics();
  }

  /**
   * Clear metrics history
   */
  clearHistory(): void {
    this.metrics = [];
    this.frameData = [];
    this.droppedFrames = 0;
  }

  /**
   * Generate performance report
   */
  generateReport(): PerformanceReport {
    if (this.metrics.length === 0) {
      return {
        duration: 0,
        averageFrameRate: 0,
        averageMemoryUsage: 0,
        totalDroppedFrames: 0,
        samples: 0,
        summary: 'No performance data available'
      };
    }

    const duration = this.metrics[this.metrics.length - 1].timestamp - this.metrics[0].timestamp;
    const avgFrameRate = this.metrics.reduce((sum, m) => sum + m.frameRate, 0) / this.metrics.length;
    const avgMemoryUsage = this.metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / this.metrics.length;
    const totalDroppedFrames = Math.max(...this.metrics.map(m => m.droppedFrames));
    
    const minFrameRate = Math.min(...this.metrics.map(m => m.frameRate));
    const maxFrameRate = Math.max(...this.metrics.map(m => m.frameRate));
    
    const report: PerformanceReport = {
      duration,
      averageFrameRate: Math.round(avgFrameRate),
      minFrameRate,
      maxFrameRate,
      averageMemoryUsage: Math.round(avgMemoryUsage),
      totalDroppedFrames,
      samples: this.metrics.length,
      frameRateStability: this.calculateStability(),
      summary: this.generateSummary(avgFrameRate, totalDroppedFrames)
    };

    console.log('📈 Performance Report Generated:');
    console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`   Average FPS: ${report.averageFrameRate}`);
    console.log(`   Frame Rate Range: ${minFrameRate} - ${maxFrameRate} FPS`);
    console.log(`   Dropped Frames: ${totalDroppedFrames}`);
    console.log(`   Memory Usage: ${(avgMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Stability: ${report.frameRateStability}`);

    return report;
  }

  /**
   * Calculate frame rate stability
   */
  private calculateStability(): 'Excellent' | 'Good' | 'Fair' | 'Poor' {
    if (this.metrics.length < 2) return 'Poor';
    
    const frameRates = this.metrics.map(m => m.frameRate);
    const avg = frameRates.reduce((a, b) => a + b, 0) / frameRates.length;
    const variance = frameRates.reduce((sum, rate) => sum + Math.pow(rate - avg, 2), 0) / frameRates.length;
    const standardDeviation = Math.sqrt(variance);
    
    if (standardDeviation < 2) return 'Excellent';
    if (standardDeviation < 5) return 'Good';
    if (standardDeviation < 10) return 'Fair';
    return 'Poor';
  }

  /**
   * Generate summary text
   */
  private generateSummary(avgFrameRate: number, droppedFrames: number): string {
    if (avgFrameRate >= 55) {
      return droppedFrames === 0 
        ? 'Excellent performance - smooth animations'
        : 'Good performance with occasional frame drops';
    } else if (avgFrameRate >= 45) {
      return 'Acceptable performance - minor stuttering possible';
    } else if (avgFrameRate >= 30) {
      return 'Poor performance - noticeable stuttering';
    } else {
      return 'Very poor performance - animations may appear choppy';
    }
  }

  /**
   * Log performance warning
   */
  logWarning(message: string, metrics?: Partial<PerformanceMetrics>): void {
    if (!this.config.enabled) return;
    
    console.warn(`⚠️ Performance Warning: ${message}`, metrics || '');
  }

  /**
   * Check if performance is degraded
   */
  isPerformanceDegraded(): boolean {
    if (this.metrics.length === 0) return false;
    
    const recent = this.metrics.slice(-5); // Last 5 samples
    const avgFrameRate = recent.reduce((sum, m) => sum + m.frameRate, 0) / recent.length;
    
    return avgFrameRate < 45 || this.droppedFrames > 5;
  }

  /**
   * Get performance grade
   */
  getPerformanceGrade(): 'A' | 'B' | 'C' | 'D' | 'F' {
    const snapshot = this.getCurrentSnapshot();
    
    if (snapshot.frameRate >= 55 && this.droppedFrames === 0) return 'A';
    if (snapshot.frameRate >= 45 && this.droppedFrames < 3) return 'B';
    if (snapshot.frameRate >= 30 && this.droppedFrames < 10) return 'C';
    if (snapshot.frameRate >= 20) return 'D';
    return 'F';
  }
}

export interface PerformanceReport {
  duration: number;
  averageFrameRate: number;
  minFrameRate?: number;
  maxFrameRate?: number;
  averageMemoryUsage: number;
  totalDroppedFrames: number;
  samples: number;
  frameRateStability?: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  summary: string;
}

// Global performance monitor instance
let globalMonitor: PerformanceMonitor | null = null;

/**
 * Get or create global performance monitor
 */
export function getPerformanceMonitor(config?: Partial<PerformanceConfig>): PerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor(config);
  }
  return globalMonitor;
}

/**
 * Performance decorator for methods
 */
export function performanceTrack(label: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const monitor = getPerformanceMonitor();
      const start = performance.now();
      
      try {
        const result = method.apply(this, args);
        
        // Handle async functions
        if (result && typeof result.then === 'function') {
          return result.finally(() => {
            const duration = performance.now() - start;
            if (duration > 16.67) {
              monitor.logWarning(`${label} took ${duration.toFixed(2)}ms`);
            }
          });
        }
        
        const duration = performance.now() - start;
        if (duration > 16.67) {
          monitor.logWarning(`${label} took ${duration.toFixed(2)}ms`);
        }
        
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        monitor.logWarning(`${label} failed after ${duration.toFixed(2)}ms`, { error: error.message });
        throw error;
      }
    };

    return descriptor;
  };
}