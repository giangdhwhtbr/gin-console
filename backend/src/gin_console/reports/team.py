"""The Team report of one milestone (spec REQ-REPORTS-008..011), built from the project's beads.

Dates are local (`astimezone()`); the working days are Monday to Friday."""

import statistics
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta

from gin_console.beads.milestones import current_milestone, milestone_status, parse_date
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
from gin_console.reports.service import DAY, UNASSIGNED, _key, _span, _Tree

PACE_WINDOW = 5  # working days behind `throughput`


def _day(moment: datetime) -> date:
    return moment.astimezone().date()


def _workday(day: date) -> date:
    """A weekend day counts on the Friday before it."""
    return day - timedelta(days=max(day.weekday() - 4, 0))


def _workdays(first: date, last: date) -> list[date]:
    days = (first + timedelta(days=n) for n in range((last - first).days + 1))
    return [d for d in days if d.weekday() < 5]


def _member(row: TeamBead) -> str:
    return row.assignee or UNASSIGNED


def _milestones(beads: list[ReportBead], today: date) -> tuple[list[TeamMilestone], int]:
    found: list[TeamMilestone] = []
    undated = 0
    for m in beads:
        if m.issue_type != "milestone":
            continue
        start, end = parse_date(m.start), parse_date(m.end)
        if start is None or end is None:
            undated += 1
            continue
        closed_on = _day(m.closed_at) if m.status == "closed" and m.closed_at else None
        found.append(
            TeamMilestone(
                id=m.id,
                title=m.title,
                status=milestone_status(m.status == "closed", m.kickoff, today),
                start=start,
                end=end,
                closed_on=closed_on,
            )
        )
    found.sort(key=lambda m: (m.start, m.id))
    return found, undated


def _default(milestones: list[TeamMilestone], today: date) -> TeamMilestone:
    found = current_milestone(milestones, today)
    if found is not None:
        return found
    pool = [m for m in milestones if m.status == "closed"] or milestones
    return min(pool, key=lambda m: (-m.end.toordinal(), m.id))


def _scope(
    tree: _Tree, beads: list[ReportBead], milestone_id: str
) -> list[tuple[ReportBead, ReportBead]]:
    """(bead, nearest epic) of beads under an epic of the milestone; an epic while childless."""
    rows: list[tuple[ReportBead, ReportBead]] = []
    for bead in beads:
        if bead.issue_type == "milestone":
            continue
        if bead.issue_type == "epic" and tree.children.get(_key(bead)):
            continue  # split into tasks: its children carry the work
        epics = tree.epics_of(bead)
        if any(e.parent == milestone_id for e in epics):
            rows.append((bead, epics[0]))
    rows.sort(key=lambda r: r[0].id)
    return rows


def _figures(
    rows: list[TeamBead],
    reworks: dict[str, tuple[int, int]],
    last: set[date],
    closed_span: int | None,
) -> TeamFigures:
    done = [r for r in rows if r.bucket == "closed"]
    active = [r for r in rows if r.bucket == "in_progress"]
    waiting = [r for r in rows if r.bucket == "open"]
    cycles = [s for r in done if (s := _span(r.started_at, r.closed_at)) is not None]
    ages = [r.age_days for r in active if r.age_days is not None]
    measured = [r for r in done if r.rework is not None]
    if closed_span is None:
        throughput = float(
            sum(1 for r in done if r.closed_at is not None and _workday(_day(r.closed_at)) in last)
        )
    else:
        throughput = round(len(done) / closed_span * PACE_WINDOW, 1)
    return TeamFigures(
        scope=len(rows),
        closed=len(done),
        in_progress=len(active),
        open=len(waiting),
        blocked=sum(1 for r in waiting if r.status == "blocked"),
        unclaimed=sum(1 for r in waiting if r.assignee is None),
        done=round(len(done) / len(rows), 4) if rows else None,
        throughput=throughput,
        cycle_median=round(statistics.median(cycles), 2) if cycles else None,
        oldest_in_progress=max(ages) if ages else None,
        on_time=round(sum(1 for r in done if r.late_days == 0) / len(done), 4) if done else None,
        rework_rate=(
            round(sum(1 for r in measured if (r.rework or 0) > 0) / len(measured), 4)
            if measured
            else None
        ),
        reopens=sum(reworks[r.id][0] for r in done if r.id in reworks),
        bugs=sum(reworks[r.id][1] for r in done if r.id in reworks),
    )


