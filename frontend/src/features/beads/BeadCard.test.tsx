import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { bead } from "./beadFixtures";
import { BeadCard } from "./BeadCard";

afterEach(cleanup);

const card = (item: ReturnType<typeof bead>) => {
  render(
    <ul>
      <BeadCard project="alpha" bead={item} />
    </ul>,
  );
  return screen.getByRole("listitem");
};

describe("BeadCard", () => {
  it("REQ-UI-065 shows the id, priority, title link, state, type, indicators and assignee", () => {
    const li = card(
      bead("a-1", { title: "Fix it", ready: true, priority: 1, assignee: "alice", comment_count: 2, dependency_count: 1 }),
    );
    expect(li).toHaveTextContent("a-1");
    expect(li).toHaveTextContent("P1");
    expect(screen.getByRole("link", { name: "Fix it" })).toHaveAttribute("href", "/beads/alpha/a-1");
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("task")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "2 comments" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "1 dependency" })).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
  });

  it("REQ-UI-065 a bare card has only the state and the type on its last line", () => {
    const li = card(bead("a-2"));
    expect(screen.queryByRole("img")).toBeNull();
    expect(li).not.toHaveTextContent(/0 comments|0 deps/);
  });

  it("REQ-UI-064 the left edge has the colour of the state", () => {
    expect(card(bead("a-3", { blocked: true }))).toHaveClass("border-l-4", "border-l-state-blocked");
  });
});
