import { expect, test } from "@playwright/test";

test("preset switching atomically updates source and memory trace", async ({
  page,
}) => {
  await page.goto("/?view=visualizer");
  await expect(page.getByText("预置轨迹", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "单链表就地反转", exact: true })
    .click();
  await expect(page.locator(".cm-content")).toContainText(
    "Node* prev = nullptr",
  );
  await expect(page.locator(".memory-step-caption")).toContainText(
    /链表|head|节点/,
  );
});

test("editing loaded source marks the trace stale", async ({ page }) => {
  await page.goto("/?view=visualizer");
  await page.locator(".cm-content").click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type(" ");
  await expect(
    page.getByText("代码已修改，点击“运行”更新内存轨迹", { exact: true }),
  ).toBeVisible();
});

test("trace import rejects malformed JSON and atomically loads a valid legacy trace", async ({
  page,
}) => {
  await page.goto("/?view=visualizer");
  await page.getByRole("button", { name: "剧本库 / 导入" }).click();
  await page.getByRole("button", { name: /粘贴 JSON 文本/ }).click();
  const input = page.getByLabel("粘贴轨迹 JSON");
  await input.fill('{"sourceCode":"int main() {}","snapshots":[{}]}');
  await page.getByRole("button", { name: "导入并解析" }).click();
  await expect(page.getByRole("alert")).toContainText("缺少 callStack");

  await input.fill(
    JSON.stringify({
      sourceCode: "int main() { int imported = 7; }",
      snapshots: [
        {
          line: 1,
          description: "imported snapshot",
          activeOp: "step",
          callStack: [
            {
              id: "frame-main",
              name: "main",
              variables: [
                { name: "imported", type: "int", value: "7", status: "normal" },
              ],
            },
          ],
          heap: [],
          pointers: [],
          stdout: "",
          warnings: [],
        },
      ],
    }),
  );
  await page.getByRole("button", { name: "导入并解析" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator(".cm-content")).toContainText("imported = 7");
  await expect(page.locator(".var-name")).toHaveText("imported");
});

test("VS Code toolbar above code view supports step execution and stays stationary while code scrolls", async ({
  page,
}) => {
  await page.goto("/?view=visualizer");
  const toolbar = page.locator(".vscode-code-toolbar");
  await expect(toolbar).toBeVisible();
  await expect(toolbar.locator(".vscode-file-tab")).toContainText("main.cpp");

  const initialBox = await toolbar.boundingBox();
  expect(initialBox).not.toBeNull();

  const stepBtn = toolbar.getByRole("button", { name: /单步/ });
  await expect(stepBtn).toBeVisible();
  await stepBtn.click();

  await expect(page.locator(".cm-active-execution-line")).toBeVisible();
  await expect(page.locator(".cm-debug-gutter-marker")).toBeVisible();

  const afterStepBox = await toolbar.boundingBox();
  expect(afterStepBox).not.toBeNull();
  expect(Math.abs((afterStepBox?.y ?? 0) - (initialBox?.y ?? 0))).toBeLessThan(
    1,
  );
});
