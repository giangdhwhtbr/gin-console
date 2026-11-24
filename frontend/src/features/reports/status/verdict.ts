import type { GlyphState } from "@/components/StateGlyph";
import { addWorkdays, plural, workdaysAfter } from "@/features/milestones/format";
import { lateOf } from "@/features/milestones/late";
import { formatDate } from "@/lib/dates";
import { lateDays } from "../team/format";
import type { TeamMilestone } from "../teamApi";
import type { StatusReport } from "./statusApi";

export type VerdictTone = "good" | "risk" | "late" | "idle";

export type StatusVerdict = {
  word: string;
  tone: VerdictTone;
  glyph: GlyphState;
  dashed: boolean;
  sentence: string;
  paceFinish: string | null;
};

const formatPoints = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** REQ-REPORTS-027: today plus open beads ÷ pace, rounded up, in working days; null when nothing is open or pace is 0/absent. */
export function paceFinish(today: string, open: number, pace: number | null): string | null {
  if (open <= 0 || pace === null || pace <= 0) return null;
  return addWorkdays(today, Math.ceil(open / pace));
}

function paceRelation(finish: string, end: string): string {
  if (finish > end) return `${plural(workdaysAfter(end, finish), "working day")} after the end`;
  if (finish < end) return `${plural(workdaysAfter(finish, end), "working day")} before the end`;
  return "on the end date";
}

/**
 * REQ-REPORTS-027: the milestone status verdict and its sentence.
 * `finish` is the forecast finish from the Milestones list (or null while unknown);
 * `unsplit` is the number of open epic rows without a track.
 */
export function statusVerdict(report: StatusReport, milestone: TeamMilestone, finish: string | null, unsplit: number): StatusVerdict {
  const { today, kpis, risks, epics } = report;

  // 1. Closed milestone
  if (milestone.status === "closed") {
    const late = lateOf({ status: milestone.status, end: milestone.end, closedOn: milestone.closed_on }, today);
    const closed = milestone.closed_on !== null ? formatDate(milestone.closed_on, today) : null;
    if (late) {
      const days = lateDays(milestone);
      return {
        word: `Finished ${days} d late`,
        tone: "late",
        glyph: "blocked",
        dashed: false,
        sentence: closed !== null ? `Closed on ${closed}, ${plural(days, "working day")} after the end.` : `${plural(days, "working day")} after the end.`,
        paceFinish: null,
      };
    }
    return {
      word: "Finished on time",
      tone: "good",
      glyph: "done",
      dashed: false,
      sentence: closed !== null ? `Closed on ${closed}.` : "Closed.",
      paceFinish: null,
    };
  }

  // 2. Not started
  if (today < milestone.start) {
    const plannedPoints = kpis.points.scope ?? epics.reduce((sum, e) => sum + (e.points ?? 0), 0);
    return {
      word: "Not started",
      tone: "idle",
      glyph: "ready",
      dashed: false,
      sentence: `Starts on ${formatDate(milestone.start, today)}, with ${formatPoints(plannedPoints)} points planned.`,
      paceFinish: null,
    };
  }

  const scope = kpis.beads.scope ?? 0;
  const done = kpis.beads.done ?? 0;
  const open = Math.max(0, scope - done);
  const pf = paceFinish(today, open, kpis.pace.pace);

  let lead: string;
  if (open > 0 && pf !== null) {
    lead = `At today's pace the ${open} open ${open === 1 ? "bead closes" : "beads close"} around ${formatDate(pf, today)}, ${paceRelation(pf, milestone.end)}.`;
  } else if (open > 0) {
    lead = `No bead closed in the last 5 working days; ${open} ${open === 1 ? "bead is" : "beads are"} open.`;
  } else {
    lead = `All ${scope} beads are done.`;
  }

  const estimatePart =
    finish !== null
      ? ` The epic estimates finish on ${formatDate(finish, today)}${
          unsplit > 0 ? `; ${unsplit === 1 ? "1 epic is" : `${unsplit} epics are`} not split into tasks yet.` : "."
        }`
      : "";
  const sentence = `${lead}${estimatePart}`;

  // 3. Late
  if (lateOf({ status: milestone.status, end: milestone.end, finish }, today)) {
    return { word: "Late", tone: "late", glyph: "blocked", dashed: false, sentence, paceFinish: pf };
  }

  // 4. At risk
  const atRisk =
    (open > 0 && ((pf !== null && pf > milestone.end) || kpis.pace.pace === 0)) ||
    kpis.blocked.count > 0 ||
    risks.unestimated.length > 0;
  if (atRisk) {
    return { word: "At risk", tone: "risk", glyph: "deferred", dashed: true, sentence, paceFinish: pf };
  }

  // 5. On track
  return { word: "On track", tone: "good", glyph: "done", dashed: false, sentence, paceFinish: pf };
}
