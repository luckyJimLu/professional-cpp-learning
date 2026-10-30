import { test, expect } from "@playwright/test";

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]) {
  test(`topics, booklets and slides share a centered ${viewport.width}x${viewport.height} frame`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);

    await page.goto(
      "/?view=topics&topicCategory=books&topic=references%2Freading-paths%2Fcpp-compiler-abi.md",
    );
    await expect(page.locator(".topic-document-centered h1")).toBeVisible();
    const topicFrame = (await page.locator(".topic-reading").boundingBox())!;
    const topicNav = (await page.locator(".topic-reader-tools").boundingBox())!;
    const topicMain = (await page.locator(".topic-reader-main").boundingBox())!;
    const shellBox = (await page.locator(".main-shell").boundingBox())!;

    // Frame is horizontally centered inside .main-shell
    const leftGap = topicFrame.x - shellBox.x;
    const rightGap =
      shellBox.x + shellBox.width - (topicFrame.x + topicFrame.width);
    expect(Math.abs(leftGap - rightGap)).toBeLessThanOrEqual(2);

    // Navigate via sidebar to Booklets: stale topic params must be cleaned
    await page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("button", { name: "小册子", exact: true })
      .click();
    await expect(page).toHaveURL(/\?view=booklets$/);
    await expect(page.locator(".booklet-directory")).toBeVisible();

    const bookletFrame = (await page.locator(".booklets-page").boundingBox())!;
    const bookletNav = (await page
      .locator(".booklet-directory")
      .boundingBox())!;
    const bookletMain = (await page.locator(".booklet-content").boundingBox())!;

    expect(Math.abs(bookletFrame.x - topicFrame.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(bookletFrame.width - topicFrame.width)).toBeLessThanOrEqual(
      1,
    );
    expect(Math.abs(bookletNav.width - topicNav.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(bookletMain.x - topicMain.x)).toBeLessThanOrEqual(1);

    // Navigate via sidebar to Slides: stale params remain clean and stage fits viewport
    await page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("button", { name: "课件", exact: true })
      .click();
    await expect(page).toHaveURL(/\?view=slides$/);
    const slidesFrame = (await page.locator(".slides-page").boundingBox())!;
    expect(Math.abs(slidesFrame.x - topicFrame.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(slidesFrame.width - topicFrame.width)).toBeLessThanOrEqual(
      1,
    );

    const footerBox = (await page
      .locator(".slide-stage-footer")
      .boundingBox())!;
    expect(footerBox.y + footerBox.height).toBeLessThanOrEqual(
      viewport.height + 1,
    );

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test("mobile 390x844 layout has no horizontal overflow across topics, booklets and slides", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const url of [
    "/?view=topics&topicCategory=books&topic=references%2Freading-paths%2Fcpp-compiler-abi.md",
    "/?view=booklets",
    "/?view=slides",
  ]) {
    await page.goto(url);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
