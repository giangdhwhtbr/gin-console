import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RequirementsFailure } from "./api";
import { useFetched } from "./useFetched";

describe("useFetched", () => {
  it("REQ-REQUIREMENTS-019 retry fetches again and replaces an error with data", async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new RequirementsFailure("boom", 502)).mockResolvedValueOnce("data");
    const { result } = renderHook(() => useFetched(fetcher));
    await waitFor(() => expect(result.current.state.status).toBe("error"));
    act(() => result.current.retry());
    expect(result.current.state.status).toBe("loading");
    await waitFor(() => expect(result.current.state).toEqual({ status: "ok", data: "data" }));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("REQ-REQUIREMENTS-019 a failure that is not a RequirementsFailure is wrapped", async () => {
    const fetcher = () => Promise.reject(new Error("net down"));
    const { result } = renderHook(() => useFetched(fetcher));
    await waitFor(() => expect(result.current.state.status).toBe("error"));
    expect(result.current.state).toMatchObject({ error: { message: "net down", status: 0 } });
  });

  it("REQ-REQUIREMENTS-015 the answer of an older fetcher is dropped, and loading shows meanwhile", async () => {
    let release: (value: string) => void = () => undefined;
    const slow = () => new Promise<string>((resolve) => (release = resolve));
    const fast = () => Promise.resolve("new");
    const { result, rerender } = renderHook(({ fetcher }) => useFetched(fetcher), { initialProps: { fetcher: slow } });
    rerender({ fetcher: fast });
    await waitFor(() => expect(result.current.state).toEqual({ status: "ok", data: "new" }));
    release("old");
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current.state).toEqual({ status: "ok", data: "new" });
  });

  it("REQ-REQUIREMENTS-015 a new fetcher shows loading, not the data of the old one", async () => {
    const first = () => Promise.resolve("one");
    const second = () => new Promise<string>(() => undefined);
    const { result, rerender } = renderHook(({ fetcher }) => useFetched(fetcher), { initialProps: { fetcher: first } });
    await waitFor(() => expect(result.current.state.status).toBe("ok"));
    rerender({ fetcher: second });
    expect(result.current.state).toEqual({ status: "loading" });
  });
});
