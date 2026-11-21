import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { clearSections, publishSections, useSections, type SectionLink } from "./sectionStore";

const link = (tab: SectionLink["tab"]): SectionLink => ({ tab, label: tab, headline: "h", warn: false, href: `/reports?tab=${tab}` });
afterEach(() => act(() => clearSections()));

describe("sectionStore", () => {
  it("REQ-UI-129 starts empty, publishes, and clears", () => {
    const { result } = renderHook(() => useSections());
    expect(result.current).toEqual({ sections: [], selected: null });
    act(() => publishSections([link("team"), link("delivery")], "delivery"));
    expect(result.current.sections.map((s) => s.tab)).toEqual(["team", "delivery"]);
    expect(result.current.selected).toBe("delivery");
    act(() => clearSections());
    expect(result.current).toEqual({ sections: [], selected: null });
  });

  it("REQ-UI-129 keeps the same snapshot when the same sections are published again", () => {
    const { result } = renderHook(() => useSections());
    act(() => publishSections([link("team")], "team"));
    const first = result.current;
    act(() => publishSections([link("team")], "team"));
    expect(result.current).toBe(first);
  });
});
