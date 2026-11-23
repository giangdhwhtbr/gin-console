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

describe("FocusView", () => {
  it("REQ-UI-030 Focus restored from the URL", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=focus");
    stubBeads(() => json([]));
    render(<BeadsPage />);

    expect(await screen.findByRole("region", { name: "In flight" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Blocked" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Next up" })).toBeInTheDocument();
  });

  it("REQ-UI-033 columns placement and counts", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=focus");
    stubBeads(() =>
      json([
        bead("p-1", { status: "in_progress", title: "In progress bead" }),
        bead("h-1", { status: "hooked", title: "Hooked bead" }),
        bead("b-1", { blocked: true, title: "Blocked bead" }),
        bead("n-1", { ready: true, priority: 1, title: "Next up P1 bead" }),
        bead("n-3", { ready: true, priority: 3, title: "Ready P3 bead" }),
        bead("pb-1", { status: "in_progress", blocked: true, title: "In progress and blocked bead" }),
      ]),
    );
    render(<BeadsPage />);

    const inFlight = await screen.findByRole("region", { name: "In flight" });
    expect(within(inFlight).getByRole("link", { name: "In progress bead" })).toBeInTheDocument();
    expect(within(inFlight).getByRole("link", { name: "Hooked bead" })).toBeInTheDocument();
    expect(within(inFlight).getByText("2")).toBeInTheDocument();
    expect(within(inFlight).getAllByRole("link")).toHaveLength(2);

    const blocked = screen.getByRole("region", { name: "Blocked" });
    expect(within(blocked).getByRole("link", { name: "Blocked bead" })).toBeInTheDocument();
    expect(within(blocked).getByRole("link", { name: "In progress and blocked bead" })).toBeInTheDocument();
    expect(within(blocked).getByText("2")).toBeInTheDocument();
    expect(within(blocked).getAllByRole("link")).toHaveLength(2);

    const nextUp = screen.getByRole("region", { name: "Next up" });
    expect(within(nextUp).getByRole("link", { name: "Next up P1 bead" })).toBeInTheDocument();
    expect(within(nextUp).getByText("1")).toBeInTheDocument();
    expect(within(nextUp).getAllByRole("link")).toHaveLength(1);

    expect(screen.queryByRole("link", { name: "Ready P3 bead" })).not.toBeInTheDocument();
  });

  it("REQ-UI-033 the Blocked column counts prep tasks apart", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=focus");
    stubBeads(() =>
      json([
        bead("t-1", { blocked: true, labels: ["track:1"], title: "Blocked track one" }),
        bead("t-2", { blocked: true, labels: ["track:2"], title: "Blocked track two" }),
        bead("p-1", { blocked: true, labels: ["prep"], title: "Blocked prep" }),
      ]),
    );
    render(<BeadsPage />);
    const blocked = await screen.findByRole("region", { name: "Blocked" });
    expect(within(blocked).getByText("2 + 1 prep")).toBeInTheDocument();
  });

  it("REQ-UI-034 group by assignee rows", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=focus");
    stubBeads(() =>
      json([
        bead("b-bob", { assignee: "bob", status: "in_progress", title: "Bob in flight" }),
        bead("b-alice", { assignee: "alice", status: "in_progress", title: "Alice in flight" }),
        bead("b-nobody", { assignee: null, status: "in_progress", title: "Nobody in flight" }),
        bead("b-charlie", {
          assignee: "charlie",
          status: "open",
          ready: false,
          blocked: false,
          title: "Charlie no work",
        }),
      ]),
    );
    const user = userEvent.setup();
    render(<BeadsPage />);

    expect(await screen.findByRole("region", { name: "In flight" })).toBeInTheDocument();

    const groupBySelect = screen.getByLabelText("Group by");
    await user.selectOptions(groupBySelect, "Assignee");

    expect(window.location.search).toContain("group=assignee");

    const aliceSection = screen.getByRole("region", { name: "alice" });
    const bobSection = screen.getByRole("region", { name: "bob" });
    const nobodySection = screen.getByRole("region", { name: "Unassigned" });

    expect(aliceSection).toBeInTheDocument();
    expect(bobSection).toBeInTheDocument();
    expect(nobodySection).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "charlie" })).not.toBeInTheDocument();

    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    const rowHeadings = headings.filter((text) => text === "alice" || text === "bob" || text === "Unassigned");
    expect(rowHeadings).toEqual(["alice", "bob", "Unassigned"]);

    expect(within(aliceSection).getByRole("link", { name: "Alice in flight" })).toBeInTheDocument();
    expect(within(bobSection).getByRole("link", { name: "Bob in flight" })).toBeInTheDocument();
    expect(within(nobodySection).getByRole("link", { name: "Nobody in flight" })).toBeInTheDocument();

    await user.selectOptions(groupBySelect, "None");
    expect(window.location.search).not.toContain("group=");
    expect(screen.queryByRole("region", { name: "alice" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "In flight" })).toBeInTheDocument();
  });

  it("REQ-UI-035 Recently finished latest seven and expansion", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=focus&closed=1&finished=1");
    const closedBeads = Array.from({ length: 12 }, (_, i) => {
      const num = String(i + 1).padStart(2, "0");
      return bead(`c-${num}`, {
        title: `Closed ${num}`,
        status: "closed",
        closed_at: new Date(Date.UTC(2026, 9, 1, 0, i, 0)).toISOString(),
      });
    });
    stubBeads(() => json(closedBeads));
    const user = userEvent.setup();
    render(<BeadsPage />);

    const finished = await screen.findByRole("region", { name: "Recently finished" });
    const initialLinks = within(finished).getAllByRole("link");
    expect(initialLinks).toHaveLength(7);
    expect(within(finished).getByText("7 of 12")).toBeInTheDocument();
    expect(initialLinks[0]).toHaveTextContent("Closed 12");

    await user.click(within(finished).getByRole("button", { name: "Show all 12 completed" }));
    expect(within(finished).getAllByRole("link")).toHaveLength(12);
    expect(within(finished).getByText("12")).toBeInTheDocument();

    await user.click(within(finished).getByRole("button", { name: "Show latest 7" }));
    expect(within(finished).getAllByRole("link")).toHaveLength(7);

    const searchInput = screen.getByRole("searchbox", { name: "Search" });
    await user.type(searchInput, "Closed 01");
    expect(within(finished).getAllByRole("link")).toHaveLength(1);
    expect(within(finished).getByRole("link", { name: "Closed 01" })).toBeInTheDocument();
    expect(within(finished).getByText("1")).toBeInTheDocument();
  });

  it("REQ-UI-035 Recently finished needs closed beads", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=focus");
    const requested: string[] = [];
    stubBeads((url) => {
      requested.push(url.search);
      return json([]);
    });
    const user = userEvent.setup();
    render(<BeadsPage />);

    expect(await screen.findByRole("region", { name: "In flight" })).toBeInTheDocument();

    const finishedCheckbox = screen.getByLabelText("Recently finished");
    expect(finishedCheckbox).not.toBeChecked();

    await user.click(finishedCheckbox);

    expect(window.location.search).toContain("finished=1");
    expect(window.location.search).toContain("closed=1");
    expect(requested.some((u) => u.includes("closed=1"))).toBe(true);
  });

  it("REQ-UI-037 keyboard search shortcut", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=board");
    stubBeads(() => json([bead("r-1", { ready: true, title: "Ready bead" })]));
    const user = userEvent.setup();
    render(<BeadsPage />);

    await screen.findByRole("region", { name: "Ready" });

    document.body.focus();
    expect(document.body).toHaveFocus();

    await user.keyboard("/");
    const searchInput = screen.getByRole("searchbox", { name: "Search" });
    expect(searchInput).toHaveFocus();
    expect(searchInput).toHaveValue("");

    await user.keyboard("/");
    expect(searchInput).toHaveValue("/");
  });

  it("REQ-UI-037 REQ-UI-147 move, select and open on Board and Focus: the cards take the focus", async () => {
    stubBeads(() =>
      json([
        bead("c-1", { ready: true, priority: 0, title: "Card 1" }),
        bead("c-2", { ready: true, priority: 1, title: "Card 2" }),
        bead("c-3", { ready: true, priority: 2, title: "Card 3" }),
      ]),
    );
    const user = userEvent.setup();
    const cardOf = (title: string) => screen.getByRole("link", { name: title }).closest("[data-card]");

    for (const [view, column] of [
      ["board", "Ready"],
      ["focus", "Next up"],
    ]) {
      window.history.replaceState(null, "", `/beads?project=alpha&view=${view}`);
      const { unmount } = render(<BeadsPage />);
      await screen.findByRole("region", { name: column });
      const card1 = cardOf("Card 1");
      const card2 = cardOf("Card 2");

      document.body.focus();
      await user.keyboard("{ArrowDown}");
      expect(card1).toHaveFocus();
      await user.keyboard("{ArrowDown}");
      expect(card2).toHaveFocus();
      await user.keyboard("{ArrowUp}");
      expect(card1).toHaveFocus();

      await user.keyboard("{Enter}");
      expect(window.location.search).toContain("select=c-1");
      expect(window.location.pathname).toBe("/beads");
      await user.keyboard("{Enter}");
      expect(window.location.pathname).toBe("/beads/alpha/c-1");
      unmount();
    }
  });

  it("REQ-UI-147 Phone: a tap on a Focus card opens its bead page, and the card has data-id for Back (REQ-UI-127)", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    window.history.replaceState(null, "", "/beads?project=alpha&view=focus");
    stubBeads(() => json([bead("t-1", { status: "in_progress", title: "Working" })]));
    render(<BeadsPage />);
    const card = (await screen.findByRole("link", { name: "Working" })).closest("[data-card]");
    expect(card).toHaveAttribute("data-id", "t-1");
    await userEvent.click(within(await screen.findByRole("region", { name: "In flight" })).getByText("P2"));
    expect(window.location.pathname).toBe("/beads/alpha/t-1");
  });

  it("REQ-UI-037 escape clears search and leaves search box", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=board");
    stubBeads(() => json([]));
    const user = userEvent.setup();
    render(<BeadsPage />);

    await screen.findByRole("region", { name: "Ready" });
    const searchInput = screen.getByRole("searchbox", { name: "Search" });

    await user.type(searchInput, "fix");
    expect(searchInput).toHaveValue("fix");
    expect(window.location.search).toContain("q=fix");

    await user.keyboard("{Escape}");
    expect(searchInput).toHaveValue("");
    expect(window.location.search).not.toContain("q=");
    expect(searchInput).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(searchInput).not.toHaveFocus();
  });

  it("REQ-UI-037 keyboard shortcuts ignored with modifier keys", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=board");
    stubBeads(() => json([bead("b-1", { title: "Card 1", ready: true })]));
    const user = userEvent.setup();
    render(<BeadsPage />);

    await screen.findByRole("region", { name: "Ready" });
    document.body.focus();

    await user.keyboard("{Control>}/{/Control}");
    const searchInput = screen.getByRole("searchbox", { name: "Search" });
    expect(searchInput).not.toHaveFocus();
  });
  it("REQ-UI-037 arrow keys keep their default action when there is no card to move to", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=board");
    stubBeads(() => json([]));
    render(<BeadsPage />);
    await screen.findByRole("region", { name: "Ready" });

    for (const key of ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"]) {
      const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
      document.body.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    }
  });

});

