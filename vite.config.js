import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Vite parses the ES modules into a real syntax tree, so each module keeps its
// own scope — no textual import/export stripping, no globally-unique-name rule.
// viteSingleFile inlines the bundled JS and CSS into one self-contained
// docs/index.html, which is what GitHub Pages serves and what ships offline.
export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    outDir: "docs",
    emptyOutDir: true,
  },
});
