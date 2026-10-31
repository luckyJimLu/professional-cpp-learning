import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const totalEntries = [
  ...readFileSync("booklets/c.md", "utf8").matchAll(/<!-- entry:/g),
].length;

test("booklet navigation, keyword search, categories and history are usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("button", { name: "小册子", exact: true })
    .click();
  await expect(page).toHaveTitle("小册子 · Professional C++");
  await expect(page.locator(".booklet-entry")).toHaveCount(totalEntries);
  const search = page.getByRole("searchbox", { name: /^快速查找/ });
  await page.keyboard.press("/");
  await expect(search).toBeFocused();
  await search.fill("realloc 失败");
  await expect(page.locator(".booklet-entry")).toHaveCount(1);
  await expect(page.locator(".booklet-entry")).toContainText("临时指针");
  await expect(page).toHaveURL(/bq=/);
  await page.getByRole("button", { name: "清除小册子搜索" }).click();
  await expect(search).toBeFocused();
  await expect(page.locator(".booklet-entry")).toHaveCount(totalEntries);
  await page
    .getByRole("navigation", { name: "小册子目录" })
    .getByRole("link", { name: /^指针与内存/ })
    .click();
  await expect(page).toHaveURL(/category=memory/);
  await expect(page.locator(".booklet-entry")).toHaveCount(totalEntries);
  await expect(page.locator(".booklet-content > .booklet-section")).toHaveCount(
    11,
  );
  await expect(page.locator("#booklet-category-memory")).toBeFocused();
  await page.reload();
  await expect(
    page
      .getByRole("navigation", { name: "小册子目录" })
      .getByRole("link", { name: /^指针与内存/ }),
  ).toHaveAttribute("aria-current", "location");
  await search.fill("no_such_symbol_0099");
  await expect(
    page.getByRole("heading", { name: "没有找到匹配条目" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "清除搜索，查看全册" }).click();
  await expect(page.locator(".booklet-entry")).toHaveCount(totalEntries);
  await search.fill("QSORT");
  expect(await page.locator(".booklet-entry").count()).toBeGreaterThanOrEqual(
    1,
  );
  await expect(page.locator(".booklet-entry").first()).toHaveAttribute(
    "id",
    "booklet-qsort",
  );
});

test("IME commits only completed text and special characters are searched literally", async ({
  page,
}) => {
  await page.goto("/?view=booklets");
  const search = page.getByRole("searchbox", { name: /^快速查找/ });
  await search.dispatchEvent("compositionstart");
  await search.fill("字符串");
  await expect(page).not.toHaveURL(/bq=/);
  await search.dispatchEvent("compositionend");
  await expect(page).toHaveURL(/bq=/);
  await expect(page.locator(".booklet-result-count")).toContainText("字符串");
  await search.fill("%zu");
  await expect(page.locator("#booklet-printf")).toBeVisible();
  await search.fill("[");
  await expect(page.locator(".booklet-result-count")).toBeVisible();
});

