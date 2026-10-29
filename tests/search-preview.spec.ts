import { test, expect } from "@playwright/test";

for (const width of [320, 390, 800, 1440]) {
  test(`search preview keeps actions readable and focus recoverable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 800 ? 360 : 900 });
    await page.goto("/?view=search&q=unique_ptr");
    const result = page.locator(".search-result").first();
    await result.click();
    const preview = page.getByRole("region", { name: "代码预览" });
    await expect(preview.getByRole("heading", { level: 2 })).toBeFocused();
    await expect(preview.locator(".source-path")).toContainText(
      "daily/day-031-",
    );
    await expect(preview.locator(".source-viewer-kind")).toContainText(/L\d+/);
    for (const button of await preview.getByRole("button").all()) {
      const layout = await button.evaluate((node) => ({
        width: node.getBoundingClientRect().width,
        height: node.getBoundingClientRect().height,
        right: node.getBoundingClientRect().right,
        nowrap: getComputedStyle(node).whiteSpace,
      }));
      expect(layout.nowrap).toBe("nowrap");
      expect(layout.height).toBeGreaterThanOrEqual(width <= 760 ? 44 : 36);
      expect(layout.right).toBeLessThanOrEqual(width);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width <= 1100) {
      const previewBox = await preview.boundingBox();
      const resultBox = await result.boundingBox();
      expect(previewBox!.y).toBeLessThan(resultBox!.y);
    }
    const panelBox = await preview.boundingBox();
    const codeBox = await preview.locator("pre").boundingBox();
    expect(codeBox!.y + codeBox!.height).toBeLessThanOrEqual(
      panelBox!.y + panelBox!.height,
    );
    const query = new URL(page.url()).searchParams.get("q");
    await preview.getByRole("button", { name: "关闭预览" }).click();
    await expect(result).toBeFocused();
    await expect(preview).toHaveCount(0);
    expect(new URL(page.url()).searchParams.get("q")).toBe(query);
  });
}

test("preview reports clipboard rejection, allows retry, and preserves selected source on reload", async ({
  page,
}) => {
  await page.goto("/?view=search&q=unique_ptr");
  await page.locator(".search-result").first().click();
  await page.reload();
  const preview = page.getByRole("region", { name: "代码预览" });
  await expect(preview.locator(".source-viewer-kind")).toContainText(/L\d+/);
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("denied");
        },
      },
    }),
  );
  await preview.getByRole("button", { name: "复制代码", exact: true }).click();
  await expect(preview.getByRole("status")).toContainText("复制失败");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) =>
          sessionStorage.setItem("copied-preview", text),
      },
    }),
  );
  await preview.getByRole("button", { name: "复制代码", exact: true }).click();
  await expect(preview.getByRole("status")).toHaveText("代码已复制");
  expect(
    await page.evaluate(() => sessionStorage.getItem("copied-preview")),
  ).toContain("std::unique_ptr");
  await preview.getByRole("button", { name: "在 Lab 中运行" }).click();
  await expect(page).toHaveURL(/view=lab/);
  expect(
    await page.evaluate(() => sessionStorage.getItem("lab_custom_code")),
  ).toContain("std::unique_ptr");
});
