"""Beads of one project for reports, from its `.beads/issues.jsonl` snapshot."""

from collections.abc import Mapping, Sequence
from dataclasses import asdict
from datetime import date, datetime
from typing import Any

from pydantic import ValidationError

from gin_console.beads.definitions import Counts, child_counts, is_blocked, is_done
from gin_console.beads.kinds import points_of
from gin_console.beads.lanes import is_merge_gate
from gin_console.beads.models import ChildCounts
from gin_console.beads.snapshot import BLOCKING, Snapshot
from gin_console.reports.history import parse_moves, parse_points
from gin_console.reports.models import ReportBead

_KEYS = (
    "id",
    "title",
    "issue_type",
    "status",
    "assignee",
    "parent",
    "labels",
    "created_at",
    "updated_at",
    "started_at",
    "closed_at",
    "estimated_minutes",
    "priority",
)


def _stamp(value: object) -> datetime | None:
    try:
        return datetime.fromisoformat(value) if isinstance(value, str) else None
    except ValueError:
        return None


def _blocking(
    ident: str, raw: Mapping[str, Any], snapshot: Snapshot
) -> tuple[list[str], datetime | None]:
    """The open beads of the store `raw` waits on through its own blocking dependencies,
    sorted by id, and the earliest `created_at` of those dependencies."""
    deps = raw.get("dependencies")
    waits: set[str] = set()
    since: list[datetime] = []
    for dep in deps if isinstance(deps, list) else []:
        if (
            not isinstance(dep, dict)
            or dep.get("issue_id") != ident
            or dep.get("type") not in BLOCKING
        ):
            continue
        target = dep.get("depends_on_id")
        if (
            isinstance(target, str)
            and target in snapshot.rows
            and not is_done(snapshot.rows[target])
        ):
            waits.add(target)
            if (made := _stamp(dep.get("created_at"))) is not None:
                since.append(made)
    try:
        return sorted(waits), min(since) if since else None
    except TypeError:  # naive and aware stamps cannot be compared
        return sorted(waits), None


def _bug_days(ident: str, snapshot: Snapshot) -> list[date]:
    """Local creation dates of the bugs with a `discovered-from` dependency on `ident`."""
    days: list[date] = []
    for issue, kind in snapshot.dependents.get(ident, []):
        made = _stamp(snapshot.rows.get(issue, {}).get("created_at"))
        if kind == "discovered-from" and snapshot.rows.get(issue, {}).get("issue_type") == "bug":
            days.append((made or datetime.min.astimezone()).astimezone().date())
    return days


def _days_per_point(metadata: object) -> float | None:
    value = metadata.get("planned_days_per_point") if isinstance(metadata, dict) else None
    if isinstance(value, str):
        try:
            value = float(value)
        except ValueError:
            return None
    if isinstance(value, bool) or not isinstance(value, int | float):
        return None
    return float(value) if value > 0 else None


def read_beads(
    snapshot: Snapshot, project: str, reopens: Mapping[str, Sequence[date]]
) -> list[ReportBead]:
    beads: list[ReportBead] = []
    counts = child_counts(snapshot)
    for ident, raw in snapshot.rows.items():
        if is_merge_gate(raw):
            continue  # a placeholder, not work (REQ-BEADS-019)
        fields = {key: raw[key] for key in _KEYS if raw.get(key) is not None}
        metadata = raw.get("metadata")
        if raw.get("issue_type") == "milestone" and isinstance(metadata, dict):
            for key in ("start", "end", "kickoff"):
                if isinstance(metadata.get(key), str):
                    fields[key] = metadata[key]
            fields["planned_days_per_point"] = _days_per_point(metadata)
        if (points := points_of(metadata)) is not None:
            fields["points"] = points
        if ident in snapshot.parents:
            fields["parent"] = snapshot.parents[ident]
        if raw.get("issue_type") == "epic":
            fields["child_counts"] = ChildCounts(**asdict(counts.get(ident, Counts())))
        history = metadata if isinstance(metadata, dict) else {}
        blockers, blocked_since = _blocking(ident, raw, snapshot)
        bug_days = _bug_days(ident, snapshot)
        reopened_on = list(reopens.get(ident, ()))
        fields["blocked"] = is_blocked(ident, raw, snapshot)
        try:
            beads.append(
                ReportBead.model_validate(
                    {
                        **fields,
                        "project": project,
                        "reopens": len(reopened_on),
                        "reopened_on": reopened_on,
                        "bugs": len(bug_days),
                        "bug_days": bug_days,
                        "moves": parse_moves(history.get("milestone_moves")),
                        "points_history": parse_points(history.get("points_history")),
                        "blockers": blockers,
                        "blocked_since": blocked_since,
                    }
                )
            )
        except ValidationError:
            continue  # a row with wrong types is left out, as REQ-BEADS-005 does for lists
    return beads