for (const [width, height] of [
  [320, 780],
  [390, 844],
  [800, 360],
]) {
  test(`phone/landscape booklet selection and permalinks at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/?view=booklets&category=memory");
    await expect(page.locator(".booklet-entry")).toHaveCount(totalEntries);
    await expect(page.locator("#booklet-category-memory")).toBeFocused();
    const chapterBox = await page
      .locator("#booklet-category-memory")
      .boundingBox();
    const toolbarBox = (await page.locator(".booklet-toolbar").boundingBox())!;
    expect(chapterBox!.y).toBeGreaterThanOrEqual(toolbarBox.y + toolbarBox.height);
    await page.getByRole("searchbox", { name: /^快速查找/ }).fill("realloc");
    const heading = page.locator("#booklet-realloc h3");
    await heading.getByRole("link").click();
    await expect(heading).toBeFocused();
    await expect(page).toHaveURL(/entry=realloc/);
    const href = await heading.getByRole("link").getAttribute("href");
    expect(href).toContain("view=booklets");
    await page.reload();
    await expect(heading).toBeFocused();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const clear = page.getByRole("button", { name: "清除小册子搜索" });
    expect((await clear.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });
}

test("clipboard rejection and retry retain working code", async ({
  page,
}) => {
  await page.goto("/?view=booklets&bq=realloc&entry=realloc");
  await expect(
    page.getByRole("link", { name: "下载 Markdown", exact: true }),
  ).toHaveCount(0);
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
  const entry = page.locator("#booklet-realloc");
  await entry.getByRole("button", { name: "复制代码", exact: true }).click();
  await expect(entry.getByRole("status")).toContainText("未能复制");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) =>
          sessionStorage.setItem("copied-booklet", text),
      },
    }),
  );
  await entry.getByRole("button", { name: "复制代码", exact: true }).click();
  await expect(
    entry.getByRole("button", { name: "已复制", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => sessionStorage.getItem("copied-booklet")),
  ).toContain("realloc");
});

test("unknown entry has recovery and mobile navigation exposes booklets", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?view=booklets&entry=missing");
  await expect(page.locator(".booklet-notice")).toContainText("该条目不存在");
  await page.getByRole("button", { name: "查看全部条目" }).click();
  await expect(page).not.toHaveURL(/entry=/);
  await page.goto("/");
  await page.getByLabel("打开导航菜单", { exact: true }).click();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("button", { name: "小册子", exact: true })
    .click();
  await expect(page.locator("h1")).toHaveText("小册子");
  await expect(page.locator("#main-content")).toBeFocused();
});

test("single-page directory follows reading position and leaves all chapters available", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?view=booklets&category=memory");
  await expect(page.locator("#booklet-category-memory")).toBeFocused();
  await expect(page.locator(".booklet-entry")).toHaveCount(totalEntries);
  await page
    .locator("#booklet-category-files")
    .evaluate((node) => node.scrollIntoView({ block: "start" }));
  const directory = page.getByRole("navigation", { name: "小册子目录" });
  await expect(
    directory.getByRole("link", { name: /^文件与错误处理/ }),
  ).toHaveAttribute("aria-current", "location");
  await directory.getByRole("link", { name: /^数组与字符串/ }).click();
  await expect(page.locator("#booklet-category-arrays")).toBeFocused();
  await page.goBack();
  await expect(page.locator("#booklet-category-memory")).toBeFocused();
  await page.getByRole("searchbox", { name: /^快速查找/ }).fill("realloc");
  await expect(page.locator(".booklet-entry")).toHaveCount(1);
  await directory.getByRole("link", { name: /^输入与输出/ }).click();
  await expect(page.getByRole("searchbox", { name: /^快速查找/ })).toHaveValue(
    "",
  );
  await expect(page.locator(".booklet-entry")).toHaveCount(totalEntries);
  await expect(page.locator("#booklet-category-io")).toBeFocused();
});

test("extended C17 topics can be found directly instead of generic indexes", async ({
  page,
}) => {
  await page.goto("/?view=booklets");
  const search = page.getByRole("searchbox", { name: /^快速查找/ });
  for (const [query, id] of [
    ["va_copy", "variadic"],
    ["offsetof", "record-layout"],
    ["_Generic", "generic"],
    ["_Atomic", "atomics"],
    ["fseek", "stream-position"],
    ["setjmp", "nonlocal-jump"],
  ]) {
    await search.fill(query);
    await expect(page.locator(".booklet-entry").first()).toHaveAttribute(
      "id",
      `booklet-${id}`,
    );
  }
});

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`C and C++ booklets stay separate at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/?view=booklets&book=c&bq=malloc&category=memory");
    const languages = page.getByLabel("小册子语言", { exact: true });
    await languages.selectOption("cpp");
    await expect(page).toHaveURL(/book=cpp/);
    expect(new URL(page.url()).searchParams.has("bq")).toBe(false);
    expect(new URL(page.url()).searchParams.has("category")).toBe(false);
    await expect(languages).toHaveValue("cpp");
    await expect(page.locator("#booklet-top")).toHaveText("C++ 语言速查");
    const cppCount = [
      ...readFileSync("booklets/cpp.md", "utf8").matchAll(/<!-- entry:/g),
    ].length;
    await expect(page.locator(".booklet-entry")).toHaveCount(cppCount);
    await expect(page.locator(".booklet-section")).toHaveCount(
      [...readFileSync("booklets/cpp.md", "utf8").matchAll(/<!-- category:/g)]
        .length,
    );
    const search = page.getByRole("searchbox", { name: /^快速查找/ });
    await search.fill("std::make_unique");
    await expect(page.locator(".booklet-entry").first()).toContainText("C++14");
    const entry = page
      .locator(".booklet-entry")
      .first()
      .getByRole("heading")
      .getByRole("link");
    expect(
      new URL((await entry.getAttribute("href")) as string).searchParams.get(
        "book",
      ),
    ).toBe("cpp");
    await page.reload();
    await expect(search).toHaveValue("std::make_unique");
    await expect(
      page.getByRole("link", { name: "下载 Markdown", exact: true }),
    ).toHaveCount(0);
    await languages.selectOption("c");
    await expect(page.locator(".booklet-entry")).toHaveCount(totalEntries);
    await search.fill("unique_ptr");
    await expect(
      page.getByRole("heading", { name: "没有找到匹配条目" }),
    ).toBeVisible();
    await page.goBack();
    await expect(page.locator("#booklet-top")).toHaveText("C++ 语言速查");
    await expect(search).toHaveValue("std::make_unique");
    await page.getByRole("button", { name: "清除小册子搜索" }).click();
    if (viewport.width < 1100) {
      await page.goto("/?view=booklets&book=cpp&category=cpp-20");
    } else {
      await page
        .getByRole("navigation", { name: "小册子目录" })
        .getByRole("link", { name: /^C\+\+20 新特性/ })
        .click();
    }
    await expect(page.locator("#booklet-category-cpp-20")).toBeFocused();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/booklets/language-split-${viewport.width}.png`,
    });
  });
}

test("C++ attachment topics are searchable with corrected version boundaries", async ({
  page,
}) => {
  await page.goto("/?view=booklets&book=cpp");
  await expect(
    page.getByRole("link", { name: "下载 Markdown", exact: true }),
  ).toHaveCount(0);
  const search = page.getByRole("searchbox", { name: /^快速查找/ });
  for (const [query, id, text] of [
    ["explicit", "explicit", "C++20"],
    ["constinit", "constant-evaluation", "静态初始化"],
    ["try_emplace", "map-lookup", "C++17"],
    ["jthread", "threads-jthread", "协作式"],
    ["memory_order", "atomics", "不保证无锁"],
    ["import std", "modules", "C++23"],
    ["NRVO", "parameter-passing", "仍可选"],
    ["decltype", "auto-decltype", "悬空引用"],
    ["close", "file-stream", "关闭失败"],
  ]) {
    await search.fill(query);
    await expect(page.locator(`#booklet-${id}`)).toContainText(text);
  }
  await search.fill("no_matching_cpp_topic_888");
  await expect(
    page.getByRole("heading", { name: "没有找到匹配条目" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "清除搜索，查看全册" }).click();
  await expect(page.locator("#booklet-keyword-index")).toBeVisible();
});

