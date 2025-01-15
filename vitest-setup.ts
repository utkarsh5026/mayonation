import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",

    globals: true,

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

    include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**"],

    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
