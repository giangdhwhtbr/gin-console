import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BeadSummary } from "./api";
import { bead, json, stubBeads } from "./beadFixtures";
import { GraphPage } from "./GraphPage";
import { clearReturn } from "./returnState";

const epic = (id: string, extra = {}) => bead(id, { issue_type: "epic", ...extra });
const task = (id: string, parent: string | null, blockedBy: string[] = [], extra = {}) =>
  bead(id, { parent, blocked_by: blockedBy, ...extra });

function open(path: string, beads: BeadSummary[] | (() => Response)) {
  window.history.replaceState(null, "", path);
  const fetchMock = stubBeads(() => (typeof beads === "function" ? beads() : json(beads)));
  const [, , project, second] = path.split("?")[0].split("/");
  render(<GraphPage project={project} id={second === "graph" ? null : decodeURIComponent(second)} />);
  return fetchMock;
}
const node = (id: string) => screen.findByRole("button", { name: new RegExp(`^${id}`) });
const panel = () => screen.getByRole("complementary", { name: "Bead details" });

beforeEach(() => clearReturn());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("GraphPage", () => {
  it("REQ-UI-075 loads closed beads too", async () => {
    const fetchMock = open("/beads/p/graph", [epic("r-1"), epic("r-2", { blocked_by: ["r-1"] })]);
    await node("r-1");
    expect(fetchMock.mock.calls.some(([input]) => (typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url).includes("closed=1"))).toBe(true);
  });

  it("REQ-UI-075 an epic: heading bar with n of m done and its tasks as nodes", async () => {
    open("/beads/p/e-1/graph", [epic("e-1"), task("a", "e-1"), task("b", "e-1", ["a"])]);
    await node("a");
    const heading = screen.getByRole("region", { name: "Scope" });
    expect(within(heading).getByRole("link", { name: "e-1" })).toHaveAttribute("href", "/beads/p/e-1");
    expect(heading).toHaveTextContent("0 of 2 done");
    expect(await node("b")).toBeInTheDocument();
  });

  it("REQ-UI-075 the project draws its top-level epics", async () => {
    open("/beads/p/graph", [epic("r-1"), epic("r-2", { blocked_by: ["r-1"] }), task("a", "r-1")]);
    expect(await node("r-1")).toBeInTheDocument();
    expect(await node("r-2")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^a/ })).toBeNull();
  });

  it("REQ-UI-075 the heading bar links the scope bead's blockers to their pages", async () => {
    open("/beads/p/e-2/graph", [epic("e-1"), epic("e-2", { blocked_by: ["e-1"] }), task("t", "e-2")]);
    await node("t");
    const heading = screen.getByRole("region", { name: "Scope" });
    expect(within(heading).getByRole("link", { name: /e-1/ })).toHaveAttribute("href", "/beads/p/e-1/graph");
  });

  it("REQ-UI-075 nothing to draw, empty project, not found, load error", async () => {
    open("/beads/p/t/graph", [task("t", null)]);
    expect(await screen.findByText("No dependencies")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "t" })).toHaveAttribute("href", "/beads/p/t");
    cleanup();
    open("/beads/p/graph", []);
    expect(await screen.findByText("No beads in this project")).toBeInTheDocument();
    cleanup();
    open("/beads/p/zz/graph", [task("t", null)]);
    expect(await screen.findByText("Bead not found")).toBeInTheDocument();
    cleanup();
    open("/beads/p/graph", () => json({ error: "boom" }, 500));
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("REQ-UI-076 Hide done leaves out closed beads", async () => {
    open("/beads/p/e/graph", [epic("e"), task("a", "e", [], { status: "closed" }), task("b", "e", ["a"])]);
    await node("a");
    await userEvent.click(screen.getByRole("switch", { name: "Hide done" }));
    expect(screen.queryByRole("button", { name: /^a/ })).toBeNull();
    expect(await node("b")).toBeInTheDocument();
  });

  it("REQ-UI-081 Only linked is on for the project and off inside a bead", async () => {
    open("/beads/p/graph", [epic("r-1"), epic("r-2", { blocked_by: ["r-1"] }), ...["u", "v", "w", "x", "y"].map((id) => task(id, null))]);
    await node("r-1");
    expect(screen.getByRole("switch", { name: "Only linked" })).toBeChecked();
    expect(screen.getByText("5 without dependencies")).toBeInTheDocument();
    cleanup();
    open("/beads/p/e/graph", [epic("e"), task("a", "e")]);
    expect(await node("a")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Only linked" })).not.toBeChecked();
  });

  it("REQ-UI-051 the scope bead is selected at first; the project page selects nothing", async () => {
    open("/beads/p/b/graph", [task("a", null), task("b", null, ["a"])]);
    expect(await node("b")).toHaveAttribute("aria-pressed", "true");
    expect(await within(panel()).findByRole("link", { name: "Open page" })).toHaveAttribute("href", "/beads/p/b");
    cleanup();
    open("/beads/p/graph", [epic("r-1"), epic("r-2", { blocked_by: ["r-1"] })]);
    await node("r-1");
    expect(panel()).toHaveTextContent("Select a bead to see its details");
  });

  it("REQ-UI-051 selecting replaces the history entry; an unknown select falls back", async () => {
    open("/beads/p/e/graph?select=zz", [epic("e"), task("a", "e"), task("b", "e", ["a"])]);
    await node("a");
    expect(screen.getByRole("button", { name: "Title e" })).toHaveAttribute("aria-pressed", "true");
    const before = window.history.length;
    await userEvent.click(await node("a"));
    expect(window.location.search).toBe("?select=a");
    expect(window.history.length).toBe(before);
  });

  it("REQ-UI-080 a double click goes down with a history entry", async () => {
    open("/beads/p/graph", [epic("e-1"), epic("e-2", { blocked_by: ["e-1"] }), task("a", "e-1")]);
    const before = window.history.length;
    await userEvent.dblClick(await node("e-1"));
    expect(window.location.pathname).toBe("/beads/p/e-1/graph");
    expect(window.history.length).toBe(before + 1);
  });

  it("REQ-UI-080 Back restores select and scope bead panel has no View dependencies link", async () => {
    open("/beads/p/e/graph", [epic("e"), task("a", "e"), task("b", "e", ["a"])]);
    await node("a");
    expect(screen.queryByRole("link", { name: "View dependencies" })).toBeNull();
    await userEvent.click(await node("a"));
    expect(window.location.search).toBe("?select=a");
  });

  it("REQ-UI-052 under 1024px the jump buttons move along the arrows", async () => {
    open("/beads/p/b/graph?select=b", [task("a", null), task("c", null), task("b", null, ["a", "c"]), task("d", null, ["b"])]);
    await node("b");
    await userEvent.click(screen.getByRole("button", { name: "2 blockers" }));
    expect(["?select=a", "?select=c"]).toContain(window.location.search);
    expect(screen.getByRole("button", { name: "1 blocked" })).toBeInTheDocument();
  });

  it("REQ-UI-072 the breadcrumb lists the path", async () => {
    open("/beads/p/a-3/graph", [epic("a-1"), epic("a-2", { parent: "a-1" }), task("a-3", "a-2"), task("x", "a-3")]);
    const crumb = within(await screen.findByRole("navigation", { name: "Breadcrumb" }));
    expect(crumb.getByRole("link", { name: "Dependencies" })).toHaveAttribute("href", "/beads/p/graph");
    expect(crumb.getByRole("link", { name: "a-1" })).toHaveAttribute("href", "/beads/p/a-1/graph");
    expect(crumb.getByRole("link", { name: "a-2" })).toHaveAttribute("href", "/beads/p/a-2/graph");
    expect(crumb.getByText("a-3")).toHaveAttribute("aria-current", "page");
  });
});
