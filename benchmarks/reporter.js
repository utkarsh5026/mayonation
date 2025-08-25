/**
 * Benchmark Results Reporter and Visualization
 * Generates HTML reports with charts and performance analysis
 */

const fs = require('fs');
const path = require('path');

class BenchmarkReporter {
  constructor() {
    this.outputDir = path.join(__dirname, 'reports');
    this.ensureOutputDir();
  }

  /**
   * Ensure output directory exists
   */
  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Generate HTML report from benchmark results
   */
  generateHTMLReport(results, outputName = null) {
    const reportName = outputName || `benchmark-report-${Date.now()}.html`;
    const reportPath = path.join(this.outputDir, reportName);

    const html = this.createHTMLReport(results);
    fs.writeFileSync(reportPath, html);

    console.log(`📄 HTML report generated: ${reportPath}`);
    return reportPath;
  }

  /**
   * Create HTML report content
   */
  createHTMLReport(results) {
    const chartData = this.prepareChartData(results);
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mayonation Performance Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        ${this.getReportStyles()}
    </style>
</head>
<body>
    <div class="container">
        <header class="report-header">
            <h1>🚀 Mayonation Performance Report</h1>
            <div class="report-meta">
                <span>Generated: ${new Date(results.timestamp).toLocaleString()}</span>
                <span class="suite-name">${results.suite || 'Performance Benchmarks'}</span>
            </div>
        </header>

        <div class="summary-cards">
            ${this.generateSummaryCards(results)}
        </div>

        <div class="charts-section">
            <div class="chart-container">
                <h2>📊 Performance Comparison</h2>
                <canvas id="performanceChart"></canvas>
            </div>
            
            <div class="chart-container">
                <h2>📈 Performance Distribution</h2>
                <canvas id="distributionChart"></canvas>
            </div>
        </div>

        <div class="detailed-results">
            <h2>📋 Detailed Results</h2>
            ${this.generateDetailedTable(results)}
        </div>

        ${results.environment ? this.generateEnvironmentInfo(results.environment) : ''}

        <div class="recommendations">
            <h2>💡 Performance Recommendations</h2>
            ${this.generateRecommendations(results)}
        </div>
    </div>

    <script>
        ${this.generateChartScript(chartData)}
    </script>
</body>
</html>`;
  }

  /**
   * Get CSS styles for the report
   */
  getReportStyles() {
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: white;
            margin-top: 20px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }

        .report-header {
            text-align: center;
            margin-bottom: 30px;
            padding: 30px 0;
            border-bottom: 3px solid #667eea;
        }

        .report-header h1 {
            font-size: 2.5rem;
            color: #333;
            margin-bottom: 10px;
        }

        .report-meta {
            display: flex;
            justify-content: center;
            gap: 30px;
            color: #666;
            font-size: 1rem;
        }

        .suite-name {
            font-weight: 600;
            color: #667eea;
        }

        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }

        .summary-card {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 25px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }

        .summary-card h3 {
            font-size: 1.2rem;
            margin-bottom: 10px;
            opacity: 0.9;
        }

        .summary-card .value {
            font-size: 2.2rem;
            font-weight: bold;
            margin-bottom: 5px;
        }

        .summary-card .unit {
            font-size: 0.9rem;
            opacity: 0.8;
        }

        .charts-section {
            margin-bottom: 40px;
        }

        .chart-container {
            background: #f8f9fa;
            padding: 25px;
            border-radius: 12px;
            margin-bottom: 30px;
        }

        .chart-container h2 {
            margin-bottom: 20px;
            color: #333;
        }

        .chart-container canvas {
            max-height: 400px;
        }

        .detailed-results {
            margin-bottom: 40px;
        }

        .results-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }

        .results-table thead {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
        }

        .results-table th,
        .results-table td {
            padding: 15px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }

        .results-table th {
            font-weight: 600;
            font-size: 1rem;
        }

        .results-table tbody tr:hover {
            background: #f8f9fa;
        }

        .status-passed {
            color: #28a745;
            font-weight: 600;
        }

        .status-failed {
            color: #dc3545;
            font-weight: 600;
        }

        .performance-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
        }

        .badge-excellent {
            background: #d4edda;
            color: #155724;
        }

        .badge-good {
            background: #d1ecf1;
            color: #0c5460;
        }

        .badge-fair {
            background: #fff3cd;
            color: #856404;
        }

        .badge-poor {
            background: #f8d7da;
            color: #721c24;
        }

        .environment-info {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 30px;
        }

        .environment-info h3 {
            margin-bottom: 15px;
            color: #333;
        }

        .env-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }

        .env-item {
            display: flex;
            justify-content: space-between;
            padding: 10px;
            background: white;
            border-radius: 6px;
        }

        .recommendations {
            background: #e8f4fd;
            padding: 25px;
            border-radius: 12px;
            border-left: 4px solid #667eea;
        }

        .recommendations h2 {
            margin-bottom: 20px;
            color: #333;
        }

        .recommendation {
            background: white;
            padding: 20px;
            margin-bottom: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }

        .recommendation h4 {
            color: #667eea;
            margin-bottom: 10px;
        }

        .recommendation-priority {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 15px;
            font-size: 0.8rem;
            font-weight: 600;
            margin-bottom: 10px;
        }

        .priority-high {
            background: #f8d7da;
            color: #721c24;
        }

        .priority-medium {
            background: #fff3cd;
            color: #856404;
        }

        .priority-low {
            background: #d4edda;
            color: #155724;
        }

        @media (max-width: 768px) {
            .container {
                margin: 10px;
                padding: 15px;
            }

            .report-header h1 {
                font-size: 2rem;
            }

            .report-meta {
                flex-direction: column;
                gap: 10px;
            }

            .summary-cards {
                grid-template-columns: 1fr;
            }

            .results-table {
                font-size: 0.9rem;
            }
        }
    `;
  }

