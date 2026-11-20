export type RoundSimulatorType =
  | 'ch1-r1-module-brace'
  | 'ch1-r2-ref-const'
  | 'ch1-r3-auto-nrvo'
  | 'ch2-r1-cstring-ctad'
  | 'ch2-r2-sv-charconv'
  | 'ch2-r3-println-dangling'
  | 'ch3-r1-selfdoc-squint'
  | 'ch3-r2-naming-constcast'
  | 'ch3-r3-style-ub';

export type EditorialPlateId =
  | 'ch3-hero-codecraft'
  | 'ch3-art-selfdoc'
  | 'ch3-art-decompose'
  | 'ch3-art-naming'
  | 'ch3-art-ruler';

export interface XianTuArtifact {
  id: string;
  name: string;
  syntax: string;
  identity: string;
  superpower: string;
  weakness: string;
  imageUrl?: string;
  plateId?: EditorialPlateId;
  imageAlt: string;
  legacyCode: string;
  modernCode: string;
  comparisonNote: string;
}

export interface XianTuRound {
  id: string;
  index: number;
  total: number;
  title: string;
  shortTitle: string;
  realm: string;
  isBossTrial?: boolean;
  peril: string;
  question: string;
  guidance: string[];
  enlightenment: {
    mainline: string;
    breakthrough: string;
    verse: string;
  };
  simulatorType: RoundSimulatorType;
  simulatorTitle: string;
  simulatorSubtitle: string;
}

export interface XianTuChapter {
  id: string;
  chapterNumber: number;
  shortName: string;
  title: string;
  stageLabel: string;
  realmStage: string;
  prologue: string;
  heroImageUrl?: string;
  heroPlateId?: EditorialPlateId;
  heroImageAlt: string;
  heroCaption: string;
  heroVerse: string;
  heroTagline: string;
  artifacts: XianTuArtifact[];
  rounds: XianTuRound[];
}

export interface EraEvolutionStep {
  chapterId: string;
  chapterNumber: number;
  keyword: string;
  summary: string;
}

export interface EraCommandment {
  id: string;
  title: string;
  detail: string;
  relatedChapterId: string;
  relatedChapterNumber: number;
  relatedRoundIndex: number;
}

export interface TrialBugOption {
  id: string;
  label: string;
  isCorrect: boolean;
  feedback: string;
}

export interface TrialBugSpec {
  id: string;
  lineNumber: number;
  secondaryLineNumber?: number;
  codeExcerpt: string;
  dimension: string;
  category: '规范违禁' | '编译错误' | '运行期未定义行为' | '类型与契约隐患';
  title: string;
  prompt: string;
  options: TrialBugOption[];
  explanation: string;
  fixedLine: string;
}

export interface XianTuTrial {
  filename: string;
  title: string;
  intro: string;
  hint: string;
  codeLines: { lineNumber: number; content: string; bugId?: string }[];
  bugs: TrialBugSpec[];
  fixedFullCode: string;
}

export interface XianTuEra {
  id: string;
  eraLabel: string;
  title: string;
  subtitle: string;
  overview: string;
  nextEraPreview: string;
  chapters: XianTuChapter[];
  evolution: EraEvolutionStep[];
  commandments: EraCommandment[];
  trial: XianTuTrial;
}
