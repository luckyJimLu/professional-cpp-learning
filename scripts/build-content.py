#!/usr/bin/env python3
"""Content pipeline: contract checks, mirrored copies, manifest and search index.

Usage:
  python3 scripts/build-content.py --check   validate only, no writes
  python3 scripts/build-content.py [--out dist/content]

Machine-readable counterpart of docs/maint/content-contract.md.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LESSON_META = ROOT / "daily" / "lessons.meta.json"

ZONE1_DOCS = [
    "content-map.md",
    "beginner-start.md",
    "beginner-course-map.md",
    "lab-environments.md",
    "engineering-learning-path.md",
    "chapter-06-review.md",
    "reference-reading-guide.md",
    "cpp-implementation-deep-dive.md",
    "memory-visualizer-guide.md",
    "learning-plan.md",
    "harmonyos-mini-cpp11-compatibility.md",
    "zephyr-cpp20-zpp.md",
    "mermaid.md",
    "faq.md",
    "cpp-feature-standards.md",
    "rtos-simulator/DESIGN.md",
    "rtos-simulator/LEARNING-GUIDE.md",
]

SLIDES_FILES = [
    "PPT/设计模式大纲.md",
    "slides/lesson-01.md",
    "slides/lesson-02.md",
    "slides/lesson-02-traceability.md",
    "slides/lesson-03.md",
    "slides/lesson-03-traceability.md",
]

IMAGE_EXTS = {".jpeg", ".jpg", ".png", ".svg", ".webp", ".gif"}
BINARY_EXTS = IMAGE_EXTS | {".pdf", ".deb", ".zip", ".bin", ".exe"}
CODE_EXTS = {".cpp", ".c", ".h", ".hpp", ".cmm", ".cc", ".cxx", ".ipp"}
ALLOWED_BINARY_DIRS = (
    "assets/",
    "patterns/examples/",
    "booklets/examples/",
    "examples/",
    "frameworks/",
    "books/",
    "references/system-design-notes/",
)
SCANNED_TEXT_DIRS = ("daily", "weekly", "patterns", "booklets", "guidelines",
                     "frameworks", "docs", "references/reading-paths")


def collect_sources():
    pairs = []  # (src_abs, rel_from_repo_root)
    def add_dir(pattern: str):
        for f in sorted(ROOT.glob(pattern)):
            if f.is_file():
                pairs.append((f, f.relative_to(ROOT)))
    for d in ("daily", "weekly", "guidelines"):
        add_dir(f"{d}/*.md")
    p_progress = ROOT / "progress.md"
    if p_progress.is_file():
        pairs.append((p_progress, p_progress.relative_to(ROOT)))
    add_dir("patterns/**/*.md")
    add_dir("booklets/**/*.md")
    add_dir("references/reading-paths/*.md")
    for name in ZONE1_DOCS:
        p = ROOT / "docs" / name
        if p.is_file():
            pairs.append((p, p.relative_to(ROOT)))
    for tree in ("patterns/examples", "booklets/examples", "examples",
                 "frameworks/trace32", "frameworks/openharmony",
                 "frameworks/asio", "frameworks/trace32/examples",
                 "references/system-design-notes"):
        base = ROOT / tree
        if base.is_dir():
            for f in sorted(base.rglob("*")):
                if f.is_file() and "__pycache__" not in f.parts:
                    pairs.append((f, f.relative_to(ROOT)))
    for name in SLIDES_FILES:
        p = ROOT / name
        if p.is_file():
            pairs.append((p, p.relative_to(ROOT)))
    assets = ROOT / "assets"
    if assets.is_dir():
        for f in sorted(assets.rglob("*")):
            if f.is_file():
                pairs.append((f, f.relative_to(ROOT)))
    seen, uniq = set(), []
    for src, rel in pairs:
        key = str(rel)
        if key in seen:
            continue
        seen.add(key)
        uniq.append((src, rel))
    return uniq


LIST_KEYS = ("topics", "guidelines")


def parse_frontmatter(text: str) -> dict[str, object]:
    lines = text.splitlines()
    meta: dict[str, object] = {}
    if not (lines and lines[0].strip() == "---"):
        return meta
    lab_path = None
    current_list = None
    for line in lines[1:]:
        if line.strip() in ("---", "..."):
            break
        block = re.match(r"^\s+-\s*(.*)$", line)
        if block and current_list:
            values = meta[current_list] if isinstance(meta[current_list], list) else []
            values.append(block.group(1).strip().strip("'\""))
            meta[current_list] = values
            continue
        m = re.match(r"^([A-Za-z_-]+):\s*(.*)$", line)
        if not m:
            continue
        key, raw = m.group(1), m.group(2).strip()
        if key in LIST_KEYS and raw == "":
            current_list = key
            meta[key] = []
            continue
        current_list = None
        if raw.startswith("[") and raw.endswith("]"):
            meta[key] = [v.strip().strip("'\"") for v in raw[1:-1].split(",") if v.strip()]
        else:
            meta[key] = raw.strip("'\"")
    return meta


def reading_stats(text: str) -> dict[str, int]:
    cjk = len(re.findall(r"[\u4e00-\u9fa5\u3040-\u30ff]", text))
    prose = re.sub(r"```[\s\S]*?```", " ", text)
    latin = len(re.findall(r"[a-zA-Z0-9_\-]+", prose))
    code_lines = sum(block.count("\n") + 1 for block in re.findall(r"```[\s\S]*?```", text))
    minutes = max(1, round(cjk / 320 + latin / 180 + code_lines / 35))
    return {"minutes": minutes, "wordCount": cjk + latin}


def list_value(meta: dict[str, object], key: str) -> list[str]:
    value = meta.get(key)
    if value is None or value == "":
        return []
    if isinstance(value, list):
        return [str(v) for v in value]
    return [str(value)]


def scalar_value(meta: dict[str, object], key: str) -> str:
    value = meta.get(key)
    return "" if value is None or isinstance(value, list) else str(value)


def first_heading(text: str) -> str:
    m = re.search(r"^#\s+(.+)$", text, re.M)
    return m.group(1).strip() if m else ""


def load_lesson_meta() -> list[dict]:
    """Lesson metadata lives in daily/lessons.meta.json, never in the markdown."""
    data = json.loads(LESSON_META.read_text(encoding="utf-8"))
    entries = []
    for item in data.get("lessons", []):
        entry = dict(item)
        rel = str(entry.get("path", ""))
        match = re.match(r"daily/day-(\d{3})-", rel)
        if not match:
            raise SystemExit(f"{LESSON_META.name}: bad lesson path {rel!r}")
        entry["day"] = int(match.group(1))
        entries.append(entry)
    entries.sort(key=lambda e: e["day"])
    return entries


def build_manifest(pairs):
    lessons = []
    for meta in load_lesson_meta():
        rel = meta["path"]
        lesson_text = (ROOT / rel).read_text(encoding="utf-8", errors="replace")
        entry = {
            "path": rel,
            "number": meta["day"],
            "title": first_heading(lesson_text),
            "week": scalar_value(meta, "week"),
            "part": scalar_value(meta, "part"),
            "chapter": scalar_value(meta, "chapter"),
            "chapterTitle": scalar_value(meta, "chapter_title"),
            "status": scalar_value(meta, "status"),
            "duration": scalar_value(meta, "duration"),
            "topics": list_value(meta, "topics"),
            "guidelines": list_value(meta, "guidelines"),
            "lab": scalar_value(meta, "lab"),
            "previous": scalar_value(meta, "previous"),
            "next": scalar_value(meta, "next"),
            "stats": reading_stats(lesson_text),
        }
        if meta.get("rtos_scenario"):
            entry["rtosScenario"] = scalar_value(meta, "rtos_scenario")
        lessons.append(entry)

    lesson_paths = {e["path"] for e in lessons}
    topics = []
    for _, rel in pairs:
        rel_s = str(rel)
        if rel_s in lesson_paths or not rel_s.endswith(".md"):
            continue
        if not (rel_s.startswith(("patterns/", "booklets/", "guidelines/", "frameworks/",
                                  "references/reading-paths/", "docs/", "weekly/",
                                  "utils/", "references/system-design-notes/"))
                or rel_s in ("PPT/设计模式大纲.md",) or rel_s.startswith("slides/")):
            continue
        if "maint/" in rel_s or "archive/" in rel_s or rel_s == "progress.md":
            continue
        text = (ROOT / rel).read_text(encoding="utf-8", errors="replace")
        meta = parse_frontmatter(text)
        category = (
            "参考书导读" if rel_s.startswith("references/reading-paths/")
            else "OpenHarmony 轻量系统" if rel_s.startswith("frameworks/openharmony/")
            else "TRACE32" if rel_s.startswith("frameworks/trace32/") or rel_s.startswith("docs/rtos-simulator/")
            else "网络与异步" if "asio" in rel_s.lower()
            else "周复盘" if rel_s.startswith("weekly/")
            else "专题"
        )
        topics.append({
            "path": rel_s,
            "category": category,
            "summary": scalar_value(meta, "summary"),
            "title": first_heading(text),
            "locale": "en" if rel_s.endswith(".en.md") else "zh",
        })

    bundle = {}
    for name, path in (("c", "booklets/c.md"), ("cpp", "booklets/cpp.md")):
        text = (ROOT / path).read_text(encoding="utf-8", errors="replace")
        bundle[name] = {
            "path": path,
            "sections": len(re.findall(r"^## ", text, re.M)),
            "entries": len(re.findall(r"^### ", text, re.M)),
        }

    assets = {"byPath": {}}
    for src, rel in pairs:
        rel_s = str(rel)
        if rel_s.startswith("assets/"):
            content_rel = rel_s[len("assets/"):]
            assets["byPath"][content_rel] = f"content/assets/{content_rel}"
        elif src.suffix in IMAGE_EXTS | {".pdf"} and rel_s.startswith("references/system-design-notes/"):
            assets["byPath"][rel_s] = f"content/{rel_s}"

    digest = hashlib.sha256()
    for src, rel in sorted(pairs, key=lambda item: str(item[1])):
        digest.update(f"{rel}:".encode())
        digest.update(hashlib.sha256(src.read_bytes()).digest())
        digest.update(b"\n")
    digest.update(f"{LESSON_META.relative_to(ROOT).as_posix()}:".encode())
    digest.update(hashlib.sha256(LESSON_META.read_bytes()).digest())

    return {
        "contentVersion": digest.hexdigest()[:8],
        "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "lessons": lessons,
        "topics": topics,
        "booklets": bundle,
        "slides": {"outline": "content/PPT/设计模式大纲.md",
                   "lessons": ["content/slides/lesson-01.md", "content/slides/lesson-02.md", "content/slides/lesson-03.md"]},
        "assets": assets,
    }, lessons, topics


def search_rank(rel: str) -> tuple[int, str]:
    # 复刻旧 Web bundle 的 glob 插入顺序：代码区（examples→frameworks→patterns→references），
    # 再跟 md 区（daily→weekly→guidelines→patterns→frameworks→references→docs→utils…），新增源共尾部。
    code_ranks = {"examples/": 0, "frameworks/": 1, "patterns/": 2, "references/": 3}
    md_ranks = {"daily/": 100, "weekly/": 101, "guidelines/": 102, "patterns/": 103,
                "frameworks/": 104, "references/": 105, "docs/": 106, "booklets/": 108,
                "utils/": 109, "slides/": 110, "PPT/": 110}
    if rel.endswith((".cpp", ".c", ".h", ".hpp", ".cmm", ".cc", ".cxx", ".ipp")):
        for prefix, rank in code_ranks.items():
            if rel.startswith(prefix):
                return (rank, rel)
        return (112, rel)
    for prefix, rank in md_ranks.items():
        if rel.startswith(prefix):
            return (rank, rel)
    return (110, rel)


def build_search_index(pairs, topics, lessons):
    files = []
    titles = {t["path"]: (t["title"] or t["path"]) for t in topics}
    for entry in lessons:
        titles.setdefault(entry["path"], entry["title"] or entry["path"])
    for src, rel in pairs:
        rel_s = str(rel)
        is_code = src.suffix in CODE_EXTS
        if not is_code and src.suffix != ".md":
            continue
        text = src.read_text(encoding="utf-8", errors="replace")
        files.append({
            "path": rel_s,
            "title": titles.get(rel_s, first_heading(text) or rel_s),
            "kind": "code" if is_code else "md",
            "content": text,
            "lines": text.count("\n") + (1 if text and not text.endswith("\n") else 0),
        })
    files.sort(key=lambda f: search_rank(f["path"]))
    return {"files": files}


def validate(pairs):
    problems = []
    checked_links = 0
    scanned_dirs = tuple(d for d in SCANNED_TEXT_DIRS if (ROOT / d).exists())
    md_targets = []
    for d in scanned_dirs:
        md_targets.extend(sorted((ROOT / d).rglob("*.md")))
    for md in md_targets:
        rel_md = md.relative_to(ROOT).as_posix()
        if rel_md.startswith(("docs/maint/", "docs/archive/")):
            continue
        text = md.read_text(encoding="utf-8", errors="replace")
        for m in re.finditer(r"!?\[[^\]]*\]\(([^)]+)\)", text):
            target = m.group(1).strip()
            if target.startswith("<") and target.endswith(">"):
                target = target[1:-1]
            target = target.split("#")[0].split("?")[0]
            if not target or target.startswith(("http://", "https://", "mailto:")):
                continue
            if not re.search(r"\.(md|jpe?g|png|svg|webp|gif)$", target, re.I):
                continue
            checked_links += 1
            if not (md.parent / target).exists():
                problems.append(f"broken link in {rel_md}: {target}")
    for src, rel in pairs:
        rel_s = str(rel)
        if src.suffix in BINARY_EXTS and not rel_s.startswith(ALLOWED_BINARY_DIRS):
            problems.append(f"non-text file in content zone: {rel_s}")
    daily = sorted((ROOT / "daily").glob("day-*.md"))
    meta_entries = load_lesson_meta()
    meta_paths = {entry["path"] for entry in meta_entries}
    meta_days = {entry["day"] for entry in meta_entries}
    required = ("week", "part", "chapter", "chapter_title", "title", "duration",
                "status", "topics", "guidelines", "lab", "previous", "next")
    for entry in meta_entries:
        rel = entry["path"]
        if not (ROOT / rel).is_file():
            problems.append(f"{LESSON_META.name}: {rel} has no markdown file")
        missing = [key for key in required if entry.get(key) in ("", None, [])]
        if missing:
            problems.append(f"{LESSON_META.name}: {rel} empty metadata fields {missing}")
        lab = entry.get("lab", "")
        if lab and lab != "rtos-sim" and not (ROOT / lab).is_file():
            problems.append(f"{LESSON_META.name}: {rel} lab path does not exist: {lab}")
        previous = entry.get("previous")
        if previous not in (-1, *meta_days):
            problems.append(f"{LESSON_META.name}: {rel} previous={previous} has no lesson")
        following = entry.get("next")
        if not isinstance(following, int) or (following != -1 and following <= entry["day"]):
            problems.append(f"{LESSON_META.name}: {rel} next={following} is not a later day")
    for md in daily:
        if not re.match(r"day-\d{3}-", md.name):
            continue
        rel_md = md.relative_to(ROOT).as_posix()
        if rel_md not in meta_paths:
            problems.append(f"{rel_md}: missing entry in {LESSON_META.name}")
    print(f"PASS: content contract ({len(md_targets)} md scanned, {checked_links} links checked, "
          f"{len(meta_entries)} lesson metadata entries)")
    return problems


def write_out(pairs, manifest, index, out: Path):
    for f in out.rglob("*"):
        if f.is_file():
            f.unlink()
    for src, rel in pairs:
        dest = out / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    (out / "search-index.json").write_text(json.dumps(index, ensure_ascii=False), encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="validate only")
    parser.add_argument("--out", default="dist/content", help="output dir (default dist/content)")
    args = parser.parse_args()

    pairs = collect_sources()
    problems = validate(pairs)
    if args.check:
        if problems:
            print("\n".join(problems[:10]), file=sys.stderr)
            return 1
        return 0
    for p in problems:
        print("WARN:", p)
    manifest, lessons, topics = build_manifest(pairs)
    index = build_search_index(pairs, topics, lessons)
    out = (ROOT / args.out).resolve()
    write_out(pairs, manifest, index, out)
    md_count = sum(1 for _, rel in pairs if str(rel).endswith(".md"))
    code_count = sum(1 for _, rel in pairs if (ROOT / rel).suffix in CODE_EXTS)
    print(f"PASS: build-content wrote {len(pairs)} files ({md_count} md, {code_count} code) to {out}")
    print(f"lessons={len(lessons)} topics={len(topics)} assets={len(manifest['assets']['byPath'])} searchFiles={len(index['files'])} version={manifest['contentVersion']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
