"""The one place that decides what blocked, done and a child count mean."""

from collections.abc import Mapping
from dataclasses import dataclass, replace
from typing import Any, Literal

from gin_console.beads.lanes import is_merge_gate
from gin_console.beads.prep import row_is_prep
from gin_console.beads.snapshot import Snapshot


def is_done(row: Mapping[str, Any]) -> bool:
    return row.get("status") == "closed"


def is_blocked(ident: str, row: Mapping[str, Any], snapshot: Snapshot) -> bool:
    """Not done, and either status `blocked` or held back by an open blocker (REQ-BEADS-021)."""
    return not is_done(row) and (row.get("status") == "blocked" or ident in snapshot.blocked)


def counts_toward(row: Mapping[str, Any]) -> bool:
    """A milestone is not work, nor is a merge gate."""
    return row.get("issue_type") != "milestone" and not is_merge_gate(row)


@dataclass(frozen=True)
class Counts:
    total: int = 0
    closed: int = 0
    prep_total: int = 0
    prep_closed: int = 0
    in_progress: int = 0
    blocked: int = 0
    ready: int = 0
    deferred: int = 0


TrackState = Literal["done", "blocked", "deferred", "ready", "in_progress"]


def track_state(ident: str, row: Mapping[str, Any], snapshot: Snapshot) -> TrackState:
    """The one state a track counts in (REQ-BEADS-022), as the Board gives it (REQ-UI-031)."""
    if is_done(row):
        return "done"
    if is_blocked(ident, row, snapshot):
        return "blocked"
    if row.get("status") == "deferred":
        return "deferred"
    if ident in snapshot.ready:
        return "ready"
    if row.get("status") in ("in_progress", "hooked"):
        return "in_progress"
    return "deferred"


def child_counts(snapshot: Snapshot) -> dict[str, Counts]:
    """Children of each parent, merge gates left out, prep tasks counted apart (REQ-BEADS-022)."""
    found: dict[str, Counts] = {}
    for child, parent in snapshot.parents.items():
        row = snapshot.rows.get(child)
        if row is None or parent not in snapshot.rows or is_merge_gate(row):
            continue
        now = found.get(parent, Counts())
        done = 1 if is_done(row) else 0
        if row_is_prep(row):
            found[parent] = replace(
                now, prep_total=now.prep_total + 1, prep_closed=now.prep_closed + done
            )
            continue
        state = track_state(child, row, snapshot)
        found[parent] = replace(
            now,
            total=now.total + 1,
            closed=now.closed + done,
            **({} if state == "done" else {state: getattr(now, state) + 1}),
        )
    return found


def person_key(value: str | None) -> str | None:
    """A person across spellings: the lower-cased text before the `@` (REQ-BEADS-023)."""
    text = (value or "").strip().lower()
    if not text:
        return None
    return text.split("@", 1)[0] or text


def bugs_found(snapshot: Snapshot) -> dict[str, int]:
    """Bugs, open or closed, with a `discovered-from` dependency on each bead (REQ-REPORTS-019)."""
    found: dict[str, int] = {}
    for target, links in snapshot.dependents.items():
        count = sum(
            1
            for issue, kind in links
            if kind == "discovered-from" and snapshot.rows.get(issue, {}).get("issue_type") == "bug"
        )
        if count:
            found[target] = count
    return found
