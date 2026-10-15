import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { quota } from "@/features/quota/quotaFixtures";
import { resetQuotaStore } from "@/features/quota/quotaStore";
import { App } from "./App";

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  resetQuotaStore();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("App routing", () => {
  // REQ-UI-008
  it("REQ-UI-008 opens the list from the sidebar without a reload and follows back", async () => {
    window.history.replaceState(null, "", "/");
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([]))));
    render(<App />);
    await screen.findByText(/no projects configured/i);
    await userEvent.click(screen.getByRole("link", { name: "Sessions" }));
    expect(window.location.pathname).toBe("/sessions");
    await screen.findByText(/no sessions found/i);
    act(() => window.history.back());
    await screen.findByText(/no projects configured/i);
    expect(window.location.pathname).toBe("/");
  });

  // REQ-UI-012
  it("REQ-UI-012 renders the session log page on /sessions/:project/:id and falls back on malformed route", async () => {
    window.history.replaceState(null, "", "/sessions/qwikfone/11111111-1111-4111-8111-111111111111");
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/messages")) {
          return Promise.resolve(json({ items: [], next_offset: null }));
        }
        return Promise.resolve(json([]));
      }),
    );
    render(<App />);
    await screen.findByRole("link", { name: "Back to sessions" });
    expect(screen.getByText("No messages.")).toBeInTheDocument();

    cleanup();
    window.history.replaceState(null, "", "/sessions/%E0%A4%A");
    render(<App />);
    await screen.findByText(/no projects configured/i);

    cleanup();
    window.history.replaceState(null, "", "/sessions/%E0%A4%A/11111111-1111-4111-8111-111111111111");
    render(<App />);
    await screen.findByText(/no projects configured/i);
  });

  // REQ-UI-015
  it("REQ-UI-015 opens the quota page from the sidebar without a reload and follows back", async () => {
    window.history.replaceState(null, "", "/");
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        Promise.resolve(url.includes("/api/quota") ? json(quota()) : json([])),
      ),
    );
    render(<App />);
    await screen.findByText(/no projects configured/i);
    await userEvent.click(screen.getByRole("link", { name: "Quota" }));
    expect(window.location.pathname).toBe("/quota");
    expect(await screen.findByRole("heading", { name: "Quota" })).toBeInTheDocument();
    act(() => window.history.back());
    await screen.findByText(/no projects configured/i);
    expect(window.location.pathname).toBe("/");
  });
});


