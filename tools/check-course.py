#!/usr/bin/env python3
"""Course content health check.

Scans daily/*.md and reports:
  - stub days (placeholder text or too short),
  - frontmatter problems (missing keys, bad lab path, broken prev/next chain),
  - example labs with no course referencing them,
  - runnable-example contract problems.

Runnable-example contract:
  - every published day must have examples/day-XXX/main.cpp,
  - every standalone C++ source under examples/day-XXX must define int main(),
  - exercise-XX.cpp and exercise-XX-solution.cpp are treated as standalone
    runnable programs when they exist.

Usage: python3 tools/check-course.py
Exit code is 0 when everything is healthy, 1 otherwise.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DAILY = ROOT / "daily"
EXAMPLES = ROOT / "examples"

REQUIRED_KEYS = [
    "day", "week", "part", "chapter", "chapter_title", "title",
    "duration", "status", "topics", "guidelines", "lab", "previous", "next",
]
STUB_MARKERS = ["历史课程迁移", "完整课程见 HTML", "完整内容见 HTML"]
STUB_MAX_LINES = 50
MAIN_RE = re.compile(r"\bint\s+main\s*\(")
# A file is "gold" when it has frontmatter, real sections, and no stub marker.
# "legacy" = readable content without complete metadata.
# "stub"   = placeholder only, needs a full rewrite.


def parse_frontmatter(text: str) -> dict:
    """Parse a simple YAML-ish frontmatter block into a flat dict.

    Only handles the subset this repo uses: scalar keys, list keys with
    '  - ' items, and one nested 'lab:' -> '  path:' mapping.
    """
    m = re.match(r"^---\n(.*?)\n---\n", text, re.DOTALL)
    if not m:
        return {}
    data: dict = {}
    current_list_key = None
    in_lab = False
    for line in m.group(1).splitlines():
        if re.match(r"^  - ", line) and current_list_key:
            data.setdefault(current_list_key, []).append(line[4:].strip())
            continue
        kv = re.match(r"^([a-z_]+):\s*(.*)$", line)
        if kv:
            key, value = kv.group(1), kv.group(2).strip()
            in_lab = key == "lab"
            current_list_key = key if value == "" and not in_lab else None
            if value != "":
                data[key] = value
            continue
        sub = re.match(r"^  ([a-z_]+):\s*(.*)$", line)
        if sub and in_lab:
            data[f"lab.{sub.group(1)}"] = sub.group(2).strip()
            current_list_key = None
    return data


def main() -> int:
    files = sorted(DAILY.glob("day-*.md"))
    problems: list[str] = []
    stubs: list[str] = []
    legacy: list[str] = []
    gold = 0
    days_seen: dict[int, str] = {}

    for path in files:
        name = path.name
        text = path.read_text(encoding="utf-8")
        lines = text.splitlines()
        fm = parse_frontmatter(text)

        day_m = re.match(r"day-(\d+)-", name)
        day = int(day_m.group(1)) if day_m else -1
        days_seen[day] = name

        is_stub = len(lines) < STUB_MAX_LINES or (
            any(marker in text for marker in STUB_MARKERS)
            and len(lines) < STUB_MAX_LINES
        )
        markers = re.findall(r"^## ([①②③④⑤⑥⑦⑧])", text, re.M)
        has_sections = set(markers) == set("①②③④⑤⑥⑦⑧") and len(markers) == 8
        if not has_sections:
            problems.append(f"{name}: requires all eight core learning stages")
        if any(marker in text for marker in STUB_MARKERS):
            problems.append(f"{name}: contains delivery placeholder text")
        if is_stub:
            stubs.append(f"{name} ({len(lines)} lines)")
            continue
        if fm and has_sections:
            gold += 1
        else:
            legacy.append(f"{name} ({len(lines)} lines)")

        if not fm:
            problems.append(f"{name}: no frontmatter (legacy format)")
        else:
            for key in REQUIRED_KEYS:
                if key == "lab":
                    continue
                if key not in fm:
                    problems.append(f"{name}: frontmatter missing '{key}'")

        lab_path = fm.get("lab.path", "")
        if lab_path and not (ROOT / lab_path).exists():
            problems.append(f"{name}: lab path does not exist: {lab_path}")

        if fm:
            try:
                if int(fm.get("day", -1)) != day:
                    problems.append(f"{name}: frontmatter day != filename day")
            except ValueError:
                problems.append(f"{name}: frontmatter day is not an integer")

    # prev/next chain integrity
    for day in sorted(days_seen):
        path = DAILY / days_seen[day]
        text = path.read_text(encoding="utf-8")
        if any(marker in text for marker in STUB_MARKERS):
            continue
        fm = parse_frontmatter(text)
        for rel, key in (("previous", "previous"), ("next", "next")):
            try:
                target = int(fm.get(key, -1))
            except ValueError:
                problems.append(f"{path.name}: {key} is not an integer")
                continue
            if target != -1 and target not in days_seen:
                if rel == "previous":
                    problems.append(
                        f"{path.name}: previous={target} has no file"
                    )

    # Orphan example labs.
    referenced = set()
    for path in files:
        fm = parse_frontmatter(path.read_text(encoding="utf-8"))
        if "lab.path" in fm:
            referenced.add(fm["lab.path"])
    for lab in sorted(EXAMPLES.glob("*/main.cpp")):
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
