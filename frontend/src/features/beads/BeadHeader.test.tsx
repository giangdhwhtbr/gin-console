import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearEmail, resetIdentity, setEmail } from "@/app/identity";
import type { BeadDetail, BeadSummary, Relation } from "./api";
import { bead } from "./beadFixtures";
import { BeadHeader } from "./BeadHeader";

const ME = "alice@example.com";
const detail = (b: BeadSummary, over: Partial<BeadDetail> = {}): BeadDetail => ({
  ...b,
  description: null,
  design: null,
  notes: null,
  acceptance_criteria: null,
  close_reason: null,
  dependencies: [],
  dependents: [],
  children: [],
  bugs: [],
  ...over,
});
const blocks = (id: string, status = "open", title = `Title ${id}`): Relation => ({ id, title, status, type: "blocks" });
const show = (b: BeadSummary, over: Partial<BeadDetail> = {}, stage: string | null = null, graphLink = true) =>
  render(<BeadHeader project="alpha" bead={detail(b, over)} stage={stage} graphLink={graphLink} />);

beforeEach(() => {
  resetIdentity();
  window.localStorage.clear();
  setEmail(ME);
});
afterEach(() => {
  cleanup();
  clearEmail();
  resetIdentity();
  vi.restoreAllMocks();
});

describe("BeadHeader next command and blockers", () => {
  // REQ-UI-151 Scenario: Ready unassigned task, REQ-BEADS-025
  it("REQ-UI-151 REQ-BEADS-025 a ready unassigned task shows Next with the claim command and Copy", () => {
    show(bead("t-1", { ready: true }));
    expect(screen.getByText("Next")).toBeInTheDocument();
    expect(screen.getByText("gin task update t-1 --claim")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("REQ-UI-151 REQ-BEADS-025 an in-progress task of mine shows the execute command", () => {
    show(bead("t-2", { status: "in_progress", assignee: ME }));
    expect(screen.getByText("/gin:execute t-2")).toBeInTheDocument();
  });

  it("REQ-UI-151 REQ-BEADS-025 no command for a closed task or a task in progress for another person", () => {
    show(bead("t-3", { status: "closed" }));
    expect(screen.queryByText("Next")).toBeNull();
    cleanup();
    show(bead("t-4", { status: "in_progress", assignee: "bob@example.com" }));
    expect(screen.queryByText("Next")).toBeNull();
    expect(screen.queryByRole("button", { name: "Copy" })).toBeNull();
  });

  it("REQ-UI-151 Next sits before View in graph, also without the graph link", () => {
    const b = bead("t-5", { ready: true });
    show(b, { dependents: [blocks("t-6")] });
    const next = screen.getByText("Next");
    const graph = screen.getByRole("link", { name: "View in graph" });
    expect(next.compareDocumentPosition(graph) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    cleanup();
    show(b, {}, null, false);
    expect(screen.getByText("Next")).toBeInTheDocument();
  });

  it("REQ-UI-151 a blocked task shows Blocked by instead of a command", () => {
    show(bead("t-7", { blocked: true }), { dependencies: [blocks("t-9", "open", "Nine"), blocks("t-8", "open", "Eight")] });
    expect(screen.getByText(/Blocked by/)).toBeInTheDocument();
    expect(screen.queryByText("Next")).toBeNull();
  });

  // REQ-UI-152
  it("REQ-UI-152 Blocked by links the open blockers ordered by id and leaves out closed ones", () => {
    show(bead("t-7", { blocked: true }), {
      dependencies: [blocks("t-9", "open", "Nine"), blocks("t-8", "in_progress", "Eight"), blocks("t-1", "closed", "One")],
    });
    const links = screen.getAllByRole("link").filter((l) => l.getAttribute("href")?.startsWith("/beads/alpha/t-"));
    expect(links.map((l) => l.textContent)).toEqual(["Eight", "Nine"]);
    expect(links[0]).toHaveAttribute("href", "/beads/alpha/t-8");
    expect(screen.getByText(/Blocked by/)).toHaveTextContent("Blocked by Eight, Nine");
    expect(screen.queryByText("One")).toBeNull();
  });

  it("REQ-UI-152 no Blocked by line without open blockers", () => {
    show(bead("t-7", { blocked: true }), { dependencies: [blocks("t-1", "closed")] });
    expect(screen.queryByText(/Blocked by/)).toBeNull();
  });

  // REQ-BEADS-025 epic
  it("REQ-BEADS-025 an epic shows its command once the stage is known and none without it", () => {
    show(bead("e-1", { issue_type: "epic", status: "in_progress" }), {}, "plan");
    expect(screen.getByText("/gin:plan e-1")).toBeInTheDocument();
    cleanup();
    show(bead("e-1", { issue_type: "epic", status: "in_progress" }), {}, null);
    expect(screen.queryByText("Next")).toBeNull();
  });
});
