import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig(() => {
  // 只有显式声明部署到 Pages 时才用仓库子路径。CI 里的 e2e 构建
  // 必须用根路径：vite preview 会把应用挂在 base 下，测试用的
  // /rtos.html 等根路径在子路径模式下全部 404。生产部署由
  // deploy.yml / build:pages 显式设置 GITHUB_PAGES=true，不受影响。
  const isGitHubPages = process.env.GITHUB_PAGES === "true";
  const repoName = process.env.GITHUB_REPOSITORY
    ? process.env.GITHUB_REPOSITORY.split("/")[1]
    : "professional-cpp-learning";
  const base = isGitHubPages
    ? `/${repoName}/`
    : process.env.VITE_BASE_PATH || process.env.BASE_URL || "/";

  return {
    base,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
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
