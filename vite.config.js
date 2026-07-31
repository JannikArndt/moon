import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Vite parses the ES modules into a real syntax tree, so each module keeps its
// own scope — no textual import/export stripping, no globally-unique-name rule.
// viteSingleFile inlines the bundled JS and CSS into one self-contained
// dist/index.html. CI (.github/workflows/deploy.yml) builds this and publishes
// it to GitHub Pages; dist/ is gitignored and never committed.
export default defineConfig({
  plugins: [viteSingleFile()],
});
