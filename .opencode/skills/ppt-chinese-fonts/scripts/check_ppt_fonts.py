#!/usr/bin/env python3
"""Check locally available CJK presentation fonts without modifying the system."""

from __future__ import annotations

import argparse
import json
import os
import platform
import re
import shutil
import subprocess
from pathlib import Path


CANDIDATES = {
    "zh-CN": [
        "Noto Sans CJK SC",
        "Source Han Sans SC",
        "Noto Sans SC",
        "Microsoft YaHei",
        "PingFang SC",
    ],
    "zh-TW": [
        "Noto Sans CJK TC",
        "Source Han Sans TC",
        "Noto Sans TC",
        "PingFang TC",
        "Microsoft JhengHei",
    ],
    "zh-HK": [
        "Noto Sans CJK HK",
        "Source Han Sans HC",
        "Noto Sans HK",
        "PingFang HK",
        "Microsoft JhengHei",
    ],
    "ja-JP": [
        "Noto Sans CJK JP",
        "Source Han Sans JP",
        "Noto Sans JP",
        "Yu Gothic",
        "Hiragino Sans",
    ],
    "ko-KR": [
        "Noto Sans CJK KR",
        "Source Han Sans KR",
        "Noto Sans KR",
        "Malgun Gothic",
        "Apple SD Gothic Neo",
    ],
}

MONO_CANDIDATES = [
    "JetBrains Mono",
    "Noto Sans Mono CJK SC",
    "Sarasa Mono SC",
    "Fira Code",
    "Source Han Mono SC",
    "DejaVu Sans Mono",
]


def normalize(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", name.casefold())


def fontconfig_families() -> set[str]:
    if not shutil.which("fc-list"):
        return set()
    result = subprocess.run(
        ["fc-list", "--format=%{family}\\n"],
        check=False,
        capture_output=True,
        text=True,
        timeout=20,
    )
    if result.returncode != 0:
        return set()
    families: set[str] = set()
    for line in result.stdout.splitlines():
        families.update(part.strip() for part in line.split(",") if part.strip())
    return families


def windows_registry_families() -> set[str]:
    if platform.system() != "Windows":
        return set()
    try:
        import winreg
    except ImportError:
        return set()
    families: set[str] = set()
    key_path = r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts"
    try:
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path) as key:
            index = 0
            while True:
                try:
                    name, _, _ = winreg.EnumValue(key, index)
                except OSError:
                    break
                families.add(re.sub(r"\s*\([^)]*\)\s*$", "", name).strip())
                index += 1
    except OSError:
        pass
    return families


def filename_hints() -> set[str]:
    roots: list[Path] = []
    system = platform.system()
    if system == "Darwin":
        roots = [Path("/System/Library/Fonts"), Path("/Library/Fonts"), Path.home() / "Library/Fonts"]
    elif system == "Windows":
        roots = [Path(os.environ.get("WINDIR", r"C:\Windows")) / "Fonts"]
    else:
        roots = [Path("/usr/share/fonts"), Path("/usr/local/share/fonts"), Path.home() / ".local/share/fonts"]

    hints: set[str] = set()
    for root in roots:
        if not root.is_dir():
            continue
        for path in root.rglob("*"):
            if path.suffix.casefold() in {".otf", ".ttf", ".ttc"}:
                hints.add(path.stem)
    return hints


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--locale", choices=sorted(CANDIDATES), default="zh-CN")
    parser.add_argument("--check-mono", action="store_true", help="also check C++ code & CJK monospace font stack for slidev-ppt")
    parser.add_argument("--json", action="store_true", help="emit machine-readable JSON")
    parser.add_argument("--all", action="store_true", help="show every discovered font family")
    args = parser.parse_args()

    discovered = fontconfig_families() | windows_registry_families()
    source = "font family metadata"
    if not discovered:
        discovered = filename_hints()
        source = "font filename hints"

    by_normalized = {normalize(name): name for name in discovered}
    candidates = CANDIDATES[args.locale]
    matches = [
        {"requested": candidate, "installed_as": by_normalized.get(normalize(candidate))}
        for candidate in candidates
    ]
    selected = next((item["installed_as"] for item in matches if item["installed_as"]), None)

    mono_matches = [
        {"requested": candidate, "installed_as": by_normalized.get(normalize(candidate))}
        for candidate in MONO_CANDIDATES
    ]
    selected_mono = next((item["installed_as"] for item in mono_matches if item["installed_as"]), None)

    payload: dict[str, object] = {
        "locale": args.locale,
        "selected": selected,
        "selected_mono": selected_mono,
        "source": source,
        "candidates": matches,
        "mono_candidates": mono_matches,
        "discovered_count": len(discovered),
    }

    if args.all:
        payload["all_families"] = sorted(discovered, key=str.casefold)

    if args.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        print(f"Locale: {args.locale}")
        print(f"Selected Sans-Serif: {selected or 'none of the preferred families is installed'}")
        print(f"Discovery: {source} ({len(discovered)} families)")
        for item in matches:
            status = item["installed_as"] or "not found"
            print(f"- {item['requested']}: {status}")
        if args.check_mono:
            print(f"\nSelected Monospace (--pc-font-mono): {selected_mono or 'none found'}")
            for item in mono_matches:
                status = item["installed_as"] or "not found"
                print(f"- {item['requested']}: {status}")
        if args.all:
            print("\nAll discovered families:")
            for family in payload["all_families"]:  # type: ignore[union-attr]
                print(f"- {family}")

    return 0 if selected else 1


if __name__ == "__main__":
    raise SystemExit(main())
