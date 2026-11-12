export type Period = 7 | 30 | 90;
export const PERIODS: readonly Period[] = [7, 30, 90];
export type ReportTab = "team" | "delivery" | "usage" | "quality" | "coverage";
export const TABS: readonly ReportTab[] = ["team", "delivery", "usage", "quality", "coverage"];
export type BeadStatus = "open" | "in_progress" | "closed" | "all";
export const STATUSES: readonly BeadStatus[] = ["open", "in_progress", "closed", "all"];
export type ReportFilters = {
  project: string;
  days: Period;
  sprint: string;
  tab: ReportTab;
  /** "" = the server's default milestone */
  milestone: string;
  /** "" = All members */
  member: string;
  /** "" = the default list */
  status: BeadStatus | "";
};

export function parseReportSearch(search: string): ReportFilters {
  const params = new URLSearchParams(search);
  const days = PERIODS.find((p) => String(p) === params.get("days")) ?? 30;
  const tab = TABS.find((t) => t === params.get("tab")) ?? "team";
  const status = STATUSES.find((s) => s === params.get("status")) ?? "";
  return {
    project: params.get("project") ?? "",
    days,
    sprint: params.get("sprint") ?? "",
    tab,
    milestone: params.get("milestone") ?? "",
    member: params.get("member") ?? "",
    status,
  };
}

export function reportSearch(filters: ReportFilters): string {
  const params = new URLSearchParams({ project: filters.project, days: String(filters.days) });
  if (filters.sprint !== "") params.set("sprint", filters.sprint);
  params.set("tab", filters.tab);
  if (filters.milestone !== "") params.set("milestone", filters.milestone);
  if (filters.member !== "") params.set("member", filters.member);
  if (filters.status !== "") params.set("status", filters.status);
  return `?${params.toString()}`;
}
