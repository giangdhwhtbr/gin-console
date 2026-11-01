export type Period = 7 | 30 | 90;
export const PERIODS: readonly Period[] = [7, 30, 90];
export type ReportFilters = { project: string; days: Period; sprint: string };

export function parseReportSearch(search: string): ReportFilters {
  const params = new URLSearchParams(search);
  const days = PERIODS.find((p) => String(p) === params.get("days")) ?? 30;
  return { project: params.get("project") ?? "", days, sprint: params.get("sprint") ?? "" };
}

export function reportSearch(filters: ReportFilters): string {
  const params = new URLSearchParams({ project: filters.project, days: String(filters.days) });
  if (filters.sprint !== "") params.set("sprint", filters.sprint);
  return `?${params.toString()}`;
}
