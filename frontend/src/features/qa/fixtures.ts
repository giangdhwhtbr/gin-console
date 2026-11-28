import type { CaseCounts, CaseDetail, CaseList, CaseRow, Trends } from "./api";

export const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const caseRow = (fields: Partial<CaseRow> = {}): CaseRow => ({
  id: "TC-UI-001",
  title: "A case",
  capability: "ui",
  type: "e2e",
  priority: "medium",
  result: "passed",
  effective_result: "passed",
  reqs: ["REQ-UI-001"],
  bug: null,
  file: "qa/cases/ui/TC-UI-001.e2e.md",
  ...fields,
});

export const counts = (name: string, fields: Partial<CaseCounts> = {}): CaseCounts => ({ name, passed: 0, failed: 0, blocked: 0, not_run: 0, outdated: 0, other: 0, total: 0, ...fields });

export const caseList = (cases: CaseRow[], by_capability: CaseCounts[] = [], by_type: CaseCounts[] = []): CaseList => ({ cases, counts: { by_capability, by_type } });

export const caseDetail = (fields: Partial<CaseDetail> = {}): CaseDetail => ({
  ...caseRow(),
  bug: null,
  preconditions: [],
  steps: [],
  expected: [],
  latest_run: null,
  latest_run_reason: "no_run",
  ...fields,
});

export const trends = (fields: Partial<Trends> = {}): Trends => ({
  days: ["2026-06-01", "2026-06-02", "2026-06-03"],
  tz: "UTC",
  pass_rate: [
    {
      name: "beads",
      points: [
        { date: "2026-06-01", passed: 0, failed: 0, rate: null },
        { date: "2026-06-02", passed: 1, failed: 0, rate: 1 },
        { date: "2026-06-03", passed: 1, failed: 1, rate: 0.5 },
      ],
    },
    {
      name: "ui",
      points: [
        { date: "2026-06-01", passed: 2, failed: 0, rate: 1 },
        { date: "2026-06-02", passed: 1, failed: 1, rate: 0.5 },
        { date: "2026-06-03", passed: 2, failed: 0, rate: 1 },
      ],
    },
  ],
  flaky: [{ case: "TC-UI-001", capability: "ui", flips: 3, last_result: "passed", last_at: "2026-06-03T09:00:00Z" }],
  time_to_fix: {
    overall: { fixes: 2, median_seconds: 6300 },
    by_capability: [
      { name: "beads", fixes: 0, median_seconds: null },
      { name: "ui", fixes: 2, median_seconds: 6300 },
    ],
  },
  still_failing: [
    { case: "TC-BEADS-001", capability: "beads", failing_since: "2026-06-02T08:00:00Z", bug: "gin-console-3kd" },
    { case: "TC-BEADS-002", capability: "beads", failing_since: "2026-06-03T08:00:00Z", bug: null },
  ],
  problems: [],
  ...fields,
});
