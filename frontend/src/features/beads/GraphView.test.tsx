import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bead, json, stubBeads } from "./beadFixtures";
import { BeadsPage } from "./BeadsPage";

beforeEach(() => window.history.replaceState(null, "", "/beads"));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const epic = bead("e-1", { issue_type: "epic", title: "Epic One" });
const task = (id: string, blockedBy: string[] = [], extra = {}) =>
  bead(id, { parent: "e-1", blocked_by: blockedBy, title: `Task ${id}`, ...extra });
const open = (search: string, beads: ReturnType<typeof bead>[]) => {
  window.history.replaceState(null, "", `/beads?project=alpha&view=graph${search}`);
  stubBeads(() => json(beads));
  render(<BeadsPage />);
};

describe("GraphView", () => {
  it("REQ-UI-030 Graph tab switches the view and keeps the URL", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha");
    stubBeads(() => json([epic]));
    render(<BeadsPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Graph" }));
    expect(window.location.search).toContain("view=graph");
    expect(await screen.findByRole("button", { name: /Epic One/ })).toBeInTheDocument();
  });

  it("REQ-UI-047 lists epics with counts", async () => {
    open("", [epic, task("a"), task("b", ["a"], { blocked: true }), bead("e-2", { issue_type: "epic", title: "Empty" })]);
    const row = await screen.findByRole("button", { name: /Epic One/ });
    expect(row).toHaveTextContent("2 tasks");
    expect(row).toHaveTextContent("1 blocked");
    expect(screen.getByRole("button", { name: /Empty/ })).toHaveTextContent("0 tasks");
  });

  it("REQ-UI-047 says so when there is no epic", async () => {
    open("", [task("a")]);
    expect(await screen.findByText("No epics")).toBeInTheDocument();
  });

  it("REQ-UI-047 an epic parameter that is a task shows the epics", async () => {
    open("&epic=a", [epic, task("a")]);
    expect(await screen.findByRole("button", { name: /Epic One/ })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("REQ-UI-048 REQ-UI-049 draws nodes with id, priority and state label", async () => {
    open("&epic=e-1", [epic, task("a", [], { ready: true, priority: 1 }), task("b", ["a"], { blocked: true })]);
    const a = await screen.findByRole("button", { name: /Task a/ });
    expect(a).toHaveTextContent("a");
    expect(a).toHaveTextContent("P1");
    expect(a).toHaveTextContent("Ready");
    expect(screen.getByRole("button", { name: /Task b/ })).toHaveTextContent("Blocked");
  });

  it("REQ-UI-048 says so when the epic has no tasks or no relations", async () => {
    open("&epic=e-1", [epic]);
    expect(await screen.findByText("This epic has no tasks")).toBeInTheDocument();
    cleanup();
    open("&epic=e-1", [epic, task("a"), task("b")]);
    expect(await screen.findByText("No blocking relations between these tasks")).toBeInTheDocument();
  });

  it("REQ-UI-050 draws an outside blocker", async () => {
    open("&epic=e-1", [epic, task("t-1", ["x-9"]), bead("x-9", { title: "Elsewhere", parent: "other" })]);
    expect(await screen.findByRole("button", { name: /Elsewhere/ })).toHaveAttribute("data-external", "true");
  });

  it("REQ-UI-050 warns about a cycle", async () => {
    open("&epic=e-1", [epic, task("a", ["b"]), task("b", ["a"])]);
    expect(await screen.findByText("Dependency cycle between a, b")).toBeInTheDocument();
  });

  it("REQ-UI-054 lists every arrow as text", async () => {
    open("&epic=e-1", [epic, task("a"), task("b", ["a"])]);
    await screen.findByRole("button", { name: /Task a/ });
    expect(screen.getByText("b is blocked by a")).toBeInTheDocument();
  });

  it("REQ-UI-051 selecting keeps select in the URL and highlights the chain", async () => {
    open("&epic=e-1", [epic, task("a"), task("b", ["a"]), task("z")]);
    await userEvent.click(await screen.findByRole("button", { name: /Task b/ }));
    expect(window.location.search).toContain("select=b");
    expect(screen.getByRole("button", { name: /Task a/ })).toHaveAttribute("data-dimmed", "false");
    expect(screen.getByRole("button", { name: /Task z/ })).toHaveAttribute("data-dimmed", "true");
    expect(screen.getByRole("complementary", { name: "Bead details" })).toBeInTheDocument();
  });

  it("REQ-UI-051 restores the selection from the URL", async () => {
    open("&epic=e-1&select=b", [epic, task("a"), task("b", ["a"])]);
    expect(await screen.findByRole("button", { name: /Task b/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("REQ-UI-052 arrows follow edges and Escape clears", async () => {
    open("&epic=e-1&select=a", [epic, task("a"), task("b", ["a"])]);
    const a = await screen.findByRole("button", { name: /Task a/ });
    a.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("button", { name: /Task b/ })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(window.location.search).not.toContain("select=");
    expect(
      within(screen.getByRole("complementary", { name: "Bead details" })).getByText("Select a bead to see its details"),
    ).toBeInTheDocument();
  });

  it("REQ-UI-052 keeps one node in the tab order", async () => {
    open("&epic=e-1", [epic, task("a"), task("b", ["a"])]);
    await screen.findByRole("button", { name: /Task a/ });
    const nodes = screen.getAllByRole("button", { name: /^(?!All epics)/ }).filter((el) => el.hasAttribute("data-node"));
    expect(nodes.filter((el) => el.tabIndex === 0)).toHaveLength(1);
  });
});
