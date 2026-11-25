import { act, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it } from "vitest";
import { useKeyed } from "./useKeyed";

type Deferred = { key: string; resolve: (value: string) => void; reject: (error: Error) => void };

function setup() {
  const open: Deferred[] = [];
  const calls: string[] = [];
  let peak = 0;
  const fetcher = (key: string) =>
    new Promise<string>((resolve, reject) => {
      calls.push(key);
      const entry: Deferred = {
        key,
        resolve: (value) => {
          open.splice(open.indexOf(entry), 1);
          resolve(value);
        },
        reject: (error) => {
          open.splice(open.indexOf(entry), 1);
          reject(error);
        },
      };
      open.push(entry);
      peak = Math.max(peak, open.length);
    });
  return { open, calls, fetcher, peak: () => peak };
}

const keysOf = (n: number) => Array.from({ length: n }, (_, i) => `k${i}`);

describe("useKeyed", () => {
  it("REQ-OVERVIEW-008 never has more than the limit open, and answers all 14 keys", async () => {
    const s = setup();
    const keys = keysOf(14);
    const { result } = renderHook(() => useKeyed(keys, s.fetcher, 4));
    expect(s.open).toHaveLength(4);
    while (s.open.length > 0) {
      await act(() => {
        s.open[0]?.resolve("ok");
        return Promise.resolve();
      });
      expect(s.open.length).toBeLessThanOrEqual(4);
    }
    expect(s.peak()).toBe(4);
    expect(result.current.size).toBe(14);
  });

  it("REQ-OVERVIEW-010 asks nothing again for the same keys, and asks a new key", async () => {
    const s = setup();
    const { rerender } = renderHook(({ keys }) => useKeyed(keys, s.fetcher, 4), { initialProps: { keys: ["a", "b"] } });
    await act(() => {
      s.open.slice().forEach((d) => d.resolve("ok"));
      return Promise.resolve();
    });
    rerender({ keys: ["a", "b"] });
    expect(s.calls).toEqual(["a", "b"]);
    rerender({ keys: ["a", "b", "c"] });
    expect(s.calls).toEqual(["a", "b", "c"]);
  });

  it("REQ-OVERVIEW-008 turns a rejection into an error answer and frees its slot", async () => {
    const s = setup();
    const { result } = renderHook(() => useKeyed(["a", "b"], s.fetcher, 1));
    expect(s.calls).toEqual(["a"]);
    await act(() => {
      s.open[0]?.reject(new Error("HTTP 502"));
      return Promise.resolve();
    });
    expect(result.current.get("a")).toEqual({ status: "error", message: "HTTP 502" });
    expect(s.calls).toEqual(["a", "b"]);
  });

  it("REQ-OVERVIEW-008 asks each key once under StrictMode", async () => {
    const s = setup();
    const { result } = renderHook(() => useKeyed(["a", "b"], s.fetcher, 4), { wrapper: StrictMode });
    expect(s.calls).toEqual(["a", "b"]);
    await act(() => {
      s.open.slice().forEach((d) => d.resolve("ok"));
      return Promise.resolve();
    });
    expect(result.current.size).toBe(2);
  });
});
