import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { claudeQuota, codexQuota, json, quota } from "./quotaFixtures";
import { resetQuotaStore } from "./quotaStore";
import { QuotaPage } from "./QuotaPage";

const answer = (make: () => Response) =>
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(make())));

beforeEach(() => resetQuotaStore());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("QuotaPage", () => {
  // REQ-UI-018
  it("REQ-UI-018 shows each Claude window with a progress bar and its reset time", async () => {
    answer(() => json(quota()));
    render(<QuotaPage />);
    const card = await screen.findByRole("region", { name: "Claude" });
    const session = within(card).getByRole("progressbar", { name: "session" });
    expect(session).toHaveAttribute("aria-valuenow", "41");
    expect(within(card).getByRole("progressbar", { name: "week (all models)" })).toHaveAttribute(
      "aria-valuenow",
      "25",
    );
    expect(within(card).getByText("41%")).toBeInTheDocument();
    expect(within(card).getAllByText(/2026-10-20 12:00 UTC/)).not.toHaveLength(0);
  });

  // REQ-UI-018
  it("REQ-UI-018 says how long ago the usage was fetched", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-15T03:03:00Z"));
    answer(() => json(quota()));
    render(<QuotaPage />);
    const card = await screen.findByRole("region", { name: "Claude" });
    expect(within(card).getByText(/Updated 3 minutes ago/)).toBeInTheDocument();
  });

  // REQ-UI-018
  it("REQ-UI-018 Refresh sends refresh=1 and is disabled until the answer arrives", async () => {
    let release: (response: Response) => void = () => undefined;
    const later = new Promise<Response>((resolve) => {
      release = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => Promise.resolve(json(quota())))
      .mockImplementationOnce(() => later);
    vi.stubGlobal("fetch", fetchMock);
    render(<QuotaPage />);
    const button = await screen.findByRole("button", { name: "Refresh" });
    await userEvent.click(button);
    expect(fetchMock).toHaveBeenLastCalledWith("/api/quota?refresh=1");
    expect(screen.getByRole("button", { name: "Refresh" })).toBeDisabled();
    await act(async () => {
      release(json(quota(claudeQuota(70))));
      await later;
    });
    expect(await screen.findByText("70%")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeEnabled();
  });

  // REQ-UI-018
  it("REQ-UI-018 keeps raw command text in a closed details element as plain text", async () => {
    const raw = "<script>window.hacked = 1</script> API key login";
    answer(() => json(quota({ error: "claude /usage output was not understood", raw })));
    const { container } = render(<QuotaPage />);
    expect(await screen.findByText(/was not understood/)).toBeInTheDocument();
    expect(screen.getByText(raw).closest("details")).toHaveProperty("open", false);
    expect(container.querySelector("script")).toBeNull();
  });

  // REQ-UI-019
  it("REQ-UI-019 shows the plan, a 30-day window and the reset credits", async () => {
    const codex = codexQuota({
      plan_type: "free",
      reset_credits_available: 2,
      primary: { used_percent: 0, window_minutes: 43200, resets_at: "2026-11-06T06:50:12Z" },
    });
    answer(() => json(quota(claudeQuota(41), codex)));
    render(<QuotaPage />);
    const card = await screen.findByRole("region", { name: "Codex" });
    expect(within(card).getByText(/free/)).toBeInTheDocument();
    expect(within(card).getByRole("progressbar", { name: "30 days" })).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
    expect(within(card).getByText(/2 reset credits available/)).toBeInTheDocument();
    expect(within(card).getByText(/2026-11-06 06:50 UTC/)).toBeInTheDocument();
  });

  // REQ-UI-019
  it("REQ-UI-019 shows two windows by length", async () => {
    const codex = codexQuota({
      secondary: { used_percent: 40, window_minutes: 10080, resets_at: null },
    });
    answer(() => json(quota(claudeQuota(41), codex)));
    render(<QuotaPage />);
    const card = await screen.findByRole("region", { name: "Codex" });
    expect(within(card).getByRole("progressbar", { name: "5 hours" })).toHaveAttribute("aria-valuenow", "16");
    expect(within(card).getByRole("progressbar", { name: "7 days" })).toHaveAttribute("aria-valuenow", "40");
  });

  // REQ-UI-019
  it("REQ-UI-019 says when the limit has been reached", async () => {
    const codex = codexQuota({ ordinary_usage_allowed: false, rate_limit_reached_type: "rate_limit_reached" });
    answer(() => json(quota(claudeQuota(41), codex)));
    render(<QuotaPage />);
    expect(await screen.findByText(/limit has been reached/i)).toBeInTheDocument();
  });

  // REQ-UI-019
  it("REQ-UI-019 says when Codex reported no window", async () => {
    answer(() => json(quota(claudeQuota(41), codexQuota({ primary: null }))));
    render(<QuotaPage />);
    expect(await screen.findByText(/no rate-limit window/i)).toBeInTheDocument();
  });

  // REQ-UI-021
  it("REQ-UI-021 shows one side's error and still shows the other card", async () => {
    answer(() => json(quota(claudeQuota(41), { error: "codex command not found" })));
    render(<QuotaPage />);
    expect(await screen.findByText("codex command not found")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "session" })).toBeInTheDocument();
  });

  // REQ-UI-021
  it("REQ-UI-021 shows an error with Retry for a failed request and recovers", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => Promise.resolve(json({}, 500)))
      .mockImplementation(() => Promise.resolve(json(quota())));
    vi.stubGlobal("fetch", fetchMock);
    render(<QuotaPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/500/);
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("progressbar", { name: "session" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // REQ-UI-021
  it("REQ-UI-021 shows an error, not a blank page, for an unexpected response", async () => {
    answer(() => json({ claude: "x", codex: null }));
    render(<QuotaPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/unexpected response/);
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
