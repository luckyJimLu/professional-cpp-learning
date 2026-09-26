import { expect, test } from "@playwright/test";

test("Day 33 compiles and runs in the browser", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Lab", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Compile Mode" })).toBeVisible();

  await page.getByRole("button", { name: /Compile & Run/ }).click();

  await expect(page.getByText("BUILD SUCCEEDED", { exact: true })).toBeVisible();
  await expect(page.getByText(/exit 0/i)).toBeVisible();
  await expect(page.getByText("Program exited successfully with no output.")).toBeVisible();
});
