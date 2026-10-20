import { test, expect } from "@playwright/test";

test("desktop guide offers a direct next action and learning pathways", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.locator(".guide-hero-cta .primary-button")).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "学习入口" }).getByRole("link"),
  ).toHaveCount(3);
  await page.locator(".guide-hero-cta .primary-button").click();
  await expect(page).toHaveURL(/view=lesson/);
  await expect(page.locator(".lesson-document h1")).toBeVisible();
});

test("course view, query and IME commit survive navigation without truncated titles", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?view=lessons");
  await page.getByRole("button", { name: "完整目录 · 54" }).click();
  await expect(page).toHaveURL(/courseTab=all/);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "完整目录 · 54" }),
  ).toHaveAttribute("aria-pressed", "true");
  const input = page.getByRole("searchbox", { name: "检索课程" });
  await input.dispatchEvent("compositionstart");
  await input.fill("智能指针");
  await expect(page).not.toHaveURL(/courseQuery=/);
  await input.dispatchEvent("compositionend");
  await expect(page).toHaveURL(/courseQuery=/);
  await expect(page.getByRole("status")).toContainText("找到");
  await page.getByRole("button", { name: "清空课程搜索" }).click();
  await expect(input).toBeFocused();
  await input.fill("a-query-that-cannot-match");
  await expect(
    page.getByRole("heading", { name: "没有找到这节课程" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "清空课程搜索" }).click();
  expect(
    await page
      .locator(".course-row strong")
      .first()
      .evaluate((el) => getComputedStyle(el).whiteSpace),
  ).toBe("normal");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("lesson review feedback leads back to a real course and can be cleared", async ({
  page,
}) => {
  await page.goto("/?view=lesson&day=54");
  await page
    .getByRole("button", { name: "稍后复习", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "已加入复习", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.goto("/?view=review");
  await expect(page.locator(".review-point-list")).toContainText("Day 54");
  await expect(
    page.getByRole("link", { name: "返回这节课程" }),
  ).toHaveAttribute("href", /day=54/);
  await page.getByRole("button", { name: /移出复习清单/ }).click();
  await expect(
    page.getByText("暂时没有待复习项", { exact: true }),
  ).toBeVisible();
  await page.locator(".review-checkpoint").first().click();
  await expect(page).toHaveURL(/view=lesson&day=7/);
});

test("mobile drawer restores focus and releases the desktop surface", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const trigger = page.locator(".mobile-menu summary");
  await trigger.click();
  await expect(page.locator("#main-content")).toHaveAttribute("inert");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(page.locator("#main-content")).not.toHaveAttribute("inert");
  await trigger.click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.locator(".mobile-menu")).not.toHaveAttribute("open");
  await expect(page.locator("#main-content")).not.toHaveAttribute("inert");
  await page
    .getByRole("button", { name: "搜索代码与课程", exact: true })
    .click();
  await expect(page.getByRole("searchbox", { name: "搜索代码" })).toBeFocused();
});

test("mobile lab reaches its workspace without expanding instructions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?view=lab&day=54");
  await expect(page.locator(".lab-instructions")).not.toHaveAttribute("open");
  await expect(
    page.getByRole("button", { name: "运行代码", exact: true }),
  ).toBeVisible();
  const bounds = await page
    .getByRole("button", { name: "运行代码", exact: true })
    .boundingBox();
  expect(bounds!.y).toBeLessThan(844);
  await page.locator(".lab-instructions summary").click();
  await expect(page.locator(".lab-instructions .checklist")).toBeVisible();
  await page.locator(".lab-instructions summary").click();
  expect((await page.locator(".cm-content").boundingBox())!.y).toBeLessThan(
    420,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("clipboard rejection is announced without reporting a successful copy", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => Promise.reject(new Error("clipboard unavailable")),
      },
    });
  });
  await page.goto("/?view=lesson&day=1");
  await page.locator(".code-block-copy-btn").first().click();
  await expect(page.locator(".copy-error").first()).toContainText("未能复制");
  await expect(page.locator(".code-block-copy-btn").first()).toHaveAttribute(
    "aria-label",
    "复制代码",
  );
});

