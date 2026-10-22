import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bead, json, stubBeads } from "./beadFixtures";
import { BeadsPage } from "./BeadsPage";

beforeEach(() => {
  window.history.replaceState(null, "", "/beads");
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("TreeView", () => {
  it("REQ-UI-030 Tree view: initial load and switch from list", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=tree");
    stubBeads(() => json([bead("t-1", { title: "Test task" })]));
    render(<BeadsPage />);
    expect(await screen.findByRole("tree")).toBeInTheDocument();

    cleanup();

    window.history.replaceState(null, "", "/beads?project=alpha&q=fix");
    const fetchMock = stubBeads(() => json([bead("t-1", { title: "Fix login" })]));
    render(<BeadsPage />);
    expect(await screen.findByText("Fix login")).toBeInTheDocument();

    const callsBefore = fetchMock.mock.calls.length;
    await userEvent.click(screen.getByRole("button", { name: "Tree" }));

    expect(screen.getByRole("tree")).toBeInTheDocument();
    expect(window.location.search).toContain("view=tree");
    expect(window.location.search).toContain("q=fix");
    expect(fetchMock.mock.calls.length).toBe(callsBefore);
  });

  it("REQ-UI-041 hierarchy: roots, children, unparented, and order", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=tree");
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

  it("REQ-UI-042 blocking: unlocking, multi-blockers, cycle, and mode", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=tree&tree=blocking");
    stubBeads(() =>
      json([
        bead("a-1", { title: "Blocker Alpha" }),
        bead("a-2", { title: "Middle Beta", blocked_by: ["a-1"] }),
        bead("a-3", { title: "Leaf Gamma", blocked_by: ["a-1", "a-2"] }),
        bead("c-1", { title: "Cycle One", blocked_by: ["c-2"] }),
        bead("c-2", { title: "Cycle Two", blocked_by: ["c-1"] }),
      ]),
    );
    render(<BeadsPage />);
    const tree = await screen.findByRole("tree");

    expect(within(tree).getByRole("treeitem", { name: /a-1/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Expand a-1" }));
    const a2 = within(tree).getByRole("treeitem", { name: /a-2/ });
    expect(a2).toBeInTheDocument();
    expect(within(a2).getByText("blocked by 1")).toBeInTheDocument();

    expect(within(tree).getByRole("treeitem", { name: /a-3/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Expand a-2" }));
    const a3Nodes = within(tree).getAllByRole("treeitem", { name: /a-3/ });
    expect(a3Nodes.length).toBeGreaterThanOrEqual(2);

    const cycleRootButton =
      screen.queryByRole("button", { name: "Expand c-1" }) ??
      screen.getByRole("button", { name: "Expand c-2" });
    await userEvent.click(cycleRootButton);
    const cycleChildButton =
      screen.queryByRole("button", { name: "Expand c-1" }) ??
      screen.getByRole("button", { name: "Expand c-2" });
    await userEvent.click(cycleChildButton);
    expect(within(tree).getByText("also above")).toBeInTheDocument();

    const hierarchyBtn = screen.getByRole("button", { name: "Hierarchy" });
    const blockingBtn = screen.getByRole("button", { name: "Blocking" });
    expect(blockingBtn).toHaveAttribute("aria-pressed", "true");
    expect(hierarchyBtn).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(hierarchyBtn);
    expect(window.location.search).not.toContain("tree=blocking");
    expect(hierarchyBtn).toHaveAttribute("aria-pressed", "true");
    expect(blockingBtn).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(blockingBtn);
    expect(window.location.search).toContain("tree=blocking");
    expect(blockingBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("REQ-UI-042 blocking: unknown tree mode gives hierarchy", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=tree&tree=unknown");
    stubBeads(() => json([bead("t-1")]));
    render(<BeadsPage />);
    await screen.findByRole("tree");
    expect(screen.getByRole("button", { name: "Hierarchy" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Blocking" })).toHaveAttribute("aria-pressed", "false");
  });

  it("REQ-UI-042 limit: 2100 root beads", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=tree");
    const beads = Array.from({ length: 2100 }, (_, i) => bead(`r-${i}`, { title: `Root ${i}` }));
    stubBeads(() => json(beads));
    render(<BeadsPage />);

    const tree = await screen.findByRole("tree");
    const items = within(tree).getAllByRole("treeitem");
    expect(items).toHaveLength(2000);
    expect(screen.getByText("100 more not shown")).toBeInTheDocument();
  });

  it("REQ-UI-043 filters: match with ancestors, closed beads, and lane", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=tree&q=login");
    stubBeads((url) => {
      const closed = url.searchParams.get("closed") === "1";
      const list = [
        bead("e-1", { issue_type: "epic", title: "Epic Auth" }),
        bead("t-login", { parent: "e-1", title: "Fix login" }),
        bead("t-search", { parent: "e-1", title: "Add search" }),
        bead("e-2", { issue_type: "epic", title: "Epic Closed" }),
        bead("t-open", { parent: "e-2", title: "Open task" }),
        bead("t-closed", { parent: "e-2", title: "Closed task", status: "closed" }),
        bead("e-3", { issue_type: "epic", title: "Epic Lanes" }),
        bead("t-fe", { parent: "e-3", title: "Frontend task", labels: ["frontend"] }),
        bead("t-be", { parent: "e-3", title: "Backend task", labels: ["backend"] }),
      ];
      return json(closed ? list : list.filter((b) => b.status !== "closed"));
    });
    render(<BeadsPage />);
    const tree = await screen.findByRole("tree");

    expect(within(tree).getByRole("treeitem", { name: /e-1/ })).toBeInTheDocument();
    expect(within(tree).getByRole("treeitem", { name: /t-login/ })).toBeInTheDocument();
    expect(within(tree).queryByRole("treeitem", { name: /t-search/ })).not.toBeInTheDocument();

    cleanup();

    window.history.replaceState(null, "", "/beads?project=alpha&view=tree");
    render(<BeadsPage />);
    const tree2 = await screen.findByRole("tree");

    await userEvent.click(within(tree2).getByRole("button", { name: "Expand e-2" }));
    expect(within(tree2).getByRole("treeitem", { name: /t-open/ })).toBeInTheDocument();
    expect(within(tree2).queryByRole("treeitem", { name: /t-closed/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByLabelText("Show closed"));
    const tree2Updated = await screen.findByRole("tree");
    expect(within(tree2Updated).getByRole("treeitem", { name: /t-closed/ })).toBeInTheDocument();

    cleanup();

    window.history.replaceState(null, "", "/beads?project=alpha&view=tree&lane=frontend");
    render(<BeadsPage />);
    const tree3 = await screen.findByRole("tree");

    expect(within(tree3).getByRole("treeitem", { name: /e-3/ })).toBeInTheDocument();
    expect(within(tree3).getByRole("treeitem", { name: /t-fe/ })).toBeInTheDocument();
    expect(within(tree3).queryByRole("treeitem", { name: /t-be/ })).not.toBeInTheDocument();
  });

  it("REQ-UI-044 rows: node fields, epic progress, expand/collapse all, and plain text", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=tree&closed=1");
    stubBeads(() =>
      json([
        bead("e-progress", { issue_type: "epic", title: "Progress Epic" }),
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
    expect(within(k1).getByText("closed")).toBeInTheDocument();
    expect(within(k1).getByText("P1")).toBeInTheDocument();
    expect(within(k1).getByText("task")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Collapse all" }));
    expect(within(tree).queryByRole("treeitem", { name: /k-1/ })).not.toBeInTheDocument();
    expect(within(tree).getByRole("treeitem", { name: /e-progress/ })).toBeInTheDocument();
    expect(within(tree).getByRole("treeitem", { name: /xss-1/ })).toBeInTheDocument();
  });

  it("REQ-UI-045 selection: clicking updates URL and initial selection opens branch", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=tree");
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
    await userEvent.click(within(t1).getByText("Task 1"));

    expect(t1).toHaveAttribute("aria-selected", "true");
    expect(window.location.search).toContain("select=t-1");
    expect(window.history.length).toBe(historyLenBefore);

    cleanup();

    window.history.replaceState(null, "", "/beads?project=alpha&view=tree&select=t-1");
    render(<BeadsPage />);
    const tree2 = await screen.findByRole("tree");

    const t1Initial = within(tree2).getByRole("treeitem", { name: /t-1/ });
    expect(t1Initial).toBeInTheDocument();
    expect(t1Initial).toHaveAttribute("aria-selected", "true");
  });

  it("REQ-UI-045 refresh keeps state", async () => {
    vi.useFakeTimers();
    window.history.replaceState(null, "", "/beads?project=alpha&view=tree");
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

    fireEvent.click(within(t1).getByText("Task 1"));
    expect(t1).toHaveAttribute("aria-selected", "true");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    const treeAfter = screen.getByRole("tree");
    const t1After = within(treeAfter).getByRole("treeitem", { name: /t-1/ });
    expect(t1After).toBeInTheDocument();
    expect(t1After).toHaveAttribute("aria-selected", "true");
  });
});
