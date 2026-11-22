"""Beads of a project from its `.beads/issues.jsonl` snapshot; the only module that knows their
JSON."""

import json
import re
from dataclasses import asdict, dataclass
from datetime import date
from pathlib import Path
from typing import Any

from pydantic import ValidationError

from gin_console.beads.definitions import Counts, child_counts, is_blocked
from gin_console.beads.errors import BeadNotFound, BeadsError
from gin_console.beads.kinds import (
    complexity_of,
    declared_capabilities,
    kind_of,
    points_of,
    req_capabilities,
)
from gin_console.beads.lanes import claim_of, gate_ref, is_merge_gate, lane_of, track_of
from gin_console.beads.milestones import (
    MilestoneStatus,
    current_milestone,
    milestone_of,
    milestone_status,
    parse_date,
)
from gin_console.beads.models import (
    BeadDetail,
    BeadSummary,
    ChildRelation,
    Comment,
    GateRelation,
    MilestoneOption,
    ProjectMilestones,
    Relation,
)
from gin_console.beads.prep import row_is_prep
from gin_console.beads.snapshot import BLOCKING, EXPORT_FILE, Snapshot

__all__ = ["EXPORT_FILE", "BeadNotFound", "BeadsError"]

MAX_COMMENT_CHARS = 20_000
MISSING = (
    "{path} not found: run `bd config set export.auto true` and "
    "`bd config set export.interval 1s` in the project, then any bd write "
    "(or `bd export -o .beads/issues.jsonl`)"
)
_NAME = EXPORT_FILE.as_posix()  # the same message on Windows
_ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]*")
_SUMMARY_KEYS = (
    "id",
    "title",
    "status",
    "priority",
    "issue_type",
    "labels",
    "owner",
    "assignee",
    "created_at",
    "updated_at",
    "dependency_count",
    "dependent_count",
    "comment_count",
    "closed_at",
    "created_by",
)


def read_export(cwd: Path) -> list[dict[str, Any]]:
    """Every row of the project's `bd` export file (what `bd export` prints)."""
    path = cwd / EXPORT_FILE
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except FileNotFoundError:
        raise BeadsError(MISSING.format(path=_NAME)) from None
    except OSError as exc:
        raise BeadsError(f"{_NAME} could not be read: {exc.strerror or exc}") from None
    try:
        rows = [json.loads(line) for line in text.splitlines() if line.strip()]
    except ValueError:
        raise BeadsError(f"{_NAME} has a line that is not JSON") from None
    if not all(isinstance(row, dict) for row in rows):
        raise BeadsError(f"{_NAME} has a line that is not a JSON object")
    return rows


def valid_id(value: str) -> bool:
    return _ID.fullmatch(value) is not None


def _blocked_by(row: dict[str, Any]) -> list[str]:
    """Ids a bead depends on as blockers."""
    ids = [
        dep["depends_on_id"]
        for dep in _own_deps(row)
        if dep.get("type") in BLOCKING and isinstance(dep.get("depends_on_id"), str)
    ]
    return list(dict.fromkeys(ids))


def _own_deps(row: dict[str, Any]) -> list[dict[str, Any]]:
    deps = row.get("dependencies")
    return [
        dep
        for dep in (deps if isinstance(deps, list) else [])
        if isinstance(dep, dict) and dep.get("issue_id") == row.get("id")
    ]


def _labels(row: dict[str, Any]) -> list[str]:
    labels = row.get("labels")
    return [label for label in labels if isinstance(label, str)] if isinstance(labels, list) else []


def _description(row: dict[str, Any]) -> str:
    text = row.get("description")
    return text if isinstance(text, str) else ""


def _capabilities(snapshot: Snapshot, ident: str) -> list[str]:
    """Declared and `req:` capabilities of a bead; an epic adds those of its children."""
    raw = snapshot.rows[ident]
    names = [*declared_capabilities(_description(raw)), *req_capabilities(_labels(raw))]
    if raw.get("issue_type") == "epic":
        for child, kind in snapshot.dependents.get(ident, []):
            if kind == "parent-child" and child in snapshot.rows:
                names += req_capabilities(_labels(snapshot.rows[child]))
    return sorted(set(names))


def _estimate(raw: dict[str, Any]) -> int | None:
    minutes = raw.get("estimated_minutes")
    return (
        minutes
        if isinstance(minutes, int) and not isinstance(minutes, bool) and minutes > 0
        else None
    )


def _points(raw: dict[str, Any]) -> tuple[int | None, str | None]:
    points = points_of(raw.get("metadata"))
    reason = raw["metadata"].get("points_reason") if points is not None else None
    return points, reason if isinstance(reason, str) else None


def _fields(snapshot: Snapshot, ident: str, counts: dict[str, Counts]) -> dict[str, Any]:
    raw = snapshot.rows[ident]
    issue_type = raw.get("issue_type")
    points, points_reason = _points(raw)
    return {
        **{k: raw[k] for k in _SUMMARY_KEYS if k in raw},
        "parent": snapshot.parents.get(ident),
        "blocked_by": _blocked_by(raw),
        "milestone": milestone_of(snapshot, ident),
        "kind": kind_of(issue_type if isinstance(issue_type, str) else "", _labels(raw)),
        "capabilities": _capabilities(snapshot, ident),
        "complexity": complexity_of(_description(raw)),
        "estimate_minutes": _estimate(raw),
        "points": points,
        "points_reason": points_reason,
        # a milestone is not work, even when nothing blocks it (REQ-MILESTONE-UI-007)
        # nor is a merge gate (REQ-BEADS-007), which only holds a track back
        "ready": ident in snapshot.ready
        and raw.get("issue_type") != "milestone"
        and not is_merge_gate(raw),
        "blocked": is_blocked(ident, raw, snapshot),
        "lane": lane_of(_description(raw), _labels(raw)),
        "track": track_of(_description(raw), _labels(raw)),
        "claim": claim_of(raw.get("metadata")),
        "waits_for": gate_ref(snapshot, ident),
        "child_counts": asdict(counts.get(ident, Counts())),
    }


