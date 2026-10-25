#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILL_SCRIPTS = ROOT / ".opencode" / "skills" / "slidev-ppt" / "scripts"
CHECKER = SKILL_SCRIPTS / "check_slides.py"
OUTLINE = ROOT / "PPT" / "设计模式大纲.md"
SLIDES_DIR = ROOT / "slides"


def lesson_number(deck: Path) -> int | None:
    match = re.fullmatch(r"lesson-0*(\d+)\.md", deck.name)
    return int(match.group(1)) if match else None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--strict", action="store_true")
    parser.add_argument("--no-tests", action="store_true")
    args = parser.parse_args()

    decks = sorted(p for p in SLIDES_DIR.glob("lesson-*.md") if lesson_number(p))
    if not decks:
        print(f"No slides/lesson-*.md decks found under {SLIDES_DIR}")
        return 1

    failures = 0
    for deck in decks:
        number = lesson_number(deck)
        print(f"=== validate {deck.relative_to(ROOT)} (lesson {number}) ===", flush=True)
        cmd = [sys.executable, str(CHECKER), str(deck), "--lesson", str(number)]
        if OUTLINE.exists():
            cmd += ["--outline", str(OUTLINE)]
        if args.strict:
            cmd.append("--strict")
        if subprocess.run(cmd).returncode != 0:
            failures += 1

    if not args.no_tests:
        print("=== slidev-ppt skill regression tests ===", flush=True)
        if subprocess.run([
            sys.executable, "-m", "unittest", "discover",
            "-s", str(SKILL_SCRIPTS), "-p", "test_*.py",
        ]).returncode != 0:
            failures += 1

    print(f"\nPPT check: {'PASSED' if failures == 0 else f'FAILED ({failures})'}", flush=True)
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
