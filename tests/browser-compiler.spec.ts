import { expect, test } from "@playwright/test";

test("Day 33 compiles and runs in the browser", async ({ page }) => {
  await page.goto("/?view=lab&day=33");
  await page.getByRole("button", { name: "运行代码", exact: true }).click();
  await expect(page.getByText(/exit 0/i)).toBeVisible();
  await expect(
    page.getByText("Program exited successfully with no output."),
  ).toBeVisible();
});
