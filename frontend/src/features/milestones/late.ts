type Lateness = { status: string; end: string | null; finish?: string | null; closedOn?: string | null };

const day = (iso: string) => iso.slice(0, 10);

/** REQ-MILESTONE-UI-023: the one rule for a late milestone. A closed one is late by the day it closed; an open one by today or its forecast. */
export function lateOf(m: Lateness, today: string): boolean {
  if (m.end === null) return false;
  const end = day(m.end);
  if (m.status === "closed") return m.closedOn != null && day(m.closedOn) > end;
  return day(today) > end || (m.finish != null && day(m.finish) > end);
}
