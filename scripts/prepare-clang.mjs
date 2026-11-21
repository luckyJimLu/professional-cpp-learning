import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkgDir = path.join(rootDir, "node_modules", "@live-codes", "clang-wasm");
const outDir = path.join(rootDir, "public", "clang");

if (!fs.existsSync(pkgDir)) {
  console.warn("[prepare:clang] @live-codes/clang-wasm is not installed yet; skipping copy.");
  process.exit(0);
}

const candidateDirs = [
  path.join(pkgDir, "dist"),
  path.join(pkgDir, "assets"),
  pkgDir,
];
const sourceDir = candidateDirs.find((dir) => fs.existsSync(dir)) ?? pkgDir;

fs.mkdirSync(outDir, { recursive: true });

for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
  if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
  const srcPath = path.join(sourceDir, entry.name);
  const destPath = path.join(outDir, entry.name);
  if (entry.isDirectory()) {
    fs.cpSync(srcPath, destPath, { recursive: true, force: true });
  } else if (/\.(wasm|js|mjs|data|json|mem|worker\.js)$/i.test(entry.name)) {
    fs.copyFileSync(srcPath, destPath);
  }
}

console.log(`[prepare:clang] Synced runtime assets from ${path.relative(rootDir, sourceDir)} to public/clang`);
