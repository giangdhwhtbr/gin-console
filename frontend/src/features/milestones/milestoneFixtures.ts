import { vi } from "vitest";
import { json, milestoneOption, project, projectMilestones } from "@/features/beads/beadFixtures";
import type { BeadSummary, Comment } from "@/features/beads/api";
import type { ClosedEpic, EpicPlan, Forecast, ForecastEpic, ForecastMilestone, MilestoneDetail, MilestoneEntry, MilestoneList } from "./api";

export const entry = (id: string, overrides: Partial<MilestoneEntry> = {}): MilestoneEntry => ({
  id,
  title: `Title ${id}`,
  status: "planned",
  start: "2026-11-02",
  end: "2026-12-18",
  kickoff: null,
  finish: "2026-12-22",
  epics: { total: 6, closed: 0 },
  warnings: 0,
  error: null,
  lanes: null,
  velocity: null,
  ...overrides,
});

export const list = (milestones: MilestoneEntry[], overrides: Partial<MilestoneList> = {}): MilestoneList => ({
  milestones,
  unassigned_epics: 0,
  today: "2026-10-29",
  forecast: null,
  days_per_point: null,
  closed_epics: [],
  ...overrides,
});

export const forecast = (overrides: Partial<Forecast> = {}): Forecast => ({
  deadline: "2026-12-31",
  lanes: 2,
  start: "2026-11-08",
  finish: "2026-12-23",
  overflow_days: 0,
  open_epics: 5,
  unestimated: 0,
  error: null,
  epics: [],
  milestones: [],
  ...overrides,
});

export const forecastEpic = (id: string, overrides: Partial<ForecastEpic> = {}): ForecastEpic => ({
  id,
  milestone: null,
  planned_start: "2026-11-02",
  planned_end: "2026-11-04",
  estimate_source: "points",
  title: `Title ${id}`,
  status: "open",
  lane: 1,
  remaining_days: 3,
  warnings: [],
  ...overrides,
});

export const forecastMilestone = (id: string, overrides: Partial<ForecastMilestone> = {}): ForecastMilestone => ({
  id,
  start: "2026-11-02",
  finish: "2026-11-04",
  overflow_days: 0,
  ...overrides,
});

export const closedEpic = (id: string, overrides: Partial<ClosedEpic> = {}): ClosedEpic => ({
  id,
  title: `Title ${id}`,
  milestone: null,
  start: "2026-10-12",
  end: "2026-10-28",
  ...overrides,
});

export const epicPlan = (id: string, overrides: Partial<EpicPlan> = {}): EpicPlan => ({
  id,
  title: `Title ${id}`,
  status: "open",
  estimate_days: 3,
  planned_start: "2026-11-02",
  planned_end: "2026-11-04",
  depends_on: [],
  external_depends_on: [],
  warnings: [],
  spec_confirmed: null,
  remaining_days: null,
  assumed_days: null,
  points: null,
  points_reason: null,
  estimate_source: null,
  actual_days: null,
  actual_days_per_point: null,
  ...overrides,
});

export const detail = (epics: EpicPlan[], overrides: Partial<MilestoneDetail> = {}): MilestoneDetail => ({
  id: "m-1",
  title: "Beta readiness",
  description: "",
  status: "planned",
  start: "2026-11-02",
  end: "2026-11-13",
  kickoff: null,
  schedule_start: "2026-11-02",
  preview: false,
  today: "2026-10-29",
  finish: "2026-11-04",
  overflow_days: 0,
  epics,
  lanes: null,
  integration: null,
  deadline: null,
  away: {},
  days_per_point: null,
  velocity: null,
  ...overrides,
});

const projectMilestones_ = projectMilestones(
  [milestoneOption("m1", "closed"), milestoneOption("m2", "active"), milestoneOption("m3", "planned")],
  "m2",
);

/** Stub `fetch`: `/api/beads/<p>/<id>/comments` returns `comments`, `/api/projects/beads` lists "alpha", `/api/beads/milestones` lists m1 (closed), m2 (active, current) and m3, `/api/milestones…` goes to `handler`, `/api/beads` returns `beads` (or what `beads(url)` answers). */
export function stubMilestones(handler: (url: URL) => Response | Promise<Response>, beads: BeadSummary[] | ((url: URL) => Response) = [], comments: Comment[] | ((url: URL) => Response) = []) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const text = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const url = new URL(text, "http://localhost");
    if (url.pathname === "/api/projects/beads") return Promise.resolve(json([project("alpha")]));
    if (url.pathname === "/api/beads/milestones") return Promise.resolve(json(projectMilestones_));
    if (url.pathname.startsWith("/api/milestones")) return Promise.resolve(handler(url));
    if (/^\/api\/beads\/[^/]+\/[^/]+\/comments$/.test(url.pathname)) return Promise.resolve(typeof comments === "function" ? comments(url) : json(comments));
    if (url.pathname === "/api/beads") return Promise.resolve(typeof beads === "function" ? beads(url) : json(beads));
    return Promise.resolve(json({}, 404));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
