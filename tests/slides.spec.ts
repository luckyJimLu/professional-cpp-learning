import { test, expect } from "@playwright/test";

test.describe("Slides 课件模块展示与交互", () => {
  test("导航至课件视图并展示首屏封面与控制底栏", async ({ page }) => {
    await page.goto("/?view=slides");

    // 检查页面标题与主要标题
    await expect(page).toHaveTitle(/课件/);
    await expect(
      page.getByRole("heading", { name: "架构与设计模式课件" }),
    ).toBeVisible();

    // 检查 16:9 演示画布与控制栏
    const stage = page.locator(".slide-stage-wrapper");
    await expect(stage).toBeVisible();

    // 首屏默认展示第 1 页
    const counter = page.locator(".slide-stage-header .slide-counter");
    await expect(counter).toHaveText(/01\s*\/\s*37/);

    // 检查上一页与下一页按钮存在
    const prevBtn = page.getByRole("button", { name: /上一页/ });
    const nextBtn = page.getByRole("button", { name: /下一页/ });
    await expect(prevBtn).toBeDisabled();
    await expect(nextBtn).toBeEnabled();
  });

  test("支持点击下一页与快捷键切换幻灯片", async ({ page }) => {
    await page.goto("/?view=slides");

    const nextBtn = page.getByRole("button", { name: /下一页/ });
    await nextBtn.click();

    // 页面更新至第 2 页
    const counter = page.locator(".slide-stage-header .slide-counter");
    await expect(counter).toHaveText(/02\s*\/\s*37/);

    // 第 2 页包含「软件开发的三层金字塔」与 SVG 矢量图
    await expect(
      page.getByRole("heading", { name: "软件开发的三层金字塔" }),
    ).toBeVisible();
    await expect(page.locator(".pc-svg-hero svg")).toBeVisible();

    // 键盘 ArrowRight 切换到第 3 页
    await page.keyboard.press("ArrowRight");
    await expect(counter).toHaveText(/03\s*\/\s*37/);
    await expect(
      page.getByRole("heading", { name: "打破迷思：新特性 ≠ 好设计" }),
    ).toBeVisible();

    // 键盘 ArrowLeft 返回第 2 页
    await page.keyboard.press("ArrowLeft");
    await expect(counter).toHaveText(/02\s*\/\s*37/);
  });

  test("支持演讲者备注抽屉开关 (P 键与备注按钮)", async ({ page }) => {
    await page.goto("/?view=slides&slide=2");

    const notesBtn = page.getByRole("button", { name: /备注/ });
    await expect(page.locator(".slide-notes-drawer")).toHaveCount(0);

    // 点击打开备注
    await notesBtn.click();
    const notesDrawer = page.locator(".slide-notes-drawer");
    await expect(notesDrawer).toBeVisible();
    await expect(notesDrawer).toContainText("Klaus Iglberger");

    // 再次点击或按快捷键 P 切换
    await page.keyboard.press("p");
    await expect(notesDrawer).toHaveCount(0);
  });

  test("支持缩略图总览网格筛选与点击跳转", async ({ page }) => {
    await page.goto("/?view=slides");

    // 切换到缩略图总览
    await page.getByRole("tab", { name: /缩略图总览/ }).click();

    const grid = page.locator(".slides-grid");
    await expect(grid).toBeVisible();

    // 筛选「RAII」
    const filterInput = page.getByRole("searchbox", { name: /筛选/ });
    await filterInput.fill("RAII");

    // 搜索结果中应包含「RAII：C++ 皇冠上的明珠」
    const raiiCard = page.locator(".slide-card-item", {
      hasText: "RAII：C++ 皇冠上的明珠",
    });
    await expect(raiiCard).toBeVisible();

    // 点击卡片跳转进入演示模式
    await raiiCard.click();
    await expect(page.locator(".slide-stage-wrapper")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "RAII：C++ 皇冠上的明珠" }),
    ).toBeVisible();
  });

  test("支持授课大纲对照与对应课件定位", async ({ page }) => {
    await page.goto("/?view=slides");

    // 切换至大纲对照标签
    await page.getByRole("tab", { name: /授课大纲对照/ }).click();

    const syllabusList = page.locator(".slides-syllabus-list");
    await expect(syllabusList).toBeVisible();
    await expect(
      page.getByText("PPT 1: 课程开篇：语言特性 vs 软件设计"),
    ).toBeVisible();
    await expect(
      page.getByText("PPT 2: C++ 内存所有权模型（Memory Ownership）"),
    ).toBeVisible();

    // 点击跳转按钮
    const jumpBtn = page.locator(".slides-syllabus-card", {
      hasText: "PPT 2: C++ 内存所有权模型",
    }).getByRole("button", { name: /跳转至对应课件/ });

    await jumpBtn.click();
    await expect(page.locator(".slide-stage-wrapper")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "所有权，才是内存管理的真正问题" }),
    ).toBeVisible();
  });

  test("主界面左侧导航栏包含课件入口并高亮", async ({ page }) => {
    await page.goto("/?view=today");

    // 点击侧边栏的「课件」
    const slidesNav = page.locator(".side-nav button", { hasText: "课件" });
    await expect(slidesNav).toBeVisible();
    await slidesNav.click();

    // URL 与页面进入课件模块
    await expect(page).toHaveURL(/\?view=slides/);
    await expect(slidesNav).toHaveClass(/is-active/);
    await expect(
      page.getByRole("heading", { name: "架构与设计模式课件" }),
    ).toBeVisible();
  });
});
