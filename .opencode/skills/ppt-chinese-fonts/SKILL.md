---
name: ppt-chinese-fonts
description: Choose, apply, audit, and troubleshoot Chinese typography for PowerPoint or PPTX presentations. Use when creating or editing slides, selecting Chinese fonts, fixing font substitution or missing glyphs, or preparing a deck for cross-platform delivery. Default to Source Han Sans / Noto Sans CJK with the locale-appropriate SC, TC, or HK variant.
license: MIT
metadata:
  default-font: Noto Sans CJK
  scope: presentation-typography
---

# PPT Chinese Fonts

Create legible, portable Chinese presentation typography with a small, intentional font system.

## Default contract

- Default family: **思源黑体 / Noto Sans CJK**.
- Simplified Chinese or unspecified Chinese: `Noto Sans CJK SC`.
- Traditional Chinese for Taiwan: `Noto Sans CJK TC`.
- Traditional Chinese for Hong Kong: `Noto Sans CJK HK`; if unavailable, use the closest verified HK-capable Source Han Sans variant.
- Japanese: `Noto Sans CJK JP`. Korean: `Noto Sans CJK KR`.
- Use `Noto Sans Mono CJK` for code, terminal output, or genuinely tabular monospace content; do not use it for ordinary body copy.
- Honor an explicit user, brand, or template font choice before these defaults.

Do not silently treat SC, TC, and HK as interchangeable. Their punctuation placement and regional glyph forms differ. When the locale is unclear and the distinction affects the deck, infer it from the text and existing template; state the chosen variant.

## Workflow

1. Inspect the deck or template before changing typography. Identify theme fonts, slide-master fonts, run-level overrides, languages, and any established brand rules.
2. Check local availability with `python3 scripts/check_ppt_fonts.py --locale zh-CN`, changing the locale as needed. Do not claim a font is installed based only on its filename or an assumed system default.
3. Use Noto Sans CJK unless the request or communication goal justifies an alternative. Read [`references/font-options.md`](references/font-options.md) only when choosing a different style, locale fallback, or commercial-use-safe alternative.
4. Apply fonts at the theme or slide-master level when the tooling supports it. Keep Latin and East Asian theme slots aligned unless the design intentionally uses a separate Latin face.
5. Remove local text-run overrides only when they conflict with the intended hierarchy. Preserve deliberate emphasis, mathematical notation, emoji, symbols, and brand marks.
6. Render the deck to images or PDF and visually inspect representative title, dense-content, chart, table, code, and mixed-language slides. Check clipping, wrapping, fallback glyphs, punctuation, weight, and contrast.
7. Report the selected family, regional variant, weights, fallback, availability result, and any portability risk.

## Recommended hierarchy

Use no more than two font families in an ordinary deck. Prefer hierarchy through size, weight, spacing, and color rather than decorative font changes.

| Role | Default face | Weight | Typical 16:9 size |
|---|---|---:|---:|
| Cover title | Noto Sans CJK regional variant | Bold or Black | 30–44 pt |
| Slide title | Same | Bold | 26–34 pt |
| Section label / eyebrow | Same | Medium or Bold | 13–18 pt |
| Body | Same | Regular | 18–24 pt |
| Caption / source | Same | Regular | 12–16 pt |
| Data emphasis | Same | Medium or Bold | Match surrounding content |
| Code / terminal | Noto Sans Mono CJK regional variant | Regular or Medium | 14–20 pt |

Treat these as readable starting ranges, not fixed templates. Adjust for room size, display resolution, language density, and the existing presentation system. Avoid Thin or Light weights for projected body text. Avoid synthetic bold and synthetic italics; Chinese emphasis should normally use weight, color, or spacing instead of italics.

## Fallback and portability

- Prefer an installed regional Noto Sans CJK family. If absent, try the corresponding Source Han Sans family, then a documented system CJK sans-serif fallback.
- Never substitute a Latin-only family for Chinese text and assume PowerPoint will resolve it consistently.
- Do not download or install fonts unless the user asks. Do not embed or redistribute a font until its license and the target application's embedding support have been checked.
- A deck intended for another computer must either use fonts available there, embed eligible fonts when supported, or be distributed with a visually verified PDF fallback.
- Keep editable text whenever practical. Do not convert all text to outlines merely to avoid font substitution.

## Acceptance checks

- No tofu boxes, replacement characters, or accidental mixed CJK families.
- Regional glyphs and punctuation match the chosen locale.
- Titles and body text remain readable at presentation distance.
- Text does not overflow, clip, or rewrap into unintended lines after font application.
- Bold and regular weights are real installed faces, not synthetic styling.
- Charts, tables, SmartArt-like shapes, speaker-visible labels, and notes intended for export follow the same font policy.

The curated reference is based on the public [yuleshow/chinese-fonts](https://github.com/yuleshow/chinese-fonts) catalog. Re-check upstream licensing before distributing font files; this skill does not bundle fonts.
