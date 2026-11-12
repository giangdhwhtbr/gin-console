"""Milestone rules shared by the Beads page and the Team report: dates, status, the current one,
and the milestone a bead belongs to."""

import re
from collections.abc import Sequence
from datetime import date
from typing import Literal, Protocol

from gin_console.beads.snapshot import Snapshot

MilestoneStatus = Literal["active", "scheduled", "planned", "closed"]
_DATE = re.compile(r"\d{4}-\d{2}-\d{2}")


class Dated(Protocol):
    @property
    def id(self) -> str: ...
    @property
    def status(self) -> MilestoneStatus: ...
    @property
    def start(self) -> date: ...
    @property
    def end(self) -> date: ...


def parse_date(text: object) -> date | None:
    """A `YYYY-MM-DD` date, or None for anything else (e.g. 2026-13-45)."""
    if not isinstance(text, str) or _DATE.fullmatch(text) is None:
        return None
    try:
        return date.fromisoformat(text)
    except ValueError:
        return None


def milestone_status(closed: bool, kickoff: object, today: date) -> MilestoneStatus:
    if closed:
        return "closed"
    day = parse_date(kickoff)
    if day is None:
        return "planned"
    return "active" if day <= today else "scheduled"


def current_milestone[T: Dated](milestones: Sequence[T], today: date) -> T | None:
    opened = sorted((m for m in milestones if m.status != "closed"), key=lambda m: (m.start, m.id))
    for pool in (
        [m for m in opened if m.status == "active"],
        [m for m in opened if m.start <= today <= m.end],
        [m for m in opened if m.start > today],
    ):
        if pool:
            return pool[0]
    return None


def milestone_of(snapshot: Snapshot, ident: str) -> str | None:
    """The bead itself when it is a milestone, else its nearest milestone ancestor."""
    seen: set[str] = set()
    current: str | None = ident
    while current is not None and current not in seen:
        row = snapshot.rows.get(current)
        if row is not None and row.get("issue_type") == "milestone":
            return current
        seen.add(current)
        current = snapshot.parents.get(current)
    return None
