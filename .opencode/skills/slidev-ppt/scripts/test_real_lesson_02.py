"""Guard lesson 2 against omissions of source code and speaker-only material."""
from pathlib import Path
import re
import textwrap
import unittest

from check_slides import extract_notes_and_canvas, parse_outline_lesson, split_slides

ROOT = Path(__file__).resolve().parents[4]


class LessonTwoSourceFidelity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.outline = parse_outline_lesson((ROOT / "PPT/设计模式大纲.md").read_text(), 2)
        cls.deck = (ROOT / "slides/lesson-02.md").read_text()
        cls.slides = split_slides(cls.deck)

    def test_every_unit_has_two_to_four_slides(self):
        self.assertEqual(set(self.outline), set(range(1, 13)))
        for ppt in self.outline:
            with self.subTest(ppt=ppt):
                count = sum(fm.get("ppt") == str(ppt) for fm, _ in self.slides)
                self.assertGreaterEqual(count, 2)
                self.assertLessEqual(count, 4)

    def test_original_speaker_notes_are_complete_in_the_correct_unit(self):
        for ppt, unit in self.outline.items():
            notes = "\n".join(
                extract_notes_and_canvas(body)[1]
                for fm, body in self.slides if fm.get("ppt") == str(ppt)
            )
            original = unit["notes"].strip().removesuffix("---").strip()
            with self.subTest(ppt=ppt):
                self.assertIn(original, notes)

    def test_original_visual_code_is_preserved_in_the_correct_canvas(self):
        for ppt, unit in self.outline.items():
            canvas = "\n".join(
                extract_notes_and_canvas(body)[0]
                for fm, body in self.slides if fm.get("ppt") == str(ppt)
            )
            for code in re.findall(r"```cpp\n(.*?)```", unit["visual"], flags=re.DOTALL):
                with self.subTest(ppt=ppt):
                    self.assertIn(textwrap.dedent(code).strip(), canvas)


if __name__ == "__main__":
    unittest.main()
