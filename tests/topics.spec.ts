import { test, expect } from "@playwright/test";

test("topic catalog filters by domain and opens a named series", async ({
  page,
}) => {
  await page.goto("/?view=topics");
  await expect(
    page.getByRole("heading", { name: "专题知识库", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".topic-reading")).toHaveCount(0);
  await page.getByLabel("浏览领域").selectOption("嵌入式系统");
  await expect(page).toHaveURL(/topicCategory=/);
  const series = page.locator(".topic-collection").filter({
    has: page.getByRole("heading", { name: "OpenHarmony 轻量系统" }),
  });
  await series.locator("summary").click();
  await expect(
    series.getByRole("link", { name: /核心接口与使用契约/ }),
  ).toBeVisible();
  await series.getByRole("heading").getByRole("link").click();
  await expect(page.locator(".topic-document-centered h1")).toContainText(
    "OpenHarmony",
  );
  await expect(
    page.getByRole("navigation", { name: "专题路径" }),
  ).toContainText("嵌入式系统");
  await page
    .getByRole("navigation", { name: "专题路径" })
    .getByRole("link", { name: "嵌入式系统", exact: true })
    .click();
  await expect(page.getByLabel("浏览领域")).toHaveValue("嵌入式系统");
  await expect(page.locator(".topic-reading")).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("浏览领域")).toHaveValue("嵌入式系统");
});

test("mobile reader has usable directories, anchors and no page overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(
    "/?view=topics&topic=frameworks/openharmony/02-kernel-interfaces.md",
  );
  await expect(page.locator(".sidebar")).toBeHidden();
  await expect(page.locator(".topic-document-centered h1")).toBeVisible();
  expect(
    await page
      .locator(".topic-document-centered .markdown")
      .evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(16);
  await page.locator(".topic-reader-toc summary").click();
  await page
    .getByRole("navigation", { name: "本文目录", exact: true })
    .getByRole("link", { name: "CMSIS-RTOS2 应用接口", exact: true })
    .click();
  await expect(page).toHaveURL(/#/);
  await expect(page.locator(".topic-reader-toc")).not.toHaveAttribute("open");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator(".topic-reader-directory summary").click();
  await page
    .getByRole("navigation", { name: "专题文章目录", exact: true })
    .getByRole("link", { name: /启动、服务、外设与基础组件接口/ })
    .click();
  await expect(page.locator(".topic-document-centered h1")).toContainText(
    "启动、服务、外设",
  );
  await expect(page.locator(".topic-reader-directory")).not.toHaveAttribute(
    "open",
  );
  await page.screenshot({
    path: "test-results/topics-reader-mobile.png",
    fullPage: false,
  });
  await page
    .getByRole("navigation", { name: "专题路径" })
    .getByRole("link", { name: "专题知识库", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("heading", { name: "专题知识库", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/topics-catalog-mobile.png",
    fullPage: true,
  });
});

test("topic reader resumes position and supports storage failures", async ({
  page,
}) => {
  await page.goto(
    "/?view=topics&topic=frameworks/openharmony/02-kernel-interfaces.md",
  );
  await expect(page.locator(".topic-document-centered h1")).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 900, behavior: "instant" }));
  await expect
    .poll(() =>
      page.evaluate(() =>
        Number(
          localStorage.getItem(
            "professional-cpp:topic:position:frameworks/openharmony/02-kernel-interfaces.md",
          ),
        ),
      ),
    )
    .toBeGreaterThan(800);
  await page.goto("/?view=topics");
  await page.getByRole("link", { name: /继续上次阅读/ }).click();
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(800);
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("storage blocked");
    };
    Storage.prototype.setItem = () => {
      throw new Error("storage blocked");
    };
  });
  await page.goto("/?view=topics&topic=patterns/README.md");
  await expect(page.locator(".topic-document-centered h1")).toHaveCount(1);
  await expect(page.locator(".topic-document-centered h1")).toBeVisible();
  await expect(
    page
      .locator(".topic-document-centered h2")
      .filter({ hasText: "2. 设计模式真正解决什么" }),
  ).toHaveCount(1);
});

test("catalog supports keyboard selection, books and invalid deep links", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?view=topics&topic=missing.md");
  await expect(
    page.getByRole("status").filter({ hasText: "暂未收录" }),
  ).toBeVisible();
  await page.getByLabel("浏览领域").focus();
  await expect(page.getByLabel("浏览领域")).toBeFocused();
  await page.getByLabel("浏览领域").selectOption("books");
  await expect(page.getByRole("region", { name: "参考书籍" })).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel("浏览领域")).toHaveValue("all");
  await page.goto("/?view=topics");
  await expect(
    page.getByRole("heading", { name: "专题知识库", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/topics-catalog-desktop.png",
    fullPage: true,
  });
});

test("desktop keeps chapter navigation beside the document while reading", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(
    "/?view=topics&topic=frameworks/openharmony/02-kernel-interfaces.md",
  );
  const directory = page.locator(".topic-reader-directory");
  const toc = page.locator(".topic-reader-toc");
  await expect(directory).toHaveAttribute("open");
  await expect(toc).toHaveAttribute("open");
  const tools = page.locator(".topic-reader-tools");
  expect(await tools.evaluate((el) => getComputedStyle(el).position)).toBe(
    "sticky",
  );
  const left = await tools.boundingBox();
  const article = await page.locator(".topic-document-centered").boundingBox();
  expect(left!.x + left!.width).toBeLessThan(article!.x);
  await page
    .getByRole("navigation", { name: "本文目录", exact: true })
    .getByRole("link", { name: "CMSIS-RTOS2 应用接口", exact: true })
    .click();
  await expect(toc).toHaveAttribute("open");
  await expect(
    page
      .getByRole("navigation", { name: "本文目录", exact: true })
      .getByRole("link", { name: "CMSIS-RTOS2 应用接口", exact: true }),
  ).toHaveAttribute("aria-current", "location");
  expect(
    await tools.evaluate((el) => el.getBoundingClientRect().top),
  ).toBeGreaterThanOrEqual(60);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/topics-reader-desktop.png",
    fullPage: false,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(directory).not.toHaveAttribute("open");
  await expect(toc).not.toHaveAttribute("open");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
