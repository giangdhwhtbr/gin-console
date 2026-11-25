import { useEffect, useRef, useState } from "react";

export type Answer<T> = { status: "ok"; data: T } | { status: "error"; message: string };

/** Asks `fetcher` once per key, at most `limit` at a time, and keeps every answer. `fetcher` must be stable. */
export function useKeyed<T>(keys: readonly string[], fetcher: (key: string) => Promise<T>, limit: number): ReadonlyMap<string, Answer<T>> {
  const [answers, setAnswers] = useState<ReadonlyMap<string, Answer<T>>>(new Map());
  const asked = useRef(new Set<string>());
  const queue = useRef<string[]>([]);
  const running = useRef(0);
  const live = useRef(true);
  const joined = JSON.stringify(keys);

  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);

  useEffect(() => {
    const pump = () => {
      while (live.current && running.current < limit && queue.current.length > 0) {
        const key = queue.current.shift();
        if (key === undefined) break;
        running.current += 1;
        const settle = (answer: Answer<T>) => {
          running.current -= 1;
          if (!live.current) return;
          setAnswers((prev) => new Map(prev).set(key, answer));
          pump();
        };
        new Promise<T>((resolve) => resolve(fetcher(key))).then(
          (data) => settle({ status: "ok", data }),
          (error: unknown) => settle({ status: "error", message: error instanceof Error ? error.message : String(error) }),
        );
      }
    };
    const wanted: unknown = JSON.parse(joined);
    for (const key of Array.isArray(wanted) ? wanted.map(String) : []) {
      if (asked.current.has(key)) continue;
      asked.current.add(key);
      queue.current.push(key);
    }
    pump();
  }, [joined, fetcher, limit]);

  return answers;
}
