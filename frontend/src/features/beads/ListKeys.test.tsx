import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bead, json, stubBeads } from "./beadFixtures";
import { BeadsPage } from "./BeadsPage";
import { clearReturn } from "./returnState";

beforeEach(() => {
  clearReturn();
  window.history.replaceState(null, "", "/beads");
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ListKeys", () => {
  it("REQ-UI-046 roles: tree, treeitem, aria-expanded, and aria-level", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=list");
    stubBeads(() =>
      json([
        bead("e-1", { issue_type: "epic", title: "Epic One" }),
        bead("t-1", { parent: "e-1", title: "Task One" }),
        bead("leaf-1", { title: "Leaf One" }),
        bead("e-2", { issue_type: "epic", title: "Epic Two" }),
        bead("t-2", { parent: "e-2", title: "Task Two" }),
      ]),
    );
    const user = userEvent.setup();
    render(<BeadsPage />);

    const tree = await screen.findByRole("tree");
    expect(tree).toBeInTheDocument();

    const epic1 = within(tree).getByRole("treeitem", { name: /e-1/ });
    const leaf1 = within(tree).getByRole("treeitem", { name: /leaf-1/ });
    const epic2 = within(tree).getByRole("treeitem", { name: /e-2/ });

    expect(epic1).toHaveAttribute("aria-expanded", "false");
    expect(epic1).toHaveAttribute("aria-level", "1");
    expect(leaf1).not.toHaveAttribute("aria-expanded");
    expect(leaf1).toHaveAttribute("aria-level", "1");
    expect(epic2).toHaveAttribute("aria-expanded", "false");

    await user.click(screen.getByRole("button", { name: "Expand e-1" }));
    expect(epic1).toHaveAttribute("aria-expanded", "true");

    const t1 = within(tree).getByRole("treeitem", { name: /t-1/ });
    expect(t1).toHaveAttribute("aria-level", "2");
  });

  it("REQ-UI-046 move: ArrowDown and ArrowUp navigate between nodes", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=list");
    stubBeads(() =>
      json([
        bead("t-1", { title: "Task 1" }),
        bead("t-2", { title: "Task 2" }),
        bead("t-3", { title: "Task 3" }),
      ]),
    );
    const user = userEvent.setup();
    render(<BeadsPage />);

    const tree = await screen.findByRole("tree");
    const item1 = within(tree).getByRole("treeitem", { name: /t-1/ });
    const item2 = within(tree).getByRole("treeitem", { name: /t-2/ });
    const item3 = within(tree).getByRole("treeitem", { name: /t-3/ });

    item1.focus();
    expect(item1).toHaveFocus();

    // ArrowUp on the first does nothing
    await user.keyboard("{ArrowUp}");
    expect(item1).toHaveFocus();

    // ArrowDown moves to next
    await user.keyboard("{ArrowDown}");
    expect(item2).toHaveFocus();

    // ArrowUp moves back
    await user.keyboard("{ArrowUp}");
    expect(item1).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(item2).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(item3).toHaveFocus();

    // ArrowDown on the last does nothing
    await user.keyboard("{ArrowDown}");
    expect(item3).toHaveFocus();
  });

  it("REQ-UI-046 open and close: ArrowRight opens and enters child, ArrowLeft leaves and closes", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=list");
    stubBeads(() =>
      json([
        bead("e-1", { issue_type: "epic", title: "Epic One" }),
        bead("t-1", { parent: "e-1", title: "Task One" }),
      ]),
    );
    const user = userEvent.setup();
    render(<BeadsPage />);

    const tree = await screen.findByRole("tree");
    const epic = within(tree).getByRole("treeitem", { name: /e-1/ });

    epic.focus();
    expect(epic).toHaveFocus();
    expect(epic).toHaveAttribute("aria-expanded", "false");

    // ArrowRight on collapsed epic opens it
    await user.keyboard("{ArrowRight}");
    expect(epic).toHaveAttribute("aria-expanded", "true");
    expect(epic).toHaveFocus();

    // Second ArrowRight moves focus to its first child
    await user.keyboard("{ArrowRight}");
    const child = within(tree).getByRole("treeitem", { name: /t-1/ });
    expect(child).toHaveFocus();

    // ArrowLeft on child moves focus to the parent
    await user.keyboard("{ArrowLeft}");
    expect(epic).toHaveFocus();

    // ArrowLeft on open parent closes it
    await user.keyboard("{ArrowLeft}");
    expect(epic).toHaveAttribute("aria-expanded", "false");
    expect(within(tree).queryByRole("treeitem", { name: /t-1/ })).toBeNull();
  });

  it("REQ-UI-046 select with Enter: puts select in URL", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=list");
    stubBeads(() => json([bead("t-1", { title: "Task One" })]));
    const user = userEvent.setup();
    render(<BeadsPage />);

    const tree = await screen.findByRole("tree");
    const item = within(tree).getByRole("treeitem", { name: /t-1/ });

    item.focus();
    await user.keyboard("{Enter}");

    expect(window.location.search).toContain("select=t-1");
  });

  it("REQ-UI-046 keys are the tree's own: tree does not take over arrows, / and Esc still work", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha&view=list");
    stubBeads(() => json([bead("t-1", { title: "Task One" })]));
    const user = userEvent.setup();
    render(<BeadsPage />);

    await screen.findByRole("tree");
    document.body.focus();

    const event = new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);

    // / focuses search
    await user.keyboard("/");
    const searchInput = screen.getByRole("searchbox", { name: "Search" });
    expect(searchInput).toHaveFocus();

    // type and Escape clears search
    await user.keyboard("test");
    expect(searchInput).toHaveValue("test");

    await user.keyboard("{Escape}");
    expect(searchInput).toHaveValue("");
  });
});
