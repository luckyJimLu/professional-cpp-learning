import { readdirSync } from "node:fs";
import { test, expect } from "@playwright/test";

const days = readdirSync("daily")
  .filter((name) => /^day-\d+-.*\.md$/.test(name))
  .map((name) => Number(name.match(/^day-(\d+)/)![1]))
  .sort((a, b) => a - b);

test("every published course renders the beginner path and the actual lab and quiz in their learning stages", async ({
  page,
}) => {
  test.setTimeout(240_000);
  for (const day of days) {
    await page.goto(`/?view=lesson&day=${day}`);
    await expect(page.locator(".lesson-section"), `Day ${day}`).toHaveCount(8);
    await expect(page.locator("#section-read")).toContainText("新手起步");
    await expect(page.locator("#section-concept")).toContainText(
      "跟着本课实验走一遍",
    );
    await expect(page.locator("#section-rules h2")).toContainText("规范");
    await expect(page.locator("#section-lab")).toContainText("本课小改动");
    await expect(page.locator("#section-lab h2")).toContainText(
      /实验|Lab|练习|周工程/,
    );
    await expect(page.locator("#section-review h2")).toContainText("坑");
    await expect(page.locator("#section-pass h2")).toContainText(
      /检查|自测|测验|Quiz/,
    );
    await expect(page.locator("#section-pass")).toContainText("辨析题参考答案");
  }
});

test("beginner guide, prerequisite navigation, and answer disclosure work on a phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?view=lesson&day=1");
  await page
    .locator("#section-read")
    .getByRole("link", { name: "新手入门手册", exact: true })
    .click();
  await expect(page.locator(".topic-reader-main h1")).toContainText(
    "C++ 新手入门",
  );
  await page
    .locator(".topic-reader-main")
    .getByRole("link", { name: "逐课导航与前置知识", exact: true })
    .click();
  await expect(page.locator(".topic-reader-main h1")).toContainText(
    "逐课入门导航",
  );
  await page
    .locator(".topic-reader-main")
    .getByRole("link", { name: /Day 64 ·/ })
    .click();
  await expect(page).toHaveURL(/view=lesson/);
  await expect(page).toHaveURL(/day=64/);
  const source = page
    .locator("#section-lab")
    .getByRole("link", { name: "examples/day-064/main.cpp", exact: true });
  const sourceHref = await source.getAttribute("href");
  expect(sourceHref).toMatch(/\/assets\/main-.*\.cpp$/);
  const response = await page.request.get(sourceHref!);
  expect(response.ok()).toBe(true);
  expect(await response.text()).toContain("std::construct_at");
  const answer = page.locator("#section-pass details").first();
  await answer.locator("summary").click();
  await expect(answer).toHaveAttribute("open", "");
  await expect(answer).toContainText("不能无条件这样做");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
