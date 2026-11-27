import type { CaseCounts, CaseDetail, CaseList, CaseRow } from "./api";

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
