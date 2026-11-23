import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BeadFilterBar } from "./BeadFilterBar";
import { bead, milestoneOption, projectMilestones } from "./beadFixtures";
import type { FilterContext } from "./filterDefs";
import { optionsOf, parseFilters } from "./filters";
import type { MilestonesState } from "./milestoneChoice";

afterEach(cleanup);

const current: FilterContext = { fixedMilestone: false, milestone: "ex-m2", byDefault: "ex-m2" };
const loaded: MilestonesState = {
  status: "ok",
  data: projectMilestones(
    [
      milestoneOption("ex-m2", "active", { title: "Checkout v2" }),
      milestoneOption("ex-m3", "planned", { title: "Payments", start: "2026-12-01" }),
      milestoneOption("ex-m1", "closed", { title: "Launch", end: "2026-10-01" }),
    ],
    "ex-m2",
  ),
};

function bar(search: string, context: FilterContext = current, count: string | null = "2 of 5", state: MilestonesState = loaded) {
  const onChange = vi.fn();
  const view = render(
    <BeadFilterBar
      filters={parseFilters(search)}
      options={optionsOf([bead("a", { status: "open" }), bead("b", { status: "in_progress", assignee: "alice" })])}
      milestones={state}
      context={context}
      count={count}
      onChange={onChange}
    />,
  );
  return { onChange, container: view.container };
}

const follows = (a: HTMLElement, b: HTMLElement) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe("BeadFilterBar", () => {
  it("REQ-UI-142 Order on a wide window", () => {
    bar("");
    const items = [
      screen.getByRole("searchbox", { name: "Search" }),
      screen.getByRole("button", { name: "Milestone Checkout v2" }),
      screen.getByRole("button", { name: "Status" }),
      screen.getByRole("button", { name: "Assignee" }),
      screen.getByRole("button", { name: "More filters" }),
      screen.getByText("2 of 5"),
      screen.getByRole("switch", { name: "Show closed" }),
    ];
    for (let i = 0; i < items.length - 1; i++) expect(follows(items[i], items[i + 1])).toBe(true);
    expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull();
  });

  it("REQ-UI-142 REQ-MILESTONE-UI-018 Fixed milestone", () => {
    bar("?status=open", { ...current, fixedMilestone: true });
    expect(screen.queryByRole("button", { name: /^Milestone/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Status open" })).toBeInTheDocument();
  });

  it("REQ-UI-142 Tab of an epic page", () => {
    bar("", { ...current, fixedMilestone: true }, null);
    expect(screen.queryByText(/ of /)).toBeNull();
    expect(screen.queryByRole("button", { name: /^Milestone/ })).toBeNull();
    expect(screen.getByRole("switch", { name: "Show closed" })).toBeInTheDocument();
  });

  it("REQ-UI-146 Hint", () => {
    const { container } = bar("");
    const kbd = container.querySelector("kbd");
    expect(kbd).toHaveTextContent("/");
    expect(kbd).toHaveClass("hidden", "md:block");
    const search = screen.getByRole("searchbox", { name: "Search" });
    expect(search).toHaveClass("md:pr-8");
    expect(search).toHaveAttribute("aria-keyshortcuts", "/");
  });

  it("REQ-UI-143 Clear filters", async () => {
    const { onChange } = bar("?project=example&milestone=all&q=pay&status=open&closed=1&view=board&select=ex-e3", {
      ...current,
      milestone: "all",
    });
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onChange).toHaveBeenCalledWith(parseFilters("?project=example&closed=1&view=board&select=ex-e3"));
  });

  it("REQ-UI-142 Clear filters sits with the count and Show closed; the search keeps 8rem", () => {
    bar("?project=example&status=open");
    const clear = screen.getByRole("button", { name: "Clear filters" });
    const show = screen.getByRole("switch", { name: "Show closed" });
    expect(clear.parentElement).toBe(show.closest("label")?.parentElement);
    expect(screen.getByRole("searchbox", { name: "Search" }).parentElement).toHaveClass("md:min-w-32");
  });

  it("REQ-UI-144 Remove one filter", async () => {
    const { onChange } = bar("?status=open&assignee=alice");
    await userEvent.click(screen.getByRole("button", { name: "Remove Status filter" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ status: [], assignee: ["alice"] }));
  });

  it("REQ-UI-144 Current milestone as a chip", async () => {
    const { onChange } = bar("");
    await userEvent.click(screen.getByRole("button", { name: "Remove Milestone filter" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ milestone: "all" }));
  });

  it("REQ-UI-144 REQ-UI-104 Milestone menu", async () => {
    const { onChange } = bar("");
    await userEvent.click(screen.getByRole("button", { name: "Milestone Checkout v2" }));
    const radios = screen.getAllByRole("radio");
    expect(radios.map((r) => r.closest("label")?.textContent)).toEqual(["All", "No milestone", "Checkout v2", "Payments", "Launch"]);
    expect(screen.getAllByRole("group").map((g) => g.getAttribute("aria-label"))).toEqual(["Active", "Planned", "Closed"]);
    expect(within(screen.getByRole("radiogroup")).getByRole("radio", { name: "Checkout v2" })).toBeChecked();
    await userEvent.click(screen.getByRole("radio", { name: "Payments" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ milestone: "ex-m3" }));
  });

  it("REQ-UI-104 Milestones loading", () => {
    bar("", { ...current, milestone: "all" }, "2 of 5", { status: "loading" });
    expect(screen.getByRole("button", { name: "Milestone…" })).toBeInTheDocument();
  });

  it("REQ-UI-104 Milestones unavailable", async () => {
    bar("", { ...current, milestone: "all" }, "2 of 5", { status: "error" });
    await userEvent.click(screen.getByRole("button", { name: "Milestone" }));
    expect(screen.getByText("Milestones unavailable")).toBeInTheDocument();
  });

  it("REQ-UI-140 Controls keep their pills", () => {
    bar("?status=open&priority=1");
    expect(screen.getByRole("button", { name: "Status open" }).parentElement).toHaveClass("bg-identity-wash");
    const more = screen.getByRole("button", { name: "More filters 1" });
    expect(within(more).getByText("1")).toHaveClass("bg-identity-wash", "text-identity");
  });
});
