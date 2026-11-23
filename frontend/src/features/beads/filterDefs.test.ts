import { describe, expect, it } from "vitest";
import { bead } from "./beadFixtures";
import { activeFilters, clearFilters, FILTER_DEFS, moreCount, type FilterContext } from "./filterDefs";
import { filtersToSearch, optionsOf, parseFilters } from "./filters";

const current: FilterContext = { fixedMilestone: false, milestone: "m2", byDefault: "m2" };
const fixed: FilterContext = { fixedMilestone: true, milestone: "m2", byDefault: "all" };
const f = (search: string) => parseFilters(search);
const plain = optionsOf([bead("a")]);
const rich = optionsOf([bead("a", { capabilities: ["ui"], labels: ["sprint:1"] })]);

describe("filterDefs", () => {
  it("REQ-UI-142 REQ-UI-145 Milestone, Status and Assignee in the bar, the rest in More filters in their order", () => {
    expect(FILTER_DEFS.map((d) => `${d.place}:${d.label}`)).toEqual([
      "bar:Milestone", "bar:Status", "bar:Assignee",
      "more:Priority", "more:Labels", "more:Type", "more:Kind", "more:Capability", "more:Sprint",
    ]);
  });

  it("REQ-UI-143 Nothing to clear: the current milestone and no other filter", () => {
    expect(activeFilters(f("?project=example"), current)).toBe(0);
  });

  it("REQ-UI-143 A search is a filter, spaces alone are not", () => {
    expect(activeFilters(f("?q=pay"), current)).toBe(1);
    expect(activeFilters(f("?q=%20%20"), current)).toBe(0);
  });

  it("REQ-UI-143 each filter counts once while it has a value", () => {
    expect(activeFilters(f("?status=open,closed&assignee=alice&priority=1&label=ui&type=bug&kind=technical&capability=ui&sprint=s1"), current)).toBe(8);
  });

  it("REQ-UI-143 the Labels mode alone is not a filter and Show closed never is", () => {
    expect(activeFilters(f("?label_mode=all&closed=1"), current)).toBe(0);
  });

  it("REQ-UI-143 Current milestone named in the URL; Milestone is active only when it differs from the default", () => {
    expect(activeFilters(f("?milestone=m2"), current)).toBe(0);
    expect(activeFilters(f("?milestone=all"), { ...current, milestone: "all" })).toBe(1);
    expect(activeFilters(f("?milestone=all"), { fixedMilestone: false, milestone: "all", byDefault: "all" })).toBe(0);
  });

  it("REQ-UI-143 Fixed milestone: Milestone is never active", () => {
    expect(activeFilters(f("?status=open"), fixed)).toBe(1);
  });

  it("REQ-UI-143 Unknown values: an unknown kind and label_mode are ignored", () => {
    const filters = f("?project=example&kind=epicish&label_mode=some");
    expect(activeFilters(filters, current)).toBe(0);
    expect(moreCount(filters, current, plain)).toBe(0);
  });

  it("REQ-UI-143 Back to the current milestone: clearFilters removes the search and the filters and keeps the rest", () => {
    const filters = f("?project=example&milestone=all&q=pay&status=open&priority=1&label=ui&label_mode=all&closed=1&view=board&select=ex-e3");
    expect(filtersToSearch(clearFilters(filters))).toBe("?project=example&closed=1&view=board&select=ex-e3");
    const kept = f("?project=p&type=bug&kind=parity&capability=ui&assignee=me&sprint=none&closed=1&view=focus&group=assignee&finished=1&select=t-1&scope=e1");
    expect(filtersToSearch(clearFilters(kept))).toBe("?project=p&closed=1&view=focus&group=assignee&finished=1&select=t-1&scope=e1");
  });

  it("REQ-UI-145 Count of active filters inside More filters, and none for the Labels mode alone", () => {
    expect(moreCount(f("?priority=1&label=ui&label_mode=all&kind=technical&status=open"), current, plain)).toBe(3);
    expect(moreCount(f("?label_mode=all"), current, plain)).toBe(0);
  });

  it("REQ-UI-145 Capability and Sprint count only while More filters offers them", () => {
    expect(moreCount(f("?capability=ui&sprint=1"), current, rich)).toBe(2);
    expect(moreCount(f("?capability=ui&sprint=1"), current, plain)).toBe(0);
  });

  it("REQ-UI-084 the Filters count leaves out the current milestone and counts another choice", () => {
    expect(activeFilters(f("?status=open"), current)).toBe(1);
    expect(activeFilters(f("?milestone=all&priority=1"), { ...current, milestone: "all" })).toBe(2);
  });
});
