import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "@/app/App";
import { bead, json } from "./beadFixtures";
import { clearReturn } from "./returnState";

beforeEach(() => clearReturn());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stub() {
  const list = [bead("a-1", { title: "Ready one", ready: true }), bead("a-2", { title: "Other", ready: true })];
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = new URL(
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url,
        "http://localhost",
      );
      if (url.pathname === "/api/projects") {
        return Promise.resolve(json([{ name: "alpha", path: "/x", exists: true, workflow: null, beads: null }]));
      }
      if (url.pathname === "/api/beads") return Promise.resolve(json(list));
      if (url.pathname.endsWith("/comments")) return Promise.resolve(json([]));
      if (url.pathname.endsWith("/reopens")) return Promise.resolve(json({ reopens: 0 }));
      return Promise.resolve(
        json({
          ...list[0],
          description: null,
          design: null,
          notes: null,
          acceptance_criteria: null,
          close_reason: null,
          dependencies: [],
          dependents: [],
          children: [],
          bugs: [],
        }),
      );
    }),
  );
}

describe("return to the same place", () => {
  it("REQ-UI-073 Board with a filter, open a card, use the breadcrumb: same Board and filter", async () => {
    stub();
    window.history.replaceState(null, "", "/beads?project=alpha&view=board&status=open");
    render(<App />);
    await userEvent.click(await screen.findByRole("link", { name: "Ready one" }));
    const nav = await screen.findByRole("navigation", { name: "Breadcrumb" });
    expect(window.location.pathname).toBe("/beads/alpha/a-1");
    await userEvent.click(within(nav).getByRole("link", { name: /^Beads › Board/ }));
    expect(window.location.pathname).toBe("/beads");
    expect(window.location.search).toContain("view=board");
    expect(window.location.search).toContain("status=open");
  });

  it("REQ-UI-073 the default project is remembered too", async () => {
    stub();
    window.history.replaceState(null, "", "/beads?view=board");
    render(<App />);
    await userEvent.click(await screen.findByRole("link", { name: "Ready one" }));
    const nav = await screen.findByRole("navigation", { name: "Breadcrumb" });
    await userEvent.click(within(nav).getByRole("link", { name: /^Beads › Board/ }));
    expect(window.location.search).toContain("view=board");
    expect(window.location.search).toContain("project=alpha");
  });
});
