import { defineConfig } from "vite";
import { resolve } from "node:path";

// 双入口：cover（全屏伪装页）+ settings（设置窗口页）
export default defineConfig({
  clearScreen: false,
  // tauri custom-protocol 下必须用相对路径，绝对 /assets 会白屏
  base: "./",
  server: { port: 5173, strictPort: true },
  build: {
    target: "es2021",
    rollupOptions: {
      input: {
        cover: resolve(__dirname, "cover.html"),
        settings: resolve(__dirname, "settings.html"),
      },
    },
  },
});
