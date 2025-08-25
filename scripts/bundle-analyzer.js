#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/**
 * Bundle Size Analyzer for Mayonation
 * Analyzes build output and provides detailed size breakdown
 */

class BundleAnalyzer {
  constructor() {
    this.distPath = path.join(process.cwd(), 'dist');
    this.srcPath = path.join(process.cwd(), 'src');
    this.results = {
      timestamp: new Date().toISOString(),
      totalSize: 0,
      files: {},
      sourceAnalysis: {},
      recommendations: []
    };
  }

  /**
   * Get file size in bytes and format it
   */
  getFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath);
      const content = fs.readFileSync(filePath);
      const gzipped = zlib.gzipSync(content);
      return {
        bytes: stats.size,
        formatted: this.formatBytes(stats.size),
        kb: Math.round(stats.size / 1024 * 100) / 100,
        gzippedBytes: gzipped.length,
        gzippedFormatted: this.formatBytes(gzipped.length),
        gzippedKb: Math.round(gzipped.length / 1024 * 100) / 100,
        compressionRatio: stats.size > 0 ? ((stats.size - gzipped.length) / stats.size * 100).toFixed(1) + '%' : '0%'
      };
    } catch (error) {
      return { bytes: 0, formatted: '0 B', kb: 0, gzippedBytes: 0, gzippedFormatted: '0 B', gzippedKb: 0, compressionRatio: '0%' };
    }
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Analyze distribution build files
   */
  analyzeBuildFiles() {
    if (!fs.existsSync(this.distPath)) {
      console.error('❌ Dist directory not found. Run npm run build first.');
      return false;
    }

    const buildFiles = ['index.js', 'index.mjs', 'index.d.ts', 'index.d.mts'];
    let totalSize = 0;

    buildFiles.forEach(file => {
      const filePath = path.join(this.distPath, file);
      if (fs.existsSync(filePath)) {
        const size = this.getFileSize(filePath);
        this.results.files[file] = size;
        totalSize += size.bytes;
      }
    });

    this.results.totalSize = totalSize;
    return true;
  }

  /**
   * Analyze source files to identify largest contributors
   */
  analyzeSourceFiles() {
    const sourceFiles = this.getAllSourceFiles(this.srcPath);
    const fileSizes = [];

    sourceFiles.forEach(file => {
      const relativePath = path.relative(this.srcPath, file);
      const size = this.getFileSize(file);
      fileSizes.push({
        path: relativePath,
        ...size,
        category: this.categorizeFile(relativePath)
      });
    });

    // Sort by size descending
    fileSizes.sort((a, b) => b.bytes - a.bytes);
    
    this.results.sourceAnalysis = {
      totalFiles: fileSizes.length,
      largestFiles: fileSizes.slice(0, 15),
      categoryBreakdown: this.getCategoryBreakdown(fileSizes)
    };

    return fileSizes;
  }

  /**
   * Get all TypeScript source files recursively
   */
  getAllSourceFiles(dir) {
    let files = [];
    const items = fs.readdirSync(dir);

    items.forEach(item => {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory() && !item.startsWith('__tests__')) {
        files = files.concat(this.getAllSourceFiles(itemPath));
      } else if (item.endsWith('.ts') && !item.endsWith('.test.ts') && !item.endsWith('.d.ts')) {
        files.push(itemPath);
      }
    });

    return files;
  }

  /**
   * Categorize files by their purpose
   */
  categorizeFile(filePath) {
    if (filePath.includes('svg/path/path_interpolate')) return 'SVG Path Interpolation';
    if (filePath.includes('animations/property-manager')) return 'Property Management';
    if (filePath.includes('animations/styles/style-animator')) return 'Style Animation';
    if (filePath.includes('animations/transform')) return 'Transform Animations';
    if (filePath.includes('svg/')) return 'SVG Handling';
    if (filePath.includes('animations/')) return 'Animation System';
    if (filePath.includes('utils/')) return 'Utilities';
    if (filePath.includes('css/')) return 'CSS Handling';
    if (filePath.includes('core/')) return 'Core System';
    if (filePath.includes('timeline/')) return 'Timeline';
    if (filePath.includes('api/')) return 'Public API';
    return 'Other';
  }

  /**
   * Group files by category and calculate total sizes
   */
  getCategoryBreakdown(fileSizes) {
    const categories = {};
    
    fileSizes.forEach(file => {
      if (!categories[file.category]) {
        categories[file.category] = {
          totalBytes: 0,
          totalKB: 0,
          fileCount: 0,
          files: []
        };
      }
      
      categories[file.category].totalBytes += file.bytes;
      categories[file.category].totalKB += file.kb;
      categories[file.category].fileCount++;
      categories[file.category].files.push(file.path);
    });

    // Sort categories by size
    return Object.entries(categories)
      .map(([name, data]) => ({
        name,
        ...data,
        formatted: this.formatBytes(data.totalBytes),
        percentage: 0 // Will be calculated later
      }))
      .sort((a, b) => b.totalBytes - a.totalBytes);
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    const largestFiles = this.results.sourceAnalysis.largestFiles.slice(0, 5);
    const totalBuildSize = this.results.files['index.js']?.kb || 0;

    // Size-based recommendations
    if (totalBuildSize > 50) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Bundle Size',
        issue: `Build size is ${totalBuildSize}KB, which is large for an animation library`,
        solution: 'Implement tree-shaking and code splitting',
        impact: 'Could reduce bundle size by 30-50%'
      });
    }

    // File-specific recommendations
    largestFiles.forEach((file, index) => {
      if (file.kb > 20 && index < 3) {
        let solution = '';
        let impact = '';
        
        switch (file.category) {
          case 'SVG Path Interpolation':
            solution = 'Split complex path interpolation into separate modules, implement lazy loading';
            impact = 'Reduce initial bundle by 15-25KB';
            break;
          case 'Property Management':
            solution = 'Break into separate handlers (transform, CSS, SVG), use composition pattern';
            impact = 'Enable tree-shaking, reduce by 8-15KB';
            break;
          case 'Style Animation':
            solution = 'Split CSS properties into separate modules, implement property-specific handlers';
            impact = 'Reduce by 5-12KB when only basic properties are used';
            break;
          default:
            solution = 'Consider breaking into smaller, focused modules';
            impact = `Potential savings of ${Math.round(file.kb * 0.3)}KB`;
        }

        recommendations.push({
          priority: index === 0 ? 'HIGH' : 'MEDIUM',
          category: 'Large File',
          issue: `${file.path} is ${file.formatted} (${file.category})`,
          solution,
          impact
        });
      }
    });

    // Category-based recommendations
    const categories = this.results.sourceAnalysis.categoryBreakdown;
    const topCategory = categories[0];
    
    if (topCategory && topCategory.totalKB > 20) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Module Organization',
        issue: `${topCategory.name} category contains ${topCategory.totalKB}KB across ${topCategory.fileCount} files`,
        solution: 'Consider implementing facade pattern or plugin architecture',
        impact: 'Enable selective imports and reduce bundle size'
      });
    }

    this.results.recommendations = recommendations;
    return recommendations;
  }

  /**
   * Generate detailed report
   */
  generateReport() {
    console.log('\n🔍 MAYONATION BUNDLE ANALYSIS REPORT');
    console.log('=' .repeat(60));
    console.log(`📅 Generated: ${new Date().toLocaleString()}`);
    console.log(`📁 Total Build Size: ${this.formatBytes(this.results.totalSize)}\n`);

    // Build files breakdown
    console.log('📦 BUILD FILES:');
    console.log('-'.repeat(50));
    console.log('  File'.padEnd(17) + 'Size'.padStart(10) + 'Gzipped'.padStart(12) + 'Compression'.padStart(12));
    console.log('-'.repeat(50));
    Object.entries(this.results.files).forEach(([filename, size]) => {
      console.log(`  ${filename.padEnd(15)} ${size.formatted.padStart(8)} ${size.gzippedFormatted.padStart(10)} ${size.compressionRatio.padStart(10)}`);
    });

    // Source analysis
    console.log('\n📊 SOURCE FILE ANALYSIS:');
    console.log('-'.repeat(30));
    console.log(`Total Source Files: ${this.results.sourceAnalysis.totalFiles}`);

    // Top 10 largest files
    console.log('\n🎯 LARGEST SOURCE FILES:');
    this.results.sourceAnalysis.largestFiles.slice(0, 10).forEach((file, index) => {
      const indicator = index < 3 ? '🔴' : index < 6 ? '🟡' : '🟢';
      console.log(`  ${indicator} ${file.path}`);
      console.log(`     ${file.formatted} (${file.category})`);
    });

    // Category breakdown
    console.log('\n📈 SIZE BY CATEGORY:');
    console.log('-'.repeat(30));
    this.results.sourceAnalysis.categoryBreakdown.forEach((cat, index) => {
      const bar = '█'.repeat(Math.round(cat.totalKB / 3));
      console.log(`  ${cat.name.padEnd(20)} ${cat.formatted.padStart(8)} ${bar}`);
    });

    // Recommendations
    console.log('\n💡 OPTIMIZATION RECOMMENDATIONS:');
    console.log('-'.repeat(30));
    this.results.recommendations.forEach((rec, index) => {
      const priority = rec.priority === 'HIGH' ? '🚨' : rec.priority === 'MEDIUM' ? '⚠️' : '💡';
      console.log(`\n${index + 1}. ${priority} ${rec.category} - ${rec.priority}`);
      console.log(`   Issue: ${rec.issue}`);
      console.log(`   Solution: ${rec.solution}`);
      console.log(`   Impact: ${rec.impact}`);
    });

    // Library comparison
    console.log('\n⚖️  LIBRARY COMPARISON:');
    console.log('-'.repeat(50));
    console.log('  Library'.padEnd(17) + 'Size (KB)'.padStart(10) + 'Gzipped'.padStart(12) + 'Status'.padStart(8));
    console.log('-'.repeat(50));
    
    const buildKB = this.results.files['index.js']?.kb || 0;
    const buildGzippedKB = this.results.files['index.js']?.gzippedKb || 0;
    
    const comparisons = [
      { name: 'Motion (mini)', size: 2.6, gzipped: 1.2, status: buildKB > 2.6 ? '❌' : '✅' },
      { name: 'Popmotion', size: 4.5, gzipped: 2.1, status: buildKB > 4.5 ? '❌' : '✅' },
      { name: 'Motion (full)', size: 18, gzipped: 6.8, status: buildKB > 18 ? '❌' : '✅' },
      { name: 'GSAP', size: 23, gzipped: 8.5, status: buildKB > 23 ? '❌' : '✅' },
      { name: 'Anime.js', size: 25, gzipped: 9.2, status: buildKB > 25 ? '❌' : '✅' },
      { name: 'Mayonation', size: buildKB, gzipped: buildGzippedKB, status: '📍' },
      { name: 'Framer Motion', size: 119, gzipped: 42.5, status: buildKB < 119 ? '✅' : '❌' }
    ];

    comparisons.forEach(lib => {
      const indicator = lib.name === 'Mayonation' ? lib.status : lib.status;
      const gzippedStr = lib.name === 'Mayonation' ? `${lib.gzipped}` : `~${lib.gzipped}`;
      console.log(`  ${indicator} ${lib.name.padEnd(15)} ${lib.size.toString().padStart(6)} ${gzippedStr.padStart(8)} ${indicator.padStart(4)}`);
    });

    console.log('\n' + '='.repeat(60));
  }

  /**
   * Save detailed JSON report
   */
  saveJSONReport() {
    const reportPath = path.join(this.distPath, 'bundle-analysis.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);
  }

  /**
   * Main analysis function
   */
  async analyze() {
    console.log('🔄 Analyzing bundle...\n');
    
    if (!this.analyzeBuildFiles()) {
      return;
    }

    this.analyzeSourceFiles();
    this.generateRecommendations();
    this.generateReport();
    this.saveJSONReport();
  }
}

// Run analysis if called directly
if (require.main === module) {
  const analyzer = new BundleAnalyzer();
  analyzer.analyze().catch(console.error);
}

module.exports = BundleAnalyzer;