  /**
   * Generate summary cards
   */
  generateSummaryCards(results) {
    const successful = results.results?.filter(r => !r.failed) || [];
    const avgTime = successful.length > 0 
      ? successful.reduce((sum, r) => sum + r.avg, 0) / successful.length 
      : 0;

    const fastest = successful.length > 0 
      ? Math.min(...successful.map(r => r.avg))
      : 0;

    const slowest = successful.length > 0 
      ? Math.max(...successful.map(r => r.avg))
      : 0;

    return `
        <div class="summary-card">
            <h3>Total Tests</h3>
            <div class="value">${results.results?.length || 0}</div>
        </div>
        <div class="summary-card">
            <h3>Successful</h3>
            <div class="value">${successful.length}</div>
        </div>
        <div class="summary-card">
            <h3>Average Time</h3>
            <div class="value">${avgTime.toFixed(2)}</div>
            <div class="unit">ms</div>
        </div>
        <div class="summary-card">
            <h3>Fastest</h3>
            <div class="value">${fastest.toFixed(2)}</div>
            <div class="unit">ms</div>
        </div>
    `;
  }

  /**
   * Generate detailed results table
   */
  generateDetailedTable(results) {
    if (!results.results || results.results.length === 0) {
      return '<p>No benchmark results available.</p>';
    }

    const rows = results.results.map(result => {
      if (result.failed) {
        return `
            <tr>
                <td>${result.label}</td>
                <td><span class="status-failed">FAILED</span></td>
                <td colspan="4">${result.error || 'Unknown error'}</td>
            </tr>
        `;
      }

      const badge = this.getPerformanceBadge(result.avg);

      return `
            <tr>
                <td>${result.label}</td>
                <td><span class="status-passed">PASSED</span></td>
                <td>${result.avg.toFixed(2)} ms</td>
                <td>${result.min.toFixed(2)} ms</td>
                <td>${result.max.toFixed(2)} ms</td>
                <td><span class="${badge.class}">${badge.text}</span></td>
            </tr>
        `;
    }).join('');

    return `
        <table class="results-table">
            <thead>
                <tr>
                    <th>Benchmark</th>
                    <th>Status</th>
                    <th>Average</th>
                    <th>Min</th>
                    <th>Max</th>
                    <th>Performance</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
  }

  /**
   * Get performance badge
   */
  getPerformanceBadge(avgTime) {
    if (avgTime < 5) return { class: 'performance-badge badge-excellent', text: 'Excellent' };
    if (avgTime < 15) return { class: 'performance-badge badge-good', text: 'Good' };
    if (avgTime < 50) return { class: 'performance-badge badge-fair', text: 'Fair' };
    return { class: 'performance-badge badge-poor', text: 'Poor' };
  }

  /**
   * Generate environment information
   */
  generateEnvironmentInfo(environment) {
    const envItems = [
      { label: 'User Agent', value: environment.userAgent || 'Unknown' },
      { label: 'Platform', value: environment.platform || 'Unknown' },
      { label: 'Memory Used', value: environment.memory 
        ? `${(environment.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`
        : 'N/A' },
      { label: 'Memory Limit', value: environment.memory 
        ? `${(environment.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
        : 'N/A' }
    ];

    const envGrid = envItems.map(item => `
        <div class="env-item">
            <strong>${item.label}:</strong>
            <span>${item.value}</span>
        </div>
    `).join('');

    return `
        <div class="environment-info">
            <h3>🖥️ Environment Information</h3>
            <div class="env-grid">
                ${envGrid}
            </div>
        </div>
    `;
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations(results) {
    const recommendations = this.analyzePerformance(results);

    if (recommendations.length === 0) {
      return '<p>✅ No performance issues detected. Great job!</p>';
    }

    return recommendations.map(rec => `
        <div class="recommendation">
            <span class="recommendation-priority priority-${rec.priority.toLowerCase()}">${rec.priority} PRIORITY</span>
            <h4>${rec.title}</h4>
            <p>${rec.description}</p>
            ${rec.solution ? `<p><strong>Solution:</strong> ${rec.solution}</p>` : ''}
        </div>
    `).join('');
  }

  /**
   * Analyze performance and generate recommendations
   */
  analyzePerformance(results) {
    const recommendations = [];
    const successful = results.results?.filter(r => !r.failed) || [];

    if (successful.length === 0) {
      return [{
        title: 'All Tests Failed',
        priority: 'HIGH',
        description: 'All benchmark tests failed. This indicates serious performance or implementation issues.',
        solution: 'Review the error messages and fix the underlying issues before running benchmarks again.'
      }];
    }

    // Check for slow operations
    const slowTests = successful.filter(r => r.avg > 50);
    if (slowTests.length > 0) {
      recommendations.push({
        title: 'Slow Operations Detected',
        priority: 'HIGH',
        description: `${slowTests.length} benchmark(s) are running slower than 50ms: ${slowTests.map(t => t.label).join(', ')}`,
        solution: 'Optimize these operations by reducing computational complexity, caching results, or using more efficient algorithms.'
      });
    }

    // Check for high variance
    const highVarianceTests = successful.filter(r => {
      const variance = r.max - r.min;
      return variance > r.avg * 0.5;
    });

    if (highVarianceTests.length > 0) {
      recommendations.push({
        title: 'High Performance Variance',
        priority: 'MEDIUM',
        description: `${highVarianceTests.length} benchmark(s) show high variance between min and max execution times.`,
        solution: 'Consider optimizing for consistent performance by avoiding conditional heavy operations or implementing object pooling.'
      });
    }

    // Check memory usage
    if (results.environment?.memory) {
      const memoryUsage = results.environment.memory.usedJSHeapSize / 1024 / 1024;
      if (memoryUsage > 50) {
        recommendations.push({
          title: 'High Memory Usage',
          priority: 'MEDIUM',
          description: `Memory usage is ${memoryUsage.toFixed(2)}MB, which may impact performance on low-memory devices.`,
          solution: 'Review memory allocation patterns and implement object pooling or lazy loading where appropriate.'
        });
      }
    }

    // Check for failed tests
    const failed = results.results?.filter(r => r.failed) || [];
    if (failed.length > 0) {
      recommendations.push({
        title: 'Failed Tests',
        priority: 'HIGH',
        description: `${failed.length} test(s) failed: ${failed.map(t => t.label).join(', ')}`,
        solution: 'Review and fix the errors in failed tests to get accurate performance metrics.'
      });
    }

    return recommendations;
  }

  /**
   * Prepare data for charts
   */
  prepareChartData(results) {
    const successful = results.results?.filter(r => !r.failed) || [];
    
    return {
      labels: successful.map(r => r.label),
      avgTimes: successful.map(r => r.avg),
      minTimes: successful.map(r => r.min),
      maxTimes: successful.map(r => r.max),
      colors: successful.map((_, i) => `hsl(${(i * 360 / successful.length)}, 70%, 60%)`)
    };
  }

  /**
   * Generate JavaScript for charts
   */
  generateChartScript(chartData) {
    return `
        // Performance Comparison Chart
        const perfCtx = document.getElementById('performanceChart').getContext('2d');
        new Chart(perfCtx, {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(chartData.labels)},
                datasets: [{
                    label: 'Average Time (ms)',
                    data: ${JSON.stringify(chartData.avgTimes)},
                    backgroundColor: ${JSON.stringify(chartData.colors)},
                    borderColor: ${JSON.stringify(chartData.colors)},
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Benchmark Execution Times'
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Time (milliseconds)'
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45
                        }
                    }
                }
            }
        });

        // Distribution Chart
        const distCtx = document.getElementById('distributionChart').getContext('2d');
        new Chart(distCtx, {
            type: 'line',
            data: {
                labels: ${JSON.stringify(chartData.labels)},
                datasets: [{
                    label: 'Min Time',
                    data: ${JSON.stringify(chartData.minTimes)},
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    fill: false
                }, {
                    label: 'Average Time',
                    data: ${JSON.stringify(chartData.avgTimes)},
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    fill: false
                }, {
                    label: 'Max Time',
                    data: ${JSON.stringify(chartData.maxTimes)},
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    fill: false
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Performance Distribution (Min/Avg/Max)'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Time (milliseconds)'
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45
                        }
                    }
                }
            }
        });
    `;
  }

  /**
   * Generate comparison report between two benchmark results
   */
  generateComparisonReport(currentResults, baselineResults, outputName = null) {
    const reportName = outputName || `comparison-report-${Date.now()}.html`;
    const reportPath = path.join(this.outputDir, reportName);

    const comparison = this.compareResults(currentResults, baselineResults);
    const html = this.createComparisonHTML(comparison, currentResults, baselineResults);

    fs.writeFileSync(reportPath, html);

    console.log(`📊 Comparison report generated: ${reportPath}`);
    return reportPath;
  }

  /**
   * Compare two benchmark results
   */
  compareResults(current, baseline) {
    const comparisons = [];

    for (const currentResult of current.results || []) {
      if (currentResult.failed) continue;

      const baselineResult = baseline.results?.find(b => b.label === currentResult.label);
      if (baselineResult && !baselineResult.failed) {
        const improvement = ((baselineResult.avg - currentResult.avg) / baselineResult.avg) * 100;
        comparisons.push({
          benchmark: currentResult.label,
          current: currentResult.avg,
          baseline: baselineResult.avg,
          improvement,
          faster: improvement > 0,
          significant: Math.abs(improvement) > 5
        });
      }
    }

    return comparisons;
  }

  /**
   * Create comparison HTML
   */
  createComparisonHTML(comparisons, current, baseline) {
    // This would be similar to createHTMLReport but focused on comparison
    // Implementation would include side-by-side charts and improvement metrics
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Performance Comparison Report</title>
    <style>${this.getReportStyles()}</style>
</head>
<body>
    <div class="container">
        <header class="report-header">
            <h1>📊 Performance Comparison Report</h1>
            <div class="report-meta">
                <span>Current: ${new Date(current.timestamp).toLocaleString()}</span>
                <span>Baseline: ${new Date(baseline.timestamp).toLocaleString()}</span>
            </div>
        </header>
        
        <div class="comparison-summary">
            <h2>📈 Summary</h2>
            <p>Compared ${comparisons.length} benchmarks</p>
            <p>Improvements: ${comparisons.filter(c => c.faster).length}</p>
            <p>Regressions: ${comparisons.filter(c => !c.faster).length}</p>
        </div>

        <div class="comparison-table">
            ${this.generateComparisonTable(comparisons)}
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate comparison table
   */
  generateComparisonTable(comparisons) {
    const rows = comparisons.map(comp => {
      const improvementClass = comp.faster ? 'improvement' : 'regression';
      const improvementText = comp.faster 
        ? `+${comp.improvement.toFixed(1)}% faster`
        : `${comp.improvement.toFixed(1)}% slower`;

      return `
            <tr class="${comp.significant ? 'significant-change' : ''}">
                <td>${comp.benchmark}</td>
                <td>${comp.current.toFixed(2)}ms</td>
                <td>${comp.baseline.toFixed(2)}ms</td>
                <td class="${improvementClass}">${improvementText}</td>
            </tr>
        `;
    }).join('');

    return `
        <table class="results-table">
            <thead>
                <tr>
                    <th>Benchmark</th>
                    <th>Current</th>
                    <th>Baseline</th>
                    <th>Change</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
  }
}

// CLI interface
if (require.main === module) {
  const reporter = new BenchmarkReporter();
  
  const command = process.argv[2];
  const inputFile = process.argv[3];
  const outputName = process.argv[4];

  if (!command) {
    console.log(`
📄 Benchmark Reporter

Usage:
  node benchmarks/reporter.js <command> <input-file> [output-name]

Commands:
  html <results.json> [name]     Generate HTML report
  compare <current.json> <baseline.json> [name]   Generate comparison report

Examples:
  node benchmarks/reporter.js html results/benchmark-results.json
  node benchmarks/reporter.js compare results/current.json results/baseline.json
    `);
    process.exit(0);
  }

  try {
    switch (command) {
      case 'html':
        if (!inputFile || !fs.existsSync(inputFile)) {
          console.error('❌ Input file not found');
          process.exit(1);
        }
        
        const results = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
        reporter.generateHTMLReport(results, outputName);
        break;

      case 'compare':
        const baselineFile = process.argv[4];
        const outputNameComp = process.argv[5];
        
        if (!inputFile || !baselineFile || !fs.existsSync(inputFile) || !fs.existsSync(baselineFile)) {
          console.error('❌ Both current and baseline files must exist');
          process.exit(1);
        }
        
        const currentResults = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
        const baselineResults = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
        
        reporter.generateComparisonReport(currentResults, baselineResults, outputNameComp);
        break;

      default:
        console.error('❌ Unknown command');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error generating report:', error.message);
    process.exit(1);
  }
}

module.exports = BenchmarkReporter;