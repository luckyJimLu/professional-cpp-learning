import { test, expect } from "@playwright/test";

test("第 3 课自动发现、备注隔离、步进图、大纲定位及旋转", async ({ page }) => {
  await page.goto("/?view=slides&deck=lesson-03");
  await expect(page.getByLabel("选择课程课件：")).toHaveValue("lesson-03");
  const stage = page.locator(".slide-stage-wrapper");
  const canvas = stage.locator(".slide-canvas-viewport");
  await expect(
    canvas.getByRole("heading", { name: "架构解耦与值语义多态", exact: true }),
  ).toBeVisible();
  await expect(canvas).not.toContainText("防君子不防编译器");
  await stage.getByRole("button", { name: /备注/ }).click();
  await expect(stage.getByRole("region", { name: "演讲者备注" })).toContainText(
    "防君子不防编译器",
  );
  await stage.getByRole("button", { name: /收起/ }).click();

  const jumper = stage.getByLabel("快速跳转幻灯片");
  const aliasPage = await jumper
    .getByRole("option", { name: /覆盖元素会改变后续删除目标/ })
    .getAttribute("value");
  await jumper.selectOption(aliasPage!);
  await expect(canvas.locator("svg")).toBeVisible();
  await expect(canvas).toContainText("有效结果：[1, 4, 42]");

  await page.getByRole("tab", { name: /授课大纲对照/ }).click();
  await expect(page.locator(".slides-syllabus-card")).toHaveCount(12);
  await page
    .locator(".slides-syllabus-card", { hasText: "PPT 8:" })
    .getByRole("button", { name: /跳转至对应课件/ })
    .click();
  await expect(
    canvas.getByRole("heading", {
      name: "Type Erasure 组合三种设计意图",
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    canvas.getByRole("heading", {
      name: "Type Erasure 组合三种设计意图",
      exact: true,
    }),
  ).toBeVisible();
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
  const finalPage = await jumper
    .getByRole("option", { name: /让架构决策成为团队习惯/ })
    .getAttribute("value");
  await jumper.selectOption(finalPage!);
  await expect(canvas).toContainText("后续实践预告");
});
