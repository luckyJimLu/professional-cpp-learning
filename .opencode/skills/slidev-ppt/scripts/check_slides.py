#!/usr/bin/env python3
"""Structural, visual-token, and outline source-grounding validator for Slidev decks.

General (lesson-agnostic) anti-hallucination checks:
  * Strict 3-zone field-boundary leak detection (演讲要点 must never reach the canvas).
  * Dynamic bogus ``std::`` prefix detection derived from the outline itself.
  * Allowed ``pc-*`` vocabulary enforcement + inline-hex ban.
  * External diagram asset existence, click synchronization, lesson identity.

Frozen CLI::

    check_slides.py DECK [--outline PATH] [--lesson N] [--public-dir PATH]
                         [--allow-partial] [--allow-unknown-classes] [--strict] [--json]
"""

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

# Fallback domain types when no outline is supplied (kept for backwards compatibility).
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

# Canonical pc-* vocabulary (must stay in sync with assets/theme/style.css).
PC_ALLOWED_VARS = {
    "pc-bg", "pc-surface", "pc-border", "pc-text", "pc-muted", "pc-accent",
    "pc-good", "pc-bad", "pc-quote", "pc-violet", "pc-radius",
    "pc-font-sans", "pc-font-mono",
}
PC_ALLOWED_CLASSES = {
    "pc-accent", "pc-good", "pc-bad", "pc-muted", "pc-quote-c",
    "pc-kicker", "pc-subtitle",
    "pc-card", "pc-card-lead", "pc-card-meta",
    "pc-layers", "pc-layer", "pc-layer-title", "pc-layer-en", "pc-layer-desc",
    "pc-tags", "pc-tag",
    "pc-axis", "pc-axis-line", "pc-span", "pc-span-title",
    "pc-chain", "pc-arrow",
    "pc-bars", "pc-bar-row", "pc-bar-label", "pc-bar-track", "pc-bar-fill",
    "pc-diagram", "pc-diagram-caption", "pc-svg-hero", "pc-next",
    "pc-callout", "pc-callout-title", "pc-callout-body",
    "pc-quote-en", "pc-quote-zh", "pc-quote-author",
    "pc-ppt", "pc-header", "pc-footer",
}
PC_ALLOWED = PC_ALLOWED_VARS | PC_ALLOWED_CLASSES

# Lowercase C++ standard-library identifiers (used for the "unknown std::" warning).
STD_ALLOWLIST = {
    "unique_ptr", "shared_ptr", "weak_ptr", "vector", "string", "string_view",
    "span", "array", "optional", "variant", "any", "function", "map",
    "unordered_map", "set", "unordered_set", "list", "deque", "tuple", "pair",
    "move", "forward", "size_t", "visit", "get", "holds_alternative",
    "enable_if_t", "is_base_of", "declval", "decltype", "make_unique",
    "make_shared", "runtime_error", "exception", "uncaught_exceptions",
    "current_exception", "rethrow_exception", "cout", "cerr", "endl", "thread",
    "mutex", "atomic", "chrono", "byte", "clamp", "exchange", "swap", "begin",
    "end", "data", "size", "min", "max", "integral_constant", "true_type",
    "false_type",
}

LEAK_MARKERS_FILE = Path(__file__).with_name("leak_markers.json")


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
    trailing = body[last.end():].strip()
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
    rest = outline_text[m_start.end():]
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


def _compact(text: str) -> str:
    """Whitespace-insensitive normalisation for containment comparisons."""
    return re.sub(r"\s+", "", text)


