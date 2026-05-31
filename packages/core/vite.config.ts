import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "GraphicalEditorCore",
      fileName: "index",
      formats: ["es", "cjs"]
    },
    rollupOptions: {
      external: ["vue", "pinia"],
      output: {
        globals: {
          vue: "Vue",
          pinia: "Pinia"
        }
      }
    }
  }
});
