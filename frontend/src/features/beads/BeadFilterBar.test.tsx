import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BeadFilterBar } from "./BeadFilterBar";
import { optionsOf, parseFilters } from "./filters";

afterEach(cleanup);

describe("BeadFilterBar", () => {
  it("REQ-UI-110 the desktop filter group may shrink to the bar so a wide milestone select cannot push Assignee out", () => {
    const { container } = render(
      <BeadFilterBar
        filters={parseFilters("")}
        options={optionsOf([])}
        milestones={{ status: "loading" }}
        milestone="all"
        onChange={() => {}}
      />,
    );
    const group = container.querySelector(".md\\:flex.flex-wrap");
    expect(group?.className).toContain("min-w-0");
    expect(group?.className).toContain("max-w-full");
  });
});
