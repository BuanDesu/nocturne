import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Static-hosting build.
 * - relative base so the bundle can live at "/" or under any sub-path
 * - output isolated in dist-static/ so the dynamic build in dist/ is untouched
 */
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist-static",
    emptyOutDir: true,
    target: "es2022",
    cssTarget: "chrome110",
    assetsDir: "assets",
  },
});
