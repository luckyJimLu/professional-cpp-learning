export interface ReadingStats {
  minutes: number;
  wordCount: number;
  cjkCount: number;
  latinWordCount: number;
}

/**
 * Calculates reading time and word count for technical Markdown documents
 * containing mixed CJK text, English terminology, and C++ code blocks.
 */
export function calculateReadingStats(content: string): ReadingStats {
  if (!content) {
    return { minutes: 1, wordCount: 0, cjkCount: 0, latinWordCount: 0 };
  }

  // Count CJK characters (Chinese, Japanese, Korean)
  const cjkMatches = content.match(/[\u4e00-\u9fa5\u3040-\u30ff]/g);
  const cjkCount = cjkMatches ? cjkMatches.length : 0;

  // Strip code blocks to count prose words separately
  const proseOnly = content.replace(/```[\s\S]*?```/g, " ");

  // Count Latin / English alphanumeric words
  const latinMatches = proseOnly.match(/[a-zA-Z0-9_\-]+/g);
  const latinWordCount = latinMatches ? latinMatches.length : 0;

  // Count code lines to estimate code reading time
  const codeMatches = content.match(/```[\s\S]*?```/g);
  const codeLines = codeMatches
    ? codeMatches.reduce((total, block) => total + block.split("\n").length, 0)
    : 0;

  const totalWords = cjkCount + latinWordCount;

  // Technical reading rates:
  // - CJK: ~320 chars/min
  // - Latin prose words: ~180 words/min
  // - Code: ~35 lines/min
  const estimatedMinutes = Math.max(
    1,
    Math.round(cjkCount / 320 + latinWordCount / 180 + codeLines / 35),
  );

  return {
    minutes: estimatedMinutes,
    wordCount: totalWords,
    cjkCount,
    latinWordCount,
  };
}