def list_beads(snapshot: Snapshot, closed: bool) -> list[BeadSummary]:
    beads: list[BeadSummary] = []
    counts = child_counts(snapshot)
    for ident, raw in snapshot.rows.items():
        if not closed and raw.get("status") == "closed":
            continue
        try:
            beads.append(BeadSummary.model_validate(_fields(snapshot, ident, counts)))
        except ValidationError:
            continue  # a malformed bead is left out (REQ-BEADS-005)
    return beads


@dataclass(frozen=True)
class _Dated:
    id: str
    status: MilestoneStatus
    start: date
    end: date


def list_milestones(snapshot: Snapshot, today: date) -> ProjectMilestones:
    options: list[MilestoneOption] = []
    for ident, raw in snapshot.rows.items():
        if raw.get("issue_type") != "milestone":
            continue
        meta = raw.get("metadata")
        meta = meta if isinstance(meta, dict) else {}
        try:
            options.append(
                MilestoneOption.model_validate(
                    {
                        "id": ident,
                        "title": raw.get("title"),
                        "status": milestone_status(
                            raw.get("status") == "closed", meta.get("kickoff"), today
                        ),
                        "start": parse_date(meta.get("start")),
                        "end": parse_date(meta.get("end")),
                    }
                )
            )
        except ValidationError:
            continue  # a malformed bead is left out (REQ-BEADS-005)
    dated = [_Dated(o.id, o.status, o.start, o.end) for o in options if o.start and o.end]
    found = current_milestone(dated, today)
    return ProjectMilestones(milestones=options, current=found.id if found else None)


def _relation(snapshot: Snapshot, ident: str, kind: str) -> GateRelation | None:
    raw = snapshot.rows.get(ident)
    if raw is None:  # an external or missing bead
        return None
    try:
        return GateRelation.model_validate(
            {
                "id": ident,
                "title": raw.get("title"),
                "status": raw.get("status"),
                "type": kind,
                "waits_for": gate_ref(snapshot, ident),
            }
        )
    except ValidationError:  # a malformed row, or a kind this view does not show
        return None


def _relations(snapshot: Snapshot, pairs: list[tuple[str, str]]) -> list[GateRelation]:
    return [r for r in (_relation(snapshot, i, k) for i, k in pairs) if r is not None]


def _bugs(snapshot: Snapshot, pairs: list[tuple[str, str]]) -> list[Relation]:
    """Bugs are plain relations: a merge gate is never a bug."""
    return [Relation(**r.model_dump(exclude={"waits_for"})) for r in _relations(snapshot, pairs)]


def _children(snapshot: Snapshot, above: list[tuple[str, str]]) -> list[ChildRelation]:
    found: list[ChildRelation] = []
    for ident, kind in above:
        relation = _relation(snapshot, ident, kind) if kind == "parent-child" else None
        if relation is not None:
            found.append(
                ChildRelation(
                    **relation.model_dump(),
                    prep=row_is_prep(snapshot.rows[ident]),
                )
            )
    return found


def _row(snapshot: Snapshot, bead_id: str) -> dict[str, Any]:
    if not valid_id(bead_id) or bead_id not in snapshot.rows:
        raise BeadNotFound(bead_id)
    return snapshot.rows[bead_id]


def get_bead(snapshot: Snapshot, bead_id: str) -> BeadDetail:
    raw = _row(snapshot, bead_id)
    own = [
        (dep["depends_on_id"], dep["type"])
        for dep in _own_deps(raw)
        if isinstance(dep.get("depends_on_id"), str) and dep.get("type") != "discovered-from"
    ]
    above = snapshot.dependents.get(bead_id, [])
    bugs = [
        (i, k)
        for i, k in above
        if k == "discovered-from" and snapshot.rows.get(i, {}).get("issue_type") == "bug"
    ]
    try:
        return BeadDetail.model_validate(
            {
                **_fields(snapshot, bead_id, child_counts(snapshot)),
                "description": raw.get("description") or None,
                "design": raw.get("design") or None,
                "notes": raw.get("notes") or None,
                "acceptance_criteria": raw.get("acceptance_criteria") or None,
                "close_reason": raw.get("close_reason") or None,
                "dependencies": _relations(snapshot, own),
                "dependents": _relations(snapshot, [(i, k) for i, k in above if k == "blocks"]),
                "children": _children(snapshot, above),
                "bugs": _bugs(snapshot, bugs),
            }
        )
    except ValidationError:
        raise BeadsError(f"{_NAME} was not understood") from None


def _comment(raw: Any) -> Comment | None:
    if not isinstance(raw, dict):
        return None
    try:
        comment = Comment.model_validate(
            {k: raw[k] for k in ("id", "author", "text", "created_at") if k in raw}
        )
    except ValidationError:
        return None
    if len(comment.text) <= MAX_COMMENT_CHARS:
        return comment
    return comment.model_copy(update={"text": comment.text[:MAX_COMMENT_CHARS], "truncated": True})


def get_comments(snapshot: Snapshot, bead_id: str) -> list[Comment]:
    data = _row(snapshot, bead_id).get("comments")
    rows = data if isinstance(data, list) else []
    return [item for item in map(_comment, rows) if item is not None]
