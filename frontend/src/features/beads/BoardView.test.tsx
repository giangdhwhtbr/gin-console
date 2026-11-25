import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BeadSummary } from "./api";
import { bead, json, stubBeads } from "./beadFixtures";
import { BeadsPage } from "./BeadsPage";

const detailOf = (id: string, over: Partial<BeadSummary> = {}) => ({
  ...bead(id, over),
  description: null,
  design: null,
  notes: null,
  acceptance_criteria: null,
  close_reason: null,
  dependencies: [],
  dependents: [],
  children: [],
  bugs: [],
});

/** The list handler answers `/api/beads`; a bead page request answers the detail, or fails with 502 when `fail` is set. */
function stubPanel(list: BeadSummary[], fail = false) {
  const fetchMock = stubBeads(() => json(list));
  const base = fetchMock.getMockImplementation();
  if (base === undefined) throw new Error("no stub");
  fetchMock.mockImplementation((input) => {
    const text = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const found = /\/api\/beads\/alpha\/([^/?]+)$/.exec(new URL(text, "http://localhost").pathname);
    if (found === null) return base(input);
    if (fail) return Promise.resolve(json({ detail: "bd failed" }, 502));
    return Promise.resolve(json(detailOf(decodeURIComponent(found[1] ?? ""), list.find((b) => b.id === found[1]) ?? {})));
  });
}

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

  it("REQ-UI-031 blocked first and prep tasks counted apart", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=board");
    stubBeads(() =>
      json([
        bead("t-1", { blocked: true, status: "in_progress", labels: ["track:1"], title: "Blocked track one" }),
        bead("t-2", { blocked: true, ready: true, labels: ["track:2"], title: "Blocked track two" }),
        bead("p-1", { blocked: true, labels: ["prep"], title: "Blocked prep" }),
      ]),
    );
    render(<BeadsPage />);

    const blocked = await screen.findByRole("region", { name: "Blocked" });
    expect(within(blocked).getByText("2 + 1 prep")).toBeInTheDocument();
    expect(within(blocked).getAllByRole("link")).toHaveLength(3);
    expect(within(screen.getByRole("region", { name: "In Progress" })).queryAllByRole("link")).toHaveLength(0);
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

    // REQ-UI-083, REQ-UI-145: Sprint filter under More filters offers All, No sprint, and sprint names
    await user.click(screen.getByRole("button", { name: "More filters" }));
    const sprintSelect = screen.getByRole("combobox", { name: "Sprint" });
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
    await userEvent.click(screen.getByRole("button", { name: "More filters" }));
    expect(screen.queryByRole("combobox", { name: "Sprint" })).toBeNull();
  });
});

describe("BoardView lanes", () => {
  it("REQ-UI-115 REQ-UI-116 Lane chip on the card, merge gate not on the Board", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=board");
    stubBeads(() =>
      json([
        bead("a-1", { title: "Laned", ready: true, lane: "be", track: { plan: null, number: 1 } }),
        bead("a-2", { title: "Plain", ready: true }),
        bead("a-3", { title: "external: p#2", waits_for: { plan: "p", number: 2, track_id: null, lane: null } }),
      ]),
    );
    render(<BeadsPage />);
    expect(await screen.findByText("Laned")).toBeInTheDocument();
    expect(screen.getByText("be")).toBeInTheDocument();
    expect(screen.getAllByText(/^be$/).filter((el) => el.previousElementSibling?.matches(".size-2.rounded-full") === true)).toHaveLength(1);
    expect(screen.queryByText("external: p#2")).toBeNull();
  });
});

