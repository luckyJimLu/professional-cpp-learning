import type {
  ContentManifest,
  SearchIndex,
} from "@/types/contentManifest";

let manifestPromise: Promise<ContentManifest> | null = null;
let searchIndexPromise: Promise<SearchIndex> | null = null;
const textCache = new Map<string, Promise<string>>();

function withBase(relative: string) {
  return `${import.meta.env.BASE_URL.replace(/\/?$/, "/")}${relative}`;
}

export function loadContentManifest(): Promise<ContentManifest> {
  manifestPromise ??= (async () => {
    const response = await fetch(withBase("content/manifest.json"));
    if (!response.ok) {
      throw new Error(`content manifest unavailable: ${response.status}`);
    }
    return (await response.json()) as ContentManifest;
  })();
  return manifestPromise;
}

export async function loadSearchIndex(): Promise<SearchIndex> {
  searchIndexPromise ??= (async () => {
    const response = await fetch(withBase("content/search-index.json"));
    if (!response.ok) {
      throw new Error(`search index unavailable: ${response.status}`);
    }
    return (await response.json()) as SearchIndex;
  })();
  return searchIndexPromise;
}

export function fetchContentText(relative: string): Promise<string> {
  textCache.set(
    relative,
    textCache.get(relative) ?? (async () => {
      const response = await fetch(withBase(`content/${relative}`));
      if (!response.ok) {
        throw new Error(`content file unavailable: ${relative} (${response.status})`);
      }
      return (await response.text()).replace(/^\uFEFF/, "");
    })(),
  );
  return textCache.get(relative) as Promise<string>;
}

export function assetUrl(resolvedContentPath: string): string {
  return withBase(`content/${resolvedContentPath}`);
}
