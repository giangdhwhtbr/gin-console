"""Report sections from the beads of one or more projects (spec REQ-REPORTS-004, 005)."""

import statistics
from collections import Counter, defaultdict
from collections.abc import Callable, Iterable
from datetime import UTC, date, datetime, timedelta

from gin_console.beads.definitions import person_key
from gin_console.reports.models import (
    DeliverySection,
    EpicQuality,
    EstimateRow,
    QualityRow,
    QualitySection,
    Report,
    ReportBead,
    Stat,
    TimeRow,
    Totals,
    WeekRow,
)

UNASSIGNED = "Unassigned"
TOP = 10
WORKDAY_MINUTES = 480  # gin-workflow workflow_core/milestone.py WORKDAY_MINUTES
DAY = 86400.0

Key = tuple[str, str]  # (project, bead id)


def _key(bead: ReportBead) -> Key:
    return (bead.project, bead.id)


def member_of(bead: ReportBead) -> str:
    return person_key(bead.assignee) or UNASSIGNED


class _Tree:
    def __init__(self, beads: list[ReportBead]) -> None:
        self.index: dict[Key, ReportBead] = {_key(b): b for b in beads}
        self.children: dict[Key, list[ReportBead]] = defaultdict(list)
        for bead in beads:
            if bead.parent:
                self.children[(bead.project, bead.parent)].append(bead)

    def _lineage(self, bead: ReportBead) -> Iterable[ReportBead]:
        """The bead, then its ancestors; stops on a cycle or a parent outside the list."""
        seen: set[Key] = set()
        current: ReportBead | None = bead
        while current is not None and _key(current) not in seen:
            yield current
            seen.add(_key(current))
            parent = current.parent
            current = self.index.get((current.project, parent)) if parent else None

    def epics_of(self, bead: ReportBead) -> list[ReportBead]:
        """Every epic in the bead's lineage: itself when it is one, then its epic ancestors."""
        return [b for b in self._lineage(bead) if b.issue_type == "epic"]

    def under(self, bead: ReportBead, roots: set[Key]) -> bool:
        return any(_key(b) in roots for b in self._lineage(bead))


def _closed_at(bead: ReportBead) -> datetime:
    assert bead.closed_at is not None  # only closed beads with closed_at are selected
    return bead.closed_at


def _rework(bead: ReportBead) -> int:
    return bead.reopens + bead.bugs


def _rate(beads: list[ReportBead]) -> float | None:
    if not beads:
        return None
    return round(sum(1 for b in beads if _rework(b) > 0) / len(beads), 4)


def _stat(values: list[float]) -> Stat | None:
    if not values:
        return None
    ordered = sorted(values)
    p85 = (
        ordered[0]
        if len(ordered) == 1
        else statistics.quantiles(ordered, n=100, method="inclusive")[84]
    )
    return Stat(n=len(ordered), median=round(statistics.median(ordered), 2), p85=round(p85, 2))


def _span(start: datetime | None, end: datetime | None) -> float | None:
    if start is None or end is None or end < start:
        return None
    return (end - start).total_seconds() / DAY


def _week(day: date) -> str:
    year, week, _ = day.isocalendar()
    return f"{year}-W{week:02d}"


def _weeks(first: date, last: date) -> list[str]:
    weeks: list[str] = []
    monday = first - timedelta(days=first.weekday())
    while monday <= last:
        weeks.append(_week(monday))
        monday += timedelta(days=7)
    return weeks


def _weekdays(first: date, last: date) -> int:
    return sum(
        1 for n in range((last - first).days + 1) if (first + timedelta(days=n)).weekday() < 5
    )


def _times(closed: list[ReportBead], key: Callable[[ReportBead], str]) -> list[TimeRow]:
    cycle: dict[str, list[float]] = defaultdict(list)
    lead: dict[str, list[float]] = defaultdict(list)
    for bead in closed:
        if (days := _span(bead.started_at, bead.closed_at)) is not None:
            cycle[key(bead)].append(days)
        if (days := _span(bead.created_at, bead.closed_at)) is not None:
            lead[key(bead)].append(days)
    return [
        TimeRow(key=k, cycle=_stat(cycle.get(k, [])), lead=_stat(lead.get(k, [])))
        for k in sorted({key(b) for b in closed})
    ]


