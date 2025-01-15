// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Using happy-dom for browser environment simulation
    environment: "happy-dom",

    // Configuring globals to make testing easier
    globals: true,

    // Setting up coverage reporting
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: [
        "node_modules/",
        "test/",
        "**/*.test.ts",
        "**/*.spec.ts",
        "vite.config.ts",
        "vitest.config.ts",
      ],
    },

    // Adding helpful testing features
    include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**"],

    // Configuring timeouts for animation-related tests
    testTimeout: 10000,
    hookTimeout: 10000,

    // Setup and teardown files
    setupFiles: ["./test/setup.ts"],
  },
  resolve: {
    // Add any path aliases you're using in your project
    alias: {
      "@": "/src",
    },
  },
});