def build_team(
    beads: list[ReportBead], *, now: datetime, project: str, milestone: str | None
) -> TeamReport:
    today = _day(now)
    milestones, undated = _milestones(beads, today)
    if not milestones:
        return TeamReport(
            generated_at=now,
            project=project,
            today=today,
            milestones=[],
            undated=undated,
            milestone=None,
            team=None,
            members=[],
            days=[],
            beads=[],
        )
    chosen = next((m for m in milestones if m.id == milestone), None) or _default(milestones, today)
    tree = _Tree(beads)
    rows: list[TeamBead] = []
    reworks: dict[str, tuple[int, int]] = {}
    for bead, epic in _scope(tree, beads, chosen.id):
        bucket: BeadBucket = (
            "closed"
            if bead.status == "closed"
            else "in_progress"
            if bead.status == "in_progress"
            else "open"
        )
        cycle = _span(bead.started_at, bead.closed_at) if bucket == "closed" else None
        own = tree.own(bead)
        if own is not None:
            reworks[bead.id] = (own.quality.reopens, own.quality.bugs)
        rows.append(
            TeamBead(
                id=bead.id,
                title=bead.title,
                issue_type=bead.issue_type,
                status=bead.status,
                bucket=bucket,
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
                    len(_workdays(chosen.end + timedelta(days=1), _day(bead.closed_at)))
                    if bucket == "closed" and bead.closed_at is not None
                    else None
                ),
                rework=(own.quality.reopens + own.quality.bugs if own is not None else None),
            )
        )
    last = set(_workdays(today - timedelta(days=14), today)[-PACE_WINDOW:])
    is_closed = chosen.status == "closed"
    closed_span = (
        max(len(_workdays(chosen.start, chosen.closed_on or chosen.end)), 1) if is_closed else None
    )
    by_member: dict[str, list[TeamBead]] = defaultdict(list)
    for r in rows:
        by_member[_member(r)].append(r)
    members = [
        MemberFigures(member=name, **_figures(mine, reworks, last, closed_span).model_dump())
        for name, mine in sorted(
            by_member.items(), key=lambda kv: (kv[0] == UNASSIGNED, -len(kv[1]), kv[0])
        )
    ]
    totals = _figures(rows, reworks, last, closed_span)
    working_days = len(_workdays(chosen.start, chosen.end))
    days_left = (
        working_days
        if today < chosen.start
        else len(_workdays(today + timedelta(days=1), chosen.end))
    )
    waiting = totals.open + totals.in_progress
    team = TeamTotals(
        **totals.model_dump(),
        working_days=working_days,
        elapsed=0 if today < chosen.start else len(_workdays(chosen.start, min(today, chosen.end))),
        days_left=days_left,
        pace=round(totals.throughput / PACE_WINDOW, 2),
        pace_needed=None if is_closed or days_left == 0 else round(waiting / days_left, 2),
        late_open=waiting if not is_closed and today > chosen.end else 0,
    )
    horizon = max(chosen.end, chosen.closed_on if is_closed and chosen.closed_on else today)
    calendar = _workdays(chosen.start, horizon)
    per_day: dict[date, Counter[str]] = {d: Counter() for d in calendar}
    for r in rows:
        if r.bucket == "closed" and r.closed_at is not None and calendar:
            day = min(max(_workday(_day(r.closed_at)), calendar[0]), calendar[-1])
            per_day[day][_member(r)] += 1
    return TeamReport(
        generated_at=now,
        project=project,
        today=today,
        milestones=milestones,
        undated=undated,
        milestone=chosen.id,
        team=team,
        members=members,
        days=[DayRow(date=d, closed=dict(per_day[d])) for d in calendar],
        beads=rows,
    )
