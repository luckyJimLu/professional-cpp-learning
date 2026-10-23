import { expect, test } from "@playwright/test";

test("RTOS page renders a deterministic mutex trace and supports replay without loading clang worker", async ({
  page,
}) => {
  const clangRequests: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("clang")) clangRequests.push(req.url());
  });

  await page.goto("/rtos.html?scenario=mutex");
  await expect(page).toHaveTitle(/RTOS 并发模拟器/);
  await expect(page.getByRole("heading", { name: "任务时间轴" })).toBeVisible();
  await expect(page.locator(".timeline-segment")).toHaveCount(9);
  await page.getByRole("button", { name: "跳到结尾" }).click();
  await expect(page.locator(".task-card")).toContainText(["main", "low", "high"]);
  await expect(page.locator(".state-machine-diagram svg")).toBeVisible();

  await page.getByRole("tab", { name: "内核对象" }).click();
  await expect(page.locator(".object-card")).toContainText("bus");

  await page.getByRole("tab", { name: "任务栈视图" }).click();
  await expect(page.locator(".task-stack-col")).toHaveCount(3);

  await page.getByRole("button", { name: "回到开始" }).click();
  await page.getByRole("button", { name: "下一步" }).click();
  await expect(page.locator(".step-count")).toContainText("2 /");

  await page.getByRole("button", { name: "下一次切换 ⇥" }).click();
  await expect(page.locator(".event-caption")).toContainText("上下文切换");

  expect(clangRequests).toHaveLength(0);
});

test("scenario selection updates URL, source and trace", async ({ page }) => {
  await page.goto("/rtos.html");
  await page.getByLabel("场景").selectOption("queue");
  await expect(page).toHaveURL(/scenario=queue/);
  await expect(page.locator(".cm-content")).toContainText("message_queue");
  await expect(page.locator(".timeline-segment")).toHaveCount(9);
});

test("queue replay shows 42 entering before the consumer receives it", async ({ page }) => {
  await page.goto("/rtos.html?scenario=queue");
  await page.getByRole("tab", { name: "内核对象" }).click();

  const replay = page.getByLabel("回放步骤");
  await replay.fill("23");
  await expect(page.locator(".event-caption")).toContainText("发送消息 samples [42]");
  await expect(page.locator(".object-card")).toContainText("缓冲 [42]");

  await replay.fill("27");
  await expect(page.locator(".event-caption")).toContainText("接收消息 samples [42]");
  await expect(page.locator(".object-card")).toContainText("缓冲 [空]");
});

test("dining philosophers scenario displays deadlock warning and wait-for graph", async ({ page }) => {
  await page.goto("/rtos.html?scenario=dining-philosophers");
  await page.getByRole("button", { name: "跳到结尾" }).click();
  await expect(page.locator(".warning-box")).toContainText("检测到死锁环");
  await page.getByRole("tab", { name: "等待关系" }).click();
  await expect(page.locator(".deadlock-alert")).toContainText("死锁环");
  await expect(page.locator(".wait-graph-svg")).toBeVisible();
});

test("narrow layout keeps editor, trace and playback reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/rtos.html?scenario=semaphore");
  await expect(page.locator(".code-pane")).toBeVisible();
  await expect(page.locator(".timeline-panel")).toBeVisible();
  await expect(page.locator(".playback")).toBeVisible();
});

test("fullscreen toggle button is available and skip link is removed", async ({ page }) => {
  await page.goto("/rtos.html");
  await expect(page.locator(".skip-link")).toHaveCount(0);
  const fullscreenBtn = page.getByRole("button", { name: "全屏模式" });
  await expect(fullscreenBtn).toBeVisible();
});
