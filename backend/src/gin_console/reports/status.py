"""The Status report of a milestone or a period (spec REQ-REPORTS-020, 022..026).

Dates are local (`astimezone()`); the working days are Monday to Friday. An epic's milestone and
points on a day come from `history.py` (REQ-REPORTS-021)."""

from datetime import date, datetime, timedelta

from gin_console.beads.milestones import parse_date
from gin_console.beads.models import ChildCounts
from gin_console.beads.prep import is_prep
from gin_console.reports.history import milestone_on, points_on
from gin_console.reports.models import (
    BeadsKpi,
    BlockedKpi,
    BlockedRisk,
    Blocker,
    BurnupDay,
    Changes,
    PaceKpi,
    PointsKpi,
    ReportBead,
    ReworkKpi,
    Risks,
    ScopeChange,
    StatusEpic,
    StatusKpis,
    StatusPeriod,
    StatusReport,
    TeamEpic,
    TeamMilestone,
    TeamTotals,
)
from gin_console.reports.scope import (
    MilestoneScope,
    PeriodScope,
    Scope,
    Tree,
    bead_key,
    day_of,
    list_milestones,
    milestone_scope,
    select_milestone,
    workday,
    workdays,
)
from gin_console.reports.service import build_report, member_of
from gin_console.reports.team import PACE_WINDOW, team_rows, team_totals

RISKS_SHOWN = 5
Pairs = list[tuple[ReportBead, ReportBead]]  # (scope bead, its nearest epic)


def first_day(m: ReportBead) -> date:
    """The date of the milestone's `kickoff`, else of its `start`."""
    first = parse_date(m.kickoff) or parse_date(m.start)
    assert first is not None  # a listed milestone has a start (list_milestones)
    return first


def epics_on(beads: list[ReportBead], milestone_id: str, day: date) -> list[ReportBead]:
    """The epics that belong to the milestone on `day` (REQ-REPORTS-021), by id."""
    found = [b for b in beads if b.issue_type == "epic" and milestone_on(b, day) == milestone_id]
    return sorted(found, key=lambda b: b.id)


def _closed_by(bead: ReportBead, day: date) -> bool:
    return bead.status == "closed" and bead.closed_at is not None and day_of(bead.closed_at) <= day


def _done_share(epic: ReportBead, tracks: list[ReportBead], day: date) -> float:
    if _closed_by(epic, day):
        return 1.0
    made = [t for t in tracks if day_of(t.created_at) <= day]
    return sum(1 for t in made if _closed_by(t, day)) / len(made) if made else 0.0


def burnup(
    tree: Tree, beads: list[ReportBead], milestone: ReportBead, last: date
) -> list[BurnupDay]:
    """One entry per working day from the first day to `last` (REQ-REPORTS-022)."""
    series: list[BurnupDay] = []
    for day in workdays(first_day(milestone), last):
        scope_points = 0.0
        done_points = 0.0
        for epic in epics_on(beads, milestone.id, day):
            points = points_on(epic, day) or 0
            tracks = [c for c in tree.children.get(bead_key(epic), []) if not is_prep(c.labels)]
            scope_points += points
            done_points += points * _done_share(epic, tracks, day)
        series.append(
            BurnupDay(
                day=day, scope_points=round(scope_points, 1), done_points=round(done_points, 1)
            )
        )
    return series


def _blocked_ancestor(tree: Tree, bead: ReportBead) -> ReportBead | None:
    return next((a for a in tree.ancestors(bead) if a.blocked), None)


def _wait(tree: Tree, bead: ReportBead, today: date) -> int:
    """The working days after the date the bead started waiting, up to `today`: its own
    blocking dependencies, else its nearest blocked ancestor's, else its last update."""
    ancestor = _blocked_ancestor(tree, bead)
    since = bead.blocked_since or (ancestor.blocked_since if ancestor else None) or bead.updated_at
    return len(workdays(day_of(since) + timedelta(days=1), today))


def blocked_waits(tree: Tree, pairs: Pairs, today: date) -> list[tuple[ReportBead, int]]:
    """The blocked scope beads with their wait, longest first and then by id."""
    waits = [
        (bead, _wait(tree, bead, today))
        for bead, _ in pairs
        if bead.status != "closed" and bead.blocked
    ]
    return sorted(waits, key=lambda w: (-w[1], w[0].id))


def _pace_week_ago(pairs: Pairs, week_ago: date) -> float:
    window = set(workdays(week_ago - timedelta(days=14), week_ago)[-PACE_WINDOW:])
    n = sum(
        1
        for bead, _ in pairs
        if bead.status == "closed"
        and bead.closed_at is not None
        and workday(day_of(bead.closed_at)) in window
    )
    return round(n / PACE_WINDOW, 2)


