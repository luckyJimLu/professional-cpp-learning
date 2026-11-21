import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const isGitHubPages = process.env.GITHUB_PAGES === "true";
const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const base = isGitHubPages
  ? (process.env.VITE_BASE_PATH ??
    (repoName ? `/${repoName}/` : "/professional-cpp-learning/"))
  : "/";

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(rootDir, "index.html"),
        rtos: path.resolve(rootDir, "rtos.html"),
      },
    },
  },
  server: {
    port: 3000,
    host: "0.0.0.0",
  },
});
