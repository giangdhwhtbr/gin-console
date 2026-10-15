import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { claudeQuota, json, quota } from "./quotaFixtures";
import { resetQuotaStore } from "./quotaStore";
import { claudeStatus } from "./status";
import { useQuota } from "./useQuota";

function Probe({ name }: { name: string }) {
  const { snapshot, pending, refresh } = useQuota();
  const detail =
    snapshot.status === "ok"
      ? `ok ${claudeStatus(snapshot.quota.claude).percent}${snapshot.error ? ` error:${snapshot.error}` : ""}`
      : snapshot.status === "error"
        ? `error ${snapshot.message}`
        : "loading";
  return (
    <div>
      <span>{`${name} ${detail} ${pending ? "pending" : "idle"}`}</span>
      <button onClick={refresh}>{`refresh ${name}`}</button>
    </div>
  );
}

const settle = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

beforeEach(() => resetQuotaStore());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("quota store", () => {
  // REQ-UI-020
  it("REQ-UI-020 shares one request between the strip and the page", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(json(quota())));
    vi.stubGlobal("fetch", fetchMock);
    render(
      <>
        <Probe name="a" />
        <Probe name="b" />
      </>,
    );
    expect(await screen.findByText(/^a ok 41 idle/)).toBeInTheDocument();
    expect(screen.getByText(/^b ok 41 idle/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // REQ-UI-020
  it("REQ-UI-020 reloads every 60 seconds without a loading state", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => Promise.resolve(json(quota(claudeQuota(41)))))
      .mockImplementation(() => Promise.resolve(json(quota(claudeQuota(50)))));
    vi.stubGlobal("fetch", fetchMock);
    render(<Probe name="a" />);
    await settle(0);
    expect(screen.getByText(/^a ok 41/)).toBeInTheDocument();
    await settle(60_000);
    expect(screen.getByText(/^a ok 50/)).toBeInTheDocument();
    expect(screen.queryByText(/loading/)).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  // REQ-UI-020
  it("REQ-UI-020 does not poll while hidden and reloads when visible again", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(() => Promise.resolve(json(quota())));
    vi.stubGlobal("fetch", fetchMock);
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    render(<Probe name="a" />);
    await settle(0);
    visibility.mockReturnValue("hidden");
    await settle(120_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    visibility.mockReturnValue("visible");
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  // REQ-UI-020
  it("REQ-UI-020 keeps the last data when a refresh fails", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => Promise.resolve(json(quota())))
      .mockImplementation(() => Promise.resolve(json({}, 500)));
    vi.stubGlobal("fetch", fetchMock);
    render(<Probe name="a" />);
    await settle(0);
    await settle(60_000);
    expect(screen.getByText(/^a ok 41 error:.*500/)).toBeInTheDocument();
  });

  // REQ-UI-021
  it("REQ-UI-021 rejects a response of an unexpected shape", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json({ claude: 1, codex: [] }))));
    render(<Probe name="a" />);
    expect(await screen.findByText(/^a error .*unexpected response/)).toBeInTheDocument();
  });

  // REQ-UI-021
  it("REQ-UI-021 accepts an error object for one side", async () => {
    const body = quota(claudeQuota(41), { error: "codex command not found" });
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json(body))));
    render(<Probe name="a" />);
    expect(await screen.findByText(/^a ok 41 idle/)).toBeInTheDocument();
  });

  // REQ-UI-018
  it("REQ-UI-018 a forced refresh sends refresh=1 and is pending until it answers", async () => {
    let answer: (response: Response) => void = () => undefined;
    const pendingAnswer = new Promise<Response>((resolve) => {
      answer = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => Promise.resolve(json(quota())))
      .mockImplementationOnce(() => pendingAnswer);
    vi.stubGlobal("fetch", fetchMock);
    render(<Probe name="a" />);
    await screen.findByText(/^a ok 41 idle/);
    act(() => screen.getByText("refresh a").click());
    expect(await screen.findByText(/^a ok 41 pending/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith("/api/quota?refresh=1");
    await act(async () => {
      answer(json(quota(claudeQuota(60))));
      await pendingAnswer;
    });
    expect(await screen.findByText(/^a ok 60 idle/)).toBeInTheDocument();
  });
});
