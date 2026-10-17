import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(() => {
  const isGitHubPages =
    process.env.GITHUB_PAGES === "true" ||
    Boolean(process.env.GITHUB_ACTIONS && process.env.GITHUB_REPOSITORY);
  const repoName = process.env.GITHUB_REPOSITORY
    ? process.env.GITHUB_REPOSITORY.split("/")[1]
    : "professional-cpp-learning";
  const base = isGitHubPages
    ? `/${repoName}/`
    : process.env.VITE_BASE_PATH || process.env.BASE_URL || "/";

  return {
    base,
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: 3000,
      allowedHosts: true,
      cors: true,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    },
    build: {
      target: "es2022",
      sourcemap: !isGitHubPages,
      rollupOptions: {
        input: {
          main: "index.html",
          rtos: "rtos.html",
        },
      },
    },
  };
});
