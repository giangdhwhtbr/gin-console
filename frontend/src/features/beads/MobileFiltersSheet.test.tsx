import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bead } from "./beadFixtures";
import type { FilterContext } from "./filterDefs";
import { optionsOf, parseFilters } from "./filters";
import { MobileFiltersSheet } from "./MobileFiltersSheet";

afterEach(cleanup);

const none: FilterContext = { fixedMilestone: false, milestone: "all", byDefault: "all" };
const current: FilterContext = { fixedMilestone: false, milestone: "m2", byDefault: "m2" };
const rich = optionsOf([bead("a", { capabilities: ["ui"], labels: ["sprint:1"] })]);
const keys = () => Array.from(document.querySelectorAll("[data-filter]")).map((s) => s.getAttribute("data-filter"));

function sheet(search: string, context: FilterContext, options = rich, handlers: { onChange?: () => void; onClear?: () => void } = {}) {
  render(
    <MobileFiltersSheet
      filters={parseFilters(search)}
      options={options}
      milestones={{ status: "loading" }}
      context={context}
      onChange={handlers.onChange ?? (() => {})}
      onClear={handlers.onClear ?? (() => {})}
    />,
  );
}

describe("MobileFiltersSheet", () => {
  it("REQ-UI-139 the section labels read in sentence case and no class sets them in capitals", async () => {
    sheet("", none, optionsOf([]));
    await userEvent.click(screen.getByRole("button", { name: "Filters" }));
    for (const label of ["Status", "Priority"]) {
      expect(screen.getByText(label, { selector: "div" }).className).not.toContain("uppercase");
    }
  });

  it("REQ-UI-084 Phone bar", () => {
    sheet("?status=open", current);
    expect(screen.getByRole("button", { name: "Filters 1" })).toBeInTheDocument();
  });

  it("REQ-UI-084 Milestone counted only when changed", () => {
    sheet("?milestone=all&priority=1", { ...current, milestone: "all" });
    expect(screen.getByRole("button", { name: "Filters 2" })).toBeInTheDocument();
  });

  it("REQ-UI-084 Sheet", async () => {
    const onClear = vi.fn();
    sheet("?status=open", current, rich, { onClear });
    await userEvent.click(screen.getByRole("button", { name: "Filters 1" }));
    expect(keys()).toEqual(["milestone", "status", "assignee", "priority", "label", "type", "kind", "capability", "sprint"]);
    expect(screen.queryByRole("checkbox", { name: "Show closed" })).toBeNull();
    expect(screen.queryByRole("switch", { name: "Show closed" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onClear).toHaveBeenCalled();
  });

  it("REQ-UI-084 exposes aria-pressed and invokes onChange when options are toggled in sheet", async () => {
    const onChange = vi.fn();
    sheet("?status=open,in_progress&priority=1", none, optionsOf([bead("a", { status: "open" }), bead("b", { status: "closed" })]), { onChange });
    await userEvent.click(screen.getByRole("button", { name: /Filters/i }));
    expect(screen.getByRole("button", { name: "open" })).toHaveAttribute("aria-pressed", "true");
    const closed = screen.getByRole("button", { name: "closed" });
    expect(closed).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(closed);
    expect(onChange).toHaveBeenCalledWith({ status: ["open", "in_progress", "closed"] });
  });

  it("REQ-UI-084 REQ-MILESTONE-UI-018 fixed milestone", async () => {
    sheet("", { ...current, fixedMilestone: true });
    await userEvent.click(screen.getByRole("button", { name: "Filters" }));
    expect(document.querySelector('[data-filter="milestone"]')).toBeNull();
    expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull();
  });
});
