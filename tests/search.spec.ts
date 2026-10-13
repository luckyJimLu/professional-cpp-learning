import { test, expect } from "@playwright/test";

test("search source and snippets, preview original lines, restore URL and clear", async ({
  page,
}) => {
  await page.goto("/?view=search");
  await expect(page.getByRole("status")).toContainText("已索引");
  const input = page.getByRole("searchbox", { name: "搜索代码" });
  await input.fill("bounded_thread_pool");
  await page.getByRole("button", { name: "源码文件", exact: true }).click();
  await expect(page.locator(".search-result").first()).toContainText(
    "bounded_thread_pool.cpp",
  );
  await page.locator(".search-result").first().click();
  await expect(page.getByRole("region", { name: "代码预览" })).toBeVisible();
  await page.reload();
  await expect(input).toHaveValue("bounded_thread_pool");
  await expect(page.locator(".source-line.is-match")).toHaveCount(1);
  await page.getByRole("button", { name: "清除搜索", exact: true }).click();
  await expect(input).toBeFocused();
  await expect(page.getByRole("status")).toContainText("已索引");
  await input.fill("std::mutex");
  await page.getByRole("button", { name: "文档代码块", exact: true }).click();
  await expect(page.locator(".search-result").first()).toContainText("代码块");
  await expect(page.locator(".search-result mark").first()).toHaveText(
    "std::mutex",
  );
  await input.fill("__no_such_symbol_98765__");
  await expect(
    page.getByRole("heading", { name: "没有找到匹配代码" }),
  ).toBeVisible();
});

test("IME composition commits only once finished and browser history restores filters", async ({
  page,
}) => {
  await page.goto("/?view=search&q=std%3A%3Amutex");
  const input = page.getByRole("searchbox", { name: "搜索代码" });
  await input.dispatchEvent("compositionstart");
  await input.fill("线程");
  await expect(page).toHaveURL(/q=std/);
  await input.dispatchEvent("compositionend");
  await expect(input).toHaveValue("线程");
  expect(new URL(page.url()).searchParams.get("q")).toBe("线程");
  await page.getByRole("button", { name: "源码文件", exact: true }).click();
  await page.goBack();
  await expect(
    page.getByRole("button", { name: "全部代码", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("migrated bilingual documents and images work on a narrow viewport", async ({
  page,
}) => {
  const topic =
    "references/system-design-notes/content/33. Cpp System Architecture/index.zh.md";
  await page.goto(`/?view=topics&topic=${encodeURIComponent(topic)}`);
  await expect(page.locator(".document-card h1")).toContainText("C++");
  const image = page.locator(".document-card img").first();
  await image.scrollIntoViewIfNeeded();
  await expect(image).toBeVisible();
  expect(
    await image.evaluate(
      (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Read in English" }).click();
  await expect(page).toHaveURL(/index.en.md/);
  await page.reload();
  await expect(page.getByRole("button", { name: "阅读中文版" })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.locator(".mobile-menu summary").click();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("button", { name: "代码搜索" })
    .click();
  await page.getByRole("searchbox").fill("unique_ptr");
  await page.locator(".search-result").first().click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/search-mobile.png",
    fullPage: false,
  });
});

test("keyboard search shortcut and pagination", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("searchbox")).toBeFocused();
  await page.getByRole("searchbox").fill("std::");
  await expect(page.locator(".search-result")).toHaveCount(30);
  await page.getByRole("button", { name: "下一页", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("第 2");
  await page.screenshot({
    path: "test-results/search-desktop.png",
    fullPage: false,
  });
});

test("failed search chunk keeps navigation available and reload recovers", async ({
  page,
}) => {
  await page.route(/\/assets\/CodeSearch[^/]*\.js$/, (route) => route.abort());
  await page.goto("/?view=search");
  await expect(page.getByRole("alert")).toContainText("代码搜索加载失败");
  await page.getByRole("button", { name: /^Today/ }).click();
  await expect(page.locator(".hero-card")).toBeVisible();
  await page.unroute(/\/assets\/CodeSearch[^/]*\.js$/);
  await page.goto("/?view=search");
  await expect(page.getByRole("searchbox")).toBeVisible();
});
