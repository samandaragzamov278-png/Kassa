// Отдельный сервер только для Аналитики, Линз и Склада (не зависит от чужих разделов): npx vite --config scripts/analytics-vite.config.ts --port 5198
// Страница: http://localhost:5198/scripts/analytics-harness/index.html?demo&p=analytics|lens|stock[&dark]
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const root = path.resolve(import.meta.dirname, "..");
export default defineConfig({
  root, base: "/", cacheDir: path.resolve(root, "node_modules/.vite-analytics"),
  plugins: [react(), tailwindcss(), { name: "analytics-demo-only", enforce: "pre", resolveId(id, importer) { if (/lib\/demoAll$|^\.\/demoAll$/.test(id) && importer?.includes("lib/source")) return path.resolve(root, "scripts/analytics-harness/demoAll.ts"); } }],
  resolve: { alias: { "@": path.resolve(root, "src") } },
});
