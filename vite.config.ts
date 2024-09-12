import { defineConfig } from "vite";

import typescript from "@rollup/plugin-typescript";
import path from "path";
import { typescriptPaths } from "rollup-plugin-typescript-paths";
import circleDependency from "vite-plugin-circular-dependency";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import legacy from "@vitejs/plugin-legacy";
import commonjs from "@rollup/plugin-commonjs";

export default defineConfig({
  build: {
    manifest: true,
    minify: true,
    reportCompressedSize: true,
    outDir: "dist",
    commonjsOptions: { requireReturnsDefault: "auto" },
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "src/main.ts"),
      },
      output: {
        dir: "dist",
        entryFileNames: "main.js",
        format: "es",
        exports: "named",
        inlineDynamicImports: true,
        preserveModules: false,
        generatedCode: {
          constBindings: true, // Ensure 'const' is used instead of 'var'
          objectShorthand: true, // Ensure object shorthand is preserved
        },
      },
      preserveEntrySignatures: "exports-only",
      external: [],
      plugins: [
        typescriptPaths({
          preserveExtensions: true,
        }),
        commonjs(),
        typescript({
          sourceMap: false,
          declaration: true,
          outDir: "dist",
        }),
        // circleDependency(),
        // nodePolyfills(),
        // legacy({
        //   modernTargets: "since 2023-01-01, not dead",
        //   modernPolyfills: true,
        //   renderLegacyChunks: false,
        // }),
      ],
    },
  },
});
