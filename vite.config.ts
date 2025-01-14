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
});
