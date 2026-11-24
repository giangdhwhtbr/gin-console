import type { EpicPlan, ForecastEpic, MilestoneDetail } from "@/features/milestones/api";
import { plural } from "@/features/milestones/format";
import { verdictOf, type Verdict } from "@/features/milestones/gantt";
import { formatDate, formatRange } from "@/lib/dates";
import { countHint } from "@/lib/definitions";
import { formatPercent } from "../format";
import type { TeamMilestone } from "../teamApi";
import type { BlockedRisk, Risks, StatusEpic, StatusKpis } from "./statusApi";

const formatNum = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export type EpicRow = {
  epic: StatusEpic;
  plan: EpicPlan | null;
  closed: boolean;
  /** The first warning of an open epic with a plan, else null. */
  verdict: Verdict | null;
  /** Plain text of the verdict cell: Done, the first warning, or — when unavailable. */
  verdictText: string;
  planned: string;
  forecast: string;
};

function compareRows(a: { epic: StatusEpic; plan: EpicPlan | null }, b: { epic: StatusEpic; plan: EpicPlan | null }): number {
  if (a.plan !== null && b.plan !== null) {
    const startDiff = a.plan.planned_start.localeCompare(b.plan.planned_start);
    if (startDiff !== 0) return startDiff;
  } else if (a.plan !== null) {
    return -1;
  } else if (b.plan !== null) {
    return 1;
  }
  return a.epic.id.localeCompare(b.epic.id);
}

/** REQ-REPORTS-031: status epics joined with milestone detail verdicts/planned dates and list forecast dates, in table order. */
export function epicRows(
  epics: readonly StatusEpic[],
  detail: MilestoneDetail | null,
  forecast: readonly ForecastEpic[] | null,
  today: string,
): EpicRow[] {
  const plans = new Map(detail?.epics.map((e) => [e.id, e]) ?? []);
  const forecasts = new Map(forecast?.map((e) => [e.id, e]) ?? []);
  return epics
    .map((epic) => ({ epic, plan: plans.get(epic.id) ?? null }))
    .sort(compareRows)
    .map(({ epic, plan }) => {
      const closed = epic.status === "closed";
      const verdict = !closed && plan !== null ? verdictOf(plan, today, detail?.integration ?? null) : null;
      const planned = plan !== null ? formatRange(plan.planned_start, plan.planned_end, today) : "—";
      const fe = forecasts.get(epic.id);
      const forecastText = closed
        ? epic.closed_on !== null
          ? formatDate(epic.closed_on, today)
          : "—"
        : fe !== undefined
          ? `${formatDate(fe.planned_end, today)}${fe.estimate_source === "assumed" ? "?" : ""}`
          : "—";
      const verdictText = closed ? "Done" : (verdict?.text ?? "—");
      return { epic, plan, closed, verdict, verdictText, planned, forecast: forecastText };
    });
}

export type RiskRef = { id: string; title: string };

export type RiskItem =
  | { kind: "blocked"; row: BlockedRisk; note: string; text: string }
  | { kind: "more"; text: string }
  | { kind: "unestimated"; text: string; items: readonly RiskRef[] }
  | { kind: "unapproved"; text: string; items: readonly RiskRef[] };

/** REQ-REPORTS-030: the risks listed on the Status section; empty when there are none. */
export function riskItems(risks: Risks, detail: MilestoneDetail | null): RiskItem[] {
  const items: RiskItem[] = risks.blocked.map((row) => {
    if (row.blocker === null) {
      return { kind: "blocked", row, note: plural(row.days, "day"), text: `${row.title} is blocked` };
    }
    const note = `${row.blocker.blocked ? `${row.blocker.title} is blocked too, ` : ""}${row.blocker.person}, ${plural(row.days, "day")}`;
    return { kind: "blocked", row, note, text: `${row.title} waits on ${row.blocker.title}` };
  });
  if (risks.blocked_more > 0) {
    items.push({ kind: "more", text: `${risks.blocked_more} more blocked ${risks.blocked_more === 1 ? "bead" : "beads"}` });
  }
  if (risks.unestimated.length > 0) {
    const n = risks.unestimated.length;
    items.push({ kind: "unestimated", text: `${n} ${n === 1 ? "epic has" : "epics have"} no estimate`, items: risks.unestimated });
  }
  const openEpics = detail?.epics.filter((e) => e.status !== "closed") ?? [];
  const unconfirmed = openEpics.filter((e) => e.spec_confirmed === false);
  if (unconfirmed.length > 0) {
    items.push({
      kind: "unapproved",
      text: `${unconfirmed.length} of ${openEpics.length} epics: spec not approved yet`,
      items: unconfirmed,
    });
  }
  return items;
}

