import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "mate",
      fileName: (format) =>
        `animation-library.${format === "es" ? "mjs" : "umd.js"}`,
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {},
      },
    },
  },
  server: {
    open: "/examples/index.html", // Automatically open browser
  },
});
