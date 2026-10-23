import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { bead } from "./beadFixtures";
import { BeadTable } from "./BeadTable";

afterEach(cleanup);

describe("BeadTable", () => {
  it("REQ-UI-064 REQ-UI-066 REQ-UI-067 a row shows the state name, the type pill and the indicators", () => {
    render(
      <BeadTable
        project="alpha"
        beads={[bead("a-1", { blocked: true, issue_type: "bug", comment_count: 3 }), bead("a-2")]}
      />,
    );
    const rows = screen.getAllByRole("row");
    const first = within(rows[1]);
    expect(first.getByText("Blocked")).toBeInTheDocument();
    expect(first.getByText("bug")).toHaveAttribute("data-type", "bug");
    expect(first.getByRole("img", { name: "3 comments" })).toBeInTheDocument();
    expect(within(rows[2]).queryByRole("img")).toBeNull();
  });
});
