import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bead, json, stubBeads } from "./beadFixtures";
import { BeadsPage } from "./BeadsPage";
import { clearOrigin, rememberOpen } from "@/app/origin";

beforeEach(() => {
  clearOrigin();
  window.history.replaceState(null, "", "/beads");
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ListView", () => {
  it("REQ-UI-044 REQ-UI-107 Long id keeps the title and the first block does not wrap on a phone", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=list");
    const id = "ex-payments-provider-migration-and-reconciliation-2026";
    stubBeads(() =>
      json([
        bead(id, { issue_type: "epic", child_counts: { total: 1, closed: 0, prep_total: 1, prep_closed: 0 }, title: "Payments migration", assignee: "a-very-long-assignee-name", labels: ["p-label"] }),
        bead("c-1", { parent: id, title: "Child" }),
        bead("c-2", { parent: id, title: "Prep child", labels: ["prep"] }),
      ]),
    );
    render(<BeadsPage />);
    const tree = await screen.findByRole("tree");
    const row = within(tree).getByRole("treeitem", { name: /Payments migration/ });
    expect(within(row).getByRole("button", { name: `Expand ${id}` })).toBeInTheDocument();
    expect(within(row).getByText(id, { selector: ".sr-only" })).toBeInTheDocument();
    const shown = within(row).getByText("ex-payments-pr…tion-2026");
    expect(shown).toHaveAttribute("title", id);
    // shortId caps the id at 24 chars: the span must not cut it again (REQ-UI-107)
    expect(shown).toHaveClass("@2xl:shrink-0");
    expect(shown).not.toHaveClass("max-w-[40%]");
    // under 42rem the first block stays on one line and the id gives way (two-line rows, REQ-UI-044); from 42rem it wraps instead of clipping
    expect(shown.parentElement).toHaveClass("flex-nowrap", "@2xl:flex-wrap");
    expect(shown).toHaveClass("min-w-0", "shrink", "truncate");
    expect(within(row).getByText("Payments migration").parentElement).toHaveClass("min-w-32", "flex-1", "truncate");
    // the bar and the closed count give way to the title when the title cell is narrow
    expect(within(row).getByText(/\d+\/\d+ closed/)).toHaveClass("hidden", "@xl:flex");
    expect(within(row).getByText(/^Prep /)).toHaveClass("hidden", "@xl:inline");
    expect(within(row).getByText("p-label").parentElement?.parentElement).toHaveClass("hidden", "@3xl:flex");
    // the extras clip before the title does
    const group = within(row).getByText(/\d+\/\d+ closed/).parentElement!;
    expect(group).toHaveClass("min-w-0", "shrink", "overflow-hidden");
    expect(group).toContainElement(within(row).getByText("p-label"));
    expect(within(row).getByText("Payments migration").parentElement).toHaveAttribute("title", "Payments migration");
    expect(within(row).getByText("a-very-long-assignee-name")).toBeInTheDocument();
  });

  it("REQ-UI-030 List view: shown by default and kept when switching from the Board", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha");
    stubBeads(() => json([bead("t-1", { title: "Test task" })]));
    render(<BeadsPage />);
    expect(await screen.findByRole("tree")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tree" })).toBeNull();

    cleanup();

    window.history.replaceState(null, "", "/beads?project=alpha&view=board&q=fix");
    const fetchMock = stubBeads(() => json([bead("t-1", { title: "Fix login", ready: true })]));
    render(<BeadsPage />);
    expect(await screen.findByText("Fix login")).toBeInTheDocument();

    const callsBefore = fetchMock.mock.calls.length;
    await userEvent.click(screen.getByRole("button", { name: "List" }));

    expect(screen.getByRole("tree")).toBeInTheDocument();
    expect(window.location.search).toContain("q=fix");
    expect(fetchMock.mock.calls.length).toBe(callsBefore);
  });

  it("REQ-UI-041 hierarchy: roots, children, unparented, and order", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=list");
    stubBeads(() =>
      json([
        bead("e-1", { issue_type: "epic", title: "Epic One" }),
        bead("t-1", { parent: "e-1", priority: 1, updated_at: "2026-10-10T00:00:00Z", title: "Task 1" }),
        bead("t-2", { parent: "e-1", priority: 1, updated_at: "2026-10-12T00:00:00Z", title: "Task 2" }),
        bead("t-3", { parent: "e-1", priority: 2, updated_at: "2026-10-11T00:00:00Z", title: "Task 3" }),
        bead("x-1", { title: "Root X" }),
        bead("orphan-1", { parent: "closed-parent", title: "Orphan child" }),
      ]),
    );
    render(<BeadsPage />);
    const tree = await screen.findByRole("tree");

    expect(within(tree).getByRole("treeitem", { name: /e-1/ })).toBeInTheDocument();
    expect(within(tree).getByRole("treeitem", { name: /x-1/ })).toBeInTheDocument();
    expect(within(tree).getByRole("treeitem", { name: /orphan-1/ })).toBeInTheDocument();
    expect(within(tree).queryByRole("treeitem", { name: /t-1/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Expand e-1" }));
    const t1 = within(tree).getByRole("treeitem", { name: /t-1/ });
    const t2 = within(tree).getByRole("treeitem", { name: /t-2/ });
    const t3 = within(tree).getByRole("treeitem", { name: /t-3/ });
    expect(t1).toHaveAttribute("aria-level", "2");
    expect(t2).toHaveAttribute("aria-level", "2");
    expect(t3).toHaveAttribute("aria-level", "2");

    const items = within(tree).getAllByRole("treeitem");
    const idxT2 = items.indexOf(t2);
    const idxT1 = items.indexOf(t1);
    const idxT3 = items.indexOf(t3);
    expect(idxT2).toBeLessThan(idxT1);
    expect(idxT1).toBeLessThan(idxT3);

    await userEvent.click(screen.getByRole("button", { name: "Collapse e-1" }));
    expect(within(tree).queryByRole("treeitem", { name: /t-1/ })).not.toBeInTheDocument();
  });

  it("REQ-UI-044 row limit: 2100 root beads", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=list");
    const beads = Array.from({ length: 2100 }, (_, i) => bead(`r-${i}`, { title: `Root ${i}` }));
    stubBeads(() => json(beads));
    render(<BeadsPage />);

    const tree = await screen.findByRole("tree");
    const items = within(tree).getAllByRole("treeitem");
    expect(items).toHaveLength(2000);
    expect(screen.getByText("100 more not shown")).toBeInTheDocument();
  }, 30_000); // 2000 full rows are slow to build in jsdom, much more so on a loaded machine

  it("REQ-UI-043 filters: match with ancestors, closed beads, assignee, and sprint", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=list&q=login");
    stubBeads((url) => {
      const closed = url.searchParams.get("closed") === "1";
      const list = [
        bead("e-1", { issue_type: "epic", title: "Epic Auth" }),
        bead("t-login", { parent: "e-1", title: "Fix login" }),
        bead("t-search", { parent: "e-1", title: "Add search" }),
        bead("e-2", { issue_type: "epic", title: "Epic Closed" }),
        bead("t-open", { parent: "e-2", title: "Open task" }),
        bead("t-closed", { parent: "e-2", title: "Closed task", status: "closed" }),
        bead("e-3", { issue_type: "epic", title: "Epic Assignees" }),
        bead("t-fe", { parent: "e-3", title: "Frontend task", assignee: "alice" }),
        bead("t-be", { parent: "e-3", title: "Backend task", assignee: "bob" }),
        bead("e-4", { issue_type: "epic", title: "Epic Sprints", labels: ["sprint:sprint-1"] }),
        bead("t-closed-sprint", { parent: "e-4", title: "Closed Sprint task", status: "closed" }),
      ];
      return json(closed ? list : list.filter((b) => b.status !== "closed"));
    });
    render(<BeadsPage />);
    const tree = await screen.findByRole("tree");

    expect(within(tree).getByRole("treeitem", { name: /e-1/ })).toBeInTheDocument();
    expect(within(tree).getByRole("treeitem", { name: /t-login/ })).toBeInTheDocument();
    expect(within(tree).queryByRole("treeitem", { name: /t-search/ })).not.toBeInTheDocument();

    cleanup();

    window.history.replaceState(null, "", "/beads?project=alpha&view=list");
    render(<BeadsPage />);
    const tree2 = await screen.findByRole("tree");

    await userEvent.click(within(tree2).getByRole("button", { name: "Expand e-2" }));
    expect(within(tree2).getByRole("treeitem", { name: /t-open/ })).toBeInTheDocument();
    expect(within(tree2).queryByRole("treeitem", { name: /t-closed/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByLabelText("Show closed"));
    const tree2Updated = await screen.findByRole("tree");
    expect(within(tree2Updated).getByRole("treeitem", { name: /t-closed/ })).toBeInTheDocument();

    cleanup();

    window.history.replaceState(null, "", "/beads?project=alpha&view=list&assignee=alice");
    render(<BeadsPage />);
    const tree3 = await screen.findByRole("tree");

    expect(within(tree3).getByRole("treeitem", { name: /e-3/ })).toBeInTheDocument();
    expect(within(tree3).getByRole("treeitem", { name: /t-fe/ })).toBeInTheDocument();
    expect(within(tree3).queryByRole("treeitem", { name: /t-be/ })).not.toBeInTheDocument();

    cleanup();

    window.history.replaceState(null, "", "/beads?project=alpha&view=list&sprint=sprint-1");
    render(<BeadsPage />);
    const tree4 = await screen.findByRole("tree");

    expect(within(tree4).getByRole("treeitem", { name: /e-4/ })).toBeInTheDocument();
    expect(within(tree4).getByRole("treeitem", { name: /t-closed-sprint/ })).toBeInTheDocument();

    cleanup();

    window.history.replaceState(null, "", "/beads?project=alpha&view=list&status=ready");
    stubBeads(() =>
      json([
        bead("e-state", { issue_type: "epic", title: "State Epic" }),
        bead("t-ready", { parent: "e-state", title: "Ready task", status: "open", ready: true }),
        bead("t-blocked", { parent: "e-state", title: "Blocked task", status: "open", blocked: true }),
      ]),
    );
    render(<BeadsPage />);
    const treeState = await screen.findByRole("tree");
    expect(within(treeState).getByRole("treeitem", { name: /t-ready/ })).toBeInTheDocument();
    expect(within(treeState).queryByRole("treeitem", { name: /t-blocked/ })).not.toBeInTheDocument();
  });

  it("REQ-UI-044 rows: node fields, epic progress, expand/collapse all, and plain text", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=list&closed=1");
    stubBeads(() =>
      json([
        bead("e-progress", { issue_type: "epic", title: "Progress Epic", child_counts: { total: 5, closed: 3, prep_total: 0, prep_closed: 0 } }),
        bead("k-1", { parent: "e-progress", status: "closed", priority: 1, issue_type: "task", title: "Task 1" }),
        bead("k-2", { parent: "e-progress", status: "closed", priority: 2, issue_type: "bug", title: "Bug 2" }),
        bead("k-3", { parent: "e-progress", status: "closed", priority: 3, issue_type: "feature", title: "Feature 3" }),
        bead("k-4", { parent: "e-progress", status: "open", priority: 1, issue_type: "task", title: "Task 4" }),
        bead("k-5", { parent: "e-progress", status: "open", priority: 2, issue_type: "task", title: "Task 5" }),
        bead("xss-1", { title: "<script>window.hacked = 1</script>" }),
      ]),
    );
    const { container } = render(<BeadsPage />);
    const tree = await screen.findByRole("tree");

    expect(within(tree).getByText("3/5 closed")).toBeInTheDocument();
    expect(within(tree).getByText("<script>window.hacked = 1</script>")).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Expand all" }));
    const k1 = within(tree).getByRole("treeitem", { name: /k-1/ });
    expect(k1).toBeInTheDocument();

    expect(within(k1).getByText("k-1")).toBeInTheDocument();
    expect(within(k1).getByText("Task 1")).toBeInTheDocument();
    expect(within(k1).getByText("Done")).toBeInTheDocument();
    expect(within(k1).getByText("P1")).toBeInTheDocument();
    expect(within(k1).getByText("task")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Collapse all" }));
    expect(within(tree).queryByRole("treeitem", { name: /k-1/ })).not.toBeInTheDocument();
    expect(within(tree).getByRole("treeitem", { name: /e-progress/ })).toBeInTheDocument();
    expect(within(tree).getByRole("treeitem", { name: /xss-1/ })).toBeInTheDocument();
  });

  it("REQ-UI-130 a list row shows 3/5 closed from the child counts with Show closed off and the closed children not loaded", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=list");
    stubBeads(() =>
      json([
        bead("e-hid", { issue_type: "epic", title: "Hidden closed", child_counts: { total: 5, closed: 3, prep_total: 0, prep_closed: 0 } }),
        bead("h-4", { parent: "e-hid", title: "Open 4" }),
        bead("h-5", { parent: "e-hid", title: "Open 5" }),
      ]),
    );
    render(<BeadsPage />);
    const tree = await screen.findByRole("tree");
    expect(within(tree).getByText("3/5 closed")).toBeInTheDocument();
  });

  it("REQ-UI-044 epic with a prep task: track bar, Prep 0/1 and a chip on p-1 only", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=list&closed=1");
    stubBeads(() =>
      json([
        bead("e-1", { issue_type: "epic", title: "Epic", child_counts: { total: 2, closed: 1, prep_total: 1, prep_closed: 0 } }),
        bead("t-1", { parent: "e-1", status: "closed", title: "Track 1" }),
        bead("t-2", { parent: "e-1", title: "Track 2" }),
        bead("p-1", { parent: "e-1", title: "Prep 1", labels: ["prep", "prep:mockup"] }),
      ]),
    );
    render(<BeadsPage />);
    const tree = await screen.findByRole("tree");
    expect(within(tree).getByText("1/2 closed")).toBeInTheDocument();
    expect(within(tree).getByText("Prep 0/1")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Expand all" }));
    const chip = (id: string) => within(within(tree).getByRole("treeitem", { name: new RegExp(id) })).queryByText("Prep", { selector: "[data-slot=badge]" });
    expect(chip("p-1")).not.toBeNull();
    expect(chip("t-1")).toBeNull();
    expect(chip("t-2")).toBeNull();
  });

  it("REQ-UI-044 an epic with only prep tasks shows no track count", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=list");
    stubBeads(() =>
      json([bead("e-1", { issue_type: "epic", child_counts: { total: 0, closed: 0, prep_total: 1, prep_closed: 0 } }), bead("p-1", { parent: "e-1", labels: ["prep"] })]),
    );
    render(<BeadsPage />);
    const tree = await screen.findByRole("tree");
    expect(within(tree).getByText("Prep 0/1")).toBeInTheDocument();
    expect(within(tree).queryByText(/closed$/)).toBeNull();
  });

  it("REQ-UI-045 selection: clicking updates URL and initial selection opens branch", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=list");
    stubBeads(() =>
      json([
        bead("e-1", { issue_type: "epic", title: "Epic 1" }),
        bead("t-1", { parent: "e-1", title: "Task 1" }),
      ]),
    );
    render(<BeadsPage />);
    const tree = await screen.findByRole("tree");

    await userEvent.click(screen.getByRole("button", { name: "Expand e-1" }));
    const t1 = within(tree).getByRole("treeitem", { name: /t-1/ });
    expect(t1).toHaveAttribute("aria-selected", "false");

    const historyLenBefore = window.history.length;
    await userEvent.click(within(t1).getByText("t-1"));

    expect(t1).toHaveAttribute("aria-selected", "true");
    expect(window.location.search).toContain("select=t-1");
    expect(window.history.length).toBe(historyLenBefore);

    cleanup();

    window.history.replaceState(null, "", "/beads?project=alpha&view=list&select=t-1");
    render(<BeadsPage />);
    const tree2 = await screen.findByRole("tree");

    const t1Initial = within(tree2).getByRole("treeitem", { name: /t-1/ });
    expect(t1Initial).toBeInTheDocument();
    expect(t1Initial).toHaveAttribute("aria-selected", "true");
  });

  describe("details panel only while selected", () => {
    const two = () => stubBeads(() => json([bead("t-1", { title: "Task 1" }), bead("t-2", { title: "Task 2" })]));

    it("REQ-UI-045 nothing selected: no panel and a single column", async () => {
      window.history.replaceState(null, "", "/beads?project=alpha&view=list");
      two();
      render(<BeadsPage />);
      const tree = await screen.findByRole("tree");
      expect(screen.queryByRole("complementary", { name: "Bead details" })).toBeNull();
      expect(tree.parentElement?.parentElement).not.toHaveClass("lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]");
    });

    it("REQ-UI-045 select a row: the panel shows and the grid has two columns", async () => {
      window.history.replaceState(null, "", "/beads?project=alpha&view=list");
      two();
      render(<BeadsPage />);
      const tree = await screen.findByRole("tree");
      await userEvent.click(within(tree).getByRole("treeitem", { name: /t-1/ }));
      expect(screen.getByRole("complementary", { name: "Bead details" })).toBeInTheDocument();
      expect(tree.parentElement?.parentElement).toHaveClass("lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]");
    });

    it("REQ-UI-045 close button clears the selection and focuses the row", async () => {
      window.history.replaceState(null, "", "/beads?project=alpha&view=list&select=t-1");
      two();
      render(<BeadsPage />);
      await screen.findByRole("tree");
      await userEvent.click(screen.getByRole("button", { name: "Close details" }));
      expect(screen.queryByRole("complementary", { name: "Bead details" })).toBeNull();
      expect(window.location.search).not.toContain("select=");
      expect(document.querySelector('[role="treeitem"][data-id="t-1"]')).toHaveFocus();
    });

    it("REQ-UI-045 Escape on a row closes the panel and keeps focus on the row", async () => {
      window.history.replaceState(null, "", "/beads?project=alpha&view=list&select=t-1");
      two();
      render(<BeadsPage />);
      const tree = await screen.findByRole("tree");
      within(tree).getByRole("treeitem", { name: /t-1/ }).focus();
      await userEvent.keyboard("{Escape}");
      expect(window.location.search).not.toContain("select=");
      expect(screen.queryByRole("complementary", { name: "Bead details" })).toBeNull();
      expect(document.querySelector('[role="treeitem"][data-id="t-1"]')).toHaveFocus();
    });

    it("REQ-UI-045 closing a selection missing from the list focuses the first row", async () => {
      window.history.replaceState(null, "", "/beads?project=alpha&view=list&select=zz");
      two();
      render(<BeadsPage />);
      await screen.findByRole("tree");
      expect(screen.getByText("Not in the current list")).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "Close details" }));
      expect(document.querySelector('[role="treeitem"][data-id="t-1"]')).toHaveFocus();
    });
  });

  it("REQ-UI-045 refresh keeps state", async () => {
    vi.useFakeTimers();
    window.history.replaceState(null, "", "/beads?project=alpha&view=list");
    stubBeads(() =>
      json([
        bead("e-1", { issue_type: "epic", title: "Epic 1" }),
        bead("t-1", { parent: "e-1", title: "Task 1" }),
      ]),
    );
    render(<BeadsPage />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const tree = screen.getByRole("tree");
    expect(tree).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Expand e-1" }));
    const t1 = within(tree).getByRole("treeitem", { name: /t-1/ });
    expect(t1).toBeInTheDocument();

    fireEvent.click(within(t1).getByText("t-1"));
    expect(t1).toHaveAttribute("aria-selected", "true");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    const treeAfter = screen.getByRole("tree");
    const t1After = within(treeAfter).getByRole("treeitem", { name: /t-1/ });
    expect(t1After).toBeInTheDocument();
    expect(t1After).toHaveAttribute("aria-selected", "true");
  });

  it("REQ-UI-064 REQ-UI-066 tree rows show the state, the type pill and the indicators", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=list");
    stubBeads(() => json([bead("t-1", { title: "Task One", blocked: true, comment_count: 2 })]));
    render(<BeadsPage />);
    const row = await screen.findByRole("treeitem");
    expect(within(row).getByText("Blocked")).toBeInTheDocument();
    expect(within(row).getByRole("img", { name: "2 comments" })).toBeInTheDocument();
  });

  it("REQ-UI-044 a row shows the id, title link, state, type, priority, indicators, assignee and three labels", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha");
    stubBeads(() =>
      json([
        bead("t-1", {
          title: "Fix it",
          blocked: true,
          priority: 1,
          issue_type: "bug",
          assignee: "alice",
          comment_count: 2,
          labels: ["ui", "qa", "a", "b"],
        }),
      ]),
    );
    render(<BeadsPage />);
    const row = await screen.findByRole("treeitem");
    expect(within(row).getByRole("link", { name: "Fix it" })).toHaveAttribute("href", "/beads/alpha/t-1");
    expect(within(row).getByText("Blocked")).toBeInTheDocument();
    expect(within(row).getByText("bug")).toHaveAttribute("data-type", "bug");
    expect(within(row).getByText("P1")).toHaveClass("text-state-blocked");
    expect(within(row).getByRole("img", { name: "2 comments" })).toBeInTheDocument();
    expect(within(row).getByText("alice")).toBeInTheDocument();
    expect(within(row).getAllByText(/^(ui|qa|a)$/)).toHaveLength(3);
    expect(within(row).getByText("ui")).toHaveClass("truncate");
    expect(within(row).getByText("ui").parentElement).toHaveAttribute("title", "ui");
    expect(within(row).queryByText("b")).toBeNull();
  });

  it("REQ-UI-045 under 1024px a click opens the bead page", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    window.history.replaceState(null, "", "/beads?project=alpha");
    stubBeads(() => json([bead("t-1", { title: "Task One" })]));
    render(<BeadsPage />);
    await userEvent.click(await screen.findByRole("treeitem", { name: /t-1/ }));
    expect(window.location.pathname).toBe("/beads/alpha/t-1");
  });

  it("REQ-UI-074 the open branches come back", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha");
    stubBeads(() =>
      json([bead("e-1", { issue_type: "epic", title: "Epic" }), bead("t-1", { parent: "e-1", title: "Child" })]),
    );
    render(<BeadsPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Expand e-1" }));
    expect(screen.getByText("Child")).toBeInTheDocument();
    cleanup();
    render(<BeadsPage />);
    expect(await screen.findByText("Child")).toBeInTheDocument();
  });

  it("REQ-UI-074 a remembered bead that is gone is ignored and other projects stay closed", async () => {
    rememberOpen("alpha", ["e-9"]);
    rememberOpen("beta", ["e-1"]);
    window.history.replaceState(null, "", "/beads?project=alpha");
    stubBeads(() =>
      json([bead("e-1", { issue_type: "epic", title: "Epic" }), bead("t-1", { parent: "e-1", title: "Child" })]),
    );
    render(<BeadsPage />);
    expect(await screen.findByText("Epic")).toBeInTheDocument();
    expect(screen.queryByText("Child")).toBeNull();
  });

  it("REQ-UI-046 Enter on the title link follows the link instead of selecting", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha");
    stubBeads(() => json([bead("t-1", { title: "Task One" })]));
    render(<BeadsPage />);
    const link = await screen.findByRole("link", { name: "Task One" });
    link.focus();
    await userEvent.keyboard("{Enter}");
    expect(window.location.pathname).toBe("/beads/alpha/t-1");
  });

  it("REQ-UI-044 the columns follow the width of the list, not of the window", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha");
    stubBeads(() => json([bead("t-1", { title: "Task One", assignee: "alice" })]));
    render(<BeadsPage />);
    const row = await screen.findByRole("treeitem");
    expect(row.parentElement?.parentElement).toHaveClass("@container");
    expect(row).toHaveClass("@2xl:grid-cols-[minmax(0,1fr)_7.5rem_5.5rem_2.5rem_6rem]");
    expect(within(row).getByText("alice")).toHaveClass("hidden", "@4xl:block");
    expect(within(row).getByRole("link", { name: "Task One" }).closest("div")).toHaveClass("overflow-hidden");
  });

  it("REQ-UI-109 Technical epic: the row shows the kind badge and the complexity and estimate chip", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=list");
    stubBeads(() =>
      json([
        bead("e-1", { issue_type: "epic", title: "Tech epic", kind: "technical", capabilities: ["beads", "ui"], complexity: "medium", estimate_minutes: 1440 }),
        bead("e-3", { issue_type: "epic", title: "Sized epic", complexity: "high" }),
      ]),
    );
    render(<BeadsPage />);
    const tree = await screen.findByRole("tree");
    const row = within(tree).getByRole("treeitem", { name: /Tech epic/ });
    const badge = within(row).getByText("Technical").parentElement;
    expect(badge).toHaveClass("min-w-0", "shrink");
    expect(badge).not.toHaveClass("shrink-0");
    expect(badge).toHaveAttribute("title", "Technical");
    expect(within(row).getByText("medium")).toHaveClass("min-w-0", "shrink", "truncate");
    const chip = within(row).getByText("3d").parentElement;
    // the size badge stays whole: the id and the complexity give way before it (REQ-UI-044)
    expect(chip).toHaveClass("shrink-0");
    expect(chip).not.toHaveClass("hidden");
    expect(chip?.parentElement).not.toHaveClass("hidden");
    expect(within(row).getByText("Tech epic").parentElement).toHaveClass("min-w-32", "flex-1", "truncate");
    expect(within(within(tree).getByRole("treeitem", { name: /Sized epic/ })).getByText("high")).toBeInTheDocument();
  });

  it("REQ-UI-109 Size at every width: the row shows the complexity and the size badge, or the badge alone, outside the hidden group", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=list");
    stubBeads(() =>
      json([
        bead("e-3", { issue_type: "epic", title: "Pointed epic", complexity: "medium", points: 5, estimate_minutes: 1440 }),
        bead("e-4", { issue_type: "epic", title: "Bare points", points: 3 }),
      ]),
    );
    render(<BeadsPage />);
    const tree = await screen.findByRole("tree");
    expect(within(within(tree).getByRole("treeitem", { name: /Pointed epic/ })).getByText("medium")).toBeInTheDocument();
    expect(within(within(tree).getByRole("treeitem", { name: /Pointed epic/ })).getByText("5 pt")).toBeInTheDocument();
    expect(within(within(tree).getByRole("treeitem", { name: /Bare points/ })).getByText("3 pt")).toBeInTheDocument();
  });

  it("REQ-UI-109 Capability epic: no kind badge and no estimate", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=list");
    stubBeads(() => json([bead("e-2", { issue_type: "epic", title: "Cap epic", kind: "capability" })]));
    render(<BeadsPage />);
    const row = within(await screen.findByRole("tree")).getByRole("treeitem", { name: /Cap epic/ });
    expect(row).not.toHaveTextContent(/Technical|Parity/);
    expect(row).not.toHaveTextContent(/\d+(\.\d)?d\b/);
    expect(row).not.toHaveTextContent("·");
  });

  it("REQ-UI-110 Priority pill: P0 destructive, P1 warning, P2 neutral on the rows", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=list");
    stubBeads(() =>
      json([bead("p-0", { priority: 0, title: "Zero" }), bead("p-1", { priority: 1, title: "One" }), bead("p-2", { priority: 2, title: "Two" })]),
    );
    render(<BeadsPage />);
    const tree = await screen.findByRole("tree");
    expect(within(within(tree).getByRole("treeitem", { name: /Zero/ })).getByText("P0")).toHaveClass("text-destructive");
    expect(within(within(tree).getByRole("treeitem", { name: /One/ })).getByText("P1")).toHaveClass("text-state-blocked");
    expect(within(within(tree).getByRole("treeitem", { name: /Two/ })).getByText("P2")).toHaveClass("bg-secondary");
  });
});

