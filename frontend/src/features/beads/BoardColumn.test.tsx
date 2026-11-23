import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HintProvider } from "@/components/HintProvider";
import { DEFINITIONS } from "@/lib/definitions";
import { bead, cardChoice, json, stubBeads } from "./beadFixtures";
import { BeadsPage } from "./BeadsPage";
import { BoardColumn } from "./BoardColumn";

beforeEach(() => {
  window.history.replaceState(null, "", "/beads");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const describedBy = (el: HTMLElement) => document.getElementById(el.getAttribute("aria-describedby") ?? "");

describe("BoardColumn", () => {
  it("REQ-UI-132 the count of a column with a rule carries it", () => {
    render(
      <HintProvider>
        <BoardColumn title="Anything" rule="blocked" project="alpha" beads={[]} choice={cardChoice()} />
      </HintProvider>,
    );
    expect(describedBy(screen.getByText("0"))).toHaveTextContent(DEFINITIONS.blocked);
  });

  it("REQ-UI-132 the count of a column without a rule has no hint", () => {
    render(
      <HintProvider>
        <BoardColumn title="Backlog" project="alpha" beads={[]} choice={cardChoice()} />
      </HintProvider>,
    );
    expect(screen.getByText("0")).not.toHaveAttribute("aria-describedby");
  });

  it.each([
    ["board", "In Progress", DEFINITIONS.inProgress],
    ["board", "Blocked", DEFINITIONS.blocked],
    ["board", "Done", DEFINITIONS.done],
    ["focus", "In flight", DEFINITIONS.inProgress],
    ["focus", "Blocked", DEFINITIONS.blocked],
    ["focus", "Recently finished", DEFINITIONS.done],
  ])("REQ-UI-132 the %s view's %s column count carries its rule", async (view, name, text) => {
    window.history.replaceState(null, "", `/beads?project=alpha&view=${view}&closed=1&finished=1`);
    stubBeads(() => json([bead("a-1", { status: "closed", closed_at: "2026-10-01T00:00:00Z" })]));
    render(
      <HintProvider>
        <BeadsPage />
      </HintProvider>,
    );
    const column = await screen.findByRole("region", { name });
    expect(describedBy(within(column).getByText(/^\d+( of \d+)?$/))).toHaveTextContent(text);
  });
});
