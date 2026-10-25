#!/usr/bin/env python3
"""Read-only structural health check for the project's diagram skills."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


EXPECTED = (
    "diagram-design",
    "draw-io",
    "excalidraw",
    "mermaid-diagrams",
    "plantuml-skill",
    "diagram-orchestrator",
)


def frontmatter_name(text: str) -> str | None:
    if not text.startswith("---\n"):
        return None
    end = text.find("\n---\n", 4)
    if end < 0:
        return None
    match = re.search(r"(?m)^name:\s*[\"']?([^\"'\n]+)[\"']?\s*$", text[4:end])
    return match.group(1).strip() if match else None


def inspect(base: Path, skill_id: str) -> dict[str, object]:
    directory = base / skill_id
    entry = directory / "SKILL.md"
    problems: list[str] = []
    declared_name: str | None = None

    if not directory.is_dir():
        problems.append("directory missing")
    elif not entry.is_file():
        problems.append("SKILL.md missing")
    else:
        declared_name = frontmatter_name(entry.read_text(encoding="utf-8"))
        if declared_name is None:
            problems.append("frontmatter name missing or malformed")
        elif declared_name != skill_id:
            problems.append(f"frontmatter name is {declared_name!r}, expected {skill_id!r}")

    return {
        "id": skill_id,
        "status": "ok" if not problems else "error",
        "declared_name": declared_name,
        "problems": problems,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--json", action="store_true", help="emit JSON instead of a table")
    args = parser.parse_args()

    base = Path(__file__).resolve().parents[2]
    results = [inspect(base, skill_id) for skill_id in EXPECTED]

    if args.json:
        print(json.dumps(results, ensure_ascii=False, indent=2))
    else:
        width = max(map(len, EXPECTED))
        for result in results:
            details = "; ".join(result["problems"]) or "healthy"
            print(f"{result['id']:<{width}}  {result['status']:<5}  {details}")

    return 1 if any(result["status"] != "ok" for result in results) else 0


if __name__ == "__main__":
    raise SystemExit(main())
