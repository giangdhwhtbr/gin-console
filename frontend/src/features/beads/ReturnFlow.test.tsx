import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "@/app/App";
import { EMAIL_KEY, resetIdentity, setEmail } from "@/app/identity";
import { bead, json } from "./beadFixtures";
import { clearOrigin } from "@/app/origin";
import { navigate } from "@/app/route";

beforeEach(() => {
  clearOrigin();
  setEmail("tester@example.com");
});
afterEach(() => {
  cleanup();
  localStorage.removeItem(EMAIL_KEY);
  resetIdentity();
  vi.unstubAllGlobals();
});

function stub() {
  const list = [bead("a-1", { title: "Ready one", ready: true, assignee: "tester" }), bead("a-2", { title: "Other", ready: true })];
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = new URL(
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url,
        "http://localhost",
      );
      if (url.pathname === "/api/projects/beads") {
        return Promise.resolve(json([{ name: "alpha", path: "/x", exists: true, beads: null }]));
      }
      if (url.pathname === "/api/beads") return Promise.resolve(json(list));
      if (url.pathname.endsWith("/comments")) return Promise.resolve(json([]));
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

  const marked = () =>
    within(screen.getByRole("navigation", { name: "Main" }))
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page")
      .map((link) => link.textContent);

  it("REQ-UI-072 REQ-UI-057 From My Tasks the breadcrumb reads My Tasks, goes back to it, and the navigation marks My Tasks", async () => {
    stub();
    window.history.replaceState(null, "", "/my-tasks?project=alpha");
    render(<App />);
    await userEvent.click(await screen.findByRole("link", { name: /Ready one/ }));
    const nav = await screen.findByRole("navigation", { name: "Breadcrumb" });
    expect(window.location.pathname).toBe("/beads/alpha/a-1");
    expect(marked()).toEqual(["My Tasks"]);
    expect(await within(nav).findByText("Ready one")).toHaveAttribute("aria-current", "page");
    await userEvent.click(within(nav).getByRole("link", { name: "My Tasks" }));
    expect(window.location.pathname).toBe("/my-tasks");
    expect(window.location.search).toBe("?project=alpha");
  });

  it("REQ-UI-073 My Tasks without ?project= goes back to My Tasks of the current project", async () => {
    stub();
    window.history.replaceState(null, "", "/my-tasks");
    render(<App />);
    await userEvent.click(await screen.findByRole("link", { name: /Ready one/ }));
    const nav = await screen.findByRole("navigation", { name: "Breadcrumb" });
    await userEvent.click(within(nav).getByRole("link", { name: "My Tasks" }));
    expect(window.location.pathname).toBe("/my-tasks");
    expect(window.location.search).toBe("?project=alpha");
  });

  it("REQ-UI-073 going from bead to bead keeps the place", async () => {
    stub();
    window.history.replaceState(null, "", "/my-tasks");
    render(<App />);
    await userEvent.click(await screen.findByRole("link", { name: /Ready one/ }));
    await screen.findByRole("navigation", { name: "Breadcrumb" });
    act(() => navigate("/beads/alpha/a-2"));
    const nav = await screen.findByRole("navigation", { name: "Breadcrumb" });
    expect(within(nav).getByRole("link", { name: "My Tasks" })).toHaveAttribute("href", "/my-tasks?project=alpha");
    expect(marked()).toEqual(["My Tasks"]);
  });

  it("REQ-UI-072 REQ-UI-057 a bead page by address names Beads and marks Beads", async () => {
    stub();
    window.history.replaceState(null, "", "/beads/alpha/a-1");
    render(<App />);
    const nav = await screen.findByRole("navigation", { name: "Breadcrumb" });
    expect(within(nav).getByRole("link", { name: "Beads" })).toHaveAttribute("href", "/beads?project=alpha");
    expect(marked()).toEqual(["Beads"]);
  });
});
