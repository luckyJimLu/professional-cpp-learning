import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
const isGitHubPages = env?.GITHUB_PAGES === 'true';
const repoName = env?.GITHUB_REPOSITORY?.split('/')[1];
const base = isGitHubPages
  ? (env?.VITE_BASE_PATH ?? (repoName ? `/${repoName}/` : './'))
  : '/';

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
});
