import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StaleNote } from "./StaleNote";

afterEach(cleanup);

describe("StaleNote", () => {
  it("REQ-UI-103 names the project and the export command", () => {
    const { container } = render(<StaleNote projects={["alpha"]} />);
    const notes = screen.getAllByRole("alert");
    expect(notes).toHaveLength(1);
    expect(notes[0]).toHaveTextContent(
      "Beads of alpha may be out of date. Run bd export -o .beads/issues.jsonl in alpha.",
    );
    expect(container.querySelector("code")).toHaveTextContent("bd export -o .beads/issues.jsonl");
  });

  it("REQ-UI-103 one note per project", () => {
    render(<StaleNote projects={["a", "b"]} />);
    expect(screen.getAllByRole("alert")).toHaveLength(2);
  });

  it("REQ-UI-103 renders nothing without projects", () => {
    const { container } = render(<StaleNote projects={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
