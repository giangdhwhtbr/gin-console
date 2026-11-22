import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DEFINITIONS } from "@/lib/definitions";
import { BoardColumn } from "./BoardColumn";

afterEach(cleanup);

const describedBy = (el: HTMLElement) => document.getElementById(el.getAttribute("aria-describedby") ?? "");

describe("BoardColumn", () => {
  it("REQ-UI-132 the count of a blocked, done or in-progress column carries its rule", () => {
    render(
      <>
        <BoardColumn title="Blocked" project="alpha" beads={[]} />
        <BoardColumn title="Done" project="alpha" beads={[]} />
        <BoardColumn title="In Progress" project="alpha" beads={[]} />
      </>,
    );
    const [blocked, done, progress] = screen.getAllByText("0");
    expect(describedBy(blocked)).toHaveTextContent(DEFINITIONS.blocked);
    expect(describedBy(done)).toHaveTextContent(DEFINITIONS.done);
    expect(describedBy(progress)).toHaveTextContent(DEFINITIONS.inProgress);
  });

  it("REQ-UI-132 the count of another column has no hint", () => {
    render(<BoardColumn title="Backlog" project="alpha" beads={[]} />);
    expect(screen.getByText("0")).not.toHaveAttribute("aria-describedby");
  });
});
