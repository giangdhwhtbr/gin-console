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
    expect(within(inFlight).getByRole("link", { name: "In progress and blocked bead" })).toBeInTheDocument();
    expect(within(inFlight).getByText("3")).toBeInTheDocument();
    expect(within(inFlight).getAllByRole("link")).toHaveLength(3);

    const blocked = screen.getByRole("region", { name: "Blocked" });
    expect(within(blocked).getByRole("link", { name: "Blocked bead" })).toBeInTheDocument();
    expect(within(blocked).getByText("1")).toBeInTheDocument();
    expect(within(blocked).getAllByRole("link")).toHaveLength(1);

    const nextUp = screen.getByRole("region", { name: "Next up" });
    expect(within(nextUp).getByRole("link", { name: "Next up P1 bead" })).toBeInTheDocument();
    expect(within(nextUp).getByText("1")).toBeInTheDocument();
    expect(within(nextUp).getAllByRole("link")).toHaveLength(1);

    expect(screen.queryByRole("link", { name: "Ready P3 bead" })).not.toBeInTheDocument();
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
    const nobodySection = screen.getByRole("region", { name: "No assignee" });

    expect(aliceSection).toBeInTheDocument();
    expect(bobSection).toBeInTheDocument();
    expect(nobodySection).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "charlie" })).not.toBeInTheDocument();

    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    const rowHeadings = headings.filter((text) => text === "alice" || text === "bob" || text === "No assignee");
    expect(rowHeadings).toEqual(["alice", "bob", "No assignee"]);

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

  it("REQ-UI-037 move and open on Board and Focus", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=board");
    stubBeads(() =>
      json([
        bead("c-1", { ready: true, priority: 0, title: "Card 1" }),
        bead("c-2", { ready: true, priority: 1, title: "Card 2" }),
        bead("c-3", { ready: true, priority: 2, title: "Card 3" }),
      ]),
    );
    const user = userEvent.setup();
    const { unmount } = render(<BeadsPage />);

    await screen.findByRole("region", { name: "Ready" });

    const link1 = screen.getByRole("link", { name: "Card 1" });
    const link2 = screen.getByRole("link", { name: "Card 2" });

    document.body.focus();
    await user.keyboard("{ArrowDown}");
    expect(link1).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(link2).toHaveFocus();

    await user.keyboard("{ArrowUp}");
    expect(link1).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(window.location.pathname).toBe("/beads/alpha/c-1");

    unmount();

    window.history.replaceState(null, "", "/beads?project=alpha&view=focus");
    render(<BeadsPage />);

    await screen.findByRole("region", { name: "Next up" });
    const focusLink1 = screen.getByRole("link", { name: "Card 1" });
    const focusLink2 = screen.getByRole("link", { name: "Card 2" });

    document.body.focus();
    await user.keyboard("{ArrowDown}");
    expect(focusLink1).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(focusLink2).toHaveFocus();

    await user.keyboard("{ArrowUp}");
    expect(focusLink1).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(window.location.pathname).toBe("/beads/alpha/c-1");
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
