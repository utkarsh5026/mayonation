#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execSync } = require('child_process');

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

function getGzippedSize(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    const gzipped = zlib.gzipSync(content);
    return gzipped.length;
  } catch (error) {
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getGitInfo() {
  try {
    const commitHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    const shortHash = commitHash.substring(0, 7);
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    const commitMessage = execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim();
    const commitDate = execSync('git log -1 --pretty=%cd --date=iso', { encoding: 'utf8' }).trim();
    
    return {
      commitHash,
      shortHash,
      branch,
      commitMessage,
      commitDate
    };
  } catch (error) {
    return {
      commitHash: 'unknown',
      shortHash: 'unknown',
      branch: 'unknown',
      commitMessage: 'unknown',
      commitDate: 'unknown'
    };
  }
}

function generateBuildInfo() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const distPath = path.resolve('dist');
  
  const buildInfo = {
    name: packageJson.name,
    version: packageJson.version,
    buildTime: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    ...getGitInfo(),
    files: {}
  };

  // Get sizes of built files
  const distFiles = [
    'index.js',
    'index.mjs', 
    'index.d.ts',
    'index.d.mts'
  ];

  let totalSize = 0;
  let totalGzippedSize = 0;
  distFiles.forEach(file => {
    const filePath = path.join(distPath, file);
    const size = getFileSize(filePath);
    const gzippedSize = getGzippedSize(filePath);
    if (size > 0) {
      buildInfo.files[file] = {
        size: size,
        sizeFormatted: formatBytes(size),
        gzippedSize: gzippedSize,
        gzippedSizeFormatted: formatBytes(gzippedSize),
        compressionRatio: size > 0 ? ((size - gzippedSize) / size * 100).toFixed(1) + '%' : '0%'
      };
      totalSize += size;
      totalGzippedSize += gzippedSize;
    }
  });

  buildInfo.totalSize = totalSize;
  buildInfo.totalSizeFormatted = formatBytes(totalSize);
  buildInfo.totalGzippedSize = totalGzippedSize;
  buildInfo.totalGzippedSizeFormatted = formatBytes(totalGzippedSize);
  buildInfo.totalCompressionRatio = totalSize > 0 ? ((totalSize - totalGzippedSize) / totalSize * 100).toFixed(1) + '%' : '0%';

  // Write build info to JSON file
  const buildInfoPath = path.join(distPath, 'build-info.json');
  fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));

  // Write human-readable build info
  const readableInfo = `
Build Information for ${buildInfo.name} v${buildInfo.version}
${'='.repeat(60)}

📦 Package Information:
   Name: ${buildInfo.name}
   Version: ${buildInfo.version}
   Build Time: ${buildInfo.buildTime}

🔧 Environment:
   Node.js: ${buildInfo.nodeVersion}
   Platform: ${buildInfo.platform}
   Architecture: ${buildInfo.arch}

📊 Git Information:
   Branch: ${buildInfo.branch}
   Commit: ${buildInfo.shortHash} (${buildInfo.commitHash})
   Message: ${buildInfo.commitMessage}
   Date: ${buildInfo.commitDate}

📁 Build Output:
   Total Size: ${buildInfo.totalSizeFormatted} (${buildInfo.totalGzippedSizeFormatted} gzipped, ${buildInfo.totalCompressionRatio} compression)
   
   Files:
${Object.entries(buildInfo.files)
  .map(([file, info]) => `   • ${file}: ${info.sizeFormatted} (${info.gzippedSizeFormatted} gzipped, ${info.compressionRatio} compression)`)
  .join('\n')}

Generated at: ${new Date().toLocaleString()}
`;

  const readableInfoPath = path.join(distPath, 'BUILD_INFO.txt');
  fs.writeFileSync(readableInfoPath, readableInfo);

  // Output to console
  console.log('\n🎉 Build completed successfully!');
  console.log(readableInfo);

  // Run bundle analysis
  try {
    const BundleAnalyzer = require('./bundle-analyzer');
    const analyzer = new BundleAnalyzer();
    console.log('\n' + '='.repeat(60));
    analyzer.analyze();
  } catch (error) {
    console.log('\n⚠️  Bundle analysis not available. Run: node scripts/bundle-analyzer.js');
  }

  return buildInfo;
}

// Run the script
if (require.main === module) {
  generateBuildInfo();
}

module.exports = { generateBuildInfo };