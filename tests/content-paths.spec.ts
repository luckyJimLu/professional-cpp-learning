import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("content map links to environment and runnable cross-module labs", async ({
  page,
}) => {
  await page.goto("/?view=topics&topic=docs%2Fcontent-map.md");
  const article = page.locator(".topic-reader-main");
  await expect(article.locator("h1")).toContainText("内容总索引");
  await article
    .getByRole("link", { name: "实验环境矩阵", exact: true })
    .click();
  await expect(article.locator("h1")).toContainText("实验环境");
  await article.getByRole("link", { name: "内容总索引", exact: true }).click();
  await article
    .getByRole("link", { name: "Modem 数据通道贯穿实验", exact: true })
    .click();
  await expect(article.locator("h1")).toContainText("贯穿实验");
  const starter = article.getByRole("link", { name: "starter", exact: true });
  const sourceUrl = await starter.getAttribute("href");
  expect(sourceUrl).toMatch(/\/assets\/modem-channel-exercise.*\.cpp$/);
  const response = await page.request.get(sourceUrl!);
  expect(response.ok()).toBe(true);
  expect(await response.text()).toContain("EXPECTED GAP");
  await article.getByRole("link", { name: "工程工作坊", exact: true }).click();
  await expect(article.locator("h1")).toContainText("工程选型工作坊");
});

test("RTOS learning guide is readable on mobile without implying board validation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    "/?view=topics&topic=docs%2Frtos-simulator%2FLEARNING-GUIDE.md",
  );
  const article = page.locator(".topic-reader-main");
  await expect(article.locator("h1")).toContainText("9 场景");
  await expect(article).toContainText("不测量中断延迟");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

for (const [file, expected] of [
  [
    "modem-channel-exercise.cpp",
    "EXPECTED GAP: cancelled slots still consume capacity",
  ],
  ["modem-channel-solution.cpp", "All channel contract checks passed"],
]) {
  test(`${file} compiles in the browser with its documented result`, async ({
    page,
  }) => {
    const code = readFileSync(
      new URL(`../examples/${file}`, import.meta.url),
      "utf8",
    );
    await page.addInitScript((source) => {
      sessionStorage.setItem("lab_custom_code", source);
      sessionStorage.setItem("lab_custom_title", "Modem 贯穿实验");
    }, code);
    await page.goto("/?view=lab&day=1");
    await page.getByRole("button", { name: "运行代码", exact: true }).click();
    await expect(page.locator(".terminal-output")).toContainText(expected);
    await expect(page.locator(".terminal-output")).toContainText("exit 0");
  });
}
