import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BeadDetail, Comment } from "./api";
import { BeadDetailPage } from "./BeadDetailPage";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const stubFetch = (
  detail: BeadDetail,
  comments: () => Response | Promise<Response> = () => json([]),
  reopens: () => Response | Promise<Response> = () => json({ reopens: 0 }),
) =>
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.endsWith("/comments")) return Promise.resolve(comments());
      if (url.endsWith("/reopens")) return Promise.resolve(reopens());
      return Promise.resolve(json(detail));
    }),
  );

const note = (id: string, overrides: Partial<Comment> = {}): Comment => ({
  id,
  author: "alice",
  text: `Text of ${id}`,
  created_at: "2026-10-05T10:00:00Z",
  truncated: false,
  ...overrides,
});

const beadDetail = (id: string, overrides: Partial<BeadDetail> = {}): BeadDetail => ({
  id,
  title: `Title ${id}`,
  status: "open",
  priority: 1,
  issue_type: "task",
  labels: ["frontend", "urgent"],
  owner: "alice",
  assignee: "bob",
  parent: null,
  created_at: "2026-10-01T12:00:00Z",
  updated_at: "2026-10-10T12:00:00Z",
  dependency_count: 0,
  dependent_count: 0,
  comment_count: 0,
  closed_at: null,
  ready: false,
  blocked: false,
  created_by: null,
  blocked_by: [],
  description: "A description",
  design: null,
  notes: null,
  acceptance_criteria: null,
  close_reason: null,
  dependencies: [],
  dependents: [],
  children: [],
  bugs: [],
  ...overrides,
});

