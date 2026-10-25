# Chinese font options for presentations

Use this shortlist only when Noto Sans CJK is unavailable or the presentation requires a different voice. It is derived from the `yuleshow/chinese-fonts` catalog, which distinguishes script coverage, weight count, licensing, and regional punctuation behavior.

## Preferred families

| Communication need | Recommended family | Why | License noted by source |
|---|---|---|---|
| Neutral professional default | 思源黑体 / Noto Sans CJK | Seven weights; SC, TC, JP, and KR coverage; dependable body and title hierarchy | SIL OFL 1.1 |
| Editorial or literary contrast | 思源宋体 / Noto Serif CJK | Seven weights; compatible regional coverage; suitable for restrained titles or quotations | SIL OFL 1.1 |
| Code and technical alignment | 思源等宽 / Noto Sans Mono CJK | CJK-capable monospace with seven weights | SIL OFL 1.1 |
| Friendly rounded tone | 源泉圆体 / GenSenRounded | Seven weights with simplified, traditional, and Japanese coverage | SIL OFL 1.1 |
| Humanist teaching or cultural tone | 霞鹜文楷 / LXGW WenKai | Three weights; simplified, traditional, and Japanese coverage; TC variant available | SIL OFL 1.1 |
| Distinctive display titles | 得意黑 / Smiley Sans | Strong title personality with simplified and traditional coverage; use sparingly | SIL OFL 1.1 |
| Corporate alternative | IBM Plex Sans TC/SC | Seven weights and explicit TC/SC families | SIL OFL 1.1 |
| Cross-platform system fallback | Microsoft YaHei, Microsoft JhengHei, PingFang SC/TC | Often available on Windows or macOS, but availability and redistribution terms differ | System-dependent |

## Selection rules

- Keep Noto Sans CJK for body text even when using a display face for titles.
- Use a serif or creative font only when it reinforces the message; avoid decorative fonts in dense slides, tables, charts, or code.
- Match the regional variant to the content. TC/TW/HK fonts generally provide centered punctuation expected in traditional Chinese layouts, while SC/CN variants use mainland punctuation placement.
- Prefer families with at least Regular and Bold. Multiple real weights produce more reliable PowerPoint hierarchy than scaling or synthetic bold.
- Confirm that every required character, punctuation mark, currency symbol, unit, and Latin glyph renders before committing to an alternative.

## Licensing boundary

The source catalog records Noto, Source Han derivatives, LXGW WenKai, Smiley Sans, GenSenRounded, and IBM Plex Sans TC/SC as SIL OFL 1.1. Treat that as a discovery aid, not a substitute for the font package's current license file. Before embedding, packaging, modifying, or redistributing fonts, inspect the exact downloaded version's license and reserved-font-name conditions.

Source: <https://github.com/yuleshow/chinese-fonts/blob/master/README.md>
