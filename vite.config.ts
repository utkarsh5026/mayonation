import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "AnimationLibrary",
      fileName: "animation-library",
      formats: ["es", "umd"],
    },
    rollupOptions: {
      output: {
        // Provide globals for UMD build
        globals: {
          // Add any external dependencies here
        },
      },
    },
  },
  server: {
    open: "/examples/index.html", // Automatically open browser
  },
});
