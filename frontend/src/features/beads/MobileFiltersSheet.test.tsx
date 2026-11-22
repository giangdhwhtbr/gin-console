import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { optionsOf, parseFilters } from "./filters";
import { MobileFiltersSheet } from "./MobileFiltersSheet";

afterEach(cleanup);

describe("MobileFiltersSheet", () => {
  it("REQ-UI-139 the section labels read in sentence case and no class sets them in capitals", async () => {
    render(
      <MobileFiltersSheet
        filters={parseFilters("")}
        options={optionsOf([])}
        milestones={{ status: "loading" }}
        milestone="all"
        onChange={() => {}}
        onClear={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Filters" }));
    for (const label of ["Status", "Priority"]) {
      expect(screen.getByText(label, { selector: "div" }).className).not.toContain("uppercase");
    }
  });
});
