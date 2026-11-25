import { act, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it } from "vitest";
import { createSlots, useKeyed } from "./useKeyed";

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
    const slots = createSlots(4);
    const { result } = renderHook(() => useKeyed(keys, s.fetcher, slots));
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
    const slots = createSlots(4);
    const { rerender } = renderHook(({ keys }) => useKeyed(keys, s.fetcher, slots), { initialProps: { keys: ["a", "b"] } });
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
    const slots = createSlots(1);
    const { result } = renderHook(() => useKeyed(["a", "b"], s.fetcher, slots));
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
    const slots = createSlots(4);
    const { result } = renderHook(() => useKeyed(["a", "b"], s.fetcher, slots), { wrapper: StrictMode });
    expect(s.calls).toEqual(["a", "b"]);
    await act(() => {
      s.open.slice().forEach((d) => d.resolve("ok"));
      return Promise.resolve();
    });
    expect(result.current.size).toBe(2);
  });

  it("REQ-OVERVIEW-008 frees the slot of a fetcher that throws synchronously", async () => {
    const calls: string[] = [];
    const fetcher = (key: string): Promise<string> => {
      calls.push(key);
      if (key === "a") throw new Error("boom");
      return Promise.resolve("ok");
    };
    const slots = createSlots(1);
    const { result } = renderHook(() => useKeyed(["a", "b"], fetcher, slots));
    await act(() => Promise.resolve());
    expect(calls).toEqual(["a", "b"]);
    expect(result.current.get("a")).toEqual({ status: "error", message: "boom" });
    expect(result.current.get("b")).toEqual({ status: "ok", data: "ok" });
  });

  it("REQ-OVERVIEW-008 shares its slots with another mount, and one that was unmounted starts nothing more", async () => {
    const s = setup();
    const slots = createSlots(2);
    const left = renderHook(() => useKeyed(["a", "b", "c"], s.fetcher, slots));
    expect(s.calls).toEqual(["a", "b"]);
    left.unmount();
    const { result } = renderHook(() => useKeyed(["x", "y"], s.fetcher, slots));
    expect(s.calls).toEqual(["a", "b"]);
    const end = (how: (d: Deferred) => void) =>
      act(() => {
        s.open.slice(0, 1).forEach(how);
        return Promise.resolve();
      });
    await end((d) => d.resolve("ok"));
    await end((d) => d.reject(new Error("HTTP 502")));
    expect(s.calls).toEqual(["a", "b", "x", "y"]);
    await end((d) => d.resolve("ok"));
    await end((d) => d.resolve("ok"));
    expect([...result.current.keys()]).toEqual(["x", "y"]);
    expect(s.peak()).toBe(2);
  });

  it("REQ-OVERVIEW-008 a fetcher that throws synchronously frees a slot another mount waits for", async () => {
    const s = setup();
    const slots = createSlots(1);
    const failing = (): Promise<string> => {
      throw new Error("boom");
    };
    renderHook(() => useKeyed(["a"], failing, slots));
    renderHook(() => useKeyed(["x"], s.fetcher, slots));
    await act(() => Promise.resolve());
    expect(s.calls).toEqual(["x"]);
  });
});