export type KpiFigure = {
  label: string;
  rule: string;
  value: string;
  /** Week-on-week or scope text, null when absent. */
  sub: string | null;
  warn: boolean;
};

/** REQ-REPORTS-028: the five milestone figures with their change texts. */
export function kpiFigures(kpis: StatusKpis, milestone: TeamMilestone, today: string): KpiFigure[] {
  const scope = "the milestone's epics";
  const beadsVal = kpis.beads.done !== null && kpis.beads.scope !== null ? `${kpis.beads.done} of ${kpis.beads.scope}` : "—";
  const beadsSub =
    kpis.beads.done !== null && kpis.beads.done_week_ago !== null ? `+${kpis.beads.done - kpis.beads.done_week_ago} this week` : null;

  const pointsVal =
    kpis.points.done !== null && kpis.points.scope !== null ? `${formatNum(kpis.points.done)} of ${formatNum(kpis.points.scope)}` : "—";
  const pointsAdded =
    kpis.points.scope !== null && kpis.points.at_kickoff !== null ? Math.round((kpis.points.scope - kpis.points.at_kickoff) * 10) / 10 : null;
  const pointsSub =
    pointsAdded === null ? null : pointsAdded > 0 ? `+${formatNum(pointsAdded)} added after kickoff` : "scope unchanged since kickoff";

  const paceVal = kpis.pace.pace !== null ? `${kpis.pace.pace.toFixed(1)} a day` : "—";
  const paceBehind = kpis.pace.pace !== null && kpis.pace.pace_needed !== null && kpis.pace.pace_needed > kpis.pace.pace;
  const paceSub =
    kpis.pace.pace_needed !== null
      ? `needs ${kpis.pace.pace_needed.toFixed(1)} to end on ${formatDate(milestone.end, today)}`
      : kpis.pace.pace_week_ago !== null
        ? `${kpis.pace.pace_week_ago.toFixed(1)} a day last week`
        : null;

  const blockedSub =
    kpis.blocked.count === 0
      ? "nothing blocked"
      : kpis.blocked.oldest_days !== null
        ? `oldest waiting ${plural(kpis.blocked.oldest_days, "day")}`
        : null;

  let reworkSub: string | null = null;
  let reworkWarn = false;
  if (kpis.rework.rate !== null && kpis.rework.rate_week_ago !== null) {
    const nowPct = Math.round(kpis.rework.rate * 100);
    const agoPct = Math.round(kpis.rework.rate_week_ago * 100);
    if (nowPct === agoPct) {
      reworkSub = "same as last week";
    } else if (nowPct > agoPct) {
      reworkSub = `up from ${formatPercent(kpis.rework.rate_week_ago)} last week`;
      reworkWarn = true;
    } else {
      reworkSub = `down from ${formatPercent(kpis.rework.rate_week_ago)} last week`;
    }
  }

  return [
    { label: "Beads done", rule: countHint("done", scope), value: beadsVal, sub: beadsSub, warn: false },
    {
      label: "Points done",
      rule: "Points done: story points completed across the milestone's epics, proportional to closed tracks.",
      value: pointsVal,
      sub: pointsSub,
      warn: pointsAdded !== null && pointsAdded > 0,
    },
    {
      label: "Pace",
      rule: "Pace: beads closed per working day over the last 5 working days, up to today. Counted in the milestone's epics.",
      value: paceVal,
      sub: paceSub,
      warn: paceBehind,
    },
    { label: "Blocked", rule: countHint("blocked", scope), value: String(kpis.blocked.count), sub: blockedSub, warn: false },
    { label: "Rework", rule: countHint("rework", scope), value: formatPercent(kpis.rework.rate), sub: reworkSub, warn: reworkWarn },
  ];
}
