import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.join(here, "web"),
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@shared": path.join(here, "shared") } },
  server: { fs: { allow: [path.resolve(here, "../..")] } },
});
