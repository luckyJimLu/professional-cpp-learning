"""Check the final course against both knowledge and visual source fields."""
from pathlib import Path
import re
import unittest

from check_slides import extract_notes_and_canvas, parse_outline_lesson, split_slides

ROOT = Path(__file__).resolve().parents[4]


def compact_code(text):
    return re.sub(r"\s+", "", text)


class LessonThreeSourceFidelity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.outline = parse_outline_lesson((ROOT / "PPT/设计模式大纲.md").read_text(), 3)
        cls.slides = split_slides((ROOT / "slides/lesson-03.md").read_text())

    def test_all_units_have_two_to_four_pages(self):
        self.assertEqual(set(self.outline), set(range(1, 13)))
        for ppt in self.outline:
            with self.subTest(ppt=ppt):
                count = sum(fm.get("ppt") == str(ppt) for fm, _ in self.slides)
                self.assertGreaterEqual(count, 2)
                self.assertLessEqual(count, 4)

    def test_original_speaker_notes_are_complete_in_the_correct_unit(self):
        for ppt, unit in self.outline.items():
            notes = "\n".join(extract_notes_and_canvas(body)[1]
                              for fm, body in self.slides if fm.get("ppt") == str(ppt))
            with self.subTest(ppt=ppt):
                self.assertIn(unit["notes"].strip().removesuffix("---").strip(), notes)

    def test_original_code_survives_splitting_across_pages(self):
        for ppt, unit in self.outline.items():
            canvases = "\n".join(extract_notes_and_canvas(body)[0]
                                 for fm, body in self.slides if fm.get("ppt") == str(ppt))
            actual = "\n".join(re.findall(r"```cpp\n(.*?)```", canvases, re.DOTALL))
            for field in ("focus", "visual"):
                for original in re.findall(r"```cpp\n(.*?)```", unit[field], re.DOTALL):
                    with self.subTest(ppt=ppt, field=field):
                        self.assertIn(compact_code(original), compact_code(actual))

    def test_benchmark_cells_are_preserved(self):
        for ppt in (3, 9):
            canvas = "\n".join(extract_notes_and_canvas(body)[0]
                               for fm, body in self.slides if fm.get("ppt") == str(ppt))
            for row in self.outline[ppt]["visual"].splitlines():
                if row.strip().startswith("|"):
                    with self.subTest(ppt=ppt, row=row):
                        self.assertIn(row.strip(), canvas)