for (const viewport of [
  { width: 320, height: 780 },
  { width: 390, height: 844 },
  { width: 800, height: 360 },
  { width: 1440, height: 1000 },
]) {
  test(`booklet tools stay reachable while reading at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/?view=booklets&book=cpp");
    const first = await page.locator(".booklet-entry").first().boundingBox();
    if (viewport.width <= 390) expect(first!.y).toBeLessThan(600);
    await page
      .locator("#booklet-category-streams")
      .evaluate((node) =>
        node.scrollIntoView({ block: "start", behavior: "instant" }),
      );
    const toolbar = page.locator(".booklet-toolbar");
    await expect(toolbar).toBeInViewport();
    await expect(
      page.getByRole("searchbox", { name: /^快速查找/ }),
    ).toBeInViewport();
    const languages = page.getByLabel("小册子语言", { exact: true });
    await expect(languages).toBeInViewport();
    const tools = (await toolbar.boundingBox())!;
    const chapter = (await page
      .locator("#booklet-category-streams")
      .boundingBox())!;
    expect(chapter.y).toBeGreaterThanOrEqual(tools.y + tools.height - 1);
    if (viewport.height < 480) expect(tools.height).toBeLessThan(80);
    await page.getByRole("button", { name: "返回顶部", exact: true }).click();
    await expect(page.locator("#booklet-top")).toBeFocused();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test("search index, Enter, Escape and return action preserve the booklet flow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?view=booklets&book=cpp&category=streams");
  const search = page.getByRole("searchbox", { name: /^快速查找/ });
  await search.fill("constexpr");
  const index = page.getByRole("navigation", { name: "搜索结果索引" });
  await expect(index).toBeVisible();
  const result = index
    .getByRole("link")
    .filter({ hasText: "if constexpr [C++17]" });
  const id = new URL((await result.getAttribute("href"))!).searchParams.get(
    "entry",
  );
  await result.click();
  const heading = page.locator(`#booklet-${id} h3`);
  await expect(heading).toBeFocused();
  const tools = (await page.locator(".booklet-toolbar").boundingBox())!;
  expect((await heading.boundingBox())!.y).toBeGreaterThanOrEqual(
    tools.y + tools.height,
  );
  await expect(heading.locator(".booklet-standard")).toHaveText("C++17");
  await page.getByRole("button", { name: "返回搜索结果", exact: true }).click();
  await expect(page).not.toHaveURL(/entry=/);
  await expect(page.locator(".booklet-result-count")).toBeFocused();
  await expect(index).toBeInViewport();
  await search.focus();
  await search.press("Enter");
  await expect(page.locator(".booklet-result-count")).toBeFocused();
  await search.focus();
  await search.press("Escape");
  await expect(search).toBeFocused();
  await expect(search).toHaveValue("");
  await expect(page).not.toHaveURL(/bq=/);
  await search.fill("   ");
  await expect(index).toHaveCount(0);
  await search.fill("unknown-booklet-term-321");
  await expect(
    page.getByRole("heading", { name: "没有找到匹配条目" }),
  ).toBeInViewport();
  await page.getByRole("button", { name: "清除搜索，查看全册" }).click();
  await expect(search).toBeFocused();
});
