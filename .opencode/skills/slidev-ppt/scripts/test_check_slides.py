#!/usr/bin/env python3
"""Regression tests for check_slides.py (stdlib unittest, runnable standalone)."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import check_slides as cs


COVER = """---
theme: default
title: Test Deck
lesson: 第 {n} 课 · Foo
lang: zh-CN
colorSchema: dark
canvasWidth: 980
transition: fade
layout: cover
ppt: 1
---

# Cover

<!--
cover note
-->
"""

OUTLINE = """## 📌 第 1 课：Foo

### PPT 1: 单元标题
* **重点内容**：
  * 关键概念 A 的描述。
* **呈现方式**：
  * 一个矩阵表格。
* **演讲要点**：
  * 开场讲一个独家故事："张三丰武当悟道记" 非常精彩。
  * 使用 Widget* 指针只是非拥有视图。
"""


def slide(body: str, ppt: int = 1, note: str = "普通备注。", next_hook: str | None = None) -> str:
    hook = ""
    if next_hook is not None:
        hook = f'\n\n<div class="pc-next">{next_hook}</div>'
    return f"""---
ppt: {ppt}
---

{body}{hook}

<!--
{note}
-->
"""


class CheckSlidesTests(unittest.TestCase):
    def _write(self, text: str, name: str) -> Path:
        tmp = Path(tempfile.mkdtemp()) / name
        tmp.write_text(text, encoding="utf-8")
        return tmp

    def test_lesson_identity_mismatch(self) -> None:
        deck = self._write(COVER.format(n=1) + slide("# Page Two"), "lesson-01.md")
        outline = self._write(OUTLINE, "outline.md")
        errors, _ = cs.validate_deck(deck, outline, lesson_num=2, allow_partial=True)
        self.assertTrue(
            any("[Lesson Identity]" in e for e in errors),
            f"expected lesson-identity error, got {errors}",
        )

    def test_notes_only_phrase_leak(self) -> None:
        body = "# 泄露页\n\n张三丰武当悟道记"
        deck = self._write(COVER.format(n=1) + slide(body), "lesson-01.md")
        outline = self._write(OUTLINE, "outline.md")
        errors, _ = cs.validate_deck(deck, outline, lesson_num=1)
        self.assertTrue(
            any("[Field-Boundary Leak" in e and "张三丰武当悟道记" in e for e in errors),
            f"expected field-boundary leak, got {errors}",
        )

    def test_hallucinated_std_prefix(self) -> None:
        body = "# std 伪造\n\n```cpp\nstd::Widget* w = MakeWidget();\n```"
        deck = self._write(COVER.format(n=1) + slide(body), "lesson-01.md")
        outline = self._write(OUTLINE, "outline.md")
        errors, _ = cs.validate_deck(deck, outline, lesson_num=1)
        self.assertTrue(
            any("Hallucinated 'std::Widget'" in e for e in errors),
            f"expected hallucinated std error, got {errors}",
        )

    def test_click_mismatch(self) -> None:
        body = "# 点击页\n\n<div v-click>要点</div>"
        deck = self._write(COVER.format(n=1) + slide(body, note="没有点击标记"), "lesson-01.md")
        errors, _ = cs.validate_deck(deck)
        self.assertTrue(
            any("Click mismatch" in e for e in errors),
            f"expected click mismatch, got {errors}",
        )

    def test_unknown_pc_class(self) -> None:
        body = '# 未知类\n\n<div class="pc-bogus">x</div>'
        deck = self._write(COVER.format(n=1) + slide(body), "lesson-01.md")
        errors, _ = cs.validate_deck(deck)
        self.assertTrue(
            any("Unknown pc-* class" in e for e in errors),
            f"expected unknown class error, got {errors}",
        )

    def test_clean_minimal_deck_passes(self) -> None:
        deck = self._write(COVER.format(n=1) + slide("# Page Two"), "lesson-01.md")
        errors, _ = cs.validate_deck(deck)
        self.assertEqual(errors, [], f"expected no errors, got {errors}")

    def test_derive_leak_candidates_ignores_canvas_corpus(self) -> None:
        focus = "关键概念 A 的描述。"
        visual = "一个矩阵表格。"
        notes = '关键概念 A 的描述非常重要。独家故事："张三丰武当悟道记"。'
        cands = cs.derive_leak_candidates(focus, visual, notes)
        self.assertNotIn("关键概念 A 的描述", cands)
        self.assertTrue(any("张三丰武当悟道记" in c for c in cands), cands)

    def test_real_lesson_01_still_passes(self) -> None:
        deck = Path(__file__).resolve().parents[4] / "slides" / "lesson-01.md"
        outline = Path(__file__).resolve().parents[4] / "PPT" / "设计模式大纲.md"
        if not deck.exists() or not outline.exists():
            self.skipTest("lesson-01 deck / outline not present")
        errors, warnings = cs.validate_deck(deck, outline, lesson_num=1)
        self.assertEqual(errors, [], f"lesson-01 must stay error-free, got {errors}")


if __name__ == "__main__":
    unittest.main()