def _rework_week_ago(pairs: Pairs, week_ago: date) -> float | None:
    closed = [b for b, _ in pairs if _closed_by(b, week_ago)]
    if not closed:
        return None
    reworked = sum(
        1
        for b in closed
        if sum(1 for d in b.reopened_on if d <= week_ago)
        + sum(1 for d in b.bug_days if d <= week_ago)
        > 0
    )
    return round(reworked / len(closed), 4)


def _empty_kpis(blocked: int) -> StatusKpis:
    return StatusKpis(
        beads=BeadsKpi(done=None, scope=None, done_week_ago=None, scope_week_ago=None),
        points=PointsKpi(done=None, scope=None, at_kickoff=None, done_week_ago=None),
        pace=PaceKpi(pace=None, pace_needed=None, pace_week_ago=None),
        blocked=BlockedKpi(count=blocked, oldest_days=None),
        rework=ReworkKpi(rate=None, rate_week_ago=None),
    )


def kpis(
    pairs: Pairs,
    series: list[BurnupDay],
    team: TeamTotals,
    waits: list[tuple[ReportBead, int]],
    *,
    first: date,
    today: date,
) -> StatusKpis:
    """The figures of a milestone now and a week ago (REQ-REPORTS-023)."""
    week_ago = today - timedelta(days=7)
    known = week_ago >= first  # a week-ago value needs a first day on or before it
    scope = [b for b, _ in pairs]
    by_then = [d for d in series if d.day <= week_ago]
    return StatusKpis(
        beads=BeadsKpi(
            done=team.closed,
            scope=team.scope,
            done_week_ago=sum(1 for b in scope if _closed_by(b, week_ago)) if known else None,
            scope_week_ago=(
                sum(1 for b in scope if day_of(b.created_at) <= week_ago) if known else None
            ),
        ),
        points=PointsKpi(
            done=series[-1].done_points if series else None,
            scope=series[-1].scope_points if series else None,
            at_kickoff=series[0].scope_points if series else None,
            done_week_ago=by_then[-1].done_points if known and by_then else None,
        ),
        pace=PaceKpi(
            pace=team.pace,
            pace_needed=team.pace_needed,
            pace_week_ago=_pace_week_ago(pairs, week_ago) if known else None,
        ),
        blocked=BlockedKpi(count=len(waits), oldest_days=waits[0][1] if waits else None),
        rework=ReworkKpi(
            rate=team.rework_rate,
            rate_week_ago=_rework_week_ago(pairs, week_ago) if known else None,
        ),
    )


def period_kpis(beads: list[ReportBead], *, now: datetime, project: str, days: int) -> StatusKpis:
    """The figures of a period: the beads of REQ-REPORTS-001, their rework rate and the blocked
    beads of the project (REQ-REPORTS-023)."""
    report = build_report(beads, now=now, project=project, scope=PeriodScope(days))
    blocked = sum(
        1
        for b in beads
        if b.issue_type != "milestone"
        and b.status != "closed"
        and b.blocked
        and not is_prep(b.labels)
    )
    empty = _empty_kpis(blocked)
    return empty.model_copy(
        update={
            "beads": empty.beads.model_copy(update={"done": report.totals.closed}),
            "rework": empty.rework.model_copy(update={"rate": report.totals.rework_rate}),
        }
    )


def _item(day: date, kind: str, bead: ReportBead, **fields: object) -> ScopeChange:
    return ScopeChange.model_validate(
        {"day": day, "kind": kind, "id": bead.id, "title": bead.title, **fields}
    )


def changes(
    beads: list[ReportBead],
    pairs: Pairs,
    series: list[BurnupDay],
    milestone: ReportBead,
    last: date,
) -> Changes:
    """Scope changes on the days after the first day (REQ-REPORTS-024)."""
    first = first_day(milestone)
    items: list[ScopeChange] = []
    before = {b.id for b in epics_on(beads, milestone.id, first)}
    for n in range(1, (last - first).days + 1):
        day = first + timedelta(days=n)
        now = epics_on(beads, milestone.id, day)
        for epic in now:
            if epic.id not in before:
                items.append(_item(day, "epic_added", epic, points=points_on(epic, day)))
            for entry in epic.points_history:
                if entry.day != day or (entry.before is None and entry.after is None):
                    continue
                if entry.before is None:
                    items.append(_item(day, "estimated", epic, after=entry.after))
                elif entry.before != entry.after:
                    items.append(
                        _item(day, "re_estimated", epic, before=entry.before, after=entry.after)
                    )
        here = {b.id for b in now}
        yesterday = day - timedelta(days=1)
        items += [
            _item(day, "epic_removed", epic, points=points_on(epic, yesterday))
            for epic in epics_on(beads, milestone.id, yesterday)
            if epic.id not in here
        ]
        before = here
    for bead, epic in pairs:
        if bead.issue_type == "bug" and first < day_of(bead.created_at) <= last:
            items.append(
                _item(
                    day_of(bead.created_at),
                    "bug_added",
                    bead,
                    epic=TeamEpic(id=epic.id, title=epic.title),
                    person=member_of(bead),
                )
            )
    items.sort(key=lambda c: (-c.day.toordinal(), c.id))
    return Changes(
        scope_from=series[0].scope_points if series else None,
        scope_to=series[-1].scope_points if series else None,
        items=items,
    )


