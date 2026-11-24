"""The Team report of a milestone or a period (spec REQ-REPORTS-008..011), built from the
project's beads, and the figures the Status report reuses (`team_rows`, `team_totals`).

Dates are local (`astimezone()`); the working days are Monday to Friday."""

import statistics
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta

from gin_console.beads.definitions import person_key
from gin_console.reports.models import (
    BeadBucket,
    DayRow,
    MemberFigures,
    ReportBead,
    TeamBead,
    TeamEpic,
    TeamFigures,
    TeamMilestone,
    TeamReport,
    TeamTotals,
)
from gin_console.reports.scope import (
    MilestoneScope,
    PeriodScope,
    Scope,
    Tree,
    day_of,
    list_milestones,
    milestone_scope,
    period_scope,
    select_milestone,
    workday,
    workdays,
)
from gin_console.reports.service import DAY, UNASSIGNED, _rework, _span

PACE_WINDOW = 5  # working days behind `throughput`

Reworks = dict[str, tuple[int, int]]  # bead id -> (reopens, bugs)


def _member(row: TeamBead) -> str:
    return person_key(row.assignee) or UNASSIGNED


def _figures(
    rows: list[TeamBead],
    reworks: dict[str, tuple[int, int]],
    last: set[date],
    closed_span: int | None,
    period: bool,
) -> TeamFigures:
    done = [r for r in rows if r.bucket == "closed"]
    active = [r for r in rows if r.bucket == "in_progress"]
    waiting = [r for r in rows if r.bucket == "open"]
    cycles = [s for r in done if (s := _span(r.started_at, r.closed_at)) is not None]
    ages = [r.age_days for r in active if r.age_days is not None]
    if closed_span is None:
        throughput = float(
            sum(1 for r in done if r.closed_at is not None and workday(day_of(r.closed_at)) in last)
        )
    else:
        throughput = round(len(done) / closed_span * PACE_WINDOW, 1)
    return TeamFigures(
        scope=len(rows),
        closed=len(done),
        in_progress=len(active),
        open=len(waiting),
        blocked=sum(1 for r in rows if r.bucket != "closed" and r.blocked),
        unclaimed=sum(1 for r in waiting if r.assignee is None),
        done=round(len(done) / len(rows), 4) if rows else None,
        throughput=throughput,
        cycle_median=round(statistics.median(cycles), 2) if cycles else None,
        oldest_in_progress=max(ages) if ages else None,
        on_time=(
            round(sum(1 for r in done if r.late_days == 0) / len(done), 4)
            if done and not period
            else None
        ),
        rework_rate=(round(sum(1 for r in done if r.rework > 0) / len(done), 4) if done else None),
        reopens=sum(reworks[r.id][0] for r in done),
        bugs=sum(reworks[r.id][1] for r in done),
    )


def _empty(now: datetime, project: str, today: date, undated: int, days: int | None) -> TeamReport:
    return TeamReport(
        generated_at=now,
        project=project,
        today=today,
        milestones=[],
        undated=undated,
        milestone=None,
        period_days=days,
        team=None,
        members=[],
        days=[],
        beads=[],
    )


def _row(
    bead: ReportBead,
    epic: ReportBead,
    now: datetime,
    end: date | None,
) -> TeamBead:
    """One scope bead; `end` is the milestone's end, None for a period (no `late_days`)."""
    bucket: BeadBucket = (
        "closed"
        if bead.status == "closed"
        else "in_progress"
        if bead.status == "in_progress" and not bead.blocked
        else "open"
    )
    cycle = _span(bead.started_at, bead.closed_at) if bucket == "closed" else None
    return TeamBead(
        id=bead.id,
        title=bead.title,
        issue_type=bead.issue_type,
        status=bead.status,
        bucket=bucket,
        blocked=bead.blocked,
        assignee=bead.assignee,
        priority=bead.priority,
        created_at=bead.created_at,
        epic=TeamEpic(id=epic.id, title=epic.title),
        started_at=bead.started_at,
        closed_at=bead.closed_at if bucket == "closed" else None,
        cycle_days=round(cycle, 1) if cycle is not None else None,
        age_days=(
            round((now - (bead.started_at or bead.updated_at)).total_seconds() / DAY, 1)
            if bucket == "in_progress"
            else None
        ),
        late_days=(
            len(workdays(end + timedelta(days=1), day_of(bead.closed_at)))
            if end is not None and bucket == "closed" and bead.closed_at is not None
            else None
        ),
        rework=_rework(bead),
    )


