import { formatDateTime } from "@/lib/dates";
import type { Signoff, SignoffState, Status } from "./api";

export const STATUS_LABELS: Record<Status, string> = { failing: "Failing", untested: "Untested", unknown: "Unknown", building: "Building", covered: "Covered" };
export const SIGNOFF_LABELS: Record<SignoffState, string> = { current: "Current", changed: "Changed", "unknown version": "Unknown version", waived: "Waived", none: "None" };

/** Who and when, for a change; `null` means the trace does not know the change. */
export function signoffText(signoff: Signoff | null, today?: string): string {
  if (signoff === null) return "Unknown";
  if (signoff.state === "none") return "None";
  if (signoff.state === "waived") return "Waived";
  const at = signoff.at === null ? "" : `, ${formatDateTime(signoff.at, today)}`;
  return `${signoff.actor ?? "Unknown person"}${at}`;
}
