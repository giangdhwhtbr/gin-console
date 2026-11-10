"""Beads of a project from its `bd export` snapshot (and `bd history`); the only module that
knows their JSON."""

import json
import re
from itertools import pairwise
from pathlib import Path
from typing import Any, Protocol

from pydantic import ValidationError

from gin_console.beads.errors import BeadNotFound, BeadsError
from gin_console.beads.models import BeadDetail, BeadSummary, Comment, Relation
from gin_console.beads.snapshot import BLOCKING, Snapshot
from gin_console.projects.collect import CollectError, run_json, run_text
from gin_console.quota.source import clean

__all__ = ["BeadNotFound", "BeadsError"]

BD_TIMEOUT = 30.0
MAX_COMMENT_CHARS = 20_000
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


class BdRunner(Protocol):
    def __call__(self, args: list[str], cwd: Path, *, json_on_failure: bool = False) -> Any: ...


def run_bd(args: list[str], cwd: Path, *, json_on_failure: bool = False) -> Any:
    try:
        if args[:1] == ["export"]:  # JSON Lines, one bead per line
            text = run_text(["bd", *args], cwd, timeout=BD_TIMEOUT)
            rows = [json.loads(line) for line in text.splitlines() if line.strip()]
            if not all(isinstance(row, dict) for row in rows):
                raise BeadsError("bd export output was not understood")
            return rows
        return run_json(["bd", *args], cwd, json_on_failure=json_on_failure, timeout=BD_TIMEOUT)
    except CollectError as exc:
        raise BeadsError(str(exc)) from None
    except ValueError:
        raise BeadsError("bd export printed invalid JSON") from None


def export_beads(run: BdRunner, cwd: Path) -> Any:
    """Every regular bead with its labels, dependencies, and comments."""
    return run(["export"], cwd)


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


def _fields(snapshot: Snapshot, ident: str) -> dict[str, Any]:
    raw = snapshot.rows[ident]
    return {
        **{k: raw[k] for k in _SUMMARY_KEYS if k in raw},
        "parent": snapshot.parents.get(ident),
        "blocked_by": _blocked_by(raw),
        # a milestone is not work, even when nothing blocks it (REQ-MILESTONE-UI-007)
        "ready": ident in snapshot.ready and raw.get("issue_type") != "milestone",
        "blocked": ident in snapshot.blocked or raw.get("status") == "blocked",
    }


def list_beads(snapshot: Snapshot, closed: bool) -> list[BeadSummary]:
    beads: list[BeadSummary] = []
    for ident, raw in snapshot.rows.items():
        if not closed and raw.get("status") == "closed":
            continue
        try:
            beads.append(BeadSummary.model_validate(_fields(snapshot, ident)))
        except ValidationError:
            continue  # a malformed bead is left out (REQ-BEADS-005)
    return beads


def _relation(snapshot: Snapshot, ident: str, kind: str) -> Relation | None:
    raw = snapshot.rows.get(ident)
    if raw is None:  # an external or missing bead
        return None
    try:
        return Relation.model_validate(
            {"id": ident, "title": raw.get("title"), "status": raw.get("status"), "type": kind}
        )
    except ValidationError:  # a malformed row, or a kind this view does not show
        return None


def _relations(snapshot: Snapshot, pairs: list[tuple[str, str]]) -> list[Relation]:
    return [r for r in (_relation(snapshot, i, k) for i, k in pairs) if r is not None]


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
                **_fields(snapshot, bead_id),
                "description": raw.get("description") or None,
                "design": raw.get("design") or None,
                "notes": raw.get("notes") or None,
                "acceptance_criteria": raw.get("acceptance_criteria") or None,
                "close_reason": raw.get("close_reason") or None,
                "dependencies": _relations(snapshot, own),
                "dependents": _relations(snapshot, [(i, k) for i, k in above if k == "blocks"]),
                "children": _relations(
                    snapshot, [(i, k) for i, k in above if k == "parent-child"]
                ),
                "bugs": _relations(snapshot, bugs),
            }
        )
    except ValidationError:
        raise BeadsError("bd export output was not understood") from None


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


def count_reopens(run: BdRunner, cwd: Path, bead_id: str) -> int:
    """Times the bead went from closed to another status, as gin-workflow's `quality()` counts."""
    if not valid_id(bead_id):
        raise BeadNotFound(bead_id)
    data = run(["history", "--json", "--", bead_id], cwd, json_on_failure=True)
    if isinstance(data, dict) and "error" in data:
        message = clean(str(data["error"]))  # it reaches response bodies: no lone surrogates
        if "no issue" in message:
            raise BeadNotFound(message)
        raise BeadsError(f"bd: {message[:200]}")
    if data is None or data == []:  # bd answers an unknown id with `null` and exit 0
        raise BeadNotFound(bead_id)
    if not isinstance(data, list):
        raise BeadsError("bd history output was not understood")
    statuses: list[str] = []
    for row in reversed(data):  # bd prints the newest snapshot first
        issue = row.get("Issue") if isinstance(row, dict) else None
        status = issue.get("status") if isinstance(issue, dict) else None
        if not isinstance(status, str):
            raise BeadsError("bd history output was not understood")
        statuses.append(status)
    return sum(1 for before, after in pairwise(statuses) if before == "closed" != after)
