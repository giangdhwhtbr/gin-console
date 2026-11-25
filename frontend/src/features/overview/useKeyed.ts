import { useEffect, useRef, useState } from "react";

export type Answer<T> = { status: "ok"; data: T } | { status: "error"; message: string };

export type Slots = { take: () => boolean; free: () => void; onFree: (wake: () => void) => () => void };

/** `limit` request slots; everyone who shares them is woken when one is freed. */
export function createSlots(limit: number): Slots {
  const waiting = new Set<() => void>();
  let taken = 0;
  return {
    take: () => {
      if (taken >= limit) return false;
      taken += 1;
      return true;
    },
    free: () => {
      taken -= 1;
      for (const wake of [...waiting]) wake();
    },
    onFree: (wake) => {
      waiting.add(wake);
      return () => {
        waiting.delete(wake);
      };
    },
  };
}

/** Asks `fetcher` once per key while one of `slots` is free, and keeps every answer. `fetcher` and `slots` must be stable. */
export function useKeyed<T>(keys: readonly string[], fetcher: (key: string) => Promise<T>, slots: Slots): ReadonlyMap<string, Answer<T>> {
  const [answers, setAnswers] = useState<ReadonlyMap<string, Answer<T>>>(new Map());
  const asked = useRef(new Set<string>());
  const queue = useRef<string[]>([]);
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
      while (live.current) {
        const key = queue.current[0];
        if (key === undefined || !slots.take()) break;
        queue.current.shift();
        const settle = (answer: Answer<T>) => {
          if (live.current) setAnswers((prev) => new Map(prev).set(key, answer));
          slots.free();
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
    return slots.onFree(pump);
  }, [joined, fetcher, slots]);

  return answers;
}
