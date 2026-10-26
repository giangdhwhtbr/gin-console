import { cleanup, render, screen, within } from "@testing-library/react";
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

describe("BoardView", () => {
  it("REQ-UI-030 switch keeps filters and makes no request", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&status=open&q=fix");
    const fetchMock = stubBeads(() => json([bead("a-1", { title: "fix bug", status: "open" })]));
    const user = userEvent.setup();
    render(<BeadsPage />);

    expect(await screen.findByText("fix bug")).toBeInTheDocument();
    const callsBefore = fetchMock.mock.calls.length;

    await user.click(screen.getByRole("button", { name: "Board" }));

    expect(window.location.search).toContain("view=board");
    expect(window.location.search).toContain("q=fix");
    expect(window.location.search).toContain("status=open");
    expect(fetchMock.mock.calls.length).toBe(callsBefore);

    const searchInput = screen.getByRole("searchbox", { name: "Search" });
    expect(searchInput).toHaveValue("fix");

    await user.click(screen.getByRole("button", { name: "List" }));
    expect(window.location.search).not.toContain("view=");
  });

  it("REQ-UI-030 restored and unknown view", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=board");
    stubBeads(() => json([bead("r-1", { title: "Ready bead", ready: true })]));
    const { unmount } = render(<BeadsPage />);

    expect(await screen.findByRole("region", { name: "Ready" })).toBeInTheDocument();
    unmount();

    window.history.replaceState(null, "", "/beads?project=alpha&view=kanban");
    render(<BeadsPage />);
    expect(await screen.findByRole("tree")).toBeInTheDocument();
  });

  it("REQ-UI-031 placement", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=board&closed=1");
    stubBeads(() =>
      json([
        bead("d-1", { status: "deferred", title: "Deferred bead" }),
        bead("r-1", { ready: true, title: "Ready bead" }),
        bead("p-1", { status: "in_progress", title: "In progress bead" }),
        bead("b-1", { blocked: true, title: "Blocked bead" }),
        bead("c-1", { status: "closed", closed_at: "2026-10-10T12:00:00Z", title: "Closed bead" }),
      ]),
    );
    render(<BeadsPage />);

    const backlog = await screen.findByRole("region", { name: "Backlog" });
    expect(within(backlog).getByRole("link", { name: "Deferred bead" })).toBeInTheDocument();
    expect(within(backlog).getByText("1")).toBeInTheDocument();
    expect(within(backlog).getAllByRole("link")).toHaveLength(1);

    const ready = screen.getByRole("region", { name: "Ready" });
    expect(within(ready).getByRole("link", { name: "Ready bead" })).toBeInTheDocument();
    expect(within(ready).getByText("1")).toBeInTheDocument();
    expect(within(ready).getAllByRole("link")).toHaveLength(1);

    const inProgress = screen.getByRole("region", { name: "In Progress" });
    expect(within(inProgress).getByRole("link", { name: "In progress bead" })).toBeInTheDocument();
    expect(within(inProgress).getByText("1")).toBeInTheDocument();
    expect(within(inProgress).getAllByRole("link")).toHaveLength(1);

    const blocked = screen.getByRole("region", { name: "Blocked" });
    expect(within(blocked).getByRole("link", { name: "Blocked bead" })).toBeInTheDocument();
    expect(within(blocked).getByText("1")).toBeInTheDocument();
    expect(within(blocked).getAllByRole("link")).toHaveLength(1);

    const done = screen.getByRole("region", { name: "Done" });
    expect(within(done).getByRole("link", { name: "Closed bead" })).toBeInTheDocument();
    expect(within(done).getByText("1")).toBeInTheDocument();
    expect(within(done).getAllByRole("link")).toHaveLength(1);
  });

  it("REQ-UI-031 pinned bead", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=board");
    stubBeads(() =>
      json([bead("pin-1", { status: "pinned", ready: false, blocked: false, title: "Pinned bead" })]),
    );
    const user = userEvent.setup();
    render(<BeadsPage />);

    await screen.findByRole("region", { name: "Ready" });
    expect(screen.queryByRole("link", { name: "Pinned bead" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "List" }));
    expect(await screen.findByRole("link", { name: "Pinned bead" })).toBeInTheDocument();
    expect(screen.getByRole("tree")).toBeInTheDocument();
  });

  it("REQ-UI-031 card and link", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=board");
    stubBeads(() =>
      json([
        bead("r-1", {
          title: "Fix bug",
          ready: true,
          priority: 1,
          issue_type: "bug",
          assignee: "alice",
          dependency_count: 2,
          comment_count: 3,
        }),
      ]),
    );
    render(<BeadsPage />);

    const ready = await screen.findByRole("region", { name: "Ready" });
    expect(within(ready).getByText("r-1")).toBeInTheDocument();
    expect(within(ready).getByText("P1")).toBeInTheDocument();
    expect(within(ready).getByText("alice")).toBeInTheDocument();
    expect(within(ready).getByText("bug")).toBeInTheDocument();
    expect(within(ready).getByRole("img", { name: "2 dependencies" })).toBeInTheDocument();
    expect(within(ready).getByRole("img", { name: "3 comments" })).toBeInTheDocument();

    const link = within(ready).getByRole("link", { name: "Fix bug" });
    expect(link).toHaveAttribute("href", "/beads/alpha/r-1");
  });

  it("REQ-UI-031 empty column", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=board");
    stubBeads(() => json([]));
    render(<BeadsPage />);

    const blocked = await screen.findByRole("region", { name: "Blocked" });
    expect(within(blocked).getByText("No beads")).toBeInTheDocument();
  });

  it("REQ-UI-031 plain text", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=board");
    const scriptTitle = "<script>window.hacked = 1</script>";
    stubBeads(() => json([bead("r-1", { ready: true, title: scriptTitle })]));
    const { container } = render(<BeadsPage />);

    expect(await screen.findByText(scriptTitle)).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
  });

  it("REQ-UI-032 Done is short", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=board&closed=1");
    const beads = Array.from({ length: 45 }, (_, i) => {
      const num = String(i + 1).padStart(2, "0");
      return bead(`c-${num}`, {
        title: `Closed ${num}`,
        status: "closed",
        closed_at: new Date(Date.UTC(2026, 9, 1, 0, i, 0)).toISOString(),
      });
    });
    stubBeads(() => json(beads));
    const user = userEvent.setup();
    render(<BeadsPage />);

    const done = await screen.findByRole("region", { name: "Done" });
    const initialLinks = within(done).getAllByRole("link");
    expect(initialLinks).toHaveLength(20);
    expect(within(done).getByText("20 of 45")).toBeInTheDocument();
    expect(initialLinks[0]).toHaveTextContent("Closed 45");

    await user.click(within(done).getByRole("button", { name: "Show all 45" }));
    const allLinks = within(done).getAllByRole("link");
    expect(allLinks).toHaveLength(45);
    expect(within(done).getByText("45")).toBeInTheDocument();

    await user.click(within(done).getByRole("button", { name: "Show latest 20" }));
    expect(within(done).getAllByRole("link")).toHaveLength(20);
  });

  it("REQ-UI-032 closed hidden", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=board");
    const requested: string[] = [];
    stubBeads((url) => {
      requested.push(url.search);
      return json([]);
    });
    const user = userEvent.setup();
    render(<BeadsPage />);

    const done = await screen.findByRole("region", { name: "Done" });
    expect(within(done).getByText("Turn on Show closed to see closed beads")).toBeInTheDocument();
    expect(within(done).queryByRole("link")).toBeNull();

    await user.click(screen.getByLabelText("Show closed"));
    expect(requested.some((u) => u.includes("closed=1"))).toBe(true);
  });

  it("REQ-UI-036 lane is removed; REQ-UI-082 assignee and REQ-UI-083 sprint filter", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=board");
    stubBeads((url) => {
      const closed = url.searchParams.get("closed") === "1";
      const all = [
        bead("epic-1", {
          title: "Frontend epic",
          labels: ["sprint:sprint-1"],
          assignee: "alice",
          ready: true,
        }),
        bead("track-1", {
          title: "Frontend track",
          parent: "epic-1",
          assignee: "bob",
          ready: true,
        }),
        bead("task-unassigned", {
          title: "Unassigned task",
          assignee: null,
          ready: true,
        }),
        bead("closed-task", {
          title: "Completed sprint task",
          labels: ["sprint:sprint-1"],
          status: "closed",
        }),
      ];
      return json(closed ? all : all.filter((b) => b.status !== "closed"));
    });
    const user = userEvent.setup();
    render(<BeadsPage />);

    expect(await screen.findByText("Frontend epic")).toBeInTheDocument();

    // REQ-UI-036: Lane filter is removed
    expect(screen.queryByLabelText("Lane")).toBeNull();

    // REQ-UI-082, REQ-UI-084: Assignee multi-select popover
    const assigneeBtn = screen.getByRole("button", { name: "Assignee" });
    await user.click(assigneeBtn);

    const aliceCheckbox = screen.getByRole("checkbox", { name: "alice" });
    await user.click(aliceCheckbox);
    expect(window.location.search).toContain("assignee=alice");
    expect(screen.getByText("Frontend epic")).toBeInTheDocument();
    expect(screen.queryByText("Frontend track")).toBeNull();

    // Multi-select bob as well
    const bobCheckbox = screen.getByRole("checkbox", { name: "bob" });
    await user.click(bobCheckbox);
    expect(window.location.search).toContain("assignee=alice%2Cbob");
    expect(screen.getByText("Frontend epic")).toBeInTheDocument();
    expect(screen.getByText("Frontend track")).toBeInTheDocument();

    // Clear assignee selection
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(window.location.search).not.toContain("assignee=");

    // Close popover
    await user.click(screen.getByRole("button", { name: "Assignee" }));

    // REQ-UI-083: Sprint filter offers All, No sprint, and sprint names
    const sprintSelect = screen.getByLabelText("Sprint");
    const sprintOptions = within(sprintSelect).getAllByRole("option").map((o) => o.textContent);
    expect(sprintOptions).toEqual(["All", "No sprint", "sprint-1"]);

    await user.selectOptions(sprintSelect, "sprint-1");
    expect(window.location.search).toContain("sprint=sprint-1");
    expect(screen.getByText("Frontend epic")).toBeInTheDocument();
    expect(screen.getByText("Frontend track")).toBeInTheDocument();
    expect(screen.getByText("Completed sprint task")).toBeInTheDocument();
    expect(screen.queryByText("Unassigned task")).toBeNull();

    // Select No sprint
    await user.selectOptions(sprintSelect, "none");
    expect(window.location.search).toContain("sprint=none");
    expect(screen.getByText("Unassigned task")).toBeInTheDocument();
    expect(screen.queryByText("Frontend epic")).toBeNull();

    // REQ-UI-025: Clear filters resets assignee and sprint
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(window.location.search).not.toContain("sprint=");
    expect(window.location.search).not.toContain("assignee=");
  });

  it("REQ-UI-083 hides Sprint control when no loaded beads contain sprint labels", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=board");
    stubBeads(() =>
      json([bead("task-1", { title: "Simple task", labels: ["ui"], ready: true })]),
    );
    render(<BeadsPage />);

    expect(await screen.findByText("Simple task")).toBeInTheDocument();
    expect(screen.queryByLabelText("Sprint")).toBeNull();
  });
});
