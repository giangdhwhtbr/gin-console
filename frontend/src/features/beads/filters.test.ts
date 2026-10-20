import { describe, expect, it } from "vitest";
import type { BeadSummary } from "./api";
import { filterBeads, filtersToSearch, optionsOf, parseFilters, sortBeads } from "./filters";

const bead = (id: string, overrides: Partial<BeadSummary> = {}): BeadSummary => ({
  id,
  title: `Title ${id}`,
  status: "open",
  priority: 2,
  issue_type: "task",
  labels: [],
  owner: null,
  assignee: null,
  parent: null,
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-10T00:00:00Z",
  dependency_count: 0,
  dependent_count: 0,
  comment_count: 0,
  ...overrides,
});

const empty = parseFilters("");

describe("filters", () => {
  // REQ-UI-025
  it("REQ-UI-025 restores every filter from the URL", () => {
    const f = parseFilters("?project=a&q=fix&status=open&priority=1&label=qa&type=bug&closed=1");
    expect(f).toEqual({ project: "a", q: "fix", status: "open", priority: "1", label: "qa", type: "bug", closed: true });
  });

  // REQ-UI-025
  it("REQ-UI-025 writes only the filters that are set", () => {
    expect(filtersToSearch(empty)).toBe("");
    expect(filtersToSearch({ ...empty, project: "a b", q: "x&y", closed: true })).toBe(
      "?project=a+b&q=x%26y&closed=1",
    );
    const round = { ...empty, project: "a", status: "open", priority: "1" };
    expect(parseFilters(filtersToSearch(round))).toEqual(round);
  });

  // REQ-UI-025
  it("REQ-UI-025 treats anything but closed=1 as not closed", () => {
    expect(parseFilters("?closed=true").closed).toBe(false);
    expect(parseFilters("?closed=1").closed).toBe(true);
  });

  // REQ-UI-025
  it("REQ-UI-025 search matches id, title and labels without regard to case", () => {
    const beads = [
      bead("a-1", { title: "Fix login" }),
      bead("a-2", { title: "Add search" }),
      bead("b-7", { labels: ["Login-Flow"] }),
    ];
    const ids = (q: string) => filterBeads(beads, { ...empty, q }).map((b) => b.id);
    expect(ids("LOGIN")).toEqual(["a-1", "b-7"]);
    expect(ids("a-2")).toEqual(["a-2"]);
    expect(ids("  login  ")).toEqual(["a-1", "b-7"]);
    expect(ids("")).toEqual(["a-1", "a-2", "b-7"]);
  });

  // REQ-UI-025
  it("REQ-UI-025 combines status, priority, label and type with AND", () => {
    const beads = [
      bead("1", { status: "open", priority: 1, labels: ["qa"], issue_type: "bug" }),
      bead("2", { status: "in_progress", priority: 1, labels: ["qa"], issue_type: "bug" }),
      bead("3", { status: "open", priority: 2, labels: ["qa"], issue_type: "bug" }),
      bead("4", { status: "open", priority: 1, labels: [], issue_type: "bug" }),
      bead("5", { status: "open", priority: 1, labels: ["qa"], issue_type: "task" }),
    ];
    const f = { ...empty, status: "open", priority: "1", label: "qa", type: "bug" };
    expect(filterBeads(beads, f).map((b) => b.id)).toEqual(["1"]);
    expect(filterBeads(beads, { ...empty, status: "open" }).map((b) => b.id)).toEqual(["1", "3", "4", "5"]);
  });

  // REQ-UI-026
  it("REQ-UI-026 hides closed beads unless showing closed ones is on", () => {
    const beads = [bead("1"), bead("2", { status: "closed" })];
    expect(filterBeads(beads, empty).map((b) => b.id)).toEqual(["1"]);
    expect(filterBeads(beads, { ...empty, closed: true }).map((b) => b.id)).toEqual(["1", "2"]);
    expect(filterBeads(beads, { ...empty, closed: true, status: "closed" }).map((b) => b.id)).toEqual(["2"]);
  });

  // REQ-UI-024
  it("REQ-UI-024 orders by priority and then by last update, newest first", () => {
    const beads = [
      bead("old-p2", { priority: 2, updated_at: "2026-10-01T00:00:00Z" }),
      bead("new-p2", { priority: 2, updated_at: "2026-10-09T00:00:00Z" }),
      bead("p1", { priority: 1, updated_at: "2026-09-01T00:00:00Z" }),
    ];
    expect(sortBeads(beads).map((b) => b.id)).toEqual(["p1", "new-p2", "old-p2"]);
    expect(beads.map((b) => b.id)).toEqual(["old-p2", "new-p2", "p1"]); // the input is not mutated
  });

  // REQ-UI-025
  it("REQ-UI-025 offers the values that exist as filter options", () => {
    const options = optionsOf([
      bead("1", { status: "open", labels: ["b", "a"], priority: 3, issue_type: "bug" }),
      bead("2", { status: "in_progress", labels: ["a"], priority: 1, issue_type: "task" }),
    ]);
    expect(options).toEqual({
      statuses: ["in_progress", "open"],
      priorities: [1, 3],
      labels: ["a", "b"],
      types: ["bug", "task"],
    });
  });
});
