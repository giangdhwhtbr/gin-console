import { workdaysAfter } from "./format";

type Lateness = { status: string; end: string | null; finish?: string | null; closedOn?: string | null };

const day = (iso: string) => iso.slice(0, 10);

/** REQ-MILESTONE-UI-023: the one rule for a late milestone. A closed one is late when it closed on a working day after its end (a weekend close after a Friday end is on time); an open one by today or its forecast. */
export function lateOf(m: Lateness, today: string): boolean {
  if (m.end === null) return false;
  const end = day(m.end);
  if (m.status === "closed") return m.closedOn != null && workdaysAfter(end, day(m.closedOn)) > 0;
  return day(today) > end || (m.finish != null && day(m.finish) > end);
}
