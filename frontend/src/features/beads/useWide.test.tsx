import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useWide } from "./useWide";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubMedia(matches: boolean) {
  const listeners = new Set<() => void>();
  const media = {
    matches,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  };
  vi.stubGlobal("matchMedia", () => media);
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
