import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BeadSummary } from "./api";
import { json, stubBeads } from "./beadFixtures";
import { parseFilters, type BeadFilters } from "./filters";
import { e12, E12, epic, t1, t2, t3, t4, t7, tracks } from "./laneFixtures";
import { LanesView } from "./LanesView";

function view(over: { beads?: BeadSummary[]; matched?: BeadSummary[]; filters?: Partial<BeadFilters> } = {}) {
  const onChange = vi.fn();
  const filters = { ...parseFilters(`?view=lanes&scope=${E12}`), ...over.filters };
  stubBeads(() => json([]));
  render(<LanesView project="p" beads={over.beads ?? e12} matched={over.matched ?? tracks} milestone="all" filters={filters} onChange={onChange} />);
  return onChange;
}
const card = (id: string) => screen.getByRole("button", { name: new RegExp(`^${id}`) });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("LanesView", () => {
  it("REQ-UI-111 a scope without lanes says so, with a link to the Graph view", () => {
    view({ beads: [epic, { ...t1, lane: null }], matched: [t1], filters: { q: "x" } });
    expect(screen.getByText("Lanes show for an epic whose tracks have lanes")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Graph/ });
    expect(link.getAttribute("href")).toContain("view=graph");
    expect(link.getAttribute("href")).toContain("q=x");
  });

  it("REQ-UI-111 no scope (project) gets the same message", () => {
    view({ filters: { scope: "" } });
    expect(screen.getByText("Lanes show for an epic whose tracks have lanes")).toBeInTheDocument();
  });

  it("REQ-UI-111 one header and card per lane, closed cards drawn, gates not drawn", () => {
    view();
    const lanes = screen.getAllByRole("region").map((r) => within(r).getByRole("heading").textContent);
    expect(lanes).toEqual(["be", "fe", "qa", "No lane"]);
    for (const t of tracks) expect(card(t.id)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /ex-e12\.9/ })).toBeNull();
    // the cards do not repeat the lane the row names
    expect(card(t1.id).textContent).not.toContain("be");
  });

  it("REQ-UI-112 headers show State, Held by, Lease and Tracks; the No lane header only its name and Tracks", () => {
    view();
    const be = screen.getByRole("region", { name: "Lane be" });
    expect(within(be).getByText("Running")).toBeInTheDocument();
    expect(within(be).getByText("ann")).toBeInTheDocument();
    expect(within(be).getByText(/^until /)).toBeInTheDocument();
    expect(within(be).getByText("1/2 closed")).toBeInTheDocument();
    const qa = screen.getByRole("region", { name: "Lane qa" });
    expect(within(qa).getByText("Waiting for be")).toBeInTheDocument();
    expect(within(qa).getByText("Unclaimed")).toBeInTheDocument();
    const fe = screen.getByRole("region", { name: "Lane fe" });
    expect(within(fe).getByText("All tracks closed")).toBeInTheDocument();
    expect(within(fe).queryByText("Held by")).toBeNull();
    expect(within(fe).queryByText("Lease")).toBeNull();
    const none = screen.getByRole("region", { name: "Lane No lane" });
    expect(within(none).queryByText("State")).toBeNull();
    expect(within(none).getByText("0/1 closed")).toBeInTheDocument();
  });

  it("REQ-UI-113 Waiting and merged markers are drawn", () => {
    view();
    expect(screen.getByText("Waiting")).toBeInTheDocument();
    expect(screen.getByText("Merged")).toBeInTheDocument();
  });

  it("REQ-UI-111 only the cards that match are drawn; a lane with none is left out", () => {
    view({ matched: [t4, t7] });
    expect(screen.queryByRole("region", { name: "Lane be" })).toBeNull();
    expect(card(t4.id)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: new RegExp(`^${t1.id}`) })).toBeNull();
  });

  it("REQ-UI-111 No beads match these filters when no card is drawn", () => {
    view({ matched: [] });
    expect(screen.getByText("No beads match these filters")).toBeInTheDocument();
  });

  it("REQ-UI-111 the scope item of the trail is the epic; the project item returns to the project", async () => {
    const onChange = view();
    const trail = screen.getByRole("navigation", { name: "Lanes scope" });
    expect(within(trail).getAllByRole("button").map((b) => b.textContent)).toEqual(["p", E12]);
    await userEvent.click(within(trail).getByRole("button", { name: "p" }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ scope: "", select: "" }));
  });

  it("REQ-UI-111 selecting a card sets select; the panel shows the scope by default and the card when selected", async () => {
    const onChange = view();
    expect(screen.getByRole("complementary", { name: "Bead details" })).toBeInTheDocument();
    await userEvent.click(card(t2.id));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ select: t2.id }));
    cleanup();
    view({ filters: { select: t2.id } });
    expect(card(t2.id)).toHaveAttribute("aria-pressed", "true");
  });

  it("REQ-UI-111 opening a card goes to its page", async () => {
    view();
    await userEvent.dblClick(card(t3.id));
    expect(window.location.pathname).toBe(`/beads/p/${t3.id}`);
  });

  it("REQ-UI-111 closing the panel sets select=none", async () => {
    const onChange = view({ filters: { select: t1.id } });
    await userEvent.click(screen.getByRole("button", { name: "Close details" }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ select: "none" }));
  });

  it("REQ-UI-111 select=none shows no panel", () => {
    view({ filters: { select: "none" } });
    expect(screen.queryByRole("complementary", { name: "Bead details" })).toBeNull();
  });

  it("REQ-UI-114 Moving between rows: Arrow Down from track 2 moves focus and selection to track 3", async () => {
    const onChange = view({ filters: { select: t2.id } });
    card(t2.id).focus();
    await userEvent.keyboard("{ArrowDown}");
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ select: t3.id }));
    expect(card(t3.id)).toHaveFocus();
  });

  it("REQ-UI-114 Arrow keys in a row, nothing at an edge, Escape and Enter as in the Graph", async () => {
    const onChange = view({ filters: { select: t1.id } });
    card(t1.id).focus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ select: t2.id }));
    await userEvent.keyboard("{Escape}");
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ select: E12 }));
    await userEvent.keyboard("{Enter}"); // a button: Enter clicks it
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ select: t2.id }));
  });

  it("REQ-UI-114 Escape from the scope's own selection closes the panel", async () => {
    const onChange = view();
    card(t1.id).focus();
    await userEvent.keyboard("{Escape}");
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ select: "none" }));
  });

  it("REQ-UI-114 the list for screen readers names lanes and merge gates", () => {
    view();
    const list = screen.getByRole("list", { name: "Lanes" });
    const text = within(list).getAllByRole("listitem").map((li) => li.textContent);
    expect(text).toContain("be: Running, held by ann, lease until 1 Jan 2099 16:00, 1/2 closed");
    expect(text).toContain("qa #4 waits for be #2: merge pending");
    expect(text).toContain("qa #4 waits for fe #3: merged");
    expect(list.className).toContain("sr-only");
  });

  it("REQ-UI-111 only one card is a tab stop", () => {
    view();
    expect(screen.getAllByRole("button").filter((b) => b.tabIndex === 0 && b.hasAttribute("data-node"))).toHaveLength(1);
  });
});