def _delivery(
    closed: list[ReportBead], now: datetime, days: int, sprint: str | None
) -> DeliverySection:
    counts: dict[str, Counter[str]] = defaultdict(Counter)
    for bead in closed:
        counts[_week(_closed_at(bead).astimezone(UTC).date())][bead.issue_type] += 1
    if sprint is None:
        weeks = _weeks(
            (now - timedelta(days=days)).astimezone(UTC).date(), now.astimezone(UTC).date()
        )
    else:
        dates = [_closed_at(b).astimezone(UTC).date() for b in closed]
        weeks = _weeks(min(dates), max(dates)) if dates else []
    estimates = [
        EstimateRow(
            project=b.project,
            id=b.id,
            title=b.title,
            estimate_days=(
                round(b.estimated_minutes / WORKDAY_MINUTES, 1) if b.estimated_minutes else None
            ),
            points=b.points,
            actual_days=actual,
            days_per_point=round(actual / b.points, 1) if b.points else None,
        )
        for b in closed
        if b.issue_type == "epic" and (b.estimated_minutes or b.points)
        for actual in [_weekdays((b.started_at or b.created_at).date(), _closed_at(b).date())]
    ]
    return DeliverySection(
        weeks=[WeekRow(week=w, counts=dict(counts.get(w, Counter()))) for w in weeks],
        by_type=_times(closed, lambda b: b.issue_type),
        by_member=_times(closed, member_of),
        overall=(_times(closed, lambda _: "all") or [TimeRow(key="all", cycle=None, lead=None)])[0],
        estimates=estimates,
    )


def _totals(closed: list[ReportBead]) -> Totals:
    return Totals(closed=len(closed), rework_rate=_rate(closed))


def _member_row(name: str, beads: list[ReportBead]) -> QualityRow:
    return QualityRow(
        member=name,
        closed=len(beads),
        reopens=sum(b.reopens for b in beads),
        bugs=sum(b.bugs for b in beads),
        rework_rate=_rate(beads),
    )


def _quality(tree: _Tree, closed: list[ReportBead]) -> QualitySection:
    by_member: dict[str, list[ReportBead]] = defaultdict(list)
    by_epic: dict[Key, list[ReportBead]] = defaultdict(list)
    for bead in closed:
        by_member[member_of(bead)].append(bead)
        if nearest := tree.epics_of(bead):
            by_epic[_key(nearest[0])].append(bead)
    members = [_member_row(name, beads) for name, beads in by_member.items()]
    members.sort(key=lambda r: (r.member == UNASSIGNED, -r.closed, r.member))
    epics = [
        EpicQuality(
            project=key[0],
            id=key[1],
            title=tree.index[key].title,
            closed=len(beads),
            reopens=sum(b.reopens for b in beads),
            bugs=sum(b.bugs for b in beads),
            rework_rate=_rate(beads),
        )
        for key, beads in by_epic.items()
    ]
    epics.sort(key=lambda r: (-(r.reopens + r.bugs), -r.closed, r.id))
    return QualitySection(members=members, epics=epics[:TOP])


def build_report(
    beads: list[ReportBead],
    *,
    now: datetime,
    project: str,
    days: int,
    sprint: str | None,
) -> Report:
    tree = _Tree(beads)
    if sprint is None:
        scope = beads
        since = now - timedelta(days=days)
        closed = [
            b
            for b in beads
            if b.status == "closed" and b.closed_at is not None and b.closed_at >= since
        ]
    else:
        roots = {
            _key(b) for b in beads if b.issue_type == "epic" and f"sprint:{sprint}" in b.labels
        }
        scope = [b for b in beads if tree.under(b, roots)]
        closed = [b for b in scope if b.status == "closed" and b.closed_at is not None]
    closed.sort(key=_key)
    return Report(
        generated_at=now,
        project=project,
        days=days,
        sprint=sprint,
        totals=_totals(closed),
        delivery=_delivery(closed, now, days, sprint),
        quality=_quality(tree, closed),
    )
