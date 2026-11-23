import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bead } from "./beadFixtures";
import type { FilterContext } from "./filterDefs";
import { optionsOf, parseFilters } from "./filters";
import { MoreFilters } from "./MoreFilters";

afterEach(cleanup);

const ctx: FilterContext = { fixedMilestone: false, milestone: "all", byDefault: "all" };
const rich = optionsOf([bead("a", { capabilities: ["ui"], labels: ["sprint:1", "ui"], priority: 1 })]);
const plain = optionsOf([bead("a", { labels: ["ui"], priority: 1 })]);
const sections = () => Array.from(document.querySelectorAll("[data-filter]")).map((s) => s.getAttribute("data-filter"));

function more(search: string, options = rich, onChange = vi.fn()) {
  render(<MoreFilters filters={parseFilters(search)} options={options} context={ctx} onChange={onChange} />);
  return onChange;
}

describe("MoreFilters", () => {
  it("REQ-UI-145 Contents", async () => {
    more("");
    await userEvent.click(screen.getByRole("button", { name: "More filters" }));
    expect(sections()).toEqual(["priority", "label", "type", "kind", "capability", "sprint"]);
  });

  it("REQ-UI-145 No capability and no sprint", async () => {
    more("", plain);
    await userEvent.click(screen.getByRole("button", { name: "More filters" }));
    expect(sections()).toEqual(["priority", "label", "type", "kind"]);
  });

  it("REQ-UI-145 REQ-UI-140 Count of active filters inside", () => {
    more("?priority=1&label=ui&label_mode=all&kind=technical&status=open");
    const button = screen.getByRole("button", { name: "More filters 3" });
    expect(screen.getByText("3")).toHaveClass("bg-identity-wash", "text-identity");
    expect(button).toBeInTheDocument();
  });

  it("REQ-UI-145 No count", () => {
    more("?label_mode=all");
    expect(screen.getByRole("button", { name: "More filters" })).toBeInTheDocument();
    expect(screen.queryByText("0")).toBeNull();
  });

  it("REQ-UI-145 choosing P1 writes priority", async () => {
    const onChange = more("");
    await userEvent.click(screen.getByRole("button", { name: "More filters" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "P1" }));
    expect(onChange).toHaveBeenCalledWith({ priority: ["1"] });
  });

  it("REQ-UI-108 Kind is a select in More filters", async () => {
    const onChange = more("");
    await userEvent.click(screen.getByRole("button", { name: "More filters" }));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Kind" }), "technical");
    expect(onChange).toHaveBeenCalledWith({ kind: "technical" });
  });
});