def _blocker(tree: Tree, bead: ReportBead) -> Blocker | None:
    """The first by id of the open beads the bead waits on, else its nearest blocked ancestor."""
    owner = bead if bead.blockers else _blocked_ancestor(tree, bead)
    for ident in sorted(owner.blockers) if owner else []:
        found = tree.index.get((bead.project, ident))
        if found is not None:
            return Blocker(
                id=found.id, title=found.title, person=member_of(found), blocked=found.blocked
            )
    return None


def risks(
    tree: Tree,
    waits: list[tuple[ReportBead, int]],
    milestone: ReportBead,
    beads: list[ReportBead],
    today: date,
) -> Risks:
    """The longest blocked beads and the open epics without points (REQ-REPORTS-025)."""
    return Risks(
        blocked=[
            BlockedRisk(id=b.id, title=b.title, days=days, blocker=_blocker(tree, b))
            for b, days in waits[:RISKS_SHOWN]
        ],
        blocked_more=max(len(waits) - RISKS_SHOWN, 0),
        unestimated=[
            TeamEpic(id=e.id, title=e.title)
            for e in epics_on(beads, milestone.id, today)
            if e.status != "closed" and points_on(e, today) is None
        ],
    )


def epic_rows(beads: list[ReportBead], milestone: ReportBead, today: date) -> list[StatusEpic]:
    """One row per epic of the milestone today (REQ-REPORTS-026)."""
    return [
        StatusEpic(
            id=e.id,
            title=e.title,
            status=e.status,
            points=points_on(e, today),
            person=member_of(e),
            closed_on=day_of(e.closed_at) if e.status == "closed" and e.closed_at else None,
            child_counts=e.child_counts or ChildCounts(),
        )
        for e in epics_on(beads, milestone.id, today)
    ]


def _milestone_bead(beads: list[ReportBead], chosen: TeamMilestone) -> ReportBead:
    found = next(b for b in beads if b.id == chosen.id and b.issue_type == "milestone")
    return found


def build_status(
    beads: list[ReportBead], *, now: datetime, project: str, scope: Scope | None
) -> StatusReport:
    today = day_of(now)
    milestones, undated = list_milestones(beads, today)
    days = scope.days if isinstance(scope, PeriodScope) else None
    wanted = scope.id if isinstance(scope, MilestoneScope) else None
    chosen = None if days is not None else select_milestone(milestones, wanted, today)

    def bare(figures: StatusKpis) -> StatusReport:
        """A report with no milestone: a period, or a project without milestones."""
        return StatusReport(
            generated_at=now,
            project=project,
            today=today,
            milestones=milestones,
            undated=undated,
            milestone=None,
            days=days,
            period=None,
            kpis=figures,
            burnup=[],
            changes=Changes(scope_from=None, scope_to=None, items=[]),
            risks=Risks(blocked=[], blocked_more=0, unestimated=[]),
            epics=[],
        )

    if days is not None:
        return bare(period_kpis(beads, now=now, project=project, days=days))
    if chosen is None:
        return bare(_empty_kpis(0))
    milestone = _milestone_bead(beads, chosen)
    tree = Tree(beads)
    pairs = milestone_scope(tree, beads, chosen.id)
    last = chosen.closed_on if chosen.status == "closed" and chosen.closed_on else today
    series = burnup(tree, beads, milestone, last)
    rows, reworks = team_rows(pairs, now, chosen)
    team = team_totals(rows, reworks, today=today, milestone=chosen)
    waits = blocked_waits(tree, pairs, today)
    assert team.working_days is not None and team.elapsed is not None and team.days_left is not None
    return StatusReport(
        generated_at=now,
        project=project,
        today=today,
        milestones=milestones,
        undated=undated,
        milestone=chosen.id,
        days=None,
        period=StatusPeriod(
            kickoff=parse_date(milestone.kickoff),
            working_days=team.working_days,
            elapsed=team.elapsed,
            days_left=team.days_left,
        ),
        kpis=kpis(pairs, series, team, waits, first=first_day(milestone), today=today),
        burnup=series,
        changes=changes(beads, pairs, series, milestone, last),
        risks=risks(tree, waits, milestone, beads, today),
        epics=epic_rows(beads, milestone, today),
    )