def team_rows(
    pairs: list[tuple[ReportBead, ReportBead]], now: datetime, milestone: TeamMilestone | None
) -> tuple[list[TeamBead], Reworks]:
    """The scope rows of (bead, nearest epic) pairs; `milestone` None is a period."""
    end = milestone.end if milestone else None
    rows = [_row(bead, epic, now, end) for bead, epic in pairs]
    return rows, {b.id: (b.reopens, b.bugs) for b, _ in pairs}


def _window(today: date, milestone: TeamMilestone | None) -> tuple[set[date], int | None]:
    """The working days behind `throughput`, and the span of a closed milestone, else None."""
    last = set(workdays(today - timedelta(days=14), today)[-PACE_WINDOW:])
    closed = milestone is not None and milestone.status == "closed"
    span = (
        max(len(workdays(milestone.start, milestone.closed_on or milestone.end)), 1)
        if milestone is not None and closed
        else None
    )
    return last, span


def team_totals(
    rows: list[TeamBead], reworks: Reworks, *, today: date, milestone: TeamMilestone | None
) -> TeamTotals:
    """The team figures of REQ-REPORTS-010 over `rows`; `milestone` None is a period."""
    last, closed_span = _window(today, milestone)
    totals = _figures(rows, reworks, last, closed_span, milestone is None)
    waiting = totals.open + totals.in_progress
    pace = round(totals.throughput / PACE_WINDOW, 2)
    if milestone is None:
        return TeamTotals(
            **totals.model_dump(),
            working_days=None,
            elapsed=None,
            days_left=None,
            pace=pace,
            pace_needed=None,
            late_open=0,
        )
    is_closed = milestone.status == "closed"
    working_days = len(workdays(milestone.start, milestone.end))
    days_left = (
        working_days
        if today < milestone.start
        else len(workdays(today + timedelta(days=1), milestone.end))
    )
    return TeamTotals(
        **totals.model_dump(),
        working_days=working_days,
        elapsed=0
        if today < milestone.start
        else len(workdays(milestone.start, min(today, milestone.end))),
        days_left=days_left,
        pace=pace,
        pace_needed=None if is_closed or days_left == 0 else round(waiting / days_left, 2),
        late_open=waiting if not is_closed and today > milestone.end else 0,
    )


def build_team(
    beads: list[ReportBead], *, now: datetime, project: str, scope: Scope | None
) -> TeamReport:
    today = day_of(now)
    milestones, undated = list_milestones(beads, today)
    period = scope.days if isinstance(scope, PeriodScope) else None
    wanted = scope.id if isinstance(scope, MilestoneScope) else None
    chosen = None if period is not None else select_milestone(milestones, wanted, today)
    if chosen is None and period is None:
        return _empty(now, project, today, undated, None)
    tree = Tree(beads)
    if chosen is not None:
        pairs = milestone_scope(tree, beads, chosen.id)
    else:
        assert period is not None
        pairs = period_scope(tree, beads, period, now)
    rows, reworks = team_rows(pairs, now, chosen)
    last, closed_span = _window(today, chosen)
    by_member: dict[str, list[TeamBead]] = defaultdict(list)
    for r in rows:
        by_member[_member(r)].append(r)
    members = [
        MemberFigures(
            member=name, **_figures(mine, reworks, last, closed_span, chosen is None).model_dump()
        )
        for name, mine in sorted(
            by_member.items(), key=lambda kv: (kv[0] == UNASSIGNED, -len(kv[1]), kv[0])
        )
    ]
    team = team_totals(rows, reworks, today=today, milestone=chosen)
    if chosen is not None:
        first = chosen.start
        is_closed = chosen.status == "closed"
        horizon = max(chosen.end, chosen.closed_on if is_closed and chosen.closed_on else today)
    else:
        assert period is not None
        first, horizon = today - timedelta(days=period), today
    calendar = workdays(first, horizon)
    per_day: dict[date, Counter[str]] = {d: Counter() for d in calendar}
    for r in rows:
        if r.bucket == "closed" and r.closed_at is not None and calendar:
            day = min(max(workday(day_of(r.closed_at)), calendar[0]), calendar[-1])
            per_day[day][_member(r)] += 1
    return TeamReport(
        generated_at=now,
        project=project,
        today=today,
        milestones=milestones,
        undated=undated,
        milestone=chosen.id if chosen else None,
        period_days=period,
        team=team,
        members=members,
        days=[DayRow(date=d, closed=dict(per_day[d])) for d in calendar],
        beads=rows,
    )