def _load_extra_leak_markers() -> list[str]:
    """Optional curated leak markers (kept OUT of the source as an external data file)."""
    if not LEAK_MARKERS_FILE.exists():
        return []
    try:
        data = json.loads(LEAK_MARKERS_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []
    if isinstance(data, list):
        return [str(item) for item in data if str(item).strip()]
    return []


QUOTE_PATTERNS = (
    re.compile(r"[“\"「『]([^”\"」』\n]{4,40})[”\"」』]"),
)


def derive_leak_candidates(
    focus: str, visual: str, notes: str, extra_markers: list[str] | None = None
) -> list[str]:
    """Mine quoted speaker-note phrases absent from the focus/visual canvas corpus.

    Deliberately restricted to quoted phrases plus curated external markers: broad
    sliding-window prose mining was rejected because speaker notes legitimately
    paraphrase terms printed on the slide, which produced false-positive leaks.
    """
    allowed = focus + "\n" + visual
    allowed_compact = _compact(allowed)
    candidates: set[str] = set()

    for pattern in QUOTE_PATTERNS:
        for m in pattern.finditer(notes):
            phrase = m.group(1).strip()
            if len(phrase) < 4:
                continue
            if phrase in allowed or phrase[:2] in allowed:
                continue
            if _compact(phrase) in allowed_compact:
                continue
            if re.search(r"[\w\u4e00-\u9fff]", phrase):
                candidates.add(phrase)

    for marker in (extra_markers or []):
        marker = marker.strip()
        if marker and marker not in allowed:
            candidates.add(marker)

    return sorted(candidates)


def derive_std_and_domain_types(outline_text: str) -> tuple[set[str], set[str]]:
    """From the outline, derive (std::used types, bare capitalized domain types)."""
    std_types = set(re.findall(r"\bstd::([A-Za-z_]\w*)", outline_text))
    domain: set[str] = set()
    for m in re.finditer(r"(?<![:>\w])([A-Z][A-Za-z0-9_]+)\b", outline_text):
        start = m.start(1)
        if outline_text[max(0, start - 2):start] == "::":
            continue
        domain.add(m.group(1))
    domain -= std_types
    return std_types, domain


def _resolve_diagram_assets(canvas: str, public_dir: Path) -> list[str]:
    """Return src paths of /diagrams/*.svg|png references that do not exist on disk."""
    missing: list[str] = []
    for m in re.finditer(r'<img[^>]*\bsrc=["\']([^"\']+)["\']', canvas):
        src = m.group(1)
        if not src.startswith("/"):
            continue
        if not re.search(r"\.(svg|png)$", src, flags=re.IGNORECASE):
            continue
        target = public_dir / src.lstrip("/")
        if not target.exists():
            missing.append(src)
    return missing


def validate_deck(
    deck_path: Path,
    outline_path: Path | None = None,
    lesson_num: int | None = None,
    allow_partial: bool = False,
    public_dir: Path | None = None,
    allow_unknown_classes: bool = False,
) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []

    if public_dir is None:
        public_dir = deck_path.parent / "public"

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
    elif lesson_num is not None:
        # Lesson identity: the deck's own `lesson` label must reference the requested lesson.
        if not re.search(rf"第\s*{lesson_num}\s*课", head_fm["lesson"]):
            errors.append(
                f"[Lesson Identity] Deck headmatter lesson='{head_fm['lesson']}' does not match "
                f"requested --lesson {lesson_num} (expected substring '第 {lesson_num} 课')."
            )

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

        # pc-next hook presence + non-empty content
        if not is_cover and not is_last:
            next_match = re.search(
                r'<div[^>]*class=["\'][^"\']*\bpc-next\b[^"\']*["\'][^>]*>(.*?)</div>',
                canvas,
                flags=re.DOTALL,
            )
            if not next_match:
                errors.append(
                    f"[Slide {idx} (PPT {ppt_str})] Missing <div class=\"pc-next\">...</div> bottom transition hook."
                )
            elif not next_match.group(1).strip():
                errors.append(
                    f"[Slide {idx} (PPT {ppt_str})] Empty <div class=\"pc-next\"> hook; it must carry a transition sentence."
                )

        # Final slide should signpost the next lesson
        if is_last and not re.search(r"预告|下一课|下节", canvas):
            warnings.append(
                f"[Slide {idx}] Final slide has no next-lesson signpost ('预告' / '下一课' / '下节')."
            )

        # Inline hex color check (ignore inside ```mermaid blocks)
        no_mermaid = re.sub(r"```mermaid.*?```", "", canvas, flags=re.DOTALL)
        no_code = re.sub(r"```.*?```", "", no_mermaid, flags=re.DOTALL)
        hex_matches = re.findall(r"#[0-9a-fA-F]{3,8}\b", no_code)
        if hex_matches:
            errors.append(
                f"[Slide {idx} (PPT {ppt_str})] Forbidden inline hex color(s) {hex_matches}; use var(--pc-*) or pc-* classes."
            )

        # Vocabulary: only canonical pc-* classes / vars are allowed.
        used_classes = set(re.findall(r"\bpc-[a-z0-9]+(?:-[a-z0-9]+)*\b", no_code))
        unknown_classes = sorted(used_classes - PC_ALLOWED)
        if unknown_classes:
            msg = (
                f"[Slide {idx} (PPT {ppt_str})] Unknown pc-* class(es) {unknown_classes}; "
                f"declare them in style.css or use the canonical vocabulary."
            )
            (warnings if allow_unknown_classes else errors).append(msg)

        # External diagram assets must exist on disk.
        for src in _resolve_diagram_assets(canvas, public_dir):
            errors.append(
                f"[Slide {idx} (PPT {ppt_str})] Missing diagram asset '{src}' under {public_dir}."
            )

        if "using namespace std;" in canvas:
            errors.append(f"[Slide {idx} (PPT {ppt_str})] Forbidden 'using namespace std;'.")

    # 3. Outline Source-Grounding & Anti-Hallucination Checks
    domain_types: set[str] = set()
    std_types: set[str] = set()
    if outline_path and lesson_num:
        outline_text = outline_path.read_text(encoding="utf-8")
        std_types, domain_types = derive_std_and_domain_types(outline_text)
        ppt_units = parse_outline_lesson(outline_text, lesson_num)
        if not ppt_units:
            warnings.append(f"[Outline] Could not locate Lesson {lesson_num} in {outline_path}.")
        else:
            extra_markers = _load_extra_leak_markers()
            for ppt_id, sec in sorted(ppt_units.items()):
                if ppt_id not in ppt_to_canvases:
                    if not allow_partial:
                        errors.append(f"[Outline Coverage] PPT {ppt_id} ('{sec['title']}') is missing from slides.")
                    continue

                leak_candidates = derive_leak_candidates(
                    sec["focus"], sec["visual"], sec["notes"], extra_markers
                )
                for slide_idx, canvas, _ in ppt_to_canvases[ppt_id]:
                    for phrase in leak_candidates:
                        if phrase in canvas:
                            errors.append(
                                f"[Field-Boundary Leak · Slide {slide_idx} (PPT {ppt_id})] "
                                f"Phrase '{phrase}' belongs exclusively to '演讲要点' (Speaker Notes) in the outline "
                                f"and must NOT appear on the slide canvas."
                            )

    # 4. Dynamic bogus std:: prefix detection (falls back to the static list without an outline)
    if domain_types:
        for idx, (fm, body) in enumerate(slides, start=1):
            canvas, _ = extract_notes_and_canvas(body)
            for m in re.finditer(r"\bstd::([A-Z][A-Za-z0-9_]*)", canvas):
                name = m.group(1)
                if name in domain_types:
                    errors.append(
                        f"[Slide {idx}] Hallucinated 'std::{name}': '{name}' is a domain type in the outline "
                        f"and must not carry a 'std::' prefix."
                    )
                elif name not in std_types and name not in STD_ALLOWLIST:
                    warnings.append(
                        f"[Slide {idx}] Unknown 'std::{name}': not found in the outline or the standard-library allowlist."
                    )
    else:
        for idx, (fm, body) in enumerate(slides, start=1):
            canvas, _ = extract_notes_and_canvas(body)
            for typename in BOGUS_STD_TYPES:
                if re.search(rf"\bstd::{typename}\b", canvas):
                    errors.append(
                        f"[Slide {idx}] Hallucinated 'std::{typename}' prefix on non-standard type '{typename}'."
                    )

    return errors, warnings


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("deck", type=Path, help="Path to Slidev markdown file (e.g. slides/lesson-01.md)")
    parser.add_argument("--outline", type=Path, help="Optional path to course outline markdown (e.g. PPT/设计模式大纲.md)")
    parser.add_argument("--lesson", type=int, help="Lesson number in the outline (e.g. 1)")
    parser.add_argument("--public-dir", type=Path, default=None, help="Directory that '/...' asset srcs resolve against (default: <deck_dir>/public)")
    parser.add_argument("--allow-partial", action="store_true", help="Allow partial PPT unit coverage (for example snippets)")
    parser.add_argument("--allow-unknown-classes", action="store_true", help="Downgrade unknown pc-* classes from error to warning")
    parser.add_argument("--strict", action="store_true", help="Promote warnings to errors")
    parser.add_argument("--json", action="store_true", help="Emit JSON output")
    args = parser.parse_args()

    errors, warnings = validate_deck(
        args.deck,
        args.outline,
        args.lesson,
        args.allow_partial,
        args.public_dir,
        args.allow_unknown_classes,
    )
    if args.strict and warnings:
        errors = errors + warnings
        warnings = []

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
