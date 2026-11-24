"""The scope of a report: one milestone or a period of days (spec REQ-REPORTS-001, 008, 009)."""

from collections import defaultdict
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import date, datetime, timedelta

from gin_console.beads.milestones import current_milestone, milestone_status, parse_date
from gin_console.beads.prep import is_prep
from gin_console.reports.models import ReportBead, TeamMilestone

Key = tuple[str, str]  # (project, bead id)


def _key(bead: ReportBead) -> Key:
    return (bead.project, bead.id)


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


@dataclass(frozen=True)
class MilestoneScope:
    id: str


@dataclass(frozen=True)
class PeriodScope:
    days: int


Scope = MilestoneScope | PeriodScope


def day_of(moment: datetime) -> date:
    return moment.astimezone().date()


def workday(day: date) -> date:
    """A weekend day counts on the Friday before it."""
    return day - timedelta(days=max(day.weekday() - 4, 0))


def workdays(first: date, last: date) -> list[date]:
    days = (first + timedelta(days=n) for n in range((last - first).days + 1))
    return [d for d in days if d.weekday() < 5]


def list_milestones(beads: list[ReportBead], today: date) -> tuple[list[TeamMilestone], int]:
    found: list[TeamMilestone] = []
    undated = 0
    for m in beads:
        if m.issue_type != "milestone":
            continue
        start, end = parse_date(m.start), parse_date(m.end)
        if start is None or end is None:
            undated += 1
            continue
        closed_on = day_of(m.closed_at) if m.status == "closed" and m.closed_at else None
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


def default_milestone(milestones: list[TeamMilestone], today: date) -> TeamMilestone:
    found = current_milestone(milestones, today)
    if found is not None:
        return found
    pool = [m for m in milestones if m.status == "closed"] or milestones
    return min(pool, key=lambda m: (-m.end.toordinal(), m.id))


def select_milestone(
    milestones: list[TeamMilestone], wanted: str | None, today: date
) -> TeamMilestone | None:
    """The listed `wanted`, else the default; None when nothing is listed."""
    if not milestones:
        return None
    return next((m for m in milestones if m.id == wanted), None) or default_milestone(
        milestones, today
    )


def _tracked(tree: _Tree, bead: ReportBead) -> bool:
    """False for a milestone, a prep task, or an epic split into tasks (its children carry it)."""
    if bead.issue_type == "milestone" or is_prep(bead.labels):
        return False  # prep tasks are not tracked work (REQ-BEADS-002)
    tracks = [c for c in tree.children.get(_key(bead), []) if not is_prep(c.labels)]
    return not (bead.issue_type == "epic" and tracks)


def milestone_scope(
    tree: _Tree, beads: list[ReportBead], milestone_id: str
) -> list[tuple[ReportBead, ReportBead]]:
    """(bead, nearest epic) of beads under an epic of the milestone; an epic while childless."""
    rows: list[tuple[ReportBead, ReportBead]] = []
    for bead in beads:
        if not _tracked(tree, bead):
            continue
        epics = tree.epics_of(bead)
        if any(e.parent == milestone_id for e in epics):
            rows.append((bead, epics[0]))
    rows.sort(key=lambda r: r[0].id)
    return rows


def period_scope(
    tree: _Tree, beads: list[ReportBead], days: int, now: datetime
) -> list[tuple[ReportBead, ReportBead]]:
    """(bead, nearest epic) of beads closed in the last `days` days or in progress."""
    since = now - timedelta(days=days)
    rows: list[tuple[ReportBead, ReportBead]] = []
    for bead in beads:
        if not _tracked(tree, bead):
            continue
        closed = bead.status == "closed" and bead.closed_at is not None and bead.closed_at >= since
        if closed or bead.status == "in_progress":
            epics = tree.epics_of(bead)
            rows.append((bead, epics[0] if epics else bead))
    rows.sort(key=lambda r: r[0].id)
    return rows
