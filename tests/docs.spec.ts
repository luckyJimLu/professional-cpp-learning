import { test, expect } from "@playwright/test";

test("documentation anchors, course navigation and search shortcut", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page).toHaveTitle("学习指南 · Professional C++");
  await expect(page.locator("h1")).toContainText("从 C 出发，写出专业的 C++");
  await page.screenshot({
    path: "test-results/docs-desktop.png",
    fullPage: true,
  });
  await page.goto("/?view=lesson&day=1");
  await expect(page.locator(".lesson-toc button").first()).toHaveAttribute(
    "aria-current",
    "location",
  );
  await page.locator(".lesson-toc button").filter({ hasText: "概念" }).click();
  await expect(
    page.locator(".lesson-toc button").filter({ hasText: "概念" }),
  ).toHaveAttribute("aria-current", "location");
  await page.getByRole("link", { name: "下一课 · Day 2 →" }).click();
  await expect(page).toHaveURL(/day=2/);
  await expect(page.locator(".lesson-toc button").first()).toHaveAttribute(
    "aria-current",
    "location",
  );
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("searchbox", { name: "搜索代码" })).toBeFocused();
});

test("mobile guide and lesson remain within viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "从 C 出发",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/docs-mobile.png",
    fullPage: true,
  });
  await page.locator(".mobile-menu summary").click();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("button", { name: "每日课程" })
    .click();
  await expect(page).toHaveURL(/view=lessons/);
  await expect(page.locator(".mobile-menu")).not.toHaveAttribute("open");
  await page.goto("/?view=lesson&day=1");
  await expect(page.locator(".lesson-document h1")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
