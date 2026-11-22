import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BeadDetail, Comment } from "./api";
import { forgetConfiguredProjects, rememberProject, resolveProject } from "@/app/project";
import { factDate } from "@/lib/dates";
import { BeadDetailPage } from "./BeadDetailPage";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const stubFetch = (
  detail: BeadDetail,
  comments: () => Response | Promise<Response> = () => json([]),
) =>
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.endsWith("/comments")) return Promise.resolve(comments());
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
  milestone: null,
  kind: null,
  capabilities: [],
  complexity: null,
  estimate_minutes: null,
  points: null,
  points_reason: null,
  lane: null,
  track: null,
  claim: null,
  waits_for: null,
  child_counts: { total: 0, closed: 0, prep_total: 0, prep_closed: 0 },
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
  forgetConfiguredProjects();
  window.history.replaceState(null, "", "/beads/alpha/a-5");
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("BeadDetailPage", () => {
  it("REQ-UI-063 titles the page with the bead and its project, and the panel does not", async () => {
    stubFetch(beadDetail("a-5", { title: "Team checkout" }));
    document.title = "gin-console";
    const { unmount } = render(<BeadDetailPage project="alpha" id="a-5" embedded />);
    await screen.findByRole("heading", { name: "Team checkout" });
    expect(document.title).toBe("gin-console");
    unmount();
    render(<BeadDetailPage project="alpha" id="a-5" />);
    expect(document.title).toBe("gin-console");
    await waitFor(() => expect(document.title).toBe("Team checkout · alpha · gin-console"));
  });

  it("REQ-UI-124 a known project of the path becomes current", async () => {
    rememberProject("first");
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes("/api/projects/beads")) return Promise.resolve(json([{ name: "alpha", path: "/x", exists: true, beads: null }, { name: "first", path: "/y", exists: true, beads: null }]));
      return Promise.resolve(json(beadDetail("a-5")));
    }));
    render(<BeadDetailPage project="alpha" id="a-5" />);
    await screen.findByRole("heading", { name: "Title a-5" });
    expect(resolveProject("", ["alpha", "first"])).toBe("alpha");
  });

  it("REQ-UI-126 an unknown project of the path gets a notice and leaves the current project alone", async () => {
    rememberProject("alpha");
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes("/api/projects/beads")) return Promise.resolve(json([{ name: "alpha", path: "/x", exists: true, beads: null }]));
      return Promise.resolve(json(beadDetail("z-1")));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<BeadDetailPage project="zzz" id="z-1" />);
    expect(await screen.findByText("No project zzz is configured")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "alpha" })).toHaveAttribute("href", "/beads?project=alpha");
    expect(fetchMock.mock.calls.some(([input]) => (typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url).includes("/api/beads/zzz"))).toBe(false);
    expect(resolveProject("", ["alpha", "zzz"])).toBe("alpha");
  });

  it("REQ-UI-107 Unbroken title on a phone and Wide table on a phone", async () => {
    stubFetch(beadDetail("a-5", { title: "T".repeat(90), description: "| a | b |\n|---|---|\n| 1 | 2 |\n\n```\ncode block\n```" }));
    render(<BeadDetailPage project="alpha" id="a-5" />);
    const h1 = await screen.findByRole("heading", { name: "T".repeat(90) });
    expect(h1).toHaveClass("wrap-anywhere");
    expect(within(h1.parentElement!).getByText("a-5")).toHaveClass("wrap-anywhere");
    expect(screen.getByText("alice")).toBeInTheDocument();
    const md = await waitFor(() => {
      const el = document.querySelector<HTMLElement>(".markdown");
      if (el === null) throw new Error("markdown not rendered");
      return el;
    });
    expect(within(md).getByRole("table")).toBeInTheDocument();
    expect(md.querySelector("pre")).not.toBeNull();
    expect(md.parentElement).toHaveClass("min-w-0");
  });

  it("REQ-UI-107 a long unbroken child title wraps and a long child id is shortened", async () => {
    const longId = "ex-payments-provider-migration-and-reconciliation-2026.2.1";
    const unbroken = "Handle-PaymentReconciliationExceptionsForTheSettlementBatchProcessorWithoutBreaking";
    stubFetch(
      beadDetail("a-5", {
        children: [{ id: longId, title: unbroken, status: "open", type: "parent-child", prep: false }],
      }),
    );
    render(<BeadDetailPage project="alpha" id="a-5" />);
    const title = await screen.findByText(unbroken);
    expect(title).toHaveClass("min-w-0", "wrap-anywhere");
    const shown = screen.getByText("ex-payments-pr…-2026.2.1");
    expect(shown).toHaveAttribute("title", longId);
    expect(screen.getByRole("link", { name: longId })).toHaveAttribute("href", `/beads/alpha/${longId}`);
  });

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
  it("REQ-UI-086 the bead page requests no reopens", async () => {
    stubFetch(beadDetail("a-5"));
    render(<BeadDetailPage project="alpha" id="a-5" />);
    expect(await screen.findByRole("heading", { name: "Title a-5" })).toBeInTheDocument();
    await act(async () => {});
    const urls = vi.mocked(fetch).mock.calls.map(([input]) =>
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url,
    );
    expect(urls.some((url) => url.includes("reopens"))).toBe(false);
    expect(screen.queryByText(/Reopen/)).not.toBeInTheDocument();
  });

  // REQ-UI-087
  it("REQ-UI-087 the Bugs found heading uses the bug color", async () => {
    const blocker = { id: "d-1", title: "Dep", status: "open", type: "blocks" as const };
    stubFetch(beadDetail("a-5", { bugs: [bug("b-1")], dependencies: [blocker] }));
    render(<BeadDetailPage project="alpha" id="a-5" />);
    expect(await screen.findByRole("heading", { name: "Bugs found" })).toHaveClass("text-type-bug");
    expect(screen.getByText("Bug b-1")).not.toHaveClass("text-type-bug");
    expect(screen.getByRole("heading", { name: "Depends on" })).not.toHaveClass("text-type-bug");
  });

  // REQ-UI-028
  it("REQ-UI-028 shows fields and the description as Markdown", async () => {
    const created_at = "2026-10-01T12:00:00Z";
    const updated_at = "2026-10-10T12:00:00Z";
    const rawDesc = "**bold** <script>window.hacked = 1</script>\nsecond line";
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
    expect(screen.getByText("Deferred")).toBeInTheDocument();
    expect(screen.getByText("P1")).toBeInTheDocument();
    expect(screen.getByText("task")).toBeInTheDocument();
    expect(screen.getByText("frontend")).toBeInTheDocument();
    expect(screen.getByText("urgent")).toBeInTheDocument();

    const facts = within(header).getByText("Owner").closest("dl");
    if (facts === null) throw new Error("the facts are missing");
    expect(facts).toHaveTextContent("Owner" + "alice");
    expect(facts).toHaveTextContent("Assignee" + "bob");
    expect(within(facts).getByText(factDate(created_at))).toBeInTheDocument();
    expect(within(facts).getByText(factDate(updated_at))).toBeInTheDocument();
    expect(facts).toHaveTextContent("Comments" + "3");

    expect(await screen.findByText("bold", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText(/<script>window\.hacked = 1<\/script>/)).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
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
    expect(within(depItem).getByText("Open")).toBeInTheDocument();
    expect(within(blockedItem).getByText("Closed")).toBeInTheDocument();

    cleanup();
    render(<BeadDetailPage project="my proj" id="a-5" />);
    await screen.findByRole("heading", { name: "Depends on" });
    const depLinkEncoded = screen.getByRole("link", { name: "a-4" });
    expect(depLinkEncoded).toHaveAttribute("href", "/beads/my%20proj/a-4");
  });

  it("REQ-UI-028 epic with a Complexity line shows a badge; others do not", async () => {
    const show = async (bead: ReturnType<typeof beadDetail>) => {
      cleanup();
      vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json(bead))));
      render(<BeadDetailPage project="alpha" id={bead.id} />);
      await screen.findByRole("heading", { name: `Title ${bead.id}` });
    };
    await show(beadDetail("e-1", { issue_type: "epic", description: "Why\nComplexity: high (cross-repo)" }));
    expect(screen.getByText("Complexity: high", { selector: "[data-slot=badge]" })).toHaveClass("text-state-blocked");
    await show(beadDetail("e-2", { issue_type: "epic", description: "Complexity: low (small)" }));
    expect(screen.getByText("Complexity: low", { selector: "[data-slot=badge]" })).toHaveClass("text-muted-foreground");
    await show(beadDetail("e-3", { issue_type: "epic", description: "No label" }));
    expect(screen.queryByText(/^Complexity:/, { selector: "[data-slot=badge]" })).not.toBeInTheDocument();
    await show(beadDetail("t-1", { issue_type: "task", description: "Complexity: high" }));
    expect(screen.queryByText("Complexity: high", { selector: "[data-slot=badge]" })).not.toBeInTheDocument();
  });

  // REQ-UI-028
  it("REQ-UI-028 epic with a prep task: progress over tracks, Prep 1/1, chip on p-1 only", async () => {
    const epic = beadDetail("e-1", {
      issue_type: "feature",
      children: [
        { id: "t-1", title: "Track 1", status: "closed", type: "parent-child", prep: false },
        { id: "t-2", title: "Track 2", status: "open", type: "parent-child", prep: false },
        { id: "p-1", title: "Prep 1", status: "closed", type: "parent-child", prep: true },
      ],
    });
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json(epic))));
    render(<BeadDetailPage project="alpha" id="e-1" />);
    const bar = await screen.findByRole("progressbar", { name: "Children closed" });
    expect(bar).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByText("1 of 2 closed")).toBeInTheDocument();
    expect(screen.getByText("Prep 1/1")).toBeInTheDocument();
    expect(screen.getAllByText("Prep", { selector: "[data-slot=badge]" })).toHaveLength(1);
    const row = (id: string) => screen.getByRole("link", { name: id }).closest("li") as HTMLElement;
    expect(within(row("p-1")).getByText("Prep")).toBeInTheDocument();
    expect(within(row("t-1")).queryByText("Prep")).toBeNull();
    expect(within(row("t-2")).queryByText("Prep")).toBeNull();
  });

  it("REQ-UI-028 an epic with only prep children shows Prep x/y and no track bar", async () => {
    const epic = beadDetail("e-1", {
      issue_type: "feature",
      children: [{ id: "p-1", title: "Prep 1", status: "open", type: "parent-child", prep: true }],
    });
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(json(epic))));
    render(<BeadDetailPage project="alpha" id="e-1" />);
    expect(await screen.findByText("Prep 0/1")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("REQ-UI-028 shows epic progress and children, or omits them when absent", async () => {
    const epic = beadDetail("e-1", {
      issue_type: "feature",
      children: [
        { id: "c-1", title: "Child 1", status: "closed", type: "parent-child", prep: false },
        { id: "c-2", title: "Child 2", status: "closed", type: "parent-child", prep: false },
        { id: "c-3", title: "Child 3", status: "closed", type: "parent-child", prep: false },
        { id: "c-4", title: "Child 4", status: "open", type: "parent-child", prep: false },
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
    let beadCalls = 0;
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes("/api/projects/beads")) return Promise.resolve(json([{ name: "alpha", path: "/x", exists: true, beads: null }]));
      beadCalls += 1;
      return Promise.resolve(beadCalls === 1 ? json({ error: "bd timed out" }, 502) : json(beadDetail("a-5")));
    });
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
    expect(screen.getByText("Created by")).toBeInTheDocument();
    expect(screen.getByText("gin")).toBeInTheDocument();

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
  it("REQ-UI-038 markdown sections", async () => {
    const bead = beadDetail("a-5", {
      acceptance_criteria: "- [ ] Local time",
      design: "**bold** <script>window.hacked = 1</script>\nline two",
      comment_count: 0,
    });
    stubFetch(bead);
    const { container } = render(<BeadDetailPage project="alpha" id="a-5" />);
    expect(await screen.findByText("bold", { selector: "strong" })).toBeInTheDocument();
    expect(await screen.findByRole("checkbox")).toBeDisabled();
    expect(screen.getByText(/<script>window\.hacked = 1<\/script>/)).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
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
    expect(screen.queryByText("Created by")).not.toBeInTheDocument();
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
    expect(screen.getAllByText("alice", { selector: ":not(dd)" })).toHaveLength(2);
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
        if (url.includes("/api/projects/beads")) return Promise.resolve(json([{ name: "alpha", path: "/x", exists: true, beads: null }]));
        if (url.endsWith("/comments")) {
          commentsCallCount++;
          if (commentsCallCount === 1) {
            return Promise.resolve(json({ error: "bd comments failed" }, 502));
          }
          return Promise.resolve(json([note("c-1")]));
        }
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

  const kid = { id: "c", title: "C", status: "open", type: "parent-child", prep: false } as const;
  const viewLink = () => screen.findByRole("link", { name: "View in graph" });

  it("REQ-UI-053 Task with children: View in graph goes to its scope", async () => {
    stubFetch(beadDetail("t-1", { parent: "e-1", children: [kid] }));
    render(<BeadDetailPage project="p" id="t-1" />);
    expect(await viewLink()).toHaveAttribute("href", "/beads?project=p&view=graph&scope=t-1");
  });

  it("REQ-UI-053 Task with a blocker: View in graph goes to the parent's scope with the task selected", async () => {
    stubFetch(beadDetail("t-2", { parent: "e-1", dependencies: [{ id: "x", title: "X", status: "open", type: "blocks" }] }));
    render(<BeadDetailPage project="p" id="t-2" />);
    expect(await viewLink()).toHaveAttribute("href", "/beads?project=p&view=graph&scope=e-1&select=t-2");
  });

  it("REQ-UI-053 Task under a milestone: View in graph leaves the scope out and selects the task", async () => {
    stubFetch(beadDetail("t-6", { parent: "m-1", milestone: "m-1", dependencies: [{ id: "x", title: "X", status: "open", type: "blocks" }] }));
    render(<BeadDetailPage project="p" id="t-6" />);
    expect(await viewLink()).toHaveAttribute("href", "/beads?project=p&view=graph&select=t-6");
  });

  it("REQ-UI-053 Task with a blocked bead: the button is offered too", async () => {
    stubFetch(beadDetail("t-4", { parent: "e-1", dependents: [{ id: "x", title: "X", status: "open", type: "blocks" }] }));
    render(<BeadDetailPage project="p" id="t-4" />);
    expect(await viewLink()).toHaveAttribute("href", "/beads?project=p&view=graph&scope=e-1&select=t-4");
  });

  it("REQ-UI-053 Task with a blocker and no parent: View in graph selects it in the project", async () => {
    stubFetch(beadDetail("t-3", { dependencies: [{ id: "x", title: "X", status: "open", type: "blocks" }] }));
    render(<BeadDetailPage project="p" id="t-3" />);
    expect(await viewLink()).toHaveAttribute("href", "/beads?project=p&view=graph&select=t-3");
  });

  it("REQ-UI-053 Epic: no View in graph, the Graph tab is offered instead", async () => {
    stubFetch(beadDetail("e-1", { issue_type: "epic", children: [kid] }));
    render(<BeadDetailPage project="p" id="e-1" />);
    await screen.findByRole("heading", { name: "Title e-1" });
    expect(screen.queryByRole("link", { name: "View in graph" })).toBeNull();
  });

  it("REQ-UI-053 Nothing to draw: no View in graph", async () => {
    stubFetch(beadDetail("t-5", { dependencies: [{ id: "x", title: "X", status: "open", type: "parent-child" }] }));
    render(<BeadDetailPage project="p" id="t-5" />);
    await screen.findByRole("heading", { name: "Title t-5" });
    expect(screen.queryByRole("link", { name: "View in graph" })).toBeNull();
  });

  it("REQ-UI-109 Technical epic: the page shows the badge, the capability chips and the estimate", async () => {
    stubFetch(beadDetail("e-1", { issue_type: "epic", kind: "technical", capabilities: ["beads", "ui"], estimate_minutes: 1440 }));
    render(<BeadDetailPage project="alpha" id="e-1" />);
    expect(await screen.findByText("Technical")).toBeInTheDocument();
    const caps = screen.getByRole("list", { name: "Capabilities" });
    expect(within(caps).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["beads", "ui"]);
    expect(screen.getByText("3d")).toBeInTheDocument();
  });

  it("REQ-UI-109 Pointed epic: the page shows the size badge 5 pt and its reason on the line under it", async () => {
    stubFetch(beadDetail("e-3", { issue_type: "epic", points: 5, points_reason: "new endpoint and UI" }));
    render(<BeadDetailPage project="alpha" id="e-3" />);
    expect(await screen.findByText("5 pt")).toBeInTheDocument();
    expect(screen.getByText("new endpoint and UI")).toBeInTheDocument();
    expect(screen.queryByText(/Points 5|Estimate/)).toBeNull();
  });

  it("REQ-UI-109 Pointed epic: a blank reason shows the badge alone", async () => {
    stubFetch(beadDetail("e-3", { issue_type: "epic", points: 5, points_reason: "  " }));
    render(<BeadDetailPage project="alpha" id="e-3" />);
    const badge = await screen.findByText("5 pt");
    expect(badge.closest("header")?.querySelectorAll("p")).toHaveLength(0);
  });

  it("REQ-UI-109 Partial day: 240 minutes shows the size badge 0.5d", async () => {
    stubFetch(beadDetail("a-5", { estimate_minutes: 240 }));
    render(<BeadDetailPage project="alpha" id="a-5" />);
    expect(await screen.findByText("0.5d")).toBeInTheDocument();
  });

  it("REQ-UI-028 Badges and facts: badge row, reason line and label/value facts", async () => {
    const at = new Date(2026, 4, 11, 16, 0).toISOString();
    stubFetch(
      beadDetail("e-3", {
        issue_type: "epic",
        status: "in_progress",
        priority: 1,
        points: 5,
        points_reason: "new endpoint and UI",
        owner: "lead@example.com",
        assignee: "bao",
        created_by: "lead",
        created_at: at,
        updated_at: at,
        comment_count: 0,
      }),
    );
    render(<BeadDetailPage project="alpha" id="e-3" />);
    expect(await screen.findByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("P1")).toBeInTheDocument();
    expect(screen.getByText("5 pt")).toBeInTheDocument();
    expect(screen.getByText("new endpoint and UI")).toBeInTheDocument();
    const facts = screen.getByText("Owner").closest("dl");
    if (facts === null) throw new Error("the facts are missing");
    const pairs = Array.from(facts.querySelectorAll("dt")).map((dt) => [dt.textContent, dt.nextElementSibling?.textContent]);
    expect(pairs).toEqual([
      ["Owner", "lead@example.com"],
      ["Assignee", "bao"],
      ["Created by", "lead"],
      ["Created", "11 May 2026 16:00"],
      ["Updated", "11 May 2026 16:00"],
      ["Comments", "0"],
    ]);
    expect(within(facts).getByText("lead@example.com")).toHaveClass("text-foreground", "font-medium");
    expect(within(facts).getByText("Owner")).toHaveClass("text-muted-foreground");
    expect(screen.queryByText(/ · /)).toBeNull();
  });

  it("REQ-UI-109 without kind, capabilities or estimate the page shows none of them", async () => {
    stubFetch(beadDetail("a-5"));
    render(<BeadDetailPage project="alpha" id="a-5" />);
    await screen.findByText("A description");
    expect(screen.queryByRole("list", { name: "Capabilities" })).toBeNull();
    expect(screen.queryByText(/Estimate|Technical|Parity|\d+d$| pt$/)).toBeNull();
  });

  it("REQ-UI-028 a child with status in_progress shows the label In progress, not the raw value", async () => {
    stubFetch(
      beadDetail("e-1", {
        issue_type: "feature",
        children: [{ id: "t-1", title: "Child", status: "in_progress", type: "parent-child", prep: false }],
      }),
    );
    render(<BeadDetailPage project="alpha" id="e-1" />);
    expect(await screen.findByText("In progress")).toBeInTheDocument();
    expect(screen.queryByText("in_progress")).toBeNull();
  });

  it("REQ-UI-115 Facts and Chip in every view (bead page)", async () => {
    stubFetch(
      beadDetail("a-5", {
        lane: "be",
        track: { plan: "docs/plans/2026-11-17-team-checkout.md", number: 2 },
        claim: { holder: "w", expires_at: "2999-01-01T00:00:00Z" },
        labels: ["lane:be", "track:2", "urgent"],
      }),
    );
    render(<BeadDetailPage project="alpha" id="a-5" />);
    const h1 = await screen.findByRole("heading", { name: "Title a-5" });
    const header = h1.parentElement!;
    expect(within(header).getByTitle("Lane be")).toBeInTheDocument();
    expect(within(header).getByText("urgent")).toBeInTheDocument();
    expect(within(header).queryByText("lane:be")).toBeNull();
    expect(within(header).queryByText("track:2")).toBeNull();
    expect(within(header).getByText("Lane").nextElementSibling).toHaveTextContent("be");
    expect(within(header).getByText("Track").nextElementSibling).toHaveTextContent("#2 2026-11-17-team-checkout.md");
    expect(within(header).getByText("Lease").nextElementSibling).toHaveTextContent(`until ${factDate("2999-01-01T00:00:00Z")}`);
  });

  it("REQ-UI-115 Facts: an expired lease", async () => {
    stubFetch(beadDetail("a-5", { lane: "be", claim: { holder: "w", expires_at: "2020-01-01T00:00:00Z" } }));
    render(<BeadDetailPage project="alpha" id="a-5" />);
    expect(await screen.findByText(`expired ${factDate("2020-01-01T00:00:00Z")}`)).toBeInTheDocument();
  });

  it("REQ-UI-116 gate bead page", async () => {
    stubFetch(
      beadDetail("a-5", {
        title: "gate placeholder",
        waits_for: { plan: "docs/plans/p.md", number: 2, track_id: "a-2", lane: "be" },
      }),
    );
    render(<BeadDetailPage project="alpha" id="a-5" />);
    expect(await screen.findByRole("heading", { name: "Waits for be #2 to merge" })).toBeInTheDocument();
    expect(screen.getByText("Waiting")).toBeInTheDocument();
    expect(screen.getByText("Placeholder").nextElementSibling).toHaveTextContent("gate placeholder");
    expect(screen.getByText("Waits for").nextElementSibling).toHaveTextContent("docs/plans/p.md #2");
  });

  it("REQ-UI-116 gate bead page: merged", async () => {
    stubFetch(beadDetail("a-5", { status: "closed", waits_for: { plan: "p.md", number: 7, track_id: null, lane: null } }));
    render(<BeadDetailPage project="alpha" id="a-5" />);
    expect(await screen.findByRole("heading", { name: "Waits for track 7 to merge" })).toBeInTheDocument();
    expect(screen.getByText("Merged")).toBeInTheDocument();
  });

  it("REQ-UI-116 Not counted as a child (bead page)", async () => {
    const gate = { plan: "p.md", number: 2, track_id: null, lane: "be" };
    stubFetch(
      beadDetail("a-5", {
        issue_type: "feature",
        children: [
          { id: "a-6", title: "T6", status: "closed", type: "parent-child", prep: false },
          { id: "a-7", title: "gate", status: "open", type: "parent-child", prep: false, waits_for: gate },
        ],
      }),
    );
    render(<BeadDetailPage project="alpha" id="a-5" />);
    expect(await screen.findByText("1 of 1 closed")).toBeInTheDocument();
  });

  it("REQ-UI-072 the breadcrumb names the bead and its parent by title", async () => {
    stubFetch(
      beadDetail("p-2", {
        parent: "p-1",
        title: "Pay",
        dependencies: [{ id: "p-1", title: "Checkout", status: "open", type: "parent-child" }],
      }),
    );
    render(<BeadDetailPage project="p" id="p-2" />);
    const crumb = within(await screen.findByRole("navigation", { name: "Breadcrumb" }));
    expect(await crumb.findByRole("link", { name: "Checkout" })).toHaveAttribute("href", "/beads/p/p-1");
    expect(crumb.getByText("Pay")).toHaveAttribute("aria-current", "page");
  });

  it("REQ-UI-072 the breadcrumb shows the id of a parent that is not among the relations", async () => {
    stubFetch(beadDetail("p-2", { parent: "p-1", title: "Pay" }));
    render(<BeadDetailPage project="p" id="p-2" />);
    const crumb = within(await screen.findByRole("navigation", { name: "Breadcrumb" }));
    expect(await crumb.findByRole("link", { name: "p-1" })).toHaveAttribute("href", "/beads/p/p-1");
  });
});
