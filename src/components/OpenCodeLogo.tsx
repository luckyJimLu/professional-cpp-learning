import React from "react";

// Pixel font glyph definition on a 9-row grid (rows 0 to 8)
// Rows 0-1: ascenders (e.g. d, f, l, i-dot)
// Rows 2-6: standard x-height (5 rows for p, r, o, c, e, s, etc.)
// Rows 7-8: descenders (e.g. p)
interface GlyphDef {
  width: number;
  rows: string[];
}

const GLYPHS: Record<string, GlyphDef> = {
  p: {
    width: 4,
    rows: [
      "....",
      "....",
      "####",
      "#..#",
      "####",
      "#...",
      "#...",
      "#...",
      "#...",
    ],
  },
  r: {
    width: 4,
    rows: [
      "....",
      "....",
      "####",
      "#..#",
      "#...",
      "#...",
      "#...",
      "....",
      "....",
    ],
  },
  o: {
    width: 4,
    rows: [
      "....",
      "....",
      "####",
      "#..#",
      "#..#",
      "#..#",
      "####",
      "....",
      "....",
    ],
  },
  c: {
    width: 4,
    rows: [
      "....",
      "....",
      "####",
      "#...",
      "#...",
      "#...",
      "####",
      "....",
      "....",
    ],
  },
  "+": {
    width: 5,
    rows: [
      ".....",
      ".....",
      "..#..",
      "..#..",
      "#####",
      "..#..",
      "..#..",
      ".....",
      ".....",
    ],
  },
  f: {
    width: 4,
    rows: [
      ".###",
      ".#..",
      "####",
      ".#..",
      ".#..",
      ".#..",
      ".#..",
      "....",
      "....",
    ],
  },
  e: {
    width: 4,
    rows: [
      "....",
      "....",
      "####",
      "#..#",
      "####",
      "#...",
      "####",
      "....",
      "....",
    ],
  },
  s: {
    width: 4,
    rows: [
      "....",
      "....",
      "####",
      "#...",
      "####",
      "...#",
      "####",
      "....",
      "....",
    ],
  },
  i: {
    width: 2,
    rows: [
      "##",
      "..",
      "##",
      "##",
      "##",
      "##",
      "##",
      "..",
      "..",
    ],
  },
  n: {
    width: 4,
    rows: [
      "....",
      "....",
      "####",
      "#..#",
      "#..#",
      "#..#",
      "#..#",
      "....",
      "....",
    ],
  },
  a: {
    width: 4,
    rows: [
      "....",
      "....",
      "####",
      "...#",
      "####",
      "#..#",
      "####",
      "....",
      "....",
    ],
  },
  l: {
    width: 2,
    rows: [
      "##",
      "##",
      "##",
      "##",
      "##",
      "##",
      "##",
      "..",
      "..",
    ],
  },
  ":": {
    width: 2,
    rows: [
      "....",
      "....",
      "....",
      "##..",
      "....",
      "##..",
      "....",
      "....",
      "....",
    ],
  },
};

interface PixelTextSvgProps {
  text: string;
  pixelSize?: number;
  letterGap?: number;
  wordGap?: number;
  fillColor?: string;
  className?: string;
}

export function PixelTextSvg({
  text,
  pixelSize = 2.5,
  letterGap = 1,
  wordGap = 3,
  fillColor = "currentColor",
  className = "",
}: PixelTextSvgProps) {
  let currentX = 0;
  const rects: { key: string; x: number; y: number; width: number; height: number }[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === " ") {
      currentX += wordGap * pixelSize;
      continue;
    }

    const glyph = GLYPHS[char.toLowerCase()];
    if (!glyph) {
      currentX += 3 * pixelSize;
      continue;
    }

    for (let r = 0; r < glyph.rows.length; r++) {
      const row = glyph.rows[r];
      // Merge contiguous '#' horizontally into a single rect for efficiency
      let startCol = -1;
      for (let c = 0; c <= row.length; c++) {
        const isPixel = c < row.length && row[c] === "#";
        if (isPixel && startCol === -1) {
          startCol = c;
        } else if (!isPixel && startCol !== -1) {
          rects.push({
            key: `${i}-${r}-${startCol}`,
            x: currentX + startCol * pixelSize,
            y: r * pixelSize,
            width: (c - startCol) * pixelSize,
            height: pixelSize,
          });
          startCol = -1;
        }
      }
    }

    currentX += (glyph.width + letterGap) * pixelSize;
  }

  // subtract the trailing letterGap
  const totalWidth = Math.max(0, currentX - letterGap * pixelSize);
  const totalHeight = 9 * pixelSize;

  return (
    <svg
      width={totalWidth}
      height={totalHeight}
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      className={className}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {rects.map((rect) => (
        <rect
          key={rect.key}
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          fill={fillColor}
        />
      ))}
    </svg>
  );
}

interface OpenCodeLogoProps {
  showFullText?: boolean;
}

export const OpenCodeLogo: React.FC<OpenCodeLogoProps> = ({ showFullText = true }) => {
  return (
    <div className="opencode-brand" title="Professional C++ Learning Console">
      {/* High-contrast highlighted PRO badge in OpenCode block pixel typography */}
      <div className="opencode-pro-badge" aria-label="PRO">
        <PixelTextSvg
          text="pro"
          pixelSize={2.4}
          letterGap={1}
          fillColor="var(--opencode-pro-color, #00599c)"
          className="opencode-pro-svg"
        />
      </div>

      {/* Optional 'fessional' pixel text on wider displays */}
      {showFullText && (
        <div className="opencode-fessional-wrap" aria-hidden="true">
          <PixelTextSvg
            text="fessional"
            pixelSize={2.4}
            letterGap={1}
            fillColor="#1e293b"
            className="opencode-fessional-svg"
          />
        </div>
      )}

      {/* c++ in OpenCode block pixel typography */}
      <div className="opencode-cpp-wrap" aria-label="C++">
        <PixelTextSvg
          text="c++"
          pixelSize={2.4}
          letterGap={1}
          fillColor="#0f172a"
          className="opencode-cpp-svg"
        />
      </div>
    </div>
  );
};
