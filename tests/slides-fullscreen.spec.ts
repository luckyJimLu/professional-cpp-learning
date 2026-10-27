import { test, expect } from "@playwright/test";

test("课件全屏适配竖屏、横屏与旋转", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/?view=slides");
  const stage = page.locator(".slide-stage-wrapper");
  await stage.getByRole("button", { name: "全屏", exact: true }).click();
  await expect(stage).toHaveClass(/is-fullscreen/);

  for (const viewport of [
    { width: 360, height: 800 },
    { width: 573, height: 1280 },
    { width: 800, height: 360 },
    { width: 1280, height: 573 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await expect
      .poll(async () =>
        stage.evaluate((el) => ({
          width: el.clientWidth,
          height: el.clientHeight,
        })),
      )
      .toEqual(viewport);
    expect(await stage.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
      true,
    );
    const canvas = stage.locator(".slide-canvas-viewport");
    expect((await canvas.boundingBox())!.height).toBeGreaterThan(100);
    for (const control of await stage
      .locator(".slide-stage-footer button, select")
      .all()) {
      const box = (await control.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
    }
    const layout = (await stage.locator(".slidev-layout").boundingBox())!;
    expect(layout.y).toBeGreaterThanOrEqual((await canvas.boundingBox())!.y);
  }

  await stage.getByRole("button", { name: /备注/ }).click();
  await expect(stage.getByRole("region", { name: "演讲者备注" })).toBeVisible();
  await stage.getByRole("button", { name: /退出全屏/ }).click();
  await expect(stage).not.toHaveClass(/is-fullscreen/);
});
