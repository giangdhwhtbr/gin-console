import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

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
});
