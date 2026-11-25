import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMinWidth, useWide } from "./useWide";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubMedia(matches: boolean, queries: string[] = []) {
  const listeners = new Set<() => void>();
  const media = {
    matches,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  };
  vi.stubGlobal("matchMedia", (query: string) => {
    queries.push(query);
    return media;
  });
  return (next: boolean) => {
    media.matches = next;
    listeners.forEach((listener) => listener());
  };
}

describe("useWide", () => {
  it("REQ-UI-045 is true from 1024px and false below", () => {
    stubMedia(false);
    expect(renderHook(() => useWide()).result.current).toBe(false);
    cleanup();
    stubMedia(true);
    expect(renderHook(() => useWide()).result.current).toBe(true);
  });

  it("REQ-UI-045 follows the window", () => {
    const set = stubMedia(true);
    const { result } = renderHook(() => useWide());
    act(() => set(false));
    expect(result.current).toBe(false);
  });

  it("REQ-UI-045 is true when matchMedia is missing", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(renderHook(() => useWide()).result.current).toBe(true);
  });
});

describe("useMinWidth", () => {
  it("REQ-UI-153 asks for the given width and follows the window", () => {
    const queries: string[] = [];
    const set = stubMedia(true, queries);
    const { result } = renderHook(() => useMinWidth(768));
    expect(queries).toContain("(min-width: 768px)");
    expect(result.current).toBe(true);
    act(() => set(false));
    expect(result.current).toBe(false);
  });

  it("REQ-UI-153 is true when matchMedia is missing, and useWide asks for 1024px", () => {
    const queries: string[] = [];
    stubMedia(false, queries);
    renderHook(() => useWide());
    expect(queries).toContain("(min-width: 1024px)");
    cleanup();
    vi.stubGlobal("matchMedia", undefined);
    expect(renderHook(() => useMinWidth(768)).result.current).toBe(true);
  });
});
