import { expect, test } from "@playwright/test";

test("Day 33 compiles and runs in the browser", async ({ page }) => {
  await page.goto("/?view=lab&day=33");
  await page.getByRole("button", { name: "运行代码", exact: true }).click();
  await expect(page.getByText(/exit 0/i)).toBeVisible();
  await expect(
    page.getByText("Program exited successfully with no output."),
  ).toBeVisible();
});

test("Day 3 uses a full-width compiler workspace and complete fenced source", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto("/?view=lab&day=3");

  await expect(page.locator(".lab-task")).toContainText("实验 A");
  await expect(page.locator(".lab-task")).not.toContainText("} // namespace modem");
  await expect(page.locator(".lab-task")).not.toContainText("编译：");
  await expect(page.locator(".cm-content")).toContainText("CalculateTotalTimeoutMs");
  await page.locator(".cm-content").press("Control+End");
  await expect(page.locator(".cm-content")).toContainText("int main()");
  await expect(page.locator(".trace-toolbar")).toHaveCount(0);

  const workspaceWidth = await page.locator(".code-workbench").evaluate((element) => element.getBoundingClientRect().width);
  expect(workspaceWidth).toBeGreaterThan(1100);
  const editorDoesNotClip = await page.locator(".cm-scroller").evaluate(
    (element) => element.scrollWidth <= element.clientWidth + 2,
  );
  expect(editorDoesNotClip).toBe(true);
  await page.screenshot({ path: "test-results/lab-day3-desktop.png", fullPage: true });

  await page.setViewportSize({ width: 1000, height: 900 });
  await expect(page.getByRole("group", { name: "移动端工作区" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
