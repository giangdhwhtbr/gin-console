import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { bead, cardChoice } from "./beadFixtures";
import { BeadCard, type CardChoice } from "./BeadCard";

afterEach(cleanup);

const card = (item: ReturnType<typeof bead>, choice: CardChoice = cardChoice()) => {
  render(
    <ul>
      <BeadCard project="alpha" bead={item} choice={choice} />
    </ul>,
  );
  return screen.getByRole("listitem");
};

describe("BeadCard", () => {
  it("REQ-UI-065 REQ-UI-107 a long id is shortened with the full id as title and long text wraps anywhere", () => {
    const id = "ex-payments-provider-migration-and-reconciliation-2026";
    card(bead(id, { title: "T".repeat(80), assignee: "x".repeat(60) }));
    expect(screen.getByText("ex-payments-pr…tion-2026")).toHaveAttribute("title", id);
    expect(screen.getByText(id, { selector: ".sr-only" })).toBeInTheDocument();
    expect(screen.getByRole("listitem")).toHaveTextContent(id);
    expect(screen.getByRole("link", { name: "T".repeat(80) })).toHaveClass("wrap-anywhere");
    expect(screen.getByText("x".repeat(60))).toHaveClass("wrap-anywhere");
  });

  it("REQ-UI-065 shows the id, priority, title link, state, type, indicators and assignee", () => {
    const li = card(
      bead("a-1", { title: "Fix it", ready: true, priority: 1, assignee: "alice", comment_count: 2, dependency_count: 1 }),
    );
    expect(li).toHaveTextContent("a-1");
    expect(li).toHaveTextContent("P1");
    expect(screen.getByRole("link", { name: "Fix it" })).toHaveAttribute("href", "/beads/alpha/a-1");
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.queryByText("task")).toBeNull(); // REQ-UI-067 only a bug shows its type
    expect(screen.getByRole("img", { name: "2 comments" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "1 dependency" })).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
  });

  it("REQ-UI-140 Board card without chips: a bug is a carnelian word and nothing carries a badge", () => {
    const li = card(bead("a-9", { issue_type: "bug", priority: 0, labels: ["x"] }));
    expect(screen.getByText("bug")).toHaveClass("text-type-bug");
    expect(li.querySelector('[data-slot="badge"]')).toBeNull();
    expect(Array.from(li.querySelectorAll("*")).filter((e) => /\brounded-full\b/.test(e.getAttribute("class") ?? "") && /\bbg-/.test(e.getAttribute("class") ?? "") && e.textContent !== "")).toEqual([]);
  });

  it("REQ-UI-065 a bare card has only the state on its last line", () => {
    const li = card(bead("a-2"));
    expect(screen.queryByText("task")).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
    expect(li).not.toHaveTextContent(/0 comments|0 deps/);
  });

  it("REQ-UI-064 a blocked card has no coloured edge; its state is the glyph and word", () => {
    const li = card(bead("a-3", { blocked: true }));
    expect(Array.from(li.classList).some((c) => c.startsWith("border-l-"))).toBe(false);
    expect(li.querySelector('svg[data-glyph="blocked"]')).not.toBeNull();
  });

  it("REQ-UI-065 REQ-UI-135 shows Unassigned when only an owner is set", () => {
    card(bead("a-4", { assignee: null, owner: "bob" }));
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
    expect(screen.queryByText("bob")).not.toBeInTheDocument();
  });

  it("REQ-UI-065 REQ-UI-135 shows the person of the assignee", () => {
    card(bead("a-5", { assignee: "Bob@Example.com" }));
    expect(screen.getByText("bob")).toBeInTheDocument();
    expect(screen.queryByText("Unassigned")).not.toBeInTheDocument();
  });

  it("REQ-UI-109 shows the kind badge of a technical epic and none for a capability epic", () => {
    card(bead("e-1", { issue_type: "epic", kind: "technical" }));
    expect(screen.getByText("Technical")).toBeInTheDocument();
    cleanup();
    card(bead("e-2", { issue_type: "epic", kind: "capability" }));
    expect(screen.queryByText(/Technical|Parity/)).toBeNull();
  });

  it("REQ-UI-065 Card with points: the last line shows the state, the type and the size badge 8 pt", () => {
    const li = card(bead("e-8", { issue_type: "epic", status: "in_progress", points: 8 }));
    expect(screen.getByText("8 pt")).toBeInTheDocument();
    expect(li.lastElementChild).toHaveTextContent("8 pt");
    expect(li.lastElementChild).toHaveTextContent("In progress");
    cleanup();
    expect(card(bead("a-9"))).not.toHaveTextContent(" pt");
  });

  it("REQ-UI-147 a click outside the title calls click, and the title link does not", async () => {
    const choice = cardChoice();
    const li = card(bead("a-1", { title: "Fix it" }), choice);
    await userEvent.click(screen.getByText("P2"));
    expect(choice.choose.click).toHaveBeenCalledWith("a-1");
    const link = screen.getByRole("link", { name: "Fix it" });
    link.addEventListener("click", (event) => event.preventDefault());
    await userEvent.click(link);
    expect(choice.choose.click).toHaveBeenCalledTimes(1);
    expect(li).toHaveAttribute("data-id", "a-1");
  });

  it("REQ-UI-147 Enter on the card goes to enter", async () => {
    const choice = cardChoice({ tabStop: "a-1" });
    card(bead("a-1"), choice).focus();
    await userEvent.keyboard("{Enter}");
    expect(choice.choose.enter).toHaveBeenCalledWith("a-1");
  });

  it("REQ-UI-147 Escape on a selected card calls onEscape", async () => {
    const choice = cardChoice({ selected: "a-1", tabStop: "a-1" });
    card(bead("a-1"), choice).focus();
    await userEvent.keyboard("{Escape}");
    expect(choice.onEscape).toHaveBeenCalled();
    expect(choice.choose.enter).not.toHaveBeenCalled();
  });

  it("REQ-UI-148 the selected card has the identity wash and bar and aria-current", () => {
    const li = card(bead("a-1"), cardChoice({ selected: "a-1" }));
    expect(li).toHaveAttribute("aria-current", "true");
    expect(li).toHaveClass("bg-identity-wash", "shadow-[inset_3px_0_0_var(--identity)]");
    cleanup();
    const other = card(bead("a-2"), cardChoice({ selected: "a-1" }));
    expect(other).not.toHaveAttribute("aria-current");
    expect(other).not.toHaveClass("bg-identity-wash");
  });

  it("REQ-UI-147 only the tab stop is in the tab order", () => {
    expect(card(bead("a-1"), cardChoice({ tabStop: "a-1" }))).toHaveAttribute("tabIndex", "0");
    cleanup();
    expect(card(bead("a-2"), cardChoice({ tabStop: "a-1" }))).toHaveAttribute("tabIndex", "-1");
  });
});
