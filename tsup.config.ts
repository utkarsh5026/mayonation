import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    // Separate entry points for tree-shaking
    core: 'src/core/index.ts',
    animations: 'src/animations/index.ts',
    timeline: 'src/timeline/index.ts',
    utils: 'src/utils/interpolators/index.ts'
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: true, // Enable code splitting for better tree-shaking
  sourcemap: false,
  clean: true,
  treeshake: true, // Explicitly enable tree-shaking
  minify: false, // Keep readable for development
  target: 'es2020',
  external: [], // No external dependencies
  bundle: true
})