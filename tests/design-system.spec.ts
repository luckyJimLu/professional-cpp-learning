import { test, expect } from "@playwright/test";

for (const width of [320, 390, 768, 1440]) {
  test(`slide controls fit ${width}px without sideways page scrolling`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/?view=slides&deck=lesson-03");
    await expect(page.getByLabel("选择课程课件：")).toHaveValue("lesson-03");
    const tabs = page.getByRole("tablist", { name: "课件显示模式" });
    await expect(tabs.getByRole("tab")).toHaveCount(4);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    for (const control of [
      page.getByLabel("选择课程课件："),
      ...(await tabs.getByRole("tab").all()),
    ]) {
      const box = (await control.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
      expect(box.height).toBeGreaterThanOrEqual(width <= 760 ? 44 : 36);
    }
    if (width <= 760) {
      const boxes = await tabs.getByRole("tab").evaluateAll((elements) =>
        elements.map((element) => {
          const { x, y } = element.getBoundingClientRect();
          return { x, y };
        }),
      );
      expect(boxes[0].y).toBe(boxes[1].y);
      expect(boxes[2].y).toBeGreaterThan(boxes[0].y);
      expect(boxes[2].x).toBe(boxes[0].x);
    }
  });
}

test("slide tabs use keyboard navigation and the filter recovers from no results", async ({
  page,
}) => {
  await page.goto("/?view=slides&deck=lesson-03");
  const presenter = page.getByRole("tab", { name: "演示播放" });
  await presenter.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "缩略图总览" })).toBeFocused();
  await expect(page.getByRole("tabpanel")).toHaveAttribute(
    "aria-labelledby",
    "slides-tab-grid",
  );
  const search = page.getByRole("searchbox", { name: "筛选幻灯片" });
  await search.fill("__no_matching_slide__");
  await expect(
    page.getByRole("heading", { name: "没有匹配的幻灯片" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "清除课件筛选", exact: true }).click();
  await expect(search).toHaveValue("");
  await expect(search).toBeFocused();
  const firstSlide = page.locator("button.slide-card-item").first();
  await firstSlide.focus();
  await page.keyboard.press("Enter");
  await expect(presenter).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".slide-stage-header .slide-counter")).toHaveText(
    /01\s*\/\s*44/,
  );
});

test("runtime commands follow the selected course", async ({ page }) => {
  await page.goto("/?view=slides&deck=lesson-03&tab=live");
  const panel = page.getByRole("tabpanel");
  await expect(panel).toContainText("npm --prefix slides run dev:03");
  await expect(panel).toContainText("npm --prefix slides run export:03");
  await page.getByLabel("选择课程课件：").selectOption("lesson-02");
  await expect(panel).toContainText("npm --prefix slides run dev:02");
});

test("fullscreen rejection gives a readable recovery and leaves the player usable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(Element.prototype, "requestFullscreen", {
      configurable: true,
      value: () =>
        Promise.reject(new DOMException("Not allowed", "NotAllowedError")),
    });
  });
  await page.goto("/?view=slides");
  const stage = page.locator(".slide-stage-wrapper");
  await stage.getByRole("button", { name: "全屏", exact: true }).click();
  await expect(stage.getByRole("status")).toContainText("无法切换全屏");
  await expect(stage).not.toHaveClass(/is-fullscreen/);
  await stage.getByRole("button", { name: /下一页/ }).click();
  await expect(stage.locator(".slide-counter").first()).toHaveText(
    /02\s*\/\s*37/,
  );
});

test("malformed slide URLs fall back to a usable player", async ({ page }) => {
  await page.goto("/?view=slides&deck=lesson-03&tab=unknown&slide=-5");
  await expect(page.getByRole("tab", { name: "演示播放" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator(".slide-stage-header .slide-counter")).toHaveText(
    /01\s*\/\s*44/,
  );
  await page.goto("/?view=slides&deck=lesson-03&slide=9999");
  await expect(page.locator(".slide-stage-header .slide-counter")).toHaveText(
    /44\s*\/\s*44/,
  );
  await expect(page.getByRole("button", { name: /下一页/ })).toBeDisabled();
});
