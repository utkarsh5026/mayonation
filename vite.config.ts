import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "mayonation",
      formats: ["es", "umd"],
      fileName: (format) => `index.${format === "es" ? "mjs" : "js"}`,
    },
    sourcemap: true,
  },
  server: {
    open: "/html/index.html",
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@/core": resolve(__dirname, "src/core"),
      "@/utils": resolve(__dirname, "src/utils"),
    },
  },
  test: {
    environment: "jsdom",
  },
});
