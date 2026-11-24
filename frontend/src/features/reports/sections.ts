export type ReportSection = "status" | "team" | "delivery" | "velocity" | "rework";
export const SECTIONS: readonly ReportSection[] = ["status", "team", "delivery", "velocity", "rework"];
export const SECTION_LABELS: Record<ReportSection, string> = {
  status: "Status",
  team: "Team",
  delivery: "Delivery",
  velocity: "Velocity",
  rework: "Rework",
};

const ROOT = "/reports";

/** REQ-UI-095: the path of a section, with the query it keeps (`""` or `?…`). */
export const sectionPath = (section: ReportSection, search: string): string => `${ROOT}/${section}${search}`;

/** The section a path names; `index` for `/reports`, `unknown` for a path under `/reports/` that names none. */
export function sectionOf(pathname: string): ReportSection | "index" | "unknown" {
  if (pathname === ROOT || pathname === `${ROOT}/`) return "index";
  const name = pathname.startsWith(`${ROOT}/`) ? pathname.slice(ROOT.length + 1) : null;
  return SECTIONS.find((s) => s === name) ?? "unknown";
}

/**
 * REQ-UI-095: the URL that replaces `/reports` or a link of the retired tabs (`tab=…`), `null` when there is none.
 * `tab=quality` names Rework, a section name its section, and any other value, `usage` and `coverage` included, Status.
 */
export function legacyTarget(pathname: string, search: string): string | null {
  const params = new URLSearchParams(search);
  const tab = params.get("tab");
  if (tab === null && sectionOf(pathname) !== "index") return null;
  params.delete("tab");
  const section = tab === "quality" ? "rework" : (SECTIONS.find((s) => s === tab) ?? "status");
  const query = params.toString();
  return sectionPath(section, query === "" ? "" : `?${query}`);
}
