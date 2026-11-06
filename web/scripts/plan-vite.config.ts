// Отдельный сервер только для страниц «Главная» и «План» (не зависит от чужих разделов): npx vite --config scripts/plan-vite.config.ts --port 5199
// Страница: http://localhost:5199/scripts/plan-harness/index.html?demo&p=home|plan[&dark]
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const root = path.resolve(import.meta.dirname, "..");
export default defineConfig({
  root, base: "/", cacheDir: path.resolve(root, "node_modules/.vite-plan"),
  plugins: [react(), tailwindcss(), { name: "plan-demo-only", enforce: "pre", resolveId(id, importer) { if (/lib\/demoAll$|^\.\/demoAll$/.test(id) && importer?.includes("lib/source")) return path.resolve(root, "scripts/plan-harness/demoAll.ts"); } }],
  resolve: { alias: { "@": path.resolve(root, "src") } },
});
