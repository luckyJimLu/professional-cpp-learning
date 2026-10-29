import { test, expect } from "@playwright/test";
import type { Root } from "mdast";
import { answerDisclosures } from "../src/lib/markdownDisclosures";

test("answer wrappers become native disclosures while unrelated HTML stays escaped", () => {
  const tree: Root = {
    type: "root",
    children: [
      { type: "html", value: "<details>\n<summary>先思考，再展开</summary>" },
      { type: "paragraph", children: [{ type: "text", value: "答案" }] },
      { type: "html", value: "</details>" },
      { type: "html", value: '<script>alert("unsafe")</script>' },
      {
        type: "html",
        value: '<details onclick="alert(1)"><summary>不可信属性</summary>',
      },
    ],
  };
  answerDisclosures()(tree);
  expect(tree.children[0].data?.hName).toBe("details");
  expect(tree.children[0]).toMatchObject({
    children: [
      { data: { hName: "summary" }, children: [{ value: "先思考，再展开" }] },
      { children: [{ value: "答案" }] },
    ],
  });
  expect(tree.children[1]).toEqual({
    type: "html",
    value: '<script>alert("unsafe")</script>',
  });
  expect(tree.children[2].type).toBe("html");
});
