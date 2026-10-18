#!/usr/bin/env python3
"""Format C++ code blocks embedded inside Markdown files using clang-format.

Applies modern C++ / Prettier-like 2-space indentation, attach braces,
and left pointer/reference alignment.
"""

from __future__ import annotations

import argparse
import glob
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Default directories containing markdown documents to format
DEFAULT_DIRS = [
    "daily",
    "frameworks",
    "books",
    "weekly",
    "patterns",
    "guidelines",
    "docs",
]

# Paths to strictly avoid modifying (e.g. verified migration files)
EXCLUDE_DIRS = [
    "node_modules",
    ".git",
    "dist",
    "references/system-design-notes",
]

STYLE = (
    "{BasedOnStyle: Google, "
    "IndentWidth: 2, "
    "ColumnLimit: 100, "
    "PointerAlignment: Left, "
    "BreakBeforeBraces: Attach, "
    "AccessModifierOffset: -2, "
    "AllowShortFunctionsOnASingleLine: Empty, "
    "Standard: Latest}"
)


def find_clang_format() -> str:
    which = shutil.which("clang-format")
    if which:
        return which

    # Look in npm npx cache
    home = Path.home()
    candidates = list(home.glob(".npm/_npx/**/clang-format/bin/linux_x64/clang-format"))
    if candidates and candidates[0].is_file() and os.access(candidates[0], os.X_OK):
        return str(candidates[0])

    return "clang-format"


CLANG_FORMAT_BIN = find_clang_format()


def format_cpp_snippet(code: str) -> str:
    """Run clang-format on a snippet. If formatting fails, returns original code."""
    if not code.strip():
        return code

    try:
        proc = subprocess.run(
            [CLANG_FORMAT_BIN, f"--style={STYLE}", "--assume-filename=snippet.cpp"],
            input=code,
            capture_output=True,
            text=True,
            check=True,
        )
        formatted = proc.stdout
        # Normalize trailing whitespace
        return formatted.rstrip() + "\n"
    except Exception:
        return code


FENCE_START_RE = re.compile(r"^([`~]{3,})\s*(cpp|c\+\+|cxx)\s*$", re.IGNORECASE)


def format_markdown_content(content: str) -> tuple[str, int]:
    """Parse markdown lines, format C++ fences, and return (new_content, count_formatted)."""
    lines = content.splitlines(keepends=True)
    out_lines: list[str] = []
    in_fence = False
    fence_char = ""
    fence_len = 0
    buffer: list[str] = []
    count = 0

    for line in lines:
        stripped = line.rstrip("\r\n")
        if not in_fence:
            m = FENCE_START_RE.match(stripped)
            if m:
                in_fence = True
                fence_str = m.group(1)
                fence_char = fence_str[0]
                fence_len = len(fence_str)
                out_lines.append(line)
                buffer = []
            else:
                out_lines.append(line)
        else:
            # Check if this line closes the fence
            is_close = (
                stripped.startswith(fence_char * fence_len)
                and stripped.replace(fence_char, "").strip() == ""
            )
            if is_close:
                in_fence = False
                original_code = "".join(buffer)
                formatted_code = format_cpp_snippet(original_code)
                if formatted_code != original_code:
                    count += 1
                out_lines.append(formatted_code)
                out_lines.append(line)
                buffer = []
            else:
                buffer.append(line)

    if in_fence and buffer:
        out_lines.extend(buffer)

    return "".join(out_lines), count


def should_skip(path: Path) -> bool:
    rel = path.relative_to(ROOT).as_posix()
    for exc in EXCLUDE_DIRS:
        if rel == exc or rel.startswith(exc + "/"):
            return True
    return False


def format_cpp_file(path: Path, check: bool) -> bool:
    """Format a standalone .cpp / .h file."""
    try:
        orig = path.read_text(encoding="utf-8")
        proc = subprocess.run(
            [CLANG_FORMAT_BIN, f"--style={STYLE}", f"--assume-filename={path.name}"],
            input=orig,
            capture_output=True,
            text=True,
            check=True,
        )
        formatted = proc.stdout
        if formatted != orig:
            if not check:
                path.write_text(formatted, encoding="utf-8")
            return True
        return False
    except Exception:
        return False


def collect_markdown_files(targets: list[str]) -> list[Path]:
    files: list[Path] = []
    for target in targets:
        p = ROOT / target
        if p.is_file() and p.suffix.lower() == ".md":
            if not should_skip(p):
                files.append(p)
        elif p.is_dir():
            for f in sorted(p.rglob("*.md")):
                if not should_skip(f):
                    files.append(f)
    return files


def collect_example_files() -> list[Path]:
    examples_dir = ROOT / "examples"
    if not examples_dir.is_dir():
        return []
    return sorted(
        [
            f
            for f in examples_dir.rglob("*")
            if f.is_file() and f.suffix in {".cpp", ".h", ".hpp"} and not should_skip(f)
        ]
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "paths",
        nargs="*",
        default=[],
        help="Directories or files to process (default: markdown dirs)",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Check if files need formatting without writing changes",
    )
    parser.add_argument(
        "--examples",
        action="store_true",
        help="Format examples directory source files",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Format both markdown documents and examples",
    )
    args = parser.parse_args()

    targets = args.paths if args.paths else DEFAULT_DIRS
    do_markdown = not args.examples or args.all
    do_examples = args.examples or args.all

    modified_files = 0
    total_blocks_formatted = 0
    total_files_checked = 0

    if do_markdown:
        md_files = collect_markdown_files(targets)
        total_files_checked += len(md_files)
        for f in md_files:
            original = f.read_text(encoding="utf-8")
            new_content, count = format_markdown_content(original)
            if count > 0 and new_content != original:
                modified_files += 1
                total_blocks_formatted += count
                rel = f.relative_to(ROOT)
                if args.check:
                    print(f"[NEEDS FORMATTING] {rel} ({count} blocks)")
                else:
                    f.write_text(new_content, encoding="utf-8")
                    print(f"[FORMATTED] {rel} ({count} blocks)")

    if do_examples:
        cpp_files = collect_example_files()
        total_files_checked += len(cpp_files)
        cpp_modified = 0
        for f in cpp_files:
            if format_cpp_file(f, args.check):
                cpp_modified += 1
                modified_files += 1
                rel = f.relative_to(ROOT)
                if args.check:
                    print(f"[NEEDS FORMATTING] {rel}")
                else:
                    print(f"[FORMATTED] {rel}")

    print("-" * 50)
    mode = "Would format" if args.check else "Formatted"
    print(
        f"{mode} {total_blocks_formatted} markdown C++ blocks and "
        f"{modified_files} modified files (total {total_files_checked} files checked)."
    )
    return 1 if (args.check and modified_files > 0) else 0


if __name__ == "__main__":
    sys.exit(main())