describe("ListView lanes", () => {
  it("REQ-UI-115 REQ-UI-116 Lane chip in the list, no lane: or track: chip, no merge gate row", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=list");
    stubBeads(() =>
      json([
        bead("e-1", { issue_type: "epic", title: "Checkout", child_counts: { total: 2, closed: 0, prep_total: 0, prep_closed: 0 } }),
        bead("e-1.1", { parent: "e-1", title: "Track one", lane: "be", track: { plan: null, number: 1 }, labels: ["lane:be", "track:1", "x-label"] }),
        bead("e-1.2", { parent: "e-1", title: "No lane" }),
        bead("e-1.3", { parent: "e-1", title: "external: p#2", waits_for: { plan: "p", number: 2, track_id: null, lane: null } }),
      ]),
    );
    render(<BeadsPage />);
    const tree = await screen.findByRole("tree");
    const epic = within(tree).getByRole("treeitem", { name: /Checkout/ });
    // the gate is not counted as a child: one track and one task
    expect(within(epic).getByText("0/2 closed")).toBeInTheDocument();
    await userEvent.click(within(epic).getByRole("button", { name: "Expand e-1" }));
    const row = within(tree).getByRole("treeitem", { name: /Track one/ });
    expect(within(row).getByText("be")).toBeInTheDocument();
    expect(within(row).queryByText("lane:be")).toBeNull();
    expect(within(row).queryByText("track:1")).toBeNull();
    expect(within(row).getByText("x-label")).toBeInTheDocument();
    expect(within(tree).getByRole("treeitem", { name: /No lane/ }).querySelector("[title^='Lane ']")).toBeNull();
    expect(within(tree).queryByText("external: p#2")).toBeNull();
  });
});

describe("ListView without a lane", () => {
  it("REQ-UI-115 Bead without a lane: no chip on its row", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=list");
    stubBeads(() => json([bead("a-1", { title: "Plain", lane: null })]));
    render(<BeadsPage />);
    const row = within(await screen.findByRole("tree")).getByRole("treeitem", { name: /Plain/ });
    expect(row.querySelector("[title^='Lane ']")).toBeNull();
  });
});
