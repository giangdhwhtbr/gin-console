"""The bugs report of a milestone or a period (spec REQ-REPORTS-039..042), built from the
project's beads. Every date is a local date (`day_of`); datetimes are never compared."""

import statistics
from collections import defaultdict
from datetime import date, datetime, timedelta

from gin_console.beads.definitions import person_key
from gin_console.reports.models import (
    BugEpic,
    BugFigures,
    BugPeriod,
    BugsReport,
    BugWeek,
    EpicRef,
    OpenBug,
    ReportBead,
)
from gin_console.reports.scope import (
    MilestoneScope,
    PeriodScope,
    Scope,
    Tree,
    day_of,
    list_milestones,
    select_milestone,
)


def is_bug(bead: ReportBead) -> bool:
    """Merge gates are already left out by `read_beads` (REQ-BEADS-019)."""
    return bead.issue_type == "bug"


def source_epic(tree: Tree, bug: ReportBead) -> ReportBead | None:
    """The epic a bug comes from (REQ-REPORTS-040): that of its first `discovered-from`
    target in the project that reaches one, else the nearest epic among its parents."""
    for ident in bug.found_in:
        target = tree.index.get((bug.project, ident))
        epics = tree.epics_of(target) if target is not None else []
        if epics:
            return epics[0]
    epics = tree.epics_of(bug)
    return epics[0] if epics else None


def bug_period(
    beads: list[ReportBead], today: date, scope: Scope | None
) -> tuple[str | None, int | None, BugPeriod | None]:
    """The `milestone`, `days` and `period` of REQ-REPORTS-039."""
    if isinstance(scope, PeriodScope):
        return None, scope.days, BugPeriod(start=today - timedelta(days=scope.days), end=today)
    wanted = scope.id if isinstance(scope, MilestoneScope) else None
    milestones, _ = list_milestones(beads, today)
    chosen = select_milestone(milestones, wanted, today)
    if chosen is None:
        return None, None, None
    end = min(chosen.end, today)
    if end < chosen.start:
        return chosen.id, None, None  # not started
    return chosen.id, None, BugPeriod(start=chosen.start, end=end)


def _monday(day: date) -> date:
    return day - timedelta(days=day.weekday())


def _weeks(period: BugPeriod | None, opened: list[date], closed: list[date]) -> list[BugWeek]:
    if period is None:
        return []
    weeks: list[BugWeek] = []
    monday = _monday(period.start)
    while monday <= period.end:
        week = range(monday.toordinal(), monday.toordinal() + 7)
        weeks.append(
            BugWeek(
                start=monday,
                opened=sum(1 for d in opened if d.toordinal() in week),
                closed=sum(1 for d in closed if d.toordinal() in week),
            )
        )
        monday += timedelta(days=7)
    return weeks


def _in(period: BugPeriod | None, day: date) -> bool:
    return period is not None and period.start <= day <= period.end


def _counts(bugs: list[ReportBead], period: BugPeriod | None) -> tuple[int, int, int]:
    """(opened, closed, open now) of `bugs` as REQ-REPORTS-041 counts them."""
    return (
        sum(1 for b in bugs if _in(period, day_of(b.created_at))),
        sum(1 for b in bugs if _closed_in(b, period) is not None),
        sum(1 for b in bugs if b.status != "closed"),
    )


def _closed_in(bug: ReportBead, period: BugPeriod | None) -> date | None:
    """The local close date of a bug that `closed` counts, else None."""
    if bug.status != "closed" or bug.closed_at is None:
        return None
    day = day_of(bug.closed_at)
    return day if _in(period, day) else None


def _figures(bugs: list[ReportBead], period: BugPeriod | None, today: date) -> BugFigures:
    opened, closed, open_now = _counts(bugs, period)
    open_days = [day_of(b.created_at) for b in bugs if b.status != "closed"]
    spans = [
        max(0, (done - day_of(b.created_at)).days)
        for b in bugs
        if (done := _closed_in(b, period)) is not None
    ]
    return BugFigures(
        total=len(bugs),
        opened=opened,
        closed=closed,
        open_now=open_now,
        oldest_open_days=(today - min(open_days)).days if open_days else None,
        median_close_days=round(statistics.median(spans), 1) if spans else None,
    )


def _epic_rows(
    bugs: list[ReportBead], tree: Tree, period: BugPeriod | None
) -> tuple[list[BugEpic], dict[str, ReportBead | None]]:
    sources = {b.id: source_epic(tree, b) for b in bugs}
    groups: dict[str | None, list[ReportBead]] = defaultdict(list)
    for b in bugs:
        epic = sources[b.id]
        groups[epic.id if epic else None].append(b)
    rows: list[BugEpic] = []
    for ident, group in groups.items():
        opened, closed, open_now = _counts(group, period)
        if opened or closed or open_now:
            epic = tree.index.get((group[0].project, ident)) if ident else None
            rows.append(
                BugEpic(
                    id=ident,
                    title=epic.title if epic else None,
                    opened=opened,
                    closed=closed,
                    open_now=open_now,
                )
            )
    rows.sort(key=lambda r: (r.id is None, -(r.opened + r.closed), -r.open_now, r.id or ""))
    return rows, sources


def build_bugs(
    beads: list[ReportBead], *, now: datetime, project: str, scope: Scope | None
) -> BugsReport:
    today = day_of(now)
    milestone, days, period = bug_period(beads, today, scope)
    bugs = [b for b in beads if is_bug(b)]
    tree = Tree(beads)
    epics, sources = _epic_rows(bugs, tree, period)
    created = [day_of(b.created_at) for b in bugs if _in(period, day_of(b.created_at))]
    closed = [d for b in bugs if (d := _closed_in(b, period)) is not None]
    waiting = [
        OpenBug(
            id=b.id,
            title=b.title,
            priority=b.priority,
            assignee=person_key(b.assignee),
            age_days=(today - day_of(b.created_at)).days,
            epic=EpicRef(id=e.id, title=e.title) if (e := sources[b.id]) else None,
        )
        for b in bugs
        if b.status != "closed"
    ]
    waiting.sort(
        key=lambda b: (-b.age_days, b.priority if b.priority is not None else 1 << 30, b.id)
    )
    return BugsReport(
        generated_at=now,
        project=project,
        today=today,
        milestone=milestone,
        days=days,
        period=period,
        figures=_figures(bugs, period, today),
        weeks=_weeks(period, created, closed),
        epics=epics,
        open=waiting,
    )
