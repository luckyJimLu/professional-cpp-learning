export interface ContentLesson {
  path: string;
  number: number;
  title: string;
  status: string;
  duration: string;
  topics: string[];
  guidelines: string[];
  lab: string;
  previous: string;
  next: string;
  chapter?: string;
}

export interface ContentTopic {
  path: string;
  category: string;
  summary: string;
  title: string;
  locale: string;
}

export interface ContentBooklet {
  path: string;
  sections: number;
  entries: number;
}

export interface ContentManifest {
  contentVersion: string;
  generatedAt: string;
  lessons: ContentLesson[];
  topics: ContentTopic[];
  booklets: { c: ContentBooklet; cpp: ContentBooklet };
  slides: { outline: string; lessons: string[] };
  assets: { byPath: Record<string, string> };
}

export interface SearchIndexFile {
  path: string;
  title: string;
  kind: "md" | "code";
  content: string;
  lines: number;
}

export interface SearchIndex {
  files: SearchIndexFile[];
}
