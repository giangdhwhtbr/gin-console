import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { UnassignedNote } from "./UnassignedNote";

afterEach(cleanup);

describe("UnassignedNote", () => {
  it("REQ-REPORTS-036 Unassigned note: shown at or above 0.2", () => {
    render(<UnassignedNote unassigned={{ closed: 8, total: 30 }} />);
    expect(screen.getByText("8 of 30 closed beads have no assignee, so member numbers undercount.")).toBeInTheDocument();
  });

  it("REQ-REPORTS-036 Unassigned note: exact 0.2 threshold is shown", () => {
    render(<UnassignedNote unassigned={{ closed: 6, total: 30 }} />);
    expect(screen.getByText("6 of 30 closed beads have no assignee, so member numbers undercount.")).toBeInTheDocument();
  });

  it("REQ-REPORTS-036 No note below a fifth", () => {
    const { container } = render(<UnassignedNote unassigned={{ closed: 2, total: 30 }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("REQ-REPORTS-036 No note when no beads are closed", () => {
    const { container } = render(<UnassignedNote unassigned={{ closed: 0, total: 0 }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
