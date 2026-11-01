#!/usr/bin/env python3
"""Course content health check.

Scans daily/*.md and reports:
  - stub days (placeholder text or too short),
  - lesson metadata problems (missing keys, bad lab path, broken prev/next chain),
  - example labs with no course referencing them,
  - runnable-example contract problems.

Lesson metadata (week, chapter, duration, lab, previous/next, ...) lives in
daily/lessons.meta.json; the markdown files carry prose only.

Runnable-example contract:
  - every published day must have examples/day-XXX/main.cpp,
  - every standalone C++ source under examples/day-XXX must define int main(),
  - exercise-XX.cpp and exercise-XX-solution.cpp are treated as standalone
    runnable programs when they exist.

Usage: python3 tools/check-course.py
Exit code is 0 when everything is healthy, 1 otherwise.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DAILY = ROOT / "daily"
EXAMPLES = ROOT / "examples"
LESSON_META = DAILY / "lessons.meta.json"

REQUIRED_KEYS = [
    "week", "part", "chapter", "chapter_title", "title",
    "duration", "status", "topics", "guidelines", "lab", "previous", "next",
]
STUB_MARKERS = ["历史课程迁移", "完整课程见 HTML", "完整内容见 HTML"]
STUB_MAX_LINES = 50
MAIN_RE = re.compile(r"\bint\s+main\s*\(")
# A file is "gold" when it has a metadata entry, real sections, and no stub marker.
# "legacy" = readable content without complete metadata.
# "stub"   = placeholder only, needs a full rewrite.


def load_lesson_meta() -> list[dict]:
    data = json.loads(LESSON_META.read_text(encoding="utf-8"))
    entries = []
    for item in data.get("lessons", []):
        entry = dict(item)
        match = re.match(r"daily/day-(\d{3})-", str(entry.get("path", "")))
        entry["day"] = int(match.group(1)) if match else -1
        entries.append(entry)
    return entries


def main() -> int:
    files = sorted(DAILY.glob("day-*.md"))
    meta_entries = load_lesson_meta()
    meta_by_day = {entry["day"]: entry for entry in meta_entries}
    problems: list[str] = []
    stubs: list[str] = []
    legacy: list[str] = []
    gold = 0
    days_seen: dict[int, str] = {}

    for entry in meta_entries:
        rel = str(entry.get("path", ""))
        if not (ROOT / rel).is_file():
            problems.append(f"lessons.meta.json: {rel} has no markdown file")

    for path in files:
        name = path.name
        text = path.read_text(encoding="utf-8")
        lines = text.splitlines()

        day_m = re.match(r"day-(\d+)-", name)
        day = int(day_m.group(1)) if day_m else -1
        days_seen[day] = name
        meta = meta_by_day.get(day)

        is_stub = len(lines) < STUB_MAX_LINES or (
            any(marker in text for marker in STUB_MARKERS)
            and len(lines) < STUB_MAX_LINES
        )
        markers = re.findall(r"^## ([①②③④⑤⑥⑦⑧])", text, re.M)
        has_sections = markers == list("①②③④⑤⑥⑦⑧")
        if not has_sections:
            problems.append(f"{name}: requires all eight core learning stages in order")
        # The web reader maps stage numbers to actions. A numbered Lab in stage
        # 8 used to pass the presence check while the reader treated it as Quiz.
        stage_titles = dict(re.findall(r"^## ([⑤⑥⑦⑧])([^\n]*)", text, re.M))
        expected_titles = {
            "⑤": r"规范",
            "⑥": r"实验|Lab|练习|周工程",
            "⑦": r"坑",
            "⑧": r"检查|自测|测验|Quiz",
        }
        for marker, pattern in expected_titles.items():
            if not re.search(pattern, stage_titles.get(marker, ""), re.IGNORECASE):
                problems.append(f"{name}: stage {marker} has the wrong learning role")
        if re.search(r"^## [⑨⑩]", text, re.M):
            problems.append(f"{name}: extra numbered stages are not rendered by the eight-stage reader")
        if any(marker in text for marker in STUB_MARKERS):
            problems.append(f"{name}: contains delivery placeholder text")
        if is_stub:
            stubs.append(f"{name} ({len(lines)} lines)")
            continue
        if meta and has_sections:
            gold += 1
        else:
            legacy.append(f"{name} ({len(lines)} lines)")

        if meta is None:
            problems.append(f"{name}: no entry in daily/lessons.meta.json")
            continue
        if meta.get("path") != f"daily/{name}":
            problems.append(f"{name}: metadata path is {meta.get('path')!r}")
        for key in REQUIRED_KEYS:
            if key == "lab":
                continue
            if meta.get(key) in (None, "", []):
                problems.append(f"{name}: metadata missing '{key}'")

        lab_path = meta.get("lab", "")
        if lab_path and lab_path != "rtos-sim" and not (ROOT / lab_path).exists():
            problems.append(f"{name}: lab path does not exist: {lab_path}")

        if lab_path == "rtos-sim" and not meta.get("rtos_scenario"):
            problems.append(f"{name}: lab: rtos-sim requires rtos_scenario in metadata")

    # prev/next chain integrity
    for day in sorted(days_seen):
        meta = meta_by_day.get(day)
        if meta is None:
            continue
        for key in ("previous", "next"):
            target = meta.get(key)
            if not isinstance(target, int):
                problems.append(f"{days_seen[day]}: {key} is not an integer")
                continue
            if key == "previous" and target != -1 and target not in days_seen:
                problems.append(f"{days_seen[day]}: previous={target} has no file")

    # Orphan example labs (only day-* directories).
    referenced = {entry.get("lab", "") for entry in meta_entries if entry.get("lab")}
    for lab in sorted(EXAMPLES.glob("day-*/main.cpp")):
        rel = str(lab.relative_to(ROOT))
        if rel not in referenced:
            problems.append(f"{rel}: no daily course references this lab")

    # Runnable exercise contract.
    runnable_sources = 0
    exercise_sources = 0
    for day in sorted(days_seen):
        day_dir = EXAMPLES / f"day-{day:03d}"
        main_cpp = day_dir / "main.cpp"
        if not main_cpp.exists():
            problems.append(
                f"day-{day:03d}: missing standalone lab {main_cpp.relative_to(ROOT)}"
            )
            continue

        for source in sorted(day_dir.glob("*.cpp")):
            runnable_sources += 1
            if source.name.startswith("exercise-"):
                exercise_sources += 1
            source_text = source.read_text(encoding="utf-8")
            if not MAIN_RE.search(source_text):
                problems.append(
                    f"{source.relative_to(ROOT)}: standalone source must define int main()"
                )

    # Report.
    total = len(files)
    print(f"Days: {total} total | {gold} gold | "
          f"{len(legacy)} legacy | {len(stubs)} stubs")
    print(
        "Runnable C++ sources: "
        f"{runnable_sources} total | {exercise_sources} explicit exercises"
    )
    if stubs:
        print("\nStubs (need a full rewrite):")
        for s in stubs:
            print(f"  - {s}")
    if legacy:
        print("\nLegacy (readable, needs format upgrade to the gold template):")
        for s in legacy:
            print(f"  - {s}")
    if problems:
        print("\nProblems:")
        for p in problems:
            print(f"  ! {p}")
    else:
        print("\nNo structural problems found.")
    score = gold / total if total else 0
    print(f"\nGold-format completeness: {score:.0%}")
    return 1 if (stubs or problems) else 0


if __name__ == "__main__":
    sys.exit(main())