describe("REQ-UI-147 click rule on the Board", () => {
  const stub = () => stubBeads(() => json([bead("t-1", { title: "Card 1", ready: true }), bead("t-2", { title: "Card 2", ready: true })]));
  const cardOf = async (title: string) => {
    const card = (await screen.findByRole("link", { name: title })).closest<HTMLElement>("[data-card]");
    if (card === null) throw new Error(`no card for ${title}`);
    return card;
  };
  const phone = () => vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));

  it("REQ-UI-147 REQ-UI-148 Select a card and click it again: it is selected with no history entry and stays selected", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=board");
    stub();
    render(<BeadsPage />);
    const card = await cardOf("Card 1");
    const before = window.history.length;
    await userEvent.click(within(card).getByText("P2"));
    expect(window.location.search).toContain("select=t-1");
    expect(window.location.pathname).toBe("/beads");
    expect(window.history.length).toBe(before);
    expect(card).toHaveAttribute("aria-current", "true");
    expect(card).toHaveClass("bg-identity-wash", "shadow-[inset_3px_0_0_var(--identity)]");
    await userEvent.click(within(card).getByText("P2"));
    expect(window.location.search).toContain("select=t-1");
    expect(window.location.pathname).toBe("/beads");
  });

  it("REQ-UI-037 REQ-UI-147 Move, select and open: arrows focus the cards themselves, Enter selects, then opens", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=board");
    stub();
    const user = userEvent.setup();
    render(<BeadsPage />);
    const card1 = await cardOf("Card 1");
    const card2 = await cardOf("Card 2");
    // one tab stop among the cards
    expect([card1, card2].map((card) => card.tabIndex)).toEqual([0, -1]);
    document.body.focus();
    await user.keyboard("{ArrowDown}");
    expect(card1).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(card2).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(window.location.search).toContain("select=t-2");
    expect(window.location.pathname).toBe("/beads");
    await user.keyboard("{Enter}");
    expect(window.location.pathname).toBe("/beads/alpha/t-2");
  });

  it("REQ-UI-147 Escape: the selection is removed and the card keeps the focus", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=board&select=t-1");
    stub();
    const user = userEvent.setup();
    render(<BeadsPage />);
    const card = await cardOf("Card 1");
    card.focus();
    await user.keyboard("{Escape}");
    expect(window.location.search).not.toContain("select=");
    expect(card).toHaveFocus();
  });

  it("REQ-UI-147 Enter on a phone opens the bead page", async () => {
    phone();
    window.history.replaceState(null, "", "/beads?project=alpha&view=board");
    stub();
    const user = userEvent.setup();
    render(<BeadsPage />);
    (await cardOf("Card 1")).focus();
    await user.keyboard("{Enter}");
    expect(window.location.pathname).toBe("/beads/alpha/t-1");
  });

  it("REQ-UI-147 Phone: a click on a card opens the bead page", async () => {
    phone();
    window.history.replaceState(null, "", "/beads?project=alpha&view=board");
    stub();
    render(<BeadsPage />);
    await userEvent.click(within(await cardOf("Card 1")).getByText("P2"));
    expect(window.location.pathname).toBe("/beads/alpha/t-1");
  });

  it("REQ-UI-147 Title link: a click on the title opens the bead page", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=board");
    stub();
    render(<BeadsPage />);
    await userEvent.click(await screen.findByRole("link", { name: "Card 1" }));
    expect(window.location.pathname).toBe("/beads/alpha/t-1");
    expect(window.location.search).not.toContain("select=");
  });

  it("REQ-UI-147 Double click on a card opens the bead page", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=board");
    stub();
    render(<BeadsPage />);
    await userEvent.dblClick(within(await cardOf("Card 1")).getByText("P2"));
    expect(window.location.pathname).toBe("/beads/alpha/t-1");
  });

  it("REQ-UI-147 a selected closed card shown by Show all is the tab stop", async () => {
    const closed = Array.from({ length: 25 }, (_, i) => {
      const num = String(i + 1).padStart(2, "0");
      return bead(`c-${num}`, { title: `Closed ${num}`, status: "closed", closed_at: new Date(Date.UTC(2026, 9, 1, 0, i, 0)).toISOString() });
    });
    for (const [view, column, show] of [
      ["board", "Done", "Show all 25"],
      ["focus", "Recently finished", "Show all 25 completed"],
    ]) {
      window.history.replaceState(null, "", `/beads?project=alpha&view=${view}&closed=1&finished=1&select=c-01`);
      stubBeads(() => json(closed));
      render(<BeadsPage />);
      const region = await screen.findByRole("region", { name: column });
      await userEvent.click(within(region).getByRole("button", { name: show }));
      const oldest = await cardOf("Closed 01");
      expect(oldest).toHaveAttribute("tabIndex", "0");
      expect(Array.from(document.querySelectorAll("[data-card]")).filter((card) => card.getAttribute("tabIndex") === "0")).toEqual([oldest]);
      cleanup();
    }
  });
});

describe("REQ-UI-148 details panel on the Board", () => {
  it("REQ-UI-148 REQ-UI-078 Board with a panel: two thirds and one third, a sticky panel, wrapping columns", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=board&select=t-1");
    stubPanel([bead("t-1", { title: "Card 1", ready: true })]);
    render(<BeadsPage />);
    const panel = await screen.findByRole("complementary", { name: "Bead details" });
    expect(panel.closest(".grid")).toHaveClass("lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]");
    expect(panel).toHaveClass("hidden", "lg:block", "lg:sticky", "lg:overflow-y-auto", "lg:overscroll-contain");
    expect(panel).toHaveAttribute("tabindex", "0");
    expect(await within(panel).findByRole("link", { name: "Open page" })).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Close details" })).toBeInTheDocument();
    expect(within(panel).queryByRole("navigation", { name: "Breadcrumb" })).toBeNull();
    expect(screen.getByRole("region", { name: "Ready" }).parentElement).toHaveClass("flex-wrap");
  });

  it("REQ-UI-148 Bead fails to load: Retry is in the panel and the columns are still shown", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=board&select=t-1");
    stubPanel([bead("t-1", { title: "Card 1", ready: true })], true);
    render(<BeadsPage />);
    const panel = await screen.findByRole("complementary", { name: "Bead details" });
    expect(await within(panel).findByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Ready" })).toBeInTheDocument();
  });

  it("REQ-UI-149 Not in Board or Focus: no Show children", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=board&select=e-1");
    stubPanel([bead("e-1", { issue_type: "epic", ready: true }), bead("e-1.1", { parent: "e-1", ready: true })]);
    render(<BeadsPage />);
    const panel = await screen.findByRole("complementary", { name: "Bead details" });
    expect(await within(panel).findByRole("link", { name: "Open page" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show children" })).toBeNull();
  });

  it("REQ-UI-065 cards show Blocked by the first open blocker and the count of more", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=board");
    stubBeads(() =>
      json([
        bead("k-1", { title: "Schema", status: "in_progress" }),
        bead("k-2", { title: "API", status: "in_progress" }),
        bead("k-3", { title: "Waiting", blocked: true, blocked_by: ["k-2", "k-1"] }),
      ]),
    );
    render(<BeadsPage />);
    await screen.findByRole("link", { name: "Waiting" });
    expect(screen.getByText("Blocked by Schema +1")).toBeInTheDocument();
  });
});
