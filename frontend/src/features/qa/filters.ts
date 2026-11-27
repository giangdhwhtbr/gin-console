import { RESULT_KEYS, type CaseRow, type ResultKey } from "./api";

export type CaseFilters = { capability: string | null; type: string | null; result: ResultKey | null; q: string };

const KNOWN = ["passed", "failed", "blocked", "not run", "outdated"];

export function parseCaseFilters(search: string): CaseFilters {
  const params = new URLSearchParams(search);
  return {
    capability: params.get("capability") || null,
    type: params.get("type") || null,
    result: RESULT_KEYS.find((key) => key === params.get("result")) ?? null,
    q: params.get("q") ?? "",
  };
}

/** `/tests` with the project and the filters that are set. */
export function caseFiltersToSearch(project: string, filters: CaseFilters): string {
  const params = new URLSearchParams({ project });
  if (filters.capability !== null) params.set("capability", filters.capability);
  if (filters.type !== null) params.set("type", filters.type);
  if (filters.result !== null) params.set("result", filters.result);
  if (filters.q !== "") params.set("q", filters.q);
  return `?${params.toString()}`;
}

const matchesResult = (effective: string, key: ResultKey): boolean =>
  key === "not_run" ? effective === "not run" : key === "other" ? !KNOWN.includes(effective) : effective === key;

export function filterCases(cases: readonly CaseRow[], filters: CaseFilters): CaseRow[] {
  const text = filters.q.trim().toLowerCase();
  return cases.filter(
    (row) =>
      (filters.capability === null || row.capability === filters.capability) &&
      (filters.type === null || row.type === filters.type) &&
      (filters.result === null || matchesResult(row.effective_result, filters.result)) &&
      (text === "" || row.id.toLowerCase().includes(text) || row.title.toLowerCase().includes(text)),
  );
}
