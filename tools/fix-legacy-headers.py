#!/usr/bin/env python3
"""Fix legacy Gmail-converted headers.

The Gmail -> Markdown migration left section headers as plain-text lines like:
    ① 今日阅读范围 · 5 分钟**
instead of proper Markdown headings. This script converts them to:
    ## ① 今日阅读范围 · 5 分钟

Only touches lines that start with a circled digit ①-⑧ and contain a known
section keyword, so tree drawings and emoji markers are left alone.

Usage: python3 tools/fix-legacy-headers.py [--check]
  --check: dry run, print what would change.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DAILY = ROOT / "daily"

HEADER_RE = re.compile(r"^([①②③④⑤⑥⑦⑧])\s+(.*)$")
KEYWORDS = (
    "今日", "昨日", "核心", "编码规范", "实验", "代码练习",
    "常见坑", "检查题", "复盘", "阅读范围", "C vs", "C 写法",
)


def fix_line(line: str) -> str:
    stripped = line.rstrip("\n")
    if stripped.startswith("#"):
        return line
    m = HEADER_RE.match(stripped)
    if not m:
        return line
    num, rest = m.group(1), m.group(2).strip()
    if not any(k in rest for k in KEYWORDS):
        return line
    rest = re.sub(r"\*+$", "", rest).strip()  # drop trailing ** from bold
    rest = re.sub(r"\s+", " ", rest)
    return f"## {num} {rest}\n"


def main() -> int:
    check = "--check" in sys.argv
    changed_files = 0
    changed_lines = 0
    for path in sorted(DAILY.glob("day-*.md")):
        lines = path.read_text(encoding="utf-8").splitlines(keepends=True)
        fixed = [fix_line(l) for l in lines]
        n = sum(1 for a, b in zip(lines, fixed) if a != b)
        if n:
            changed_files += 1
            changed_lines += n
            print(f"{path.name}: {n} headers fixed")
            if not check:
                path.write_text("".join(fixed), encoding="utf-8")
    print(f"\n{changed_lines} headers in {changed_files} files"
          + (" (dry run)" if check else ""))
    return 0


if __name__ == "__main__":
    main()
