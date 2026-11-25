"""What needs a lead's attention in one project (REQ-OVERVIEW-002 to REQ-OVERVIEW-006)."""

from datetime import date, datetime, timedelta

from gin_console.beads.definitions import person_key
from gin_console.beads.milestones import current_milestone
from gin_console.beads.prep import is_prep
from gin_console.beads.snapshot import Snapshot
from gin_console.overview.models import (
    ActiveBead,
    AgingBead,
    BlockedBead,
    Named,
    ProjectOverview,
    ReadyBead,
)
from gin_console.reports.models import ReportBead
from gin_console.reports.scope import Tree, day_of, list_milestones, tracked, workdays
from gin_console.reports.source import read_beads
from gin_console.reports.status import blocker_of, wait

LAST = 1_000_000  # a bead without priority sorts last


def _milestone(beads: list[ReportBead], today: date) -> Named | None:
    opened = [m for m in list_milestones(beads, today)[0] if m.status != "closed"]
    overdue = sorted((m for m in opened if m.end < today), key=lambda m: (m.end, m.id))
    found = overdue[0] if overdue else current_milestone(opened, today)
    return None if found is None else Named(id=found.id, title=found.title)


def _age(bead: ReportBead, today: date) -> int:
    since = day_of(bead.started_at or bead.updated_at)
    return len(workdays(since + timedelta(days=1), today))


def build_overview(
    snapshot: Snapshot, name: str, aging_days: int, now: datetime, stale: bool
) -> ProjectOverview:
    beads = read_beads(snapshot, name, {})
    tree, today = Tree(beads), day_of(now)
    work = [b for b in beads if b.issue_type != "milestone" and not is_prep(b.labels)]
    waits = [(b, wait(tree, b, today)) for b in work if b.blocked]
    waits.sort(key=lambda pair: (-pair[1], pair[0].id))
    single = [b for b in beads if tracked(tree, b) and not b.blocked]
    active = sorted((b for b in single if b.status == "in_progress"), key=lambda b: b.id)
    ages = [(b, _age(b, today)) for b in active]
    ages.sort(key=lambda pair: (-pair[1], pair[0].id))
    ready = [b for b in single if b.id in snapshot.ready and person_key(b.assignee) is None]
    ready.sort(key=lambda b: (LAST if b.priority is None else b.priority, b.id))
    epics = sorted(
        (b for b in beads if b.issue_type == "epic" and b.status == "in_progress"),
        key=lambda b: b.id,
    )
    return ProjectOverview(
        name=name,
        stale=stale,
        milestone=_milestone(beads, today),
        blocked=[
            BlockedBead(
                id=b.id,
                title=b.title,
                assignee=b.assignee,
                days=days,
                blocker=blocker_of(tree, b),
            )
            for b, days in waits
        ],
        aging=[
            AgingBead(id=b.id, title=b.title, assignee=b.assignee, days=days)
            for b, days in ages
            if days > aging_days
        ],
        unassigned=[ReadyBead(id=b.id, title=b.title, priority=b.priority) for b in ready],
        in_progress=[ActiveBead(id=b.id, title=b.title, assignee=b.assignee) for b in active],
        epics=[Named(id=b.id, title=b.title) for b in epics],
    )
