import { expect, test } from "@playwright/test";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

function markdownFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? markdownFiles(path) : entry.name.endsWith(".md") ? [path] : [];
  });
}

async function openDayOne(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Lessons", exact: true }).click();
  await page.getByRole("button", { name: /DAY 001/ }).click();
}

test("Mermaid renders in lessons while C++ remains code", async ({ page }) => {
  await openDayOne(page);
  await expect(page.locator(".mermaid-viewport svg")).toBeVisible();
  await expect(page.locator(".lesson-section pre code.language-cpp")).toContainText("int main()");
  await page.getByText("查看 Mermaid 源码", { exact: true }).click();
  await expect(page.locator(".mermaid-diagram pre")).toContainText("flowchart LR");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".mermaid-viewport")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("failed Mermaid load preserves source and allows retry", async ({ page }) => {
  await page.route(/\/assets\/mermaid[^/]*\.js$/, (route) => route.abort());
  await openDayOne(page);
  await expect(page.locator(".mermaid-diagram [role=alert]")).toBeVisible();
  await expect(page.locator(".mermaid-diagram pre")).toContainText("flowchart LR");
  await page.getByRole("button", { name: "重试绘制" }).click();
  await expect(page.locator(".mermaid-diagram [role=alert]")).toBeVisible();
  await expect(page.locator(".lesson-section pre code.language-cpp")).toContainText("int main()");
});

test("all repository Mermaid diagrams have valid syntax", async ({ page }) => {
  let moduleUrl = "";
  page.on("response", (response) => {
    if (/\/assets\/mermaid\.core[^/]*\.js$/.test(response.url())) moduleUrl = response.url();
  });
  await openDayOne(page);
  await expect(page.locator(".mermaid-viewport svg")).toBeVisible();
  expect(moduleUrl, "Vite should emit the lazy mermaid.core module").not.toBe("");
  const diagrams = ["daily", "patterns", "frameworks", "docs", "weekly"].flatMap((dir) =>
    markdownFiles(resolve(dir)).flatMap((path) =>
      [...readFileSync(path, "utf8").matchAll(/(?:^|\n)(`{3,}|~{3,})mermaid[^\n]*\n([\s\S]*?)\n\1(?=\s|$)/g)]
        .map((match) => ({ path, source: match[2] })),
    ),
  );
  expect(diagrams.length).toBeGreaterThan(12);
  const failures = await page.evaluate(async ({ moduleUrl, diagrams }) => {
    const { default: mermaid } = await import(/* @vite-ignore */ moduleUrl);
    const failures: string[] = [];
    for (const diagram of diagrams) {
      try { await mermaid.parse(diagram.source); }
      catch (error) { failures.push(`${diagram.path}: ${String(error)}`); }
    }
    return failures;
  }, { moduleUrl, diagrams });
  expect(failures).toEqual([]);
});

test("topic documents are reachable and render diagrams", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "专题", exact: true }).first().click();
  await page.getByRole("button", { name: "Mermaid 图表学习与编写", exact: true }).click();
  await expect(page.locator(".mermaid-viewport svg")).toHaveCount(3);
  await page.getByRole("link", { name: "所有权与智能指针", exact: true }).click();
  await expect(page.locator(".document-card h1")).toContainText("Ownership");
});