test("RTOS mobile exposes configuration and export; desktop tabs support arrow keys", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/rtos.html?scenario=mutex");
  await expect(page.locator(".timeline-segment")).toHaveCount(9);
  await expect(page.getByLabel("播放速度")).toBeVisible();
  await page.locator(".config-trigger-btn").click();
  const panel = page.getByRole("region", { name: "RTOS 内核配置" });
  await expect(panel).toBeVisible();
  const box = await panel.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await page.getByLabel("时间片 (ticks)").fill("3");
  await page.keyboard.press("Escape");
  await expect(page.locator(".config-trigger-btn")).toBeFocused();
  await page.locator(".config-trigger-btn").click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 V3 JSON" }).click();
  expect((await download).suggestedFilename()).toMatch(/rtos-trace-.*\.json/);
  await page.getByRole("button", { name: "完成", exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("tab", { name: "任务状态", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "内核对象", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toHaveAttribute(
    "aria-labelledby",
    "rtos-tab-objects",
  );
});

for (const width of [320, 768, 1440]) {
  test(`core surfaces remain within the ${width}px viewport`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const [route, selector] of [
      ["/", ".guide-title"],
      ["/?view=lessons", ".course-page"],
      ["/?view=guidelines", ".reading-page"],
      ["/?view=review", ".review-page"],
      ["/?view=search", ".search-clean-form"],
      ["/rtos.html", ".rtos-workbench"],
    ]) {
      await page.goto(route);
      await expect(page.locator(selector)).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        route,
      ).toBe(true);
    }
  });
}

test("memory workbench exposes keyboard output tabs and selected layout", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?view=visualizer");
  await expect(page.getByText("预置轨迹", { exact: true })).toBeVisible();
  const tabs = page.getByRole("tablist", { name: "输出类型", exact: true });
  await tabs.getByRole("tab", { name: "内存视图", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    tabs.getByRole("tab", { name: "终端", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowLeft");
  await expect(
    tabs.getByRole("tab", { name: "内存视图", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page
    .getByRole("group", { name: "内存布局" })
    .getByRole("button", { name: "上下", exact: true })
    .click();
  await expect(
    page
      .getByRole("group", { name: "内存布局" })
      .getByRole("button", { name: "上下", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".memory-canvas-root")).toHaveClass(
    /layout-vertical/,
  );
});

test("mobile output keeps playback controls through repeated steps and pane switches", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?view=visualizer");
  const play = page.getByRole("button", { name: "自动连续播放", exact: true });
  await expect(play).toBeVisible();
  const step = page.locator(".vscode-step-button");
  await step.click();
  await expect(step).toContainText("2/");
  await step.click();
  await expect(step).toContainText("3/");
  await expect(
    page.locator(".mobile-show-output .output-split-pane"),
  ).toBeVisible();
  await page.getByRole("button", { name: "源码", exact: true }).click();
  await expect(play).toBeVisible();
  await page.getByRole("button", { name: "输出", exact: true }).click();
  await expect(play).toBeVisible();
  await play.click();
  await expect(
    page.getByRole("button", { name: "暂停自动播放" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "暂停自动播放" }).click();
  await page.getByRole("button", { name: "重置到第一步", exact: true }).click();
  await expect(step).toContainText("1/");
});

test("home resumes a real local visit without claiming completion", async ({
  page,
}) => {
  await page.goto("/?view=lesson&day=7");
  await expect(page.locator(".lesson-document h1")).toBeVisible();
  await page.goto("/");
  await expect(page.locator(".guide-hero-cta .primary-button")).toContainText(
    "继续阅读 · Day 7",
  );
  await expect(page.locator(".guide-current-lesson")).toContainText(
    "不代表完成",
  );
  await page.locator(".guide-hero-cta .primary-button").click();
  await expect(page).toHaveURL(/day=7/);
});

test("clearing code search cancels pending input and restores focus", async ({
  page,
}) => {
  await page.goto("/?view=search");
  const input = page.getByRole("searchbox", { name: "搜索代码" });
  await input.fill("unique_ptr");
  await page.getByRole("button", { name: "清除搜索", exact: true }).click();
  await expect(input).toBeFocused();
  await page.waitForTimeout(400);
  await expect(input).toHaveValue("");
  expect(new URL(page.url()).searchParams.get("q")).toBeNull();
});
