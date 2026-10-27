import { test, expect } from "@playwright/test";

test("第 2 课自动发现、备注隔离、大纲定位及横竖屏全屏", async ({ page }) => {
  await page.goto("/?view=slides");
  await page.getByLabel("选择课程课件：").selectOption("lesson-02");
  const stage = page.locator(".slide-stage-wrapper");
  await expect(
    stage.getByRole("heading", {
      name: "SOLID 与 GoF 的 Modern C++ 重构",
      exact: true,
    }),
  ).toBeVisible();
  await expect(stage.locator(".slide-canvas-viewport")).not.toContainText(
    "SOLID 是给 Java",
  );
  await stage.getByRole("button", { name: /备注/ }).click();
  await expect(stage.getByRole("region", { name: "演讲者备注" })).toContainText(
    "SOLID 是给 Java",
  );
  await stage.getByRole("button", { name: /收起/ }).click();
  await page.getByRole("tab", { name: /授课大纲对照/ }).click();
  await page
    .locator(".slides-syllabus-card", { hasText: "PPT 10:" })
    .getByRole("button", { name: /跳转至对应课件/ })
    .click();
  await expect(
    stage.getByRole("heading", {
      name: "variant 让图形回归独立值类型",
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    stage.getByRole("heading", {
      name: "variant 让图形回归独立值类型",
      exact: true,
    }),
  ).toBeVisible();
  await stage.getByLabel("快速跳转幻灯片").selectOption("30");
  await expect(stage.locator(".slide-canvas-viewport svg")).toBeVisible();
  await page.setViewportSize({ width: 360, height: 800 });
  await stage.getByRole("button", { name: "全屏", exact: true }).click();
  await expect(stage).toHaveClass(/is-fullscreen/);
  for (const viewport of [
    { width: 360, height: 800 },
    { width: 800, height: 360 },
  ]) {
    await page.setViewportSize(viewport);
    for (const control of await stage
      .locator(".slide-stage-footer button, select")
      .all()) {
      const box = (await control.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
    }
  }
  await stage.getByRole("button", { name: /退出全屏/ }).click();
  await stage.getByLabel("快速跳转幻灯片").selectOption("43");
  await expect(stage.locator(".slide-canvas-viewport")).toContainText(
    "下节预告",
  );
});
