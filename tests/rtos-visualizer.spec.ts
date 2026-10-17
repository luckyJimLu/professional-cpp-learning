import { expect, test } from "@playwright/test";

test("RTOS page renders a deterministic mutex trace and supports replay",async({page})=>{
  await page.goto("/rtos.html?scenario=mutex");
  await expect(page).toHaveTitle(/RTOS 并发模拟器/);
  await expect(page.getByRole("heading",{name:"任务时间轴"})).toBeVisible();
  await expect(page.locator(".timeline-segment")).toHaveCount(7);
  await page.getByRole("button",{name:"跳到结尾"}).click();
  await expect(page.locator(".task-card")).toContainText(["main","low","high"]);
  await page.getByRole("tab",{name:"内核对象"}).click();
  await expect(page.locator(".object-card")).toContainText("bus");
  await page.getByRole("button",{name:"回到开始"}).click();
  await page.getByRole("button",{name:"下一步"}).click();
  await expect(page.locator(".step-count")).toContainText("2 /");
});

test("scenario selection updates URL, source and trace",async({page})=>{
  await page.goto("/rtos.html");
  await page.getByLabel("场景").selectOption("queue");
  await expect(page).toHaveURL(/scenario=queue/);
  await expect(page.locator(".cm-content")).toContainText("message_queue");
  await expect(page.locator(".timeline-segment")).toHaveCount(7);
});

test("narrow layout keeps editor, trace and playback reachable",async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto("/rtos.html?scenario=semaphore");
  await expect(page.locator(".code-pane")).toBeVisible();
  await expect(page.locator(".timeline-panel")).toBeVisible();
  await expect(page.locator(".playback")).toBeVisible();
});
