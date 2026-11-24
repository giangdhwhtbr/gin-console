export type Period = 7 | 30 | 90;
export const PERIODS: readonly Period[] = [7, 30, 90];
export type BeadStatus = "open" | "in_progress" | "closed" | "all";
export const STATUSES: readonly BeadStatus[] = ["open", "in_progress", "closed", "all"];
/** REQ-REPORTS-033: the one scope of every report section; `default` until the team report names it. */
export type Scope = { kind: "milestone"; id: string } | { kind: "period"; days: Period } | { kind: "default" };
export type ReportFilters = {
  project: string;
  scope: Scope;
  /** "" = All members */
  member: string;
  /** "" = the default list */
  status: BeadStatus | "";
};

export function parseReportSearch(search: string): ReportFilters {
  const params = new URLSearchParams(search);
  const milestone = params.get("milestone") ?? "";
  const days = PERIODS.find((p) => String(p) === params.get("days"));
  const scope: Scope = milestone !== "" ? { kind: "milestone", id: milestone } : days !== undefined ? { kind: "period", days } : { kind: "default" };
  return {
    project: params.get("project") ?? "",
    scope,
    member: params.get("member") ?? "",
    status: STATUSES.find((s) => s === params.get("status")) ?? "",
  };
}

/** The request keys of a scope: `milestone=<id>` or `days=<n>`. */
export function scopeQuery(scope: Exclude<Scope, { kind: "default" }>): URLSearchParams {
  return new URLSearchParams(scope.kind === "milestone" ? { milestone: scope.id } : { days: String(scope.days) });
}

export function reportSearch(filters: ReportFilters): string {
  const params = new URLSearchParams({ project: filters.project });
  if (filters.scope.kind !== "default") for (const [key, value] of scopeQuery(filters.scope)) params.set(key, value);
  if (filters.member !== "") params.set("member", filters.member);
  if (filters.status !== "") params.set("status", filters.status);
  return `?${params.toString()}`;
}

/** REQ-REPORTS-033: the search without the retired `sprint`, and without `days` next to a `milestone`; `null` when nothing changes. */
export function fixedSearch(search: string): string | null {
  const params = new URLSearchParams(search);
  const both = (params.get("milestone") ?? "") !== "" && params.has("days");
  if (!params.has("sprint") && !both) return null;
  params.delete("sprint");
  if (both) params.delete("days");
  const query = params.toString();
  return query === "" ? "" : `?${query}`;
}
