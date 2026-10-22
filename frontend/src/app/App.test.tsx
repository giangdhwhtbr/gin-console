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

  // REQ-UI-022
  it("REQ-UI-022 opens the beads list from the sidebar without a reload and follows back", async () => {
    window.history.replaceState(null, "", "/");
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/api/projects")) {
          return Promise.resolve(
            json([
              {
                name: "alpha",
                path: "/home/gin/alpha",
                scotty_id: null,
                scotty_url: null,
                exists: true,
                workflow: null,
                beads: null,
              },
            ]),
          );
        }
        if (url.includes("/api/beads")) {
          return Promise.resolve(json([]));
        }
        return Promise.resolve(json([]));
      }),
    );
    render(<App />);
    await screen.findByRole("heading", { name: "Projects" });
    await userEvent.click(screen.getByRole("link", { name: "Beads" }));
    expect(window.location.pathname).toBe("/beads");
    expect(await screen.findByRole("heading", { name: "Beads" })).toBeInTheDocument();
    act(() => window.history.back());
    await screen.findByRole("heading", { name: "Projects" });
    expect(window.location.pathname).toBe("/");
  });

  // REQ-UI-022
  it("REQ-UI-022 falls back to Projects page on undecodable route segment and highlights sidebar link on /beads", async () => {
    window.history.replaceState(null, "", "/beads/%E0%A4%A/x");
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/api/projects")) {
          return Promise.resolve(json([]));
        }
        return Promise.resolve(json([]));
      }),
    );
    render(<App />);
    await screen.findByText(/no projects configured/i);

    cleanup();
    window.history.replaceState(null, "", "/beads");
    render(<App />);
    const beadsLink = screen.getByRole("link", { name: "Beads" });
    expect(beadsLink).toHaveClass("bg-muted");
  });

  // REQ-UI-022
  it("REQ-UI-022 renders the bead page on /beads/:project/:id", async () => {
    window.history.replaceState(null, "", "/beads/alpha/a-5");
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/api/beads/alpha/a-5")) {
          return Promise.resolve(
            json({
              id: "a-5",
              title: "Bead five",
              status: "open",
              priority: 1,
              issue_type: "task",
              labels: [],
              owner: null,
              assignee: null,
              parent: null,
              created_at: "2026-10-01T00:00:00Z",
              updated_at: "2026-10-10T00:00:00Z",
              dependency_count: 0,
              dependent_count: 0,
              comment_count: 0,
              closed_at: null,
              ready: false,
              blocked: false,
              created_by: null,
              blocked_by: [],
              description: null,
              design: null,
              notes: null,
              acceptance_criteria: null,
              close_reason: null,
              dependencies: [],
              dependents: [],
              children: [],
            }),
          );
        }
        return Promise.resolve(json([]));
      }),
    );
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Bead five" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to beads" })).toHaveAttribute("href", "/beads?project=alpha");
  });

  // REQ-UI-022
  it("REQ-UI-022 falls back to Projects page on undecodable bead route segment", async () => {
    window.history.replaceState(null, "", "/beads/%E0%A4%A/a-5");
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json([]))));
    render(<App />);
    await screen.findByText(/no projects configured/i);
  });
  // REQ-UI-029
  it("REQ-UI-029 a late response for the previous bead never replaces the current one", async () => {
    window.history.replaceState(null, "", "/beads/alpha/a-5");
    const detail = (id: string) =>
      json({
        id,
        title: `Bead ${id}`,
        status: "open",
        priority: 1,
        issue_type: "task",
        labels: [],
        owner: null,
        assignee: null,
        parent: null,
        created_at: "2026-10-01T00:00:00Z",
        updated_at: "2026-10-10T00:00:00Z",
        dependency_count: 0,
        dependent_count: 0,
        comment_count: 0,
        closed_at: null,
        ready: false,
        blocked: false,
        created_by: null,
        blocked_by: [],
        description: null,
        design: null,
        notes: null,
        acceptance_criteria: null,
        close_reason: null,
        dependencies: [],
        dependents: [],
        children: [],
      });
    let releaseFirst: (response: Response) => void = () => undefined;
    const first = new Promise<Response>((resolve) => {
      releaseFirst = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/api/beads/alpha/a-5")) return first;
        if (url.includes("/api/beads/alpha/a-6")) return Promise.resolve(detail("a-6"));
        return Promise.resolve(json([]));
      }),
    );
    render(<App />);
    act(() => {
      window.history.pushState(null, "", "/beads/alpha/a-6");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(await screen.findByRole("heading", { name: "Bead a-6" })).toBeInTheDocument();
    await act(async () => {
      releaseFirst(detail("a-5"));
      await first;
    });
    expect(screen.getByRole("heading", { name: "Bead a-6" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Bead a-5" })).not.toBeInTheDocument();
  });

  // REQ-UI-040
  it("REQ-UI-040 a late comments answer for the previous bead never replaces the current one", async () => {
    window.history.replaceState(null, "", "/beads/alpha/a-5");
    const detail = (id: string) =>
      json({
        id,
        title: `Bead ${id}`,
        status: "open",
        priority: 1,
        issue_type: "task",
        labels: [],
        owner: null,
        assignee: null,
        parent: null,
        created_at: "2026-10-01T00:00:00Z",
        updated_at: "2026-10-10T00:00:00Z",
        dependency_count: 0,
        dependent_count: 0,
        comment_count: 1,
        closed_at: null,
        ready: false,
        blocked: false,
        created_by: null,
        blocked_by: [],
        description: null,
        design: null,
        notes: null,
        acceptance_criteria: null,
        close_reason: null,
        dependencies: [],
        dependents: [],
        children: [],
      });
    let releaseA5Comments: (response: Response) => void = () => undefined;
    const a5Comments = new Promise<Response>((resolve) => {
      releaseA5Comments = resolve;
    });

    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url.includes("/api/beads/alpha/a-5/comments")) return a5Comments;
        if (url.includes("/api/beads/alpha/a-5")) return Promise.resolve(detail("a-5"));
        if (url.includes("/api/beads/alpha/a-6/comments")) {
          return Promise.resolve(
            json([
              {
                id: "c-6",
                author: "alice",
                text: "Text of a-6",
                created_at: "2026-10-06T10:00:00Z",
                truncated: false,
              },
            ]),
          );
        }
        if (url.includes("/api/beads/alpha/a-6")) return Promise.resolve(detail("a-6"));
        return Promise.resolve(json([]));
      }),
    );

    render(<App />);
    expect(await screen.findByRole("heading", { name: "Bead a-5" })).toBeInTheDocument();

    act(() => {
      window.history.pushState(null, "", "/beads/alpha/a-6");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    expect(await screen.findByRole("heading", { name: "Bead a-6" })).toBeInTheDocument();
    expect(await screen.findByText("Text of a-6")).toBeInTheDocument();

    await act(async () => {
      releaseA5Comments(
        json([
          {
            id: "c-5",
            author: "alice",
            text: "Text of a-5",
            created_at: "2026-10-05T10:00:00Z",
            truncated: false,
          },
        ]),
      );
      await a5Comments;
    });

    expect(screen.getByText("Text of a-6")).toBeInTheDocument();
    expect(screen.queryByText("Text of a-5")).not.toBeInTheDocument();
  });
});


