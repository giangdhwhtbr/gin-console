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
  closed_at: null,
  created_by: null,
  ready: false,
  blocked: false,
  blocked_by: [],
  ...overrides,
});

const empty = parseFilters("");

describe("filters", () => {
  // REQ-UI-025, REQ-UI-082, REQ-UI-083
  it("REQ-UI-025 restores every filter from the URL", () => {
    const f = parseFilters("?project=a&q=fix&status=open&priority=1&label=qa&type=bug&assignee=alice&sprint=1&closed=1");
    expect(f).toEqual({
      project: "a",
      q: "fix",
      status: "open",
      priority: "1",
      label: "qa",
      type: "bug",
      closed: true,
      view: "list",
      group: "",
      finished: false,
      assignee: "alice",
      sprint: "1",
      select: "",
    });
  });

  it("REQ-UI-030 old Graph links fall back to the List and lose the epic", () => {
    const filters = parseFilters("?project=a&view=graph&epic=e-1&select=t-1");
    expect(filters.view).toBe("list");
    expect(filtersToSearch(filters)).toBe("?project=a&select=t-1");
  });

  // REQ-UI-030
  it("REQ-UI-030 parses view from the URL", () => {
    expect(parseFilters("?view=board").view).toBe("board");
    expect(parseFilters("?view=tree").view).toBe("list");
    expect(parseFilters("?view=graph").view).toBe("list");
    expect(parseFilters("?view=kanban").view).toBe("list");
    expect(parseFilters("").view).toBe("list");
  });

  // REQ-UI-045
  it("REQ-UI-045 parses select from the URL", () => {
    expect(parseFilters("?select=t-1").select).toBe("t-1");
    expect(parseFilters("").select).toBe("");
  });

  // REQ-UI-030, REQ-UI-045
  it("REQ-UI-030, REQ-UI-045 serializes the view and select", () => {
    const filters = { ...empty, view: "board" as const, select: "a b" };
    expect(filtersToSearch(filters)).toBe("?view=board&select=a+b");
    expect(parseFilters(filtersToSearch(filters))).toEqual(filters);
  });

  // REQ-UI-030
  it("REQ-UI-030 an old Tree link shows the List", () => {
    expect(parseFilters("?view=tree").view).toBe("list");
    expect(filtersToSearch(parseFilters("?view=list&tree=blocking"))).toBe("");
  });

  // REQ-UI-034
  it("REQ-UI-034 parses group from the URL", () => {
    expect(parseFilters("?group=assignee").group).toBe("assignee");
    expect(parseFilters("?group=x").group).toBe("");
  });

  // REQ-UI-035
  it("REQ-UI-035 parses finished from the URL", () => {
    expect(parseFilters("?finished=1").finished).toBe(true);
    expect(parseFilters("?finished=true").finished).toBe(false);
  });

  // REQ-UI-082, REQ-UI-083
  it("REQ-UI-082, REQ-UI-083 parses assignee and sprint from URL", () => {
    const f = parseFilters("?assignee=alice%40example.com&sprint=sprint-1");
    expect(f.assignee).toBe("alice@example.com");
    expect(f.sprint).toBe("sprint-1");
  });

  // REQ-UI-030, REQ-UI-034, REQ-UI-035, REQ-UI-082, REQ-UI-083
  it("REQ-UI-030, REQ-UI-034, REQ-UI-035, REQ-UI-082, REQ-UI-083 serializes view, group, finished, assignee and sprint", () => {
    const filters = {
      ...empty,
      view: "focus" as const,
      group: "assignee" as const,
      finished: true,
      assignee: "alice",
      sprint: "sprint 1",
    };
    expect(filtersToSearch(filters)).toBe("?view=focus&group=assignee&finished=1&assignee=alice&sprint=sprint+1");
    expect(filtersToSearch({ ...empty, view: "list" })).toBe("");
    expect(parseFilters(filtersToSearch(filters))).toEqual(filters);
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

  // REQ-UI-025, REQ-UI-082, REQ-UI-083
  it("REQ-UI-025 offers the values that exist as filter options, including assignees and sprints", () => {
    const options = optionsOf([
      bead("1", { status: "open", labels: ["b", "a", "sprint:1"], priority: 3, issue_type: "bug", assignee: "bob" }),
      bead("2", { status: "in_progress", labels: ["a", "sprint:10"], priority: 1, issue_type: "task", assignee: "alice" }),
      bead("3", { status: "open", labels: ["sprint:2"], priority: 2, issue_type: "task", assignee: null }),
    ]);
    expect(options).toEqual({
      statuses: ["in_progress", "open"],
      priorities: [1, 2, 3],
      labels: ["a", "b", "sprint:1", "sprint:10", "sprint:2"],
      types: ["bug", "task"],
      assignees: ["unassigned", "alice", "bob"],
      sprints: ["10", "2", "1"],
    });
  });

  // REQ-UI-082
  it("REQ-UI-082 optionsOf excludes unassigned when all beads have an assignee", () => {
    const options = optionsOf([
      bead("1", { assignee: "bob" }),
      bead("2", { assignee: "alice" }),
    ]);
    expect(options.assignees).toEqual(["alice", "bob"]);
  });

  // REQ-UI-082
  it("REQ-UI-082 filterBeads filters by specific assignee and unassigned", () => {
    const beads = [
      bead("1", { assignee: "alice" }),
      bead("2", { assignee: "bob" }),
      bead("3", { assignee: null }),
    ];
    expect(filterBeads(beads, { ...empty, assignee: "alice" }).map((b) => b.id)).toEqual(["1"]);
    expect(filterBeads(beads, { ...empty, assignee: "bob" }).map((b) => b.id)).toEqual(["2"]);
    expect(filterBeads(beads, { ...empty, assignee: "unassigned" }).map((b) => b.id)).toEqual(["3"]);
  });

  // REQ-UI-083
  it("REQ-UI-083 filterBeads filters by sprint matching directly or via parent epic", () => {
    const beads = [
      bead("epic-1", { labels: ["sprint:sprint-1"] }),
      bead("track-1.1", { parent: "epic-1", labels: ["track:1"] }),
      bead("epic-2", { labels: ["sprint:sprint-2"] }),
      bead("track-2.1", { parent: "epic-2", labels: [] }),
      bead("task-solo", { labels: ["sprint:sprint-1"] }),
    ];
    expect(filterBeads(beads, { ...empty, sprint: "sprint-1" }).map((b) => b.id)).toEqual([
      "epic-1",
      "track-1.1",
      "task-solo",
    ]);
    expect(filterBeads(beads, { ...empty, sprint: "sprint-2" }).map((b) => b.id)).toEqual([
      "epic-2",
      "track-2.1",
    ]);
  });

  // REQ-UI-083
  it("REQ-UI-083 filterBeads includes closed beads for active sprint even when closed is off", () => {
    const beads = [
      bead("1", { status: "closed", labels: ["sprint:old"] }),
      bead("2", { status: "closed", labels: ["sprint:other"] }),
      bead("3", { status: "open", labels: ["sprint:old"] }),
    ];
    expect(filterBeads(beads, { ...empty, sprint: "old" }).map((b) => b.id)).toEqual(["1", "3"]);
  });
});
