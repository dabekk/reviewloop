import { defineConfig } from "vite";

/**
 * Builds the embed as one self-contained IIFE: no imports, no globals except
 * window.ReviewLoop, safe to drop into any page with a single script tag.
 */
export default defineConfig({
  build: {
    lib: { entry: "src/embed.ts", name: "ReviewLoopEmbed", formats: ["iife"], fileName: () => "v1.js" },
    target: "es2020",
    minify: true,
    sourcemap: false,
  },
});
