import type { EpicWorkflow } from "@/features/projects/api";

const ENTRY = ["requirement_confirmed", "plan_approved", "orchestration_ready"];

/** REQ-OVERVIEW-008: the entry gates still unmet and any gate that could not be read. */
export function gateIssues(workflow: EpicWorkflow): string[] {
  return Object.entries(workflow.gates)
    .filter(([name, value]) => value === "unknown" || (value === "unmet" && ENTRY.includes(name)))
    .map(([name, value]) => (value === "unknown" ? `${name} (unknown)` : name));
}

export type WaiverItem = { subject: string; reason: string };

const reasonOf = (value: string): string => /^waived\((.*)\)$/s.exec(value)?.[1] ?? "";

/** REQ-OVERVIEW-008: the waived gates, then the review waivers. */
export function waiversOf(workflow: EpicWorkflow): WaiverItem[] {
  return [
    ...Object.entries(workflow.gates)
      .filter(([, value]) => value.startsWith("waived"))
      .map(([name, value]) => ({ subject: name, reason: reasonOf(value) })),
    ...workflow.review_waivers.map((w) => ({ subject: w.task_id, reason: w.reason })),
  ];
}
