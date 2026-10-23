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
    expect(await screen.findByRole("table")).toBeInTheDocument();
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
    expect(screen.getByRole("table")).toBeInTheDocument();
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

  it("REQ-UI-036 lane", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=board");
    stubBeads(() =>
      json([
        bead("b-1", { title: "Frontend bead", labels: ["frontend"], ready: true }),
        bead("b-2", { title: "Backend bead", labels: ["backend"], ready: true }),
      ]),
    );
    const user = userEvent.setup();
    const { unmount } = render(<BeadsPage />);

    expect(await screen.findByText("Frontend bead")).toBeInTheDocument();
    const laneSelect = screen.getByLabelText("Lane");
    const options = within(laneSelect).getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["All", "backend", "frontend"]);

    await user.selectOptions(laneSelect, "frontend");
    expect(window.location.search).toContain("lane=frontend");
    expect(screen.getByText("Frontend bead")).toBeInTheDocument();
    expect(screen.queryByText("Backend bead")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "List" }));
    expect(screen.queryByLabelText("Lane")).toBeNull();
    unmount();

    window.history.replaceState(null, "", "/beads?project=alpha&view=board&lane=gone");
    render(<BeadsPage />);
    expect(await screen.findByRole("region", { name: "Ready" })).toBeInTheDocument();
    expect(screen.getByLabelText("Lane")).toHaveValue("gone");
    expect(screen.queryByRole("link", { name: /bead/i })).toBeNull();
  });
});
