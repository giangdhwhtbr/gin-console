import { vi } from "vitest";
import { json, project } from "@/features/beads/beadFixtures";
import type { BeadSummary } from "@/features/beads/api";
import type { EpicPlan, MilestoneDetail, MilestoneEntry, MilestoneList } from "./api";

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
  ...overrides,
});

export const list = (milestones: MilestoneEntry[], overrides: Partial<MilestoneList> = {}): MilestoneList => ({
  milestones,
  unassigned_epics: 0,
  today: "2026-10-29",
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
  ...overrides,
});

/** Stub `fetch`: `/api/projects` lists "alpha", `/api/milestones…` goes to `handler`, `/api/beads` returns `beads` (or what `beads(url)` answers). */
export function stubMilestones(handler: (url: URL) => Response | Promise<Response>, beads: BeadSummary[] | ((url: URL) => Response) = []) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const text = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const url = new URL(text, "http://localhost");
    if (url.pathname === "/api/projects") return Promise.resolve(json([project("alpha")]));
    if (url.pathname.startsWith("/api/milestones")) return Promise.resolve(handler(url));
    if (url.pathname === "/api/beads") return Promise.resolve(typeof beads === "function" ? beads(url) : json(beads));
    return Promise.resolve(json({}, 404));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