beforeEach(() => {
  window.history.replaceState(null, "", "/beads/alpha/a-5");
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("BeadDetailPage", () => {
  const bug = (id: string, status = "open") => ({ id, title: `Bug ${id}`, status, type: "discovered-from" as const });

  // REQ-UI-086
  it("REQ-UI-086 bugs found", async () => {
    stubFetch(beadDetail("a-5", { bugs: [bug("b-1"), bug("b-2", "closed")] }));
    render(<BeadDetailPage project="alpha" id="a-5" />);
    expect(await screen.findByRole("heading", { name: "Bugs found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "b-1" })).toHaveAttribute("href", "/beads/alpha/b-1");
    expect(screen.getByRole("link", { name: "b-2" })).toHaveAttribute("href", "/beads/alpha/b-2");
    expect(screen.getByText("Bug b-1")).toBeInTheDocument();
  });

  // REQ-UI-086
  it("REQ-UI-086 no bugs", async () => {
    stubFetch(beadDetail("a-5"));
    render(<BeadDetailPage project="alpha" id="a-5" />);
    expect(await screen.findByRole("heading", { name: "Title a-5" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Bugs found" })).not.toBeInTheDocument();
  });

  // REQ-UI-086
  it("REQ-UI-086 reopened", async () => {
    stubFetch(beadDetail("a-5"), undefined, () => json({ reopens: 2 }));
    render(<BeadDetailPage project="alpha" id="a-5" />);
    expect(await screen.findByText(/Reopened 2 times/)).toBeInTheDocument();
  });

  // REQ-UI-086
  it("REQ-UI-086 reopened once", async () => {
    stubFetch(beadDetail("a-5"), undefined, () => json({ reopens: 1 }));
    render(<BeadDetailPage project="alpha" id="a-5" />);
    expect(await screen.findByText(/Reopened 1 time$/)).toBeInTheDocument();
  });

  // REQ-UI-086
  it("REQ-UI-086 not reopened or still loading", async () => {
    stubFetch(beadDetail("a-5"), undefined, () => new Promise<Response>(() => undefined));
    render(<BeadDetailPage project="alpha" id="a-5" />);
    expect(await screen.findByRole("heading", { name: "Title a-5" })).toBeInTheDocument();
    expect(screen.queryByText(/Reopen/)).not.toBeInTheDocument();
    cleanup();
    stubFetch(beadDetail("a-5"), undefined, () => json({ reopens: 0 }));
    render(<BeadDetailPage project="alpha" id="a-5" />);
    expect(await screen.findByRole("heading", { name: "Title a-5" })).toBeInTheDocument();
    await act(async () => {}); // let the reopens answer arrive
    expect(screen.queryByText(/Reopen/)).not.toBeInTheDocument();
  });

  // REQ-UI-086
  it("REQ-UI-086 reopens fail", async () => {
    let answer = json({ error: "bd history failed" }, 502);
    stubFetch(beadDetail("a-5"), undefined, () => answer);
    render(<BeadDetailPage project="alpha" id="a-5" />);
    expect(await screen.findByText(/Reopens unavailable: bd history failed/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Title a-5" })).toBeInTheDocument();
    answer = json({ reopens: 1 });
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText(/Reopened 1 time$/)).toBeInTheDocument();
  });

  // REQ-UI-086
  it("REQ-UI-086 late answer", async () => {
    let releaseA5: (response: Response) => void = () => undefined;
    const a5 = new Promise<Response>((resolve) => {
      releaseA5 = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url.endsWith("/a-5/reopens")) return a5;
        if (url.endsWith("/reopens")) return Promise.resolve(json({ reopens: 0 }));
        return Promise.resolve(json(beadDetail(url.endsWith("a-6") ? "a-6" : "a-5")));
      }),
    );
    const { rerender } = render(<BeadDetailPage project="alpha" id="a-5" />);
    expect(await screen.findByRole("heading", { name: "Title a-5" })).toBeInTheDocument();
    rerender(<BeadDetailPage project="alpha" id="a-6" />);
    expect(await screen.findByRole("heading", { name: "Title a-6" })).toBeInTheDocument();
    await act(async () => {
      releaseA5(json({ reopens: 3 }));
      await a5;
    });
    expect(screen.queryByText(/Reopened 3 times/)).not.toBeInTheDocument();
  });

  // REQ-UI-028
  it("REQ-UI-028 shows fields and description as plain text", async () => {
    const created_at = "2026-10-01T12:00:00Z";
    const updated_at = "2026-10-10T12:00:00Z";
    const rawDesc = "<script>window.hacked = 1</script> **bold**\nsecond line";
    const bead = beadDetail("a-5", {
      title: "Bead five",
      status: "open",
      priority: 1,
      issue_type: "task",
      labels: ["frontend", "urgent"],
      owner: "alice",
      assignee: "bob",
      created_at,
      updated_at,
      comment_count: 3,
      description: rawDesc,
    });
    stubFetch(bead);

    const { container } = render(<BeadDetailPage project="alpha" id="a-5" />);

    expect(await screen.findByRole("heading", { name: "Bead five" })).toBeInTheDocument();
    const header = screen.getByRole("heading", { name: "Bead five" }).closest("header");
    if (header === null) throw new Error("the bead header is missing");
    expect(within(header).getByText("a-5")).toBeInTheDocument();
    expect(screen.getByText("open")).toBeInTheDocument();
    expect(screen.getByText("P1")).toBeInTheDocument();
    expect(screen.getByText("task")).toBeInTheDocument();
    expect(screen.getByText("frontend")).toBeInTheDocument();
    expect(screen.getByText("urgent")).toBeInTheDocument();

    const meta = screen.getByText(
      (content) =>
        content.includes("Owner alice") &&
        content.includes("Assignee bob") &&
        content.includes(`Created ${new Date(created_at).toLocaleString()}`) &&
        content.includes(`Updated ${new Date(updated_at).toLocaleString()}`) &&
        content.includes("3 comments"),
    );
    expect(meta).toBeInTheDocument();

    const descEl = screen.getByText((_, el) => el?.tagName === "P" && el.textContent === rawDesc);
    expect(descEl).toBeInTheDocument();
    expect(descEl).toHaveClass("whitespace-pre-wrap");
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("strong")).toBeNull();
  });

  // REQ-UI-028
  it("REQ-UI-028 links relations inside the console and encodes project name", async () => {
    const bead = beadDetail("a-5", {
      dependencies: [{ id: "a-4", title: "Dep title", status: "open", type: "blocks" }],
      dependents: [{ id: "a-6", title: "Blocked title", status: "closed", type: "blocks" }],
    });
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json(bead))));

    render(<BeadDetailPage project="alpha" id="a-5" />);

    await screen.findByRole("heading", { name: "Depends on" });
    const depLink = screen.getByRole("link", { name: "a-4" });
    expect(depLink).toHaveAttribute("href", "/beads/alpha/a-4");
    expect(screen.getByText("Dep title")).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "Blocks" })).toBeInTheDocument();
    const blockedLink = screen.getByRole("link", { name: "a-6" });
    expect(blockedLink).toHaveAttribute("href", "/beads/alpha/a-6");
    expect(screen.getByText("Blocked title")).toBeInTheDocument();
    const depItem = depLink.closest("li");
    const blockedItem = blockedLink.closest("li");
    if (depItem === null || blockedItem === null) throw new Error("the relation items are missing");
    expect(within(depItem).getByText("open")).toBeInTheDocument();
    expect(within(blockedItem).getByText("closed")).toBeInTheDocument();

    cleanup();
    render(<BeadDetailPage project="my proj" id="a-5" />);
    await screen.findByRole("heading", { name: "Depends on" });
    const depLinkEncoded = screen.getByRole("link", { name: "a-4" });
    expect(depLinkEncoded).toHaveAttribute("href", "/beads/my%20proj/a-4");
  });

  // REQ-UI-028
  it("REQ-UI-028 shows epic progress and children, or omits them when absent", async () => {
    const epic = beadDetail("e-1", {
      issue_type: "epic",
      children: [
        { id: "c-1", title: "Child 1", status: "closed", type: "parent-child" },
        { id: "c-2", title: "Child 2", status: "closed", type: "parent-child" },
        { id: "c-3", title: "Child 3", status: "closed", type: "parent-child" },
        { id: "c-4", title: "Child 4", status: "open", type: "parent-child" },
      ],
    });
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json(epic))));

    render(<BeadDetailPage project="alpha" id="e-1" />);

    const bar = await screen.findByRole("progressbar", { name: "Children closed" });
    expect(bar).toHaveAttribute("aria-valuenow", "75");
    expect(screen.getByText("3 of 4 closed")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Children" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "c-1" })).toHaveAttribute("href", "/beads/alpha/c-1");

    cleanup();
    const simpleBead = beadDetail("a-5", { children: [] });
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json(simpleBead))));
    render(<BeadDetailPage project="alpha" id="a-5" />);
    await screen.findByRole("heading", { name: "Title a-5" });
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Children" })).not.toBeInTheDocument();
  });

  // REQ-UI-029
  it("REQ-UI-029 shows not found when bead returns 404", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json({ error: "not found" }, 404))));

    render(<BeadDetailPage project="alpha" id="a-404" />);

    expect(await screen.findByText("Bead not found")).toBeInTheDocument();
    const backLink = within(screen.getByRole("navigation", { name: "Breadcrumb" })).getByRole("link", { name: "Beads" });
    expect(backLink).toHaveAttribute("href", "/beads?project=alpha");
  });

  // REQ-UI-029
  it("REQ-UI-029 shows error on failure and retries, and handles unexpected shape", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ error: "bd timed out" }, 502))
      .mockResolvedValueOnce(json(beadDetail("a-5")));
    vi.stubGlobal("fetch", fetchMock);

    render(<BeadDetailPage project="alpha" id="a-5" />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("bd timed out");

    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(await screen.findByRole("heading", { name: "Title a-5" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    cleanup();
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json({ x: 1 }))));
    render(<BeadDetailPage project="alpha" id="a-5" />);
    const badAlert = await screen.findByRole("alert");
    expect(badAlert).toHaveTextContent(/unexpected response/i);
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  // REQ-UI-028
  it("REQ-UI-028 shows No description. when description is null", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json(beadDetail("a-5", { description: null })))));

    render(<BeadDetailPage project="alpha" id="a-5" />);

    expect(await screen.findByText("No description.")).toBeInTheDocument();
  });

  // REQ-UI-038
  it("REQ-UI-038 sections and order", async () => {
    const bead = beadDetail("a-5", {
      created_by: "gin",
      acceptance_criteria: "AC",
      notes: "N",
      close_reason: "R",
      design: null,
      comment_count: 0,
    });
    stubFetch(bead);

    render(<BeadDetailPage project="alpha" id="a-5" />);

    expect(await screen.findByRole("heading", { name: "Title a-5" })).toBeInTheDocument();
    expect(screen.getByText(/Created by gin/)).toBeInTheDocument();

    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent)
      .filter((title): title is string =>
        ["Acceptance criteria", "Design", "Notes", "Close reason"].includes(title ?? ""),
      );
    expect(headings).toEqual(["Acceptance criteria", "Notes", "Close reason"]);
    expect(screen.queryByRole("heading", { name: "Design" })).not.toBeInTheDocument();
  });

  // REQ-UI-038
  it("REQ-UI-038 plain text", async () => {
    const rawDesign = "<script>window.hacked = 1</script> **bold**\nline two";
    const bead = beadDetail("a-5", {
      design: rawDesign,
      comment_count: 0,
    });
    stubFetch(bead);

    const { container } = render(<BeadDetailPage project="alpha" id="a-5" />);

    expect(await screen.findByRole("heading", { name: "Title a-5" })).toBeInTheDocument();
    const designEl = screen.getByText((_, el) => el?.tagName === "P" && el.textContent === rawDesign);
    expect(designEl).toBeInTheDocument();
    expect(designEl).toHaveClass("whitespace-pre-wrap");
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("strong")).toBeNull();
  });

  // REQ-UI-038
  it("REQ-UI-038 no author", async () => {
    const bead = beadDetail("a-5", {
      created_by: null,
      comment_count: 0,
    });
    stubFetch(bead);

    render(<BeadDetailPage project="alpha" id="a-5" />);

    expect(await screen.findByRole("heading", { name: "Title a-5" })).toBeInTheDocument();
    expect(screen.queryByText(/Created by/)).not.toBeInTheDocument();
  });

  // REQ-UI-039
  it("REQ-UI-039 comments listed", async () => {
    const bead = beadDetail("a-5", { comment_count: 2 });
    let releaseComments: (response: Response) => void = () => undefined;
    const commentsPromise = new Promise<Response>((resolve) => {
      releaseComments = resolve;
    });

    stubFetch(bead, () => commentsPromise);

    render(<BeadDetailPage project="alpha" id="a-5" />);

    expect(await screen.findByRole("heading", { name: "Title a-5" })).toBeInTheDocument();
    expect(screen.getByText("Loading comments…")).toBeInTheDocument();

    const c1 = note("c-1");
    const c2 = note("c-2", { created_at: "2026-10-06T10:00:00Z" });

    await act(async () => {
      releaseComments(json([c2, c1]));
      await commentsPromise;
    });

    expect(await screen.findByRole("heading", { name: "Discussion (2)" })).toBeInTheDocument();
    expect(screen.getByText("Text of c-2")).toBeInTheDocument();
    expect(screen.getByText("Text of c-1")).toBeInTheDocument();
    expect(screen.getAllByText("alice")).toHaveLength(2);
    expect(screen.getByText(new Date("2026-10-06T10:00:00Z").toLocaleString())).toBeInTheDocument();
    expect(screen.getByText(new Date("2026-10-05T10:00:00Z").toLocaleString())).toBeInTheDocument();
  });

  // REQ-UI-039
  it("REQ-UI-039 none requested", async () => {
    const bead = beadDetail("a-5", { comment_count: 0 });
    const urls: string[] = [];
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      urls.push(url);
      if (url.endsWith("/reopens")) return Promise.resolve(json({ reopens: 0 }));
      return Promise.resolve(url.endsWith("/comments") ? json([]) : json(bead));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<BeadDetailPage project="alpha" id="a-5" />);

    expect(await screen.findByRole("heading", { name: "Title a-5" })).toBeInTheDocument();
    expect(urls.filter((url) => url.endsWith("/comments"))).toEqual([]);
    expect(screen.queryByRole("heading", { name: /^Comments/ })).not.toBeInTheDocument();
  });

  // REQ-UI-039
  it("REQ-UI-039 plain text", async () => {
    const bead = beadDetail("a-5", { comment_count: 1 });
    const scriptText = "<script>window.hacked = 1</script>";
    stubFetch(bead, () => json([note("c-1", { text: scriptText })]));

    const { container } = render(<BeadDetailPage project="alpha" id="a-5" />);

    expect(await screen.findByRole("heading", { name: "Discussion (1)" })).toBeInTheDocument();
    expect(screen.getByText(scriptText)).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
  });

  // REQ-UI-039
  it("REQ-UI-039 truncated", async () => {
    const bead = beadDetail("a-5", { comment_count: 2 });
    stubFetch(bead, () => json([note("c-1", { truncated: true }), note("c-2", { truncated: false })]));

    render(<BeadDetailPage project="alpha" id="a-5" />);

    expect(await screen.findByRole("heading", { name: "Discussion (2)" })).toBeInTheDocument();
    expect(screen.getByText("Comment truncated")).toBeInTheDocument();
    expect(screen.getAllByText("Comment truncated")).toHaveLength(1);
  });

  // REQ-UI-040
  it("REQ-UI-040 failure and retry", async () => {
    const bead = beadDetail("a-5", { comment_count: 1 });
    let commentsCallCount = 0;
    let beadCallCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url.endsWith("/comments")) {
          commentsCallCount++;
          if (commentsCallCount === 1) {
            return Promise.resolve(json({ error: "bd comments failed" }, 502));
          }
          return Promise.resolve(json([note("c-1")]));
        }
        if (url.endsWith("/reopens")) return Promise.resolve(json({ reopens: 0 }));
        beadCallCount++;
        return Promise.resolve(json(bead));
      }),
    );

    render(<BeadDetailPage project="alpha" id="a-5" />);

    expect(await screen.findByRole("heading", { name: "Title a-5" })).toBeInTheDocument();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("bd comments failed");

    await userEvent.click(within(alert).getByRole("button", { name: /retry/i }));

    expect(await screen.findByRole("heading", { name: "Discussion (1)" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(beadCallCount).toBe(1);
    expect(commentsCallCount).toBe(2);
  });

  // REQ-UI-040
  it("REQ-UI-040 unexpected shape", async () => {
    const bead = beadDetail("a-5", { comment_count: 1 });
    stubFetch(bead, () => json({ x: 1 }));

    render(<BeadDetailPage project="alpha" id="a-5" />);

    expect(await screen.findByRole("heading", { name: "Title a-5" })).toBeInTheDocument();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/unexpected response/i);
    expect(within(alert).getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("REQ-UI-053 View dependencies for a bead with children or a blocks relation only", async () => {
    stubFetch(beadDetail("e-1", { issue_type: "epic", children: [{ id: "t", title: "T", status: "open", type: "parent-child" }] }));
    render(<BeadDetailPage project="p" id="e-1" />);
    expect(await screen.findByRole("link", { name: "View dependencies" })).toHaveAttribute("href", "/beads/p/e-1/graph");
    cleanup();
    stubFetch(beadDetail("t-1", { dependencies: [{ id: "x", title: "X", status: "open", type: "blocks" }] }));
    render(<BeadDetailPage project="p" id="t-1" />);
    expect(await screen.findByRole("link", { name: "View dependencies" })).toBeInTheDocument();
    cleanup();
    stubFetch(beadDetail("t-2"));
    render(<BeadDetailPage project="p" id="t-2" />);
    await screen.findByText("Title t-2");
    expect(screen.queryByRole("link", { name: "View dependencies" })).toBeNull();
    cleanup();
    stubFetch(beadDetail("e-1", { issue_type: "epic", children: [{ id: "t", title: "T", status: "open", type: "parent-child" }] }));
    render(<BeadDetailPage project="p" id="e-1" graphScope="e-1" />);
    await screen.findByText("Title e-1");
    expect(screen.queryByRole("link", { name: "View dependencies" })).toBeNull();
  });
});
