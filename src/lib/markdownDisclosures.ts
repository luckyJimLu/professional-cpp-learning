import type { Root, RootContent, Paragraph, Blockquote } from "mdast";

// Support the repository's answer disclosures without enabling arbitrary HTML.
// Only details/summary wrappers become elements; all other raw HTML continues
// through react-markdown's normal escaped rendering.
export function answerDisclosures() {
  return (tree: Root) => {
    const output: RootContent[] = [];
    const stack: { children: RootContent[] }[] = [{ children: output }];
    const summary = (value: string): Paragraph => ({
      type: "paragraph",
      data: { hName: "summary" },
      children: [{ type: "text", value }],
    });
    for (const node of tree.children) {
      if (node.type === "html") {
        const opening = node.value.match(
          /^<details(\s+open)?>\s*(?:<summary>([\s\S]*?)<\/summary>)?\s*$/i,
        );
        if (opening) {
          const block: Blockquote = {
            type: "blockquote",
            data: {
              hName: "details",
              hProperties: opening[1] ? { open: true } : {},
            },
            children: opening[2] ? [summary(opening[2])] : [],
          };
          stack.at(-1)!.children.push(block);
          stack.push(block);
          continue;
        }
        if (/^<\/details>\s*$/i.test(node.value) && stack.length > 1) {
          stack.pop();
          continue;
        }
        const label = node.value.match(/^<summary>([\s\S]*?)<\/summary>\s*$/i);
        if (label && stack.length > 1) {
          stack.at(-1)!.children.push(summary(label[1]));
          continue;
        }
      }
      stack.at(-1)!.children.push(node);
    }
    tree.children = output;
  };
}
