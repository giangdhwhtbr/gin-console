import type { Requirement, SignoffState, Status } from "./api";

export const STATUSES: readonly Status[] = ["failing", "untested", "unknown", "building", "covered"];
export const SIGNOFFS: readonly SignoffState[] = ["current", "changed", "unknown version", "waived", "none"];
export type MatrixFilters = { status: Status | null; capability: string | null; signoff: SignoffState | null; q: string; removed: boolean };

export function parseFilters(search: string): MatrixFilters {
  const params = new URLSearchParams(search);
  return {
    status: STATUSES.find((s) => s === params.get("status")) ?? null,
    capability: params.get("capability") || null,
    signoff: SIGNOFFS.find((s) => s === params.get("signoff")) ?? null,
    q: params.get("q") ?? "",
    removed: params.get("removed") === "1",
  };
}

/** The query with the filters replaced; `project` and `req` stay. */
export function withFilters(search: string, filters: MatrixFilters): string {
  const params = new URLSearchParams(search);
  const values: Record<string, string | null> = {
    status: filters.status,
    capability: filters.capability,
    signoff: filters.signoff,
    q: filters.q === "" ? null : filters.q,
    removed: filters.removed ? "1" : null,
  };
  for (const [key, value] of Object.entries(values)) {
    if (value === null) params.delete(key);
    else params.set(key, value);
  }
  return `?${params.toString()}`;
}

export function matching(rows: readonly Requirement[], filters: MatrixFilters): Requirement[] {
  const text = filters.q.trim().toLowerCase();
  const known = filters.capability === null || rows.some((r) => r.capability === filters.capability);
  return rows.filter(
    (r) =>
      (filters.removed || r.state !== "removed") &&
      (filters.status === null || r.status === filters.status) &&
      (!known || filters.capability === null || r.capability === filters.capability) &&
      (filters.signoff === null || r.signoff.state === filters.signoff) &&
      (text === "" || r.id.toLowerCase().includes(text) || r.title.toLowerCase().includes(text)),
  );
}
