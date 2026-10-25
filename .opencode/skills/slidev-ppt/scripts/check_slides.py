#!/usr/bin/env python3
"""Structural, visual-token, and outline source-grounding validator for Slidev decks."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


REQUIRED_HEADMATTER = {
    "theme": "default",
    "lang": "zh-CN",
    "colorSchema": "dark",
    "canvasWidth": "980",
    "transition": "fade",
}

BOGUS_STD_TYPES = (
    "Widget",
    "Record",
    "Storage",
    "Index",
    "DenseVector",
    "StrongType",
    "ListNode",
    "Meter",
    "Surname",
    "Addable",
    "Printable",
    "ComplexOperation",
)


def split_slides(text: str) -> list[tuple[dict[str, str], str]]:
    """Split a Slidev markdown file into (frontmatter_dict, body) pairs."""
    lines = text.splitlines()
    slides: list[tuple[dict[str, str], str]] = []
    i = 0
    n = len(lines)

    while i < n:
        while i < n and not lines[i].strip():
            i += 1
        if i >= n:
            break
        fm: dict[str, str] = {}
        if lines[i].strip() == "---":
            i += 1
            while i < n and lines[i].strip() != "---":
                line = lines[i]
                m = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", line)
                if m:
                    fm[m.group(1).strip()] = m.group(2).strip().strip("'\"")
                i += 1
            if i < n and lines[i].strip() == "---":
                i += 1
        body_lines: list[str] = []
        in_code = False
        while i < n:
            line = lines[i]
            if line.strip().startswith("```"):
                in_code = not in_code
            if not in_code and line.strip() == "---":
                # Peek ahead to see if this is a slide separator / frontmatter block
                j = i + 1
                is_fm = False
                while j < n and lines[j].strip() != "---":
                    if re.match(r"^[A-Za-z0-9_-]+:\s*.*$", lines[j].strip()):
                        is_fm = True
                    elif lines[j].strip() and not lines[j].startswith("  "):
                        is_fm = False
                        break
                    j += 1
                if j < n and lines[j].strip() == "---" and is_fm:
                    break
                if j == i + 1:
                    break
            body_lines.append(line)
            i += 1
        slides.append((fm, "\n".join(body_lines)))
    return slides


def extract_notes_and_canvas(body: str) -> tuple[str, str]:
    """Return (canvas_without_notes, speaker_notes)."""
    comments = list(re.finditer(r"<!--(.*?)-->", body, flags=re.DOTALL))
    if not comments:
        return body, ""
    last = comments[-1]
    # Only treat trailing HTML comment as speaker note
    trailing = body[last.end() :].strip()
    if trailing:
        return body, ""
    canvas = body[: last.start()].strip()
    notes = last.group(1).strip()
    return canvas, notes


def count_slide_clicks(canvas: str) -> int:
    """Count total click steps on a Slidev slide canvas."""
    # Check code block line-highlight steps e.g. ```cpp {2|3-4|5} -> (N-1) extra clicks
    code_extra_clicks = 0
    for m in re.finditer(r"```[a-zA-Z0-9_-]*\s+\{([^}\n]+)\}", canvas):
        steps = [s.strip() for s in m.group(1).split("|") if s.strip()]
        if len(steps) > 1:
            code_extra_clicks += len(steps) - 1

    # Remove fenced code blocks before counting v-click attributes
    no_code = re.sub(r"```.*?```", "", canvas, flags=re.DOTALL)

    explicit_nums: set[int] = set()
    for m in re.finditer(r'\bv-click=["\'](\d+)["\']', no_code):
        explicit_nums.add(int(m.group(1)))

    # Count <v-clicks> list items
    v_clicks_items = 0
    for m in re.finditer(r"<v-clicks>(.*?)</v-clicks>", no_code, flags=re.DOTALL):
        block = m.group(1)
        items = re.findall(r"(?m)^\s*(?:[-*+]|\d+\.)\s+", block)
        v_clicks_items += len(items)

    # Count unnumbered v-click occurrences (exclude v-clicks)
    unnumbered = len(re.findall(r"\bv-click\b(?!=)", no_code))

    if explicit_nums:
        return max(max(explicit_nums), v_clicks_items) + code_extra_clicks
    return v_clicks_items + unnumbered + code_extra_clicks


def parse_outline_lesson(outline_text: str, lesson_num: int) -> dict[int, dict[str, str]]:
    """Parse PPT units (focus, presentation, notes) for a given lesson from outline markdown."""
    lesson_pattern = re.compile(
        rf"^##\s+.*第\s*{lesson_num}\s*课.*$", re.MULTILINE
    )
    m_start = lesson_pattern.search(outline_text)
    if not m_start:
        return {}
    rest = outline_text[m_start.end() :]
    m_next = re.search(r"^##\s+.*第\s*\d+\s*课", rest, flags=re.MULTILINE)
    lesson_block = rest[: m_next.start()] if m_next else rest

    ppt_units: dict[int, dict[str, str]] = {}
    ppt_matches = list(
        re.finditer(r"^###\s+PPT\s+(\d+)\s*[:：](.*)$", lesson_block, flags=re.MULTILINE)
    )
    for idx, m in enumerate(ppt_matches):
        ppt_id = int(m.group(1))
        start = m.end()
        end = ppt_matches[idx + 1].start() if idx + 1 < len(ppt_matches) else len(lesson_block)
        chunk = lesson_block[start:end]

        sections = {"title": m.group(2).strip(), "focus": "", "visual": "", "notes": ""}
        current_key = None
        for line in chunk.splitlines():
            if re.match(r"^\*\s+\*\*重点内容\*\*", line):
                current_key = "focus"
                continue
            if re.match(r"^\*\s+\*\*呈现方式\*\*", line):
                current_key = "visual"
                continue
            if re.match(r"^\*\s+\*\*演讲要点\*\*", line):
                current_key = "notes"
                continue
            if current_key:
                sections[current_key] += line + "\n"
        ppt_units[ppt_id] = sections
    return ppt_units


def extract_notes_only_phrases(focus: str, visual: str, notes: str) -> list[str]:
    """Extract distinctive story/metaphor phrases from speaker notes that do not appear in focus or visual."""
    allowed_corpus = focus + "\n" + visual
    candidates: list[str] = []

    # Check quoted terms in notes (length >= 4 to avoid generic words like "做什么")
    for m in re.finditer(r"[“\"]([^”\"\n]{4,24})[”\"]", notes):
        phrase = m.group(1).strip()
        # Skip if any 3-char stem already exists in focus/visual (e.g. 富指针 vs 富独占指针)
        if phrase and phrase not in allowed_corpus and phrase[:2] not in allowed_corpus:
            candidates.append(phrase)

    # Check specific metaphor/story markers in speaker notes
    story_markers = [
        "2 个故事点",
        "晚上 CI",
        "夜间 CI",
        "电钻和锯子",
        "建筑蓝图",
        "木匠",
        "火星气候探测器",
        "鸡生蛋",
        "Destruction Is Resource Release",
    ]
    for marker in story_markers:
        if marker in notes and marker not in allowed_corpus:
            candidates.append(marker)

    return sorted(set(candidates))


def validate_deck(
    deck_path: Path,
    outline_path: Path | None = None,
    lesson_num: int | None = None,
    allow_partial: bool = False,
) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []

    text = deck_path.read_text(encoding="utf-8")
    slides = split_slides(text)
    if not slides:
        return ["No slides found in markdown file."], []

    # 1. Headmatter checks
    head_fm, _ = slides[0]
    for k, expected in REQUIRED_HEADMATTER.items():
        actual = head_fm.get(k)
        if actual != expected:
            errors.append(
                f"[Slide 1 Headmatter] Missing or mismatched '{k}': expected '{expected}', got '{actual}'"
            )
    if "lesson" not in head_fm:
        errors.append("[Slide 1 Headmatter] Missing 'lesson' field.")

    # 2. Per-slide checks
    ppt_to_canvases: dict[int, list[tuple[int, str, str]]] = {}
    for idx, (fm, body) in enumerate(slides, start=1):
        ppt_str = fm.get("ppt")
        if not ppt_str or not ppt_str.isdigit():
            errors.append(f"[Slide {idx}] Missing numeric 'ppt: N' in frontmatter.")
            ppt_id = -1
        else:
            ppt_id = int(ppt_str)

        canvas, notes = extract_notes_and_canvas(body)
        if ppt_id > 0:
            ppt_to_canvases.setdefault(ppt_id, []).append((idx, canvas, notes))

        is_cover = fm.get("layout") == "cover"
        is_last = idx == len(slides)

        # Notes presence
        if not notes:
            errors.append(f"[Slide {idx} (PPT {ppt_str})] Missing trailing speaker notes <!-- ... -->.")

        # Click count and [click] synchronization
        clicks = count_slide_clicks(canvas)
        if clicks > 5:
            errors.append(
                f"[Slide {idx} (PPT {ppt_str})] Click count {clicks} exceeds maximum of 5."
            )
        note_clicks = len(re.findall(r"\[click\]", notes))
        if not is_cover and clicks != note_clicks:
            errors.append(
                f"[Slide {idx} (PPT {ppt_str})] Click mismatch: slide canvas has {clicks} click step(s), "
                f"but speaker notes have {note_clicks} [click] marker(s)."
            )

        # pc-next hook check
        if not is_cover and not is_last:
            if 'class="pc-next"' not in canvas:
                errors.append(
                    f"[Slide {idx} (PPT {ppt_str})] Missing <div class=\"pc-next\">...</div> bottom transition hook."
                )

        # Inline hex color check (ignore inside ```mermaid blocks)
        no_mermaid = re.sub(r"```mermaid.*?```", "", canvas, flags=re.DOTALL)
        no_code = re.sub(r"```.*?```", "", no_mermaid, flags=re.DOTALL)
        hex_matches = re.findall(r"#[0-9a-fA-F]{3,8}\b", no_code)
        if hex_matches:
            errors.append(
                f"[Slide {idx} (PPT {ppt_str})] Forbidden inline hex color(s) {hex_matches}; use var(--pc-*) or pc-* classes."
            )

        # Bogus std:: prefix check
        for typename in BOGUS_STD_TYPES:
            if re.search(rf"\bstd::{typename}\b", canvas):
                errors.append(
                    f"[Slide {idx} (PPT {ppt_str})] Hallucinated 'std::{typename}' prefix on non-standard type '{typename}'."
                )

        if "using namespace std;" in canvas:
            errors.append(f"[Slide {idx} (PPT {ppt_str})] Forbidden 'using namespace std;'.")

    # 3. Outline Source-Grounding & Anti-Hallucination Checks
    if outline_path and lesson_num:
        outline_text = outline_path.read_text(encoding="utf-8")
        ppt_units = parse_outline_lesson(outline_text, lesson_num)
        if not ppt_units:
            warnings.append(f"[Outline] Could not locate Lesson {lesson_num} in {outline_path}.")
        else:
            # Known paraphrased hallucination check across entire file
            if "夜间 CI" in text and "夜间 CI" not in outline_text:
                errors.append(
                    "[Hallucination / Paraphrase] Found '夜间 CI' in slides, which does not exist in the outline (outline uses '晚上 CI' inside speaker notes only)."
                )

            for ppt_id, sec in sorted(ppt_units.items()):
                if ppt_id not in ppt_to_canvases:
                    if not allow_partial:
                        errors.append(f"[Outline Coverage] PPT {ppt_id} ('{sec['title']}') is missing from slides.")
                    continue

                notes_only_phrases = extract_notes_only_phrases(
                    sec["focus"], sec["visual"], sec["notes"]
                )
                for slide_idx, canvas, _ in ppt_to_canvases[ppt_id]:
                    for phrase in notes_only_phrases:
                        if phrase in canvas:
                            errors.append(
                                f"[Field-Boundary Leak · Slide {slide_idx} (PPT {ppt_id})] "
                                f"Phrase '{phrase}' belongs exclusively to '演讲要点' (Speaker Notes) in the outline "
                                f"and must NOT appear on the slide canvas."
                            )

    return errors, warnings


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("deck", type=Path, help="Path to Slidev markdown file (e.g. slides/lesson-01.md)")
    parser.add_argument("--outline", type=Path, help="Optional path to course outline markdown (e.g. PPT/设计模式大纲.md)")
    parser.add_argument("--lesson", type=int, help="Lesson number in the outline (e.g. 1)")
    parser.add_argument("--allow-partial", action="store_true", help="Allow partial PPT unit coverage (for example snippets)")
    parser.add_argument("--json", action="store_true", help="Emit JSON output")
    args = parser.parse_args()

    errors, warnings = validate_deck(args.deck, args.outline, args.lesson, args.allow_partial)
    payload = {
        "deck": str(args.deck),
        "ok": len(errors) == 0,
        "error_count": len(errors),
        "warning_count": len(warnings),
        "errors": errors,
        "warnings": warnings,
    }

    if args.json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        status = "PASSED" if not errors else f"FAILED ({len(errors)} error(s))"
        print(f"Slidev Deck Validation: {status} — {args.deck}")
        for err in errors:
            print(f"  ✗ {err}")
        for warn in warnings:
            print(f"  ! {warn}")
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
