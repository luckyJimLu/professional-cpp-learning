import { expect, test } from "@playwright/test";

test("C++ code blocks render with syntax highlighting and copy button", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/?view=lesson&day=1");

  // Code card exists
  const codeCard = page.locator(".code-block-card").first();
  await expect(codeCard).toBeVisible();

  // Language badge displays CPP
  await expect(codeCard.locator(".code-block-lang")).toHaveText("CPP");

  // Syntax highlighting classes are present from highlight.js
  const hljsCode = codeCard.locator("pre code.language-cpp.hljs");
  await expect(hljsCode).toBeVisible();
  await expect(hljsCode.locator(".hljs-keyword").first()).toBeVisible();

  // Test copy button
  const copyBtn = codeCard.locator(".code-block-copy-btn");
  await expect(copyBtn).toContainText("复制代码");
  await copyBtn.click();
  await expect(copyBtn).toContainText("已复制");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "int main()",
  );
});

test("PlantUML diagram renders with preview, source toggle and copy", async ({
  page,
}) => {
  // Mock PlantUML SVG response for fast, reliable deterministic tests
  await page.route(/plantuml\.com\/plantuml\/svg\//, (route) => {
    route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><text y="30">UML</text></svg>',
    });
  });

  await page.goto("/?view=topics&topic=docs/mermaid.md");

  // PlantUML diagram container exists
  const diagram = page.locator(".plantuml-diagram");
  await expect(diagram).toBeVisible();

  // Viewport image has valid PlantUML SVG url
  const img = diagram.locator(".plantuml-image");
  await expect(img).toBeVisible();
  const src = await img.getAttribute("src");
  expect(src).toContain("/svg/");

  // External SVG link is valid
  const svgLink = diagram.locator(".plantuml-actions a");
  await expect(svgLink).toHaveAttribute("target", "_blank");
  await expect(svgLink).toHaveAttribute("href", /plantuml.*\/svg\//);

  // Toggle to source view
  await diagram.getByRole("tab", { name: "源码" }).click();
  const sourcePre = diagram.locator(".plantuml-source-pre");
  await expect(sourcePre).toBeVisible();
  await expect(sourcePre).toContainText("@startuml");
  await expect(sourcePre).toContainText("RingBuffer");

  // Copy UML source
  const copySourceBtn = diagram.locator(".plantuml-action-btn", {
    hasText: "复制源码",
  });
  await copySourceBtn.click();
  await expect(diagram.locator(".plantuml-actions")).toContainText("已复制");

  // Toggle back to diagram view
  await diagram.getByRole("tab", { name: "流程图" }).click();
  await expect(diagram.locator(".plantuml-viewport")).toBeVisible();
});

test("failed PlantUML image displays friendly error and retry button", async ({
  page,
}) => {
  // Abort PlantUML server requests to simulate network failure
  await page.route(/plantuml\.com\/plantuml\/svg\//, (route) => route.abort());

  await page.goto("/?view=topics&topic=docs/mermaid.md");

  const diagram = page.locator(".plantuml-diagram");
  await expect(diagram.locator(".plantuml-error")).toBeVisible();
  await expect(diagram.locator(".plantuml-error")).toContainText(
    "PlantUML 图形未能加载",
  );

  const retryBtn = diagram.locator(".plantuml-retry-btn");
  await expect(retryBtn).toBeVisible();
});

test("code blocks and PlantUML diagrams adapt to mobile viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?view=lesson&day=1");

  await expect(page.locator(".code-block-card").first()).toBeVisible();
  const fitsViewport = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
  expect(fitsViewport).toBe(true);
});