describe("REQ-UI-148 details panel on the Focus view", () => {
  it("REQ-UI-148 Close on the Focus view: focus is back on the card", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=focus&select=t-1");
    stubPanel([bead("t-1", { title: "Card 1", status: "in_progress" })]);
    render(<BeadsPage />);
    const panel = await screen.findByRole("complementary", { name: "Bead details" });
    expect(panel.closest(".grid")).toHaveClass("lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]");
    await userEvent.click(within(panel).getByRole("button", { name: "Close details" }));
    expect(window.location.search).not.toContain("select=");
    expect(screen.queryByRole("complementary", { name: "Bead details" })).toBeNull();
    expect((await screen.findByRole("link", { name: "Card 1" })).closest("[data-card]")).toHaveFocus();
  });

  it("REQ-UI-148 Selection kept across views: Focus keeps select and notes it is not listed", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=list&select=x-1");
    stubPanel([bead("x-1", { ready: true, priority: 3 })]);
    render(<BeadsPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Focus" }));
    expect(window.location.search).toContain("select=x-1");
    const panel = await screen.findByRole("complementary", { name: "Bead details" });
    expect(within(panel).getByText("Not in the current list")).toBeInTheDocument();
  });

  it("REQ-UI-148 Bead fails to load: Retry is in the panel and the columns are still shown", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=focus&select=t-1");
    stubPanel([bead("t-1", { title: "Card 1", status: "in_progress" })], true);
    render(<BeadsPage />);
    const panel = await screen.findByRole("complementary", { name: "Bead details" });
    expect(await within(panel).findByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "In flight" })).toBeInTheDocument();
  });

  it("REQ-UI-149 Not in Focus: no Show children", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=focus&select=e-1");
    stubPanel([bead("e-1", { issue_type: "epic", status: "in_progress" }), bead("e-1.1", { parent: "e-1", status: "in_progress" })]);
    render(<BeadsPage />);
    const panel = await screen.findByRole("complementary", { name: "Bead details" });
    expect(await within(panel).findByRole("link", { name: "Open page" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show children" })).toBeNull();
  });
});
