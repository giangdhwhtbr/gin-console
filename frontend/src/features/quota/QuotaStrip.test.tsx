import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { claudeQuota, codexQuota, json, quota } from "./quotaFixtures";
import { resetQuotaStore } from "./quotaStore";
import { QuotaStrip } from "./QuotaStrip";

const answer = (body: Response) => vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(body.clone())));

beforeEach(() => resetQuotaStore());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("QuotaStrip", () => {
  // REQ-UI-016
  it("REQ-UI-016 shows a status for each harness, both linking to the quota page", async () => {
    answer(json(quota()));
    render(<QuotaStrip />);
    const claude = await screen.findByRole("link", { name: "Claude ok 41%" });
    const codex = screen.getByRole("link", { name: "Codex ok 16%" });
    expect(claude).toHaveAttribute("href", "/quota");
    expect(codex).toHaveAttribute("href", "/quota");
  });

  // REQ-UI-016
  it("REQ-UI-016 says near the limit, limited, no data and error in words", async () => {
    answer(json(quota(claudeQuota(85), codexQuota({ primary: null }))));
    const { unmount } = render(<QuotaStrip />);
    expect(await screen.findByRole("link", { name: "Claude near the limit 85%" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Codex no data" })).toBeVisible();
    unmount();
    resetQuotaStore();
    answer(json(quota({ error: "claude timed out" }, codexQuota({ ordinary_usage_allowed: false }))));
    render(<QuotaStrip />);
    expect(await screen.findByRole("link", { name: "Claude error" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Codex limited 16%" })).toBeVisible();
  });

  // REQ-UI-016
  it("REQ-UI-016 shows a note when the quota cannot be loaded", async () => {
    answer(json({}, 500));
    render(<QuotaStrip />);
    expect(await screen.findByRole("status")).toHaveTextContent(/Quota unavailable.*500/);
  });
});
