"""Points delivered and estimate accuracy (spec REQ-REPORTS-034)."""

from collections import Counter
from datetime import datetime, timedelta

from gin_console.beads.definitions import person_key
from gin_console.beads.prep import is_prep
from gin_console.reports.history import milestone_on, points_on
from gin_console.reports.models import ReportBead
from gin_console.reports.scope import (
    MilestoneScope,
    PeriodScope,
    Scope,
    Tree,
    bead_key,
    day_of,
    workdays,
)
from gin_console.reports.service import UNASSIGNED


def _person(assignee: str | None) -> str:
    return person_key(assignee) or UNASSIGNED


def actual_days(epic: ReportBead) -> int | None:
    """Working days from `started_at` to `closed_at`, both included, at least 1; None without
    `started_at` (gin-workflow's `actual_days`)."""
    if epic.started_at is None or epic.closed_at is None:
        return None
    return max(len(workdays(day_of(epic.started_at), day_of(epic.closed_at))), 1)


def delivered(beads: list[ReportBead], scope: Scope, now: datetime) -> list[ReportBead]:
    """Closed epics with points: those in the milestone today, or closed in the period."""
    today = day_of(now)
    found: list[ReportBead] = []
    for bead in beads:
        if bead.issue_type != "epic" or bead.status != "closed" or points_on(bead, today) is None:
            continue
        if isinstance(scope, MilestoneScope):
            if milestone_on(bead, today) == scope.id:
                found.append(bead)
        elif isinstance(scope, PeriodScope):
            if bead.closed_at is not None and bead.closed_at >= now - timedelta(days=scope.days):
                found.append(bead)
    return found


def shares(epic: ReportBead, tree: Tree) -> dict[str, float]:
    """Each person's share of the epic: their closed tracks over all its closed tracks, or 1 for
    the epic's assignee when it has none."""
    done = Counter(
        _person(c.assignee)
        for c in tree.children.get(bead_key(epic), [])
        if c.status == "closed" and not is_prep(c.labels)
    )
    if not done:
        return {_person(epic.assignee): 1.0}
    total = sum(done.values())
    return {person: n / total for person, n in done.items()}


def _share(epic: ReportBead, tree: Tree, person: str | None) -> float:
    return 1.0 if person is None else shares(epic, tree).get(person, 0.0)


def points_delivered(epics: list[ReportBead], tree: Tree, person: str | None) -> float:
    """The points of the delivered epics, shared by closed tracks; None is the team."""
    return round(sum(_share(e, tree, person) * (e.points or 0) for e in epics), 1)


def accuracy(
    epics: list[ReportBead], tree: Tree, planned: float | None, person: str | None
) -> float | None:
    """Planned days per point over actual days per point, rounded as gin-workflow's `velocity`
    does; None without planned days, without a measured epic, or without a share."""
    if planned is None or planned <= 0:
        return None
    days = weight = 0.0
    for epic in epics:
        spent = actual_days(epic)
        if spent is None:
            continue
        share = _share(epic, tree, person)
        days += share * spent
        weight += share * (epic.points or 0)
    if weight <= 0 or days <= 0:
        return None
    return round(planned / round(days / weight, 2), 2)
