import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DependencyList,
} from "react";

export interface AsyncContentOptions {
  /** 为 false 时跳过本轮加载（例如外部 store 已完成水合） */
  enabled?: boolean;
  /** 初始是否已有缓存数据，避免初次挂载闪烁 loading */
  initialReady?: boolean;
}

export interface AsyncContentState<T> {
  data: T;
  status: "loading" | "ready" | "error";
  error: string;
  retry: () => void;
}

/**
 * 通用异步内容加载 Hook：统一管理 loading / ready / error 状态、竞态取消与重试触发。
 */
export function useAsyncContent<T>(
  loader: () => Promise<T>,
  initialData: T,
  deps: DependencyList = [],
  options: AsyncContentOptions = {},
): AsyncContentState<T> {
  const { enabled = true, initialReady = false } = options;
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const initialDataRef = useRef(initialData);
  initialDataRef.current = initialData;

  const [data, setData] = useState<T>(initialData);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    initialReady ? "ready" : "loading",
  );
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    if (!initialReady) {
      setStatus("loading");
    }
    setError("");
    loaderRef
      .current()
      .then((result) => {
        if (!alive) return;
        setData(result);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setData(initialDataRef.current);
        setError(err instanceof Error ? err.message : "加载失败");
        setStatus("error");
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, retryKey, ...deps]);

  const retry = useCallback(() => {
    setError("");
    setStatus("loading");
    setRetryKey((n) => n + 1);
  }, []);

  return { data, status, error, retry };
}